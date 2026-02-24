# Deploy — Disputatio ISP (`video.disputatio.com.br`)

Stack de produção: **Next.js 16** + **Caddy** (SSL automático) + **PostgreSQL 16** + **MinIO** (Armazenamento de Vídeos), tudo em Docker.

---

## Pré-requisitos na VM

| Requisito | Verificar |
|---|---|
| Docker 24+ | `docker --version` |
| Docker Compose v2 | `docker compose version` |
| Porta 80 e 443 abertas no firewall | `ufw allow 80 && ufw allow 443` |
| Porta 9000 aberta no firewall | `ufw allow 9000` (Para API/Downloads do MinIO) |
| DNS apontado para o IP da VM | `ping video.disputatio.com.br` |

---

## Primeira vez (deploy inicial)

### 1. Baixar os arquivos necessários
Crie uma pasta para o projeto e baixe os arquivos de configuração:
```bash
mkdir disputatio-video && cd disputatio-video
wget https://raw.githubusercontent.com/RuyXingubit/disputatio-video/main/docker-compose.prod.yml
wget https://raw.githubusercontent.com/RuyXingubit/disputatio-video/main/.env.example
wget https://raw.githubusercontent.com/RuyXingubit/disputatio-video/main/Caddyfile
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
# Banco de Dados
POSTGRES_USER="disputatio_admin"
POSTGRES_PASSWORD="SuaSenhaForteAqui"
POSTGRES_DB="disputatio_isp_db"
DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}?schema=public"

# MinIO (Armazenamento Local default)
MINIO_ROOT_USER="admin"
MINIO_ROOT_PASSWORD="SuaSenhaForteMinio"

# Aplicação
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
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
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
# Baixar arquivos de configuração atualizados (se houver mudanças no github)
wget -qO docker-compose.prod.yml https://raw.githubusercontent.com/RuyXingubit/disputatio-video/main/docker-compose.prod.yml
wget -qO Caddyfile https://raw.githubusercontent.com/RuyXingubit/disputatio-video/main/Caddyfile

# Baixar a nova imagem do Docker Hub
docker compose -f docker-compose.prod.yml pull nextjs

# Reimplantar os containers (sem downtime do banco)
docker compose -f docker-compose.prod.yml up -d

# Se houver novas migrations:
docker compose -f docker-compose.prod.yml run --rm nextjs \
  npx prisma migrate deploy
```

---

## Arquitetura dos containers

```
Internet
   │
   ├─► [MinIO :9000] ← API/Downloads diretos via Presigned URL
   │
   ▼
[Caddy :80/:443]  ← SSL Let's Encrypt automático
   │
   ▼ (rede interna Docker)
[Next.js :3000]  ← app disputatio-isp
   │
   ├─► [PostgreSQL :5432] ← Banco de dados interno
   │
   └─► [MinIO :9000]      ← Comunicação interna Next.js <> MinIO
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
docker exec disputatio-isp-postgres \
  pg_dump -U disputatio_admin disputatio_isp_db > backup_$(date +%Y%m%d).sql
```

### Restaurar backup
```bash
docker exec -i disputatio-isp-postgres \
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

### Atualizar a imagem forçadamente
```bash
docker compose -f docker-compose.prod.yml pull nextjs
docker compose -f docker-compose.prod.yml up -d nextjs
```
