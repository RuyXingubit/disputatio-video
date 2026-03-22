# Documentação da Classe: PowerDNSService

Este documento destrincha o funcionamento Técnico da classe `PowerDNSService`, que atua como serviço de comunicação HTTP entre o Next.js (Gateway Principal) e a infraestrutura de DNS Autoritativo (`NS1`).

**Localização do Arquivo:** `app/services/dns/PowerDNSService.ts`

---

## 1. Variáveis de Ambiente Necessárias (`.env`)
Para que a classe seja instanciada com sucesso sem retornar o warning de *Ignoração de chamada DNS*, o ambiente (Vercel ou Servidor Local) que roda o Next.js obrigatoriamente precisa ter essas 3 variáveis declaradas:

```env
# URL do NS1 master e o path até a manipulação de zonas
POWERDNS_API_URL=http://NS1_IP:8081/api/v1/servers/localhost/zones

# A Senha forte gerada (Deve ser idêntica à do pdns.conf "api-key=")
POWERDNS_API_KEY=sua_super_senha_aqui

# A Zona de Topologia que o Node vai alterar (Importante: O ponto final "." é OBRIGATÓRIO no DNS)
POWERDNS_ZONE=disputatio.com.br.
```

---

## 2. Padrões de Operação e Segurança (`request()`)
A classe foi desenhada utilizando um `helper method` privado estático (`request()`). 

**Tratamento Automático de Erros:**
* Se a `POWERDNS_API_KEY` for vazia (ex: durante o dev local do frontend), a classe apenas devolve o aviso silencioso `console.warn` e retorna `null`. Ela **não crascha** a aplicação Next.js se faltar configuração DNS local.
* Headers nativos injetam o `X-API-Key`. Caso o PowerDNS retorne status `204 No Content` (padrão de sucesso para Patch de zona), a classe aborta o parser JSON para evitar estouro de promise e retorna `true`.
* Erros HTTP HTTP `4xx` ou `5xx` (falha na tabela ou IP fora) explodem uma `Exception` limpa que deverá ser apanhada no bloco `try/catch` da Server Action (ex: a tela de painel emite Toast de Falha de DNS).

---

## 3. Método: `addISPRecord()`

Usado na Action de **Criação** ou **Atualização/Edição** de um Provedor Parceiro.
O PowerDNS trata a "edição" da mesma forma que a criação, usando o parâmetro `changetype: 'REPLACE'`. Se o registro do ISP não existia, é criado. Se o provedor trocou o seu Link/IP, ele sobrepõe com a nova string.

```typescript
// Assinatura:
static async addISPRecord(subdomainSegment: string, ipAddress: string)

// Exemplo Prático de Uso da Action no Painel Admin:
await PowerDNSService.addISPRecord('isp-xpto-fibra', '200.150.10.2');
         // Resultará no roteamento: isp-xpto-fibra.disputatio.com.br -> 200.150.10.2
```

**Parâmetros Internos Disparados:**
* `type: 'A'` -> Define que o roteamento é base-IP cru (IPv4).
* `ttl: 60` -> Mantemos propositalmente um DNS Caching mundial muito curto (1 minuto). Isso é crítico pois, se o provedor parceiro mudar o "IP da Vivo" dele, a propagação em toda a rede global ocorrerá praticamente em tempo real assim que editarmos o provedor no painel.

---

## 4. Método: `removeISPRecord()`

Usado obrigatoriamente quando ocorrer a exclusão lógica de um Provedor Parceiro via Painel Admin, visando não poluir ou vazar a tabela de roteamento da nossa zona.

```typescript
// Assinatura:
static async removeISPRecord(subdomainSegment: string, ipAddress: string)

// Exemplo Prático de Uso:
await PowerDNSService.removeISPRecord('isp-xpto-fibra', '200.150.10.2');
```
* **Payload Disparado:** Dispara um Request do tipo `changetype: 'DELETE'`.
* **Resultado:** O registro desaparece da nossa zona master. Segundos depois os caches do Brasil "esquecem" deste roteamento e quem tentar acessar este endereço receberá `ERR_NAME_NOT_RESOLVED`, garantindo isolamento total pós-rescisão do parceiro.
