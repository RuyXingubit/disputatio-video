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

### Portal ISP

| Componente | Detalhe |
|---|---|
| **Landing page** | Hero, Como Funciona, Benefícios, Mapa de nós, FAQ, Formulário, Footer |
| **Formulário de cadastro** | Validação client-side, salva no banco com `isActive=false` |
| **E-mail ao admin** | Notificação em novo cadastro com dados + link para `/admin` |
| **Painel admin `/admin`** | Login por senha, tabs Pendentes/Ativos, aprovar/rejeitar com e-mail |
| **API `/api/isp/[token]/compose`** | Gera `docker-compose.yml` único por ISP (MinIO + node-agent) |
| **API `/api/public/isps-map`** | Lista ISPs ativos com coordenadas para o mapa SVG |

### Gateway (coordenação da rede)

| Endpoint | Descrição |
|---|---|
| `POST /api/gateway/upload-intent` | Seleciona ISP por scoring (espaço/saúde/peso), gera presigned URL |
| `GET /api/gateway/resolve/:videoId` | Round-robin ponderado → HTTP 302 redirect ao MinIO |
| `POST /api/gateway/heartbeat` | Recebe métricas do node-agent, atualiza healthStatus |
| `GET /api/gateway/health` | Status geral: ISPs por saúde, disco, vídeos |
| `GET /api/gateway/init` | Inicializa health checker passivo (cron 60s) |

### Infraestrutura

| Componente | Detalhe |
|---|---|
| `Dockerfile` | Multi-stage Node 22 Alpine, output standalone |
| `Caddyfile` | SSL automático Let's Encrypt |
| `docker-compose.prod.yml` | Caddy + Next.js + Postgres |
| `node-agent/` | Container Alpine leve (heartbeat 30s) |
| `docs/deploy.md` | Guia de deploy, update, backup |

### Schema Prisma

- `Isp` — dados do provedor, tokens, MinIO, saúde, coordenadas
- `VideoLocation` — qual ISP tem qual vídeo (PK composta videoId+ispId)
- `ReplicationConfig` — configurações chave-valor de replicação

---

## 🟡 Próximos passos — Integração com Disputatio principal

O gateway está pronto. Falta conectar com o app principal:

- **Upload:** ao publicar vídeo, chamar `POST /api/gateway/upload-intent` → upload direto no MinIO
- **Playback:** player usar `GET /api/gateway/resolve/:videoId` → 302 redirect ao ISP
- **Banner:** link "Seja parceiro ISP" no app principal → `video.disputatio.com.br`

## 🟢 Melhorias futuras

- Worker de replicação de vídeos quentes para múltiplos ISPs
- Dashboard de métricas (banda por ISP, top vídeos)
- Configuração de threshold de replicação via UI
- Autenticação mais robusta no `/admin` (TOTP / OAuth)
