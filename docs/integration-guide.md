# Guia de Integração — Disputatio ↔ Gateway ISP

> Este documento explica como conectar o [Disputatio](https://github.com/RuyXingubit/disputatio) 
> principal ao [Gateway ISP](https://github.com/RuyXingubit/disputatio-video) para que vídeos 
> sejam armazenados e servidos pela rede descentralizada de ISPs.

---

## Resumo da mudança

Atualmente o Disputatio faz upload direto no MinIO local. Com a integração, o fluxo muda para:

```
ANTES:
  Browser → presigned URL (MinIO local) → salva publicUrl apontando pro MinIO local

DEPOIS:
  Browser → presigned URL (MinIO do ISP) → salva resolveUrl apontando pro gateway
  O gateway redireciona (302) pro ISP que tem o vídeo
```

**O que muda:** 2 arquivos no projeto Disputatio.
**O que NÃO muda:** componentes de UI, player, modais, banco de dados.

---

## Arquivos a alterar

### 1. `src/lib/s3.ts` — Trocar MinIO local pelo Gateway

```diff
- import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
- import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
- import { v4 as uuidv4 } from "uuid"
-
- const s3Client = new S3Client({
-     region: process.env.AWS_REGION || "us-east-1",
-     endpoint: process.env.S3_ENDPOINT || "http://localhost:9000",
-     forcePathStyle: true,
-     credentials: {
-         accessKeyId: process.env.AWS_ACCESS_KEY_ID || "disputatio_admin",
-         secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "disputatio_s3_secret",
-     },
- })
-
- export async function getUploadUrl(contentType: string = "video/webm") {
-     const fileExtension = contentType === "video/webm" ? "webm" : "mp4"
-     const fileKey = `debates/${uuidv4()}.${fileExtension}`
-     const command = new PutObjectCommand({
-         Bucket: process.env.S3_BUCKET_NAME || "disputatio-videos",
-         Key: fileKey,
-         ContentType: contentType,
-     })
-     const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 900 })
-     return {
-         uploadUrl,
-         fileKey,
-         publicUrl: `${process.env.S3_ENDPOINT}/${process.env.S3_BUCKET_NAME}/${fileKey}`
-     }
- }
+ const GATEWAY_URL = process.env.GATEWAY_URL || "https://video.disputatio.com.br"
+
+ export async function getUploadUrl(contentType: string = "video/webm") {
+     const res = await fetch(`${GATEWAY_URL}/api/gateway/upload-intent`, {
+         method: "POST",
+         headers: { "Content-Type": "application/json" },
+         body: JSON.stringify({ contentType }),
+     })
+
+     if (!res.ok) {
+         throw new Error(`Gateway error: ${res.status}`)
+     }
+
+     const data = await res.json()
+     // data = { uploadUrl, fileKey, resolveUrl, isp: { id, name, region } }
+
+     return {
+         uploadUrl: data.uploadUrl,
+         fileKey: data.fileKey,
+         // publicUrl agora aponta pro gateway/resolve, que faz 302 pro ISP
+         publicUrl: `${GATEWAY_URL}${data.resolveUrl}`,
+     }
+ }
```

### 2. `.env` — Adicionar variável do gateway

```env
# Gateway ISP — rede descentralizada de vídeos
GATEWAY_URL="https://video.disputatio.com.br"
```

**Isso é tudo.** Nada mais precisa mudar.

---

## Por que funciona sem alterar mais nada

| Componente | Comportamento atual | Com o gateway |
|---|---|---|
| `NewDebateModal.tsx` | Chama `getUploadUrlAction()` → `PUT` no `uploadUrl` → salva `publicUrl` como `videoUrl` | **Idêntico** — `publicUrl` agora é `gateway/resolve/:fileKey` |
| `NewAparteModal.tsx` | Mesmo fluxo | **Idêntico** |
| `InteractivePlayer.tsx` | Usa `videoUrl` como `src` do `<video>` | O browser faz GET → gateway retorna 302 → player carrega do MinIO ISP |
| `debate.ts` / `argument.ts` | Salva `videoUrl` no banco Prisma | **Idêntico** — `videoUrl` agora é uma URL de resolve |

O player funciona porque o `<video src="...">` segue redirects HTTP 302 nativamente.

---

## Fluxo técnico detalhado

```
1. Usuário grava vídeo no browser
2. Browser → getUploadUrlAction() (server action)
3. Server → POST gateway/upload-intent { contentType: "video/webm" }
4. Gateway:
   a. Seleciona ISP healthy com mais espaço livre
   b. Gera presigned URL do MinIO desse ISP
   c. Cria VideoLocation (fileKey → ISP)
   d. Retorna { uploadUrl, fileKey, resolveUrl }
5. Server → retorna uploadUrl ao browser
6. Browser → PUT uploadUrl [payload do vídeo]
   (vídeo vai DIRETO pro ISP, sem passar pelo gateway)
7. Browser → salva videoUrl = "https://video.disputatio.com.br/api/gateway/resolve/{fileKey}"

--- Playback ---

8. Player → GET https://video.disputatio.com.br/api/gateway/resolve/{fileKey}
9. Gateway:
   a. Busca ISPs que possuem o vídeo
   b. Filtra por healthStatus = 'healthy'
   c. Round-robin ponderado por weight
   d. HTTP 302 → http://{isp-ip}:9000/disputatio-videos/{fileKey}
10. Browser → stream direto do ISP
```

---

## API do Gateway — Referência rápida

| Endpoint | Método | Descrição |
|---|---|---|
| `/api/gateway/upload-intent` | POST | `{ contentType }` → `{ uploadUrl, fileKey, resolveUrl }` |
| `/api/gateway/resolve/:videoId` | GET | HTTP 302 redirect ao MinIO do ISP |
| `/api/gateway/heartbeat` | POST | `{ ispToken, diskUsedGb, ... }` → node-agent envia métricas |
| `/api/gateway/health` | GET | Status geral: ISPs por saúde, disco, vídeos |
| `/api/gateway/init` | GET | Inicializa health checker passivo |

---

## Fallback: se não houver ISP disponível

Se todos os ISPs estiverem offline:

- **Upload:** `upload-intent` retorna `503` → `getUploadUrl` lança erro → UI mostra "Storage indisponível"
- **Playback:** `resolve` retorna `503` com `retry_after: 30` → player pode mostrar mensagem de indisponibilidade

> **Dica:** para uma transição suave, mantenha o MinIO local como fallback. Se o gateway retornar 503, 
> o `s3.ts` pode fazer fallback para o MinIO local automaticamente.

---

## Dependências adicionadas ao Disputatio

**Nenhuma.** A integração usa apenas `fetch()` nativo. As dependências `@aws-sdk/client-s3` e 
`@aws-sdk/s3-request-presigner` que existiam em `s3.ts` podem ser **removidas** do `package.json` 
do Disputatio (elas agora estão no gateway).
