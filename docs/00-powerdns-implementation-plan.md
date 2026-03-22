# Plano de Implementação: Infraestrutura DNS Autoritativo (PowerDNS) e Roteamento Edge

Este documento detalha o planejamento arquitetural e tático para a migração do roteamento de vídeos da plataforma Disputatio. O objetivo é eliminar man-in-the-middle e gargalos de banda na máquina mestre, implementando um modelo de distribuição "Edge" (borda) com HTTPS válido de ponta a ponta.

---

## O Problema Atual vs O Objetivo
**Cenário Atual (Opção 1):** O vídeo sai do navegador do cliente, vai para a VPS do Gateway (Next.js) e o Node.js envia os bits (via stream S2S) de volta para o IP cru do provedor parceiro (MinIO na porta 9000). Isso gera *overhead* insustentável de tráfego Outbound no Gateway, atuando como gargalo em massa.

**Cenário Futuro (Opção 2 - Este Plano):** O Gateway do Next.js será apenas o Orquestrador. Ele devolverá uma URL roteável e segura (ex: `https://[isp-name].disputatio.com.br/video.mp4`) ao front-end. O front-end, então, realiza o upload *diretamente* para o roteador do provedor parceiro, aliviando nossa banda em 100%.

Para viabilizar isso contornando as limitações do Registro.br (ausência de suporte a Wildcard e API para automação), assumiremos autoridade DNS própria.

---

## Divisão de Fases de Execução (Rollout)

A implementação foi dividida em 4 fases incrementais e seguras, minimizando riscos de indisponibilidade (Downtime).

### FASE 1: Infraestrutura Core DNS (PowerDNS - Máquinas Mestres)
O primeiro passo é tirar a responsabilidade global das zonas da mão do Registro.br e assumir internamente o controle com API.

1.  **Provisionamento de Instâncias (VMs):** Levantar duas máquinas de baixo custo (VPS Linux/Ubuntu 24.04) em zonas de disponibilidade eficientes para operarem como `NS1` e `NS2`.
2.  **Instalação do PowerDNS Authoritative Server:** Instalar pacote oficial `pdns-server` em ambas as máquinas.
3.  **Configuração de Persistência:** Configurar o backend `pdns-backend-sqlite3` (para simplicidade e velocidade) ou `pdns-backend-pgsql` (se houver infra de banco de dados nativa provisionada). A base SQLite atende tranquilamente aos níveis iniciais de leitura.
4.  **Replicabilidade Criptográfica (Desafio Opcional Inicial):** Configurar replicação zone-transfer (AXFR) do NS1 (Master) para NS2 (Slave) ou replicar o banco SQLite via cron/rsync.
5.  **Exposição da API REST:** Habilitar e auditar o Webserver intergrado do PowerDNS Master (NS1) assegurando o tráfego REST com autenticação e `X-API-Key`.
6.  **Carga Inicial de Zonas (Dry Run):** Recriar e validar as entradas atuais existentes no Registro.br (registros `A` da Vercel, registros de validação de e-mail `TXT` de SPF/DKIM e `MX`).

### FASE 2: Backend da Plataforma (Integração & CRUD no Next.js)
Com os servidores DNS de pé e aguardando chamadas isoladas, vamos codar a automação no Gateway de vídeo (`disputatio-app`).

1.  **Serviço DNS (`PowerDNSService.ts`):** Criar uma classe na camada `src/services` usando TypeScript (com `fetch` ou `axios`) capaz de interagir com o PowerDNS via GET (consultar zonas), POST e PATCH (add/edit de `RRsets`).
2.  **Hooks Dinâmicos de ISP:** Interceptar o controlador/Action de Administrador que cadastra novos "Nós ISP" (provedores). Ao acionar este endpoint, o backend em Node chamará o PowerDNS para criar automaticamente o Subdomínio amigável para o parceiro:
    *   *Ação:* Admin cria ISP "Xnet" informando o IP `200.150.10.1` e slug `xnet-telecom`.
    *   *Reação do Next:* Submete API call via background para criar registro DNS `A` em `xnet-telecom.disputatio.com.br` apontando para `200.150.10.1`.
3.  **Refatoração do Upload de Vídeo:** Alterar a lógica de geração de _Presigned URLs_ e _Video Gateway_. Devolver para o cliente Web não a URL da nossa API, mas sim a URI direta e montada em cima do subdomínio do parceiro sorteado.
4.  **Aprimoramento do Fallback:** Adaptar a engine do Gateway para validar proativamente a "Saúde SSL" (via probe) daquele node ISP. Se der falha (timeout HTTPS), mantemos secretamente o uso Server-to-Server legando pela nossa infra para que nenhum upload ou download de vídeo pare de acontecer.

### FASE 3: Edge Network (A Ponta / Docker ISP Partner)
Agora que controlamos as URIs diretas e elas apontam rigorosamente para o roteador de cada ISP, cada parceiro precisará provar autonomia e fornecer o cadeado verde HTTPS Let's Encrypt para os usuários finais.

1.  **Remoção da Exposição Bruta:** Na stack `.agent` ou `docker-compose.yml` que despachamos para o parceiro, removemos aquele port-binding público direto no contêiner MinIO (Ex: `9000:9000` via host mapping).
2.  **Injeção do Caddy Server:** Subir na mesma stack partner o contêiner Proxy Reverso `caddy:alpine`.
3.  **Abertura de Portas 80/443:** É requisito operacional aos provedores autorizarem e forfetarem NAT nas portas Web padrão (80/TCP e 443/TCP) para esta máquina Docker local.
4.  **Automação Caddy HTTP-01:** Disponibilizar no kit Docker deles um `Caddyfile` genérico injetável via Variável de Ambiente (`${ISP_SUBDOMAIN}`). Ao rodar o `docker compose up`, o Caddy escutará requisições para aquele sub-domínio próprio e disparará o desafio HTTPS Let's Encrypt (usando a porta 80). Alcançando sucesso, operará criptografia SSL fechada de ponta-a-ponta na porta 443 redirecionando internamente (via network privada DockerBridge) para a porta 9000 do MinIO cru.

### FASE 4: Migração (Go-Live na Tabela Global)
O último gatilho arquitetural, quando todo o BackEnd estiver conversando com nosso NS1/NS2 isoladamente com êxito.

1.  **Validação Final:** Disparo intensivo via `dig @[ip_ns1_temporario]` garantindo que as tabelas de e-mails, SPF, e da hospedagem app/API não corromperam.
2.  **Virada no Registro.br:** O Gestor da marca e do CPF dono do domínio entra no painel, aba "DNS", e executa a troca de apontamentos: deletando tudo e colocando exclusividade dos *Name Servers* para apontar a `ns1.disputatio.com.br` e `ns2.disputatio.com.br` (com provisão de *Glue Records*, se o Registro.br exigir nos Name Servers Child).
3.  **Acompanhamento da Propagação Global:** Aguardar o espalhamento para as tabelas mundiais (Tempo Variável / em 900s de TTL).

---
*Este documento é um anexo vivo, devendo ser atualizado na pasta `docs/` à medida em que as Fases avançam.*
