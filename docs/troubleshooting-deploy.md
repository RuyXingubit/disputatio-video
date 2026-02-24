# Troubleshooting e Arquitetura de Deploy (Post-Mortem)

Este documento centraliza as soluções para os principais desafios de infraestrutura enfrentados durante o desenvolvimento e deploy em produção do Disputatio Video Gateway. O conhecimento aqui visa blindar futuros microserviços contra erros similares de Docker, Prisma, MinIO e Next.js.

---

## 1. Next.js Standalone vs Prisma CLI
**O Problema**: No build `standalone` do Next.js, os binários C++ e WebAssembly da CLI do Prisma (`npx prisma migrate deploy`) não são copiados para a imagem final, resultando em erro `sh: prisma: not found`. Copiar a pasta `node_modules/.bin/prisma` diretamente falha devido à ausência das libs nativas do motor (`.wasm`).
**O Problema da v7**: Tentar rodar o Prisma 7 de dentro do Docker exigia transportar e registrar o `prisma.config.ts` no runner. E configurar `engineType = "binary"` quebra a tipagem TypeScript do `@prisma/adapter-pg`.

**Como Antecipar e Resolver**:
- **Downgrade Estratégico**: Em caso de conflito com o driver Edge/Pg, estabilize no Prisma v6 `npm i prisma@^6 @prisma/client@^6 @prisma/adapter-pg@^6`.
- **Instalação Direta no Dockerfile**: Jamais faça "cherry-pick" de binários. No estágio Runner (`builder` -> `runner`), rode `RUN npm install prisma@^6` para embutir nativamente o motor no container final (Alpine Linux).
- **Trate Tipagens**: Se usar `adapter-pg`, nunca force `engineType = "binary"` no `schema.prisma`. Deixe no padrão (`library`) para que a opção '{ adapter }' surja na criação do PrismaClient.

## 2. A Armadilha do `.dockerignore` nas Migrations
**O Problema**: Acusação de "No migration found in prisma/migrations" durante o deploy, mesmo o projeto tendo as pastas localmente.
**Como Antecipar e Resolver**:
- O arquivo `.dockerignore` estava configurado para ignorar pastas de desenvolvimento, arrastando o `prisma/migrations` junto.
- **Solução**: Certifique-se de manter sempre `!prisma/migrations` ou apenas **NÃO LISTÁ-LA** no `.dockerignore`. As migrações `.sql` são a única bússola que o banco em produção tem para desenhar as tabelas.

## 3. Automatizando Migrações via `start.sh` (Entrypoint)
**O Problema**: Rodar migrações manualmente via `docker exec` ou `run --rm` expõe a aplicação a esquecimentos de versão durante CI/CD.
**Como Antecipar e Resolver**:
- Implementar o padrão ouro de infra: um script interceptador no final do Dockerfile.
- Arquivo `start.sh`:
  ```bash
  #!/bin/sh
  set -e
  npx prisma migrate deploy
  exec node server.js
  ```
- **Dockerfile**: `COPY --chown=nextjs:nodejs start.sh ./` -> `RUN chmod +x ./start.sh` -> `CMD ["./start.sh"]`.  A aplicação vai migrar a Database sozinha toda vez que a instância ligar.

## 4. O Falso Positivo do PostgreSQL Healthcheck 
**O Problema**: O Docker marcava o banco sempre como "Unhealthy" e no log constava `FATAL: database "disputatio_admin" does not exist`. 
**Como Antecipar e Resolver**: 
- A ferramenta `pg_isready` foi desenhada para buscar um banco de dados **com o mesmo nome do usuário**, caso a flag do BD fosse omitida.
- Sempre declare o `-d` além do `-U`.
- **Errado**: `pg_isready -U ${POSTGRES_USER}`
- **Correto**: `pg_isready -d ${POSTGRES_DB} -U ${POSTGRES_USER}`

## 5. Bootstrap Dinâmico de Buckets S3 (MinIO Helper)
**O Problema**: O MinIO liga de "lona em branco", logo, no primeiro upload o sistema recebe "Bucket not found".
**Como Antecipar e Resolver**:
- Usar um container helper ephemeral no `docker-compose.yml`. Usamos a imagem `minio/mc` com instrução bash para acordar 5 segundos após o banco, criar o bucket via linha de comando (`mb myminio/disputatio-videos`) e injetar políticas de CORS automáticas (`anonymous set public`). Após isso, `exit 0`.

## 6. O Bug Silencioso de Upload: Mixed Content em Presigned URLs
**O Problema**: Ao subir um vídeo gravado no Frontend (`https://disputatio.com.br`), o terminal da rede do Chrome/Safari engolia o log com um "Failed to fetch" sem nenhum erro reportado no MinIO ou no Next.js.
**A Causa Real**: Mixed Content Protocol. Um website num contexto seguro (HTTPS) **não pode** despachar uma request silenciosa (um PUT body em File API) para um endereço inseguro (HTTP na porta 9000 do MinIO), o browser barra como proteção.

**Como Antecipar e Resolver**:
1. **Proxy Reverso com Caddy**: Não se expõe o Node de S3 crumente no navegador. Ensine o roteador SSL principal (Caddyfile) a empurrar rotas (`handle /disputatio-videos/*`) silenciosamente para a porta de container insegura (`reverse_proxy minio:9000`). Todas as rotas de porta `9000` se transformam em `443` mágicamente!
2. **Forçar Base URL Segura**: Na geração do *Pre-Signed URL* via backend AWS-SDK (`lib/s3`), sempre cheque em qual ambiente você está para injetar o Host Override:
   ```typescript
   let endpoint = "http://localhost:9000";
   // Se em prod ou tem cloudflare reverso SSL:
   if (process.env.NODE_ENV === "production" || headers.get("x-forwarded-proto") === "https") {
       endpoint = `https://meu-dominio-caddy.com.br` 
   }
   ```
   Dessa forma, o Caddy abraça a request HTTP, insere o carimbo do Let's Encrypt, acalma o browser host, e a passa limpinha pra porta de container Docker.
