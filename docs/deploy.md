# Deploy — Disputatio ISP (`video.disputatio.com.br`)

Stack de produção: **Next.js 16** + **Caddy** (SSL automático) + **PostgreSQL 16**, tudo em Docker.

---

## Pré-requisitos na VM

| Requisito | Verificar |
|---|---|
| Docker 24+ | `docker --version` |
| Docker Compose v2 | `docker compose version` |
| Porta 80 e 443 abertas no firewall | `ufw allow 80 && ufw allow 443` |
| DNS apontado para o IP da VM | `ping video.disputatio.com.br` |

---

## Primeira vez (deploy inicial)

### 1. Clonar o repositório
```bash
git clone https://github.com/RuyXingubit/disputatio-video.git
cd disputatio-video
```

### 2. Criar o `.env` de produção
```bash
cp .env.example .env
nano .env
```

> ⚠️ No `.env` de produção, o `DATABASE_URL` deve apontar para o container interno `postgres`, não para o IP externo:
> ```env
> DATABASE_URL="postgresql://disputatio_admin:SENHA@postgres:5432/disputatio_isp_db?schema=public"
> ```

Exemplo de `.env` completo para produção:
```env
DATABASE_URL="postgresql://disputatio_admin:Dsp%217v%23mX2%40qR9nL@postgres:5432/disputatio_isp_db?schema=public"

ADMIN_SECRET="senha-super-forte-aqui"
ADMIN_EMAIL="ruy@proserv.net.br"

SMTP_HOST="smtp.seuprovedor.com"
SMTP_PORT="587"
SMTP_USER="usuario@dominio.com"
SMTP_PASS="senha-smtp"
```

### 3. Rodar as migrations
```bash
docker compose -f docker-compose.prod.yml run --rm nextjs \
  npx prisma migrate deploy
```

### 4. Subir a stack
```bash
docker compose -f docker-compose.prod.yml up -d --build
```

O Caddy busca o certificado Let's Encrypt automaticamente na **primeira requisição HTTP**. Aguarde ~30 segundos após o primeiro acesso para o HTTPS ativar.

### 5. Verificar
```bash
# Ver status dos containers
docker compose -f docker-compose.prod.yml ps

# Ver logs em tempo real
docker compose -f docker-compose.prod.yml logs -f
```

---

## Atualizar para uma nova versão

```bash
# Puxar as mudanças
git pull

# Rebuildar e reiniciar (sem downtime do banco)
docker compose -f docker-compose.prod.yml up -d --build nextjs

# Se houver novas migrations:
docker compose -f docker-compose.prod.yml run --rm nextjs \
  npx prisma migrate deploy
```

---

## Arquitetura dos containers

```
Internet
   │
   ▼
[Caddy :80/:443]  ← SSL Let's Encrypt automático
   │
   ▼ (rede interna Docker)
[Next.js :3000]  ← app disputatio-isp
   │
   ▼
[PostgreSQL :5432]  ← sem porta exposta externamente
```

---

## Gerenciamento

### Painel admin
Acesse `https://video.disputatio.com.br/admin` com a senha do `ADMIN_SECRET`.

### Logs
```bash
# Todos os serviços
docker compose -f docker-compose.prod.yml logs -f

# Só o Next.js
docker compose -f docker-compose.prod.yml logs -f nextjs

# Só o Caddy (SSL, requests)
docker compose -f docker-compose.prod.yml logs -f caddy
```

### Backup do banco
```bash
docker exec disputatio-video-postgres \
  pg_dump -U disputatio_admin disputatio_isp_db > backup_$(date +%Y%m%d).sql
```

### Restaurar backup
```bash
docker exec -i disputatio-video-postgres \
  psql -U disputatio_admin disputatio_isp_db < backup_YYYYMMDD.sql
```

### Parar tudo
```bash
docker compose -f docker-compose.prod.yml down
```

### Parar e remover volumes (⚠️ apaga os dados)
```bash
docker compose -f docker-compose.prod.yml down -v
```

---

## Troubleshooting

### SSL não ativou
- Verificar se as portas 80 e 443 estão abertas no firewall
- Verificar se o DNS está apontado corretamente: `dig video.disputatio.com.br`
- Ver logs do Caddy: `docker compose -f docker-compose.prod.yml logs caddy`

### Erro de conexão com banco
- Verificar que o `DATABASE_URL` no `.env` usa `postgres` como host (não IP)
- Verificar se o container postgres está saudável: `docker compose -f docker-compose.prod.yml ps`

### Rebuild forçado
```bash
docker compose -f docker-compose.prod.yml build --no-cache nextjs
docker compose -f docker-compose.prod.yml up -d nextjs
```
