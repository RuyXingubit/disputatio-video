# Disputatio ISP — Status do Projeto

> Última atualização: 21/02/2026

---

## O que é

**Disputatio ISP** é um portal para que provedores de internet (ISPs) brasileiros se tornem parceiros de armazenamento da plataforma de vídeo [Disputatio](https://disputatio.com.br). O ISP oferece infraestrutura ociosa (disco + banda); a plataforma usa essa infraestrutura de forma descentralizada para hospedar vídeos.

**Domínio de produção:** `video.disputatio.com.br`
**Repositório:** `github.com/RuyXingubit/disputatio-video`
**Stack:** Next.js 16 · Tailwind v4 · Prisma v7 · PostgreSQL 16 · Caddy (SSL)

---

## ✅ Implementado

### Portal ISP (`disputatio-video`)

| Componente | Detalhe |
|---|---|
| **Landing page** | Hero, Como Funciona, Benefícios, Mapa de nós, FAQ, Formulário, Footer |
| **Formulário de cadastro** | Validação client-side, estados de loading/sucesso/erro, salva no banco com `isActive=false` |
| **E-mail ao admin** | Notificação imediata em novo cadastro com tabela de dados + link para `/admin` |
| **Painel admin `/admin`** | Login por senha (cookie httpOnly), tabs Pendentes/Ativos, cards com dados completos |
| **Aprovar ISP** | Ativa `isActive=true` + envia e-mail ao técnico com link do `docker-compose` personalizado |
| **Rejeitar ISP** | Remove do banco + envia e-mail amigável ao técnico |
| **API `/api/isp/[token]/compose`** | Gera e serve `docker-compose.yml` único por ISP (MinIO + node-agent configurados) |
| **API `/api/public/isps-map`** | Lista ISPs ativos com coordenadas para o mapa SVG |
| **Schema Prisma** | Modelo `Isp` com credenciais MinIO, token único, status de saúde, coordenadas |
| **Migration** | `20260221_init` aplicada no banco de produção (`143.208.136.56:5434`) |

### Infraestrutura

| Arquivo | Propósito |
|---|---|
| `Dockerfile` | Multi-stage Node 22 Alpine, output standalone |
| `Caddyfile` | Reverse proxy `video.disputatio.com.br → nextjs:3000`, SSL automático |
| `docker-compose.prod.yml` | Stack completa: Caddy + Next.js + Postgres |
| `docker-compose.postgres-disputatio-video.yml` | Postgres isolado para VM dedicada (porta 5434) |
| `docs/deploy.md` | Guia passo a passo de deploy, update, backup e troubleshooting |

---

## 🔴 Próximos passos — Gateway (prioridade máxima)

O gateway é o coração do sistema. Sem ele, ISPs aprovados ficam com o MinIO de pé mas nenhum vídeo é enviado para lá.

### Projeto: `disputatio-gateway`

Serviço Node.js/Go que coordena toda a rede:

#### Endpoints a implementar

| Endpoint | Descrição |
|---|---|
| `POST /upload-intent` | Recebe metadados de um vídeo publicado; escolhe ISPs para upload com base em peso, saúde e espaço disponível; retorna URLs presigned |
| `GET /resolve/:videoId` | Resolve qual ISP tem o vídeo; redireciona o player para o nó mais próximo/saudável |
| `POST /report` | Recebe heartbeat do `node-agent` a cada 30s (disco usado, banda, saúde) |
| `GET /health` | Status geral do gateway e dos nós |

#### Lógica interna

- **Seleção de ISPs** para upload: peso + espaço livre + latência
- **Health check** passivo: se `last_report` > 2min → marcar como `degraded`; > 5min → `offline`
- **Failover**: redirecionar resolve para ISP secundário quando primário está offline
- **Worker de replicação**: copiar vídeos com > N views para múltiplos ISPs

### `node-agent` (container no docker-compose de cada ISP)

Agente leve já referenciado no `docker-compose.yml` gerado, mas o serviço real ainda não existe:

- A cada 30s: `POST /report` no gateway com métricas de disco e banda
- Coordena pull/push de objetos MinIO para replicação

---

## 🟡 Integração com o Disputatio principal

Quando o gateway estiver pronto:

- **Upload:** ao publicar vídeo, chamar `POST gateway/upload-intent` e fazer upload direto no MinIO dos ISPs selecionados
- **Playback:** player chamar `GET gateway/resolve/:videoId` para obter URL de streaming
- **Banner:** adicionar link "Seja parceiro ISP" no app principal apontando para `video.disputatio.com.br`

---

## 🟢 Melhorias futuras (baixa prioridade)

- Dashboard de métricas para o admin (banda por ISP, top vídeos, mapa de calor de tráfego)
- Configuração de threshold de replicação via UI
- Histórico de eventos por ISP (aprovação, primeiro heartbeat, incidentes)
- Autenticação mais robusta no `/admin` (TOTP / OAuth)
