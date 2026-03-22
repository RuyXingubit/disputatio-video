# FASE 2: Integração Backend (Next.js x API PowerDNS)

Este documento exibe as especificações técnicas de como o servidor principal do `disputatio-app` (Next.js) atuará como controlador arquitetural das rotas de vídeo, provisionando caminhos dinâmicos no NS1.

---

## 1. O Pipeline da Lógica de Negócio

Sempre que a Tabela `ISP` (ou `Partner`) do nosso banco de dados relacional sofrer alteração (CRUD), o Gateway atuará como intermediário com o PowerDNS.

### O Serviço Base: `PowerDNSService.ts`
Criaremos uma classe central que servirá de *wrapper* para a REST API pública do PowerDNS Master (`NS1`).

*   **Endpoint-Alvo:** O PowerDNS disponibiliza a modificação das tabelas através do URL base `http://[IP_NOVO_NS1]:8081/api/v1/servers/localhost/zones/disputatio.com.br.`.
*   **Autenticação:** O cabeçalho imperativo precisará do `X-API-Key: {sua_senha}` configurado no conf do servidor.

### Exemplo de Payload Padrão
Quando um funcionário for no painel em `/admin/isps/novo` e cadastrar o **ISP XPTO Fiber** usando o IP (`177.200.10.5`):

```javascript
// O Next.js agirá e construirá um Slug amigável (Slugify)
const hostToCreate = "isp-xpto-fiber.disputatio.com.br.";

// Disparo HTTP PATCH:
const response = await fetch("http://NS1_IP:8081/api/v1/servers/localhost/zones/disputatio.com.br.", {
  method: "PATCH",
  headers: { "X-API-Key": process.env.POWERDNS_API_KEY },
  body: JSON.stringify({
    rrsets: [
      {
         name: hostToCreate,
         type: "A",
         ttl: 60,
         changetype: "REPLACE",
         records: [ { content: "177.200.10.5", disabled: false } ]
      }
    ]
  })
});
```

*(Com essa requisição única do Backend, a cadeia ganha vida. O NS1 injeta o sub-domínio no SQLite local atômico, envia notificação TCP em 5 milisegundos para o NS2, e a internet inteira passa a resolver o IP de videocast desse ISP parceiro).*

---

## 2. Aprimoramento do Fallback Seguro

Para o Front-End Web/App, nada muda significativamente no contrato da Request, a não ser a entrega e a origem da URL final.

**Rotina Inteligente do Roteador (Get Presigned URL):**
1. O Front-end pede URL ao Next (Ex: `POST /api/video/upload-link`).
2. O Gateway Node levanta do DB um ISP otimal-sorteado para aquele cliente.
3. O Node valida através de um ping criptográfico (Ex: `fetch(https://isp-xpto-fiber.disputatio.com.br/health_check)`) se o nó da ponta já recebeu/validou o *Let's Encrypt* através da sua sub-zona atrelada.
4. **Caminho Feliz (Tier 1):** O ping tem Status 200, certificado válido, banda limpa -> Devolve URI da borda diretamente ao Front-end `https://isp-xpto-fiber...`.
5. **Fallback:** Timeout ou Falha de Handshake SSL (Rede do parceiro tem porta 80 do provedor barrada ou roteamento NAT irregular) -> Aciona Degradação Graceful. Devolve URL local do Mestre `https://api.disputatio.com.br/relay/...` repassando o Stream (Cenário "Cara ou Coroa").

## 3. Prevenção a Ataques (DDoS Node Local)

Sendo nós gerenciadores de um DNS Autorizado próprio, garantimos que nossa API `pdns` restrinja criação em lote de subdomínios (Rate-limit via painel admin). Apenas contas Master (Dashboard de Admin com acesso Autenticado SSR) poderão acionar a classe `PowerDNSService`, e somente sobre o FQDN fixo da nossa marca `.disputatio.com.br`.
