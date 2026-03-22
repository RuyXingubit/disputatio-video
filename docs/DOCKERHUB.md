# Disputatio Video Gateway

Serviço oficial de armazenamento e roteamento de vídeos da plataforma [Disputatio](https://disputatio.com.br). 

Este repositório contém a imagem Docker do **Video Gateway**, responsável por orquestrar o upload, armazenamento em provedores de internet (ISPs) regionais parceiros e resolução inteligente de CDN via round-robin.

## Principais Funcionalidades

- **Roteamento Inteligente:** Determina o melhor ISP regional (baseado em saúde, espaço em disco e peso/weight) para receber uploads novos.
- **CDN Distribuída:** Proxy de resolução para assistir debates em provedores regionais de internet (diminuindo latência para usuários finais).
- **Fallback Automático (Storage Padrão):** Caso nenhum ISP parceiro esteja disponível ou ativo, o sistema efetua o fallback gravando os vídeos no MinIO primário mantido pela própria plataforma.
- **Sistema de Saúde (Heartbeat):** Varreduras contínuas nos ISPs (`healthy`, `degraded`, `unknown`).

## Como rodar em Produção

O uso recomendado é via `docker-compose.prod.yml`, emparelhado com Caddy, PostgreSQL e MinIO.

### Baixando a stack de deploy

Para iniciar o seu Gateway na sua instáncia rapidamente sem precisar clonar o projeto inteiro, baixe os arquivos diretamente via terminal:

```bash
mkdir disputatio-video && cd disputatio-video

wget https://raw.githubusercontent.com/RuyXingubit/disputatio-video/main/docker-compose.prod.yml
wget https://raw.githubusercontent.com/RuyXingubit/disputatio-video/main/.env.example
wget https://raw.githubusercontent.com/RuyXingubit/disputatio-video/main/Caddyfile
```

Em seguida copie o `.env.example` para `.env` e ajuste as variáveis.

### Resumo do docker-compose.prod.yml

O arquivo que você baixará contém os seguintes serviços acoplados:
version: '3.8'

services:
  nextjs:
    image: seu_user/disputatio-video:latest
    container_name: disputatio-isp-nextjs
    restart: always
    env_file: .env
    environment:
      NODE_ENV: production
    networks:
      - disputatio_web
    depends_on:
      - postgres
      - minio
```

> ⚠️ Requer preenchimento do arquivo `.env` com conexões ao banco Postgres e chave JWT e variáveis do MinIO.

## Variáveis de Ambiente Necessárias

| Variável | Descrição | Exemplo |
|----------|-------------|---------|
| `DATABASE_URL` | String de conexão com banco unificado do Gateway | `postgresql://user:pass@postgres:5432/db` |
| `MINIO_ROOT_USER` | Usuário de fallback do storage MinIO interno | `admin` |
| `MINIO_ROOT_PASSWORD` | Senha de fallback do storage MinIO interno | `StrongPass123` |
| Outras do Next.js | Conforme o `.env.example` padrão | |

## Licença e Contribuições

Este módulo é parte do ecossistema central do debate [Disputatio](https://disputatio.com.br). O acesso comercial ao painel ISP é restrito à administração da plataforma e parceiros credenciados.
