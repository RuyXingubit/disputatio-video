# FASE 3: Edge Network (A Ponta / Proxy ISP Partner)

Para que o Front-end consiga enviar fluxos binários de vídeo via protocolo HTTPS (evitando o erro `Mixed Content` do navegador) diretamente para a rede de um parceiro ISP, precisaremos instalar um Proxy Reverso configurado automaticamente nas máquinas da borda.

O objetivo principal desta fase é **entregar um subdomínio válido (`[isp-slug].disputatio.com.br`)** da nossa zona Master DNS, de forma que o servidor local no ISP intercepte o tráfego HTTP/HTTPS e obtenha sozinho, via script, um certificado assinado e renovado.

---

## 1. O Contêiner Caddy Proxy
Selecionamos o [Caddy Web Server](https://caddyserver.com/) pela sua simplicidade nativa, pois o desafio ACME (Automated Certificate Management Environment) já é executado por padrão no binário e dispensa Cron Jobs de renovação do `certbot`.

### Pré-requisitos do Parceiro ISP (Roteamento e Rede)
O dono da rede precisará garantir infraestrutura local aberta:
1.  **IP Público Fixo:** O mesmo reportado e cadastrado no Gateway via Painel Admin OBRIGATORIAMENTE deve ser um IP Alcançável pelo planeta terra. NAT Carrier-Grade (CGNAT) impossibilita entrega direta.
2.  **Encaminhamento (Port Forwarding):** O roteador de borda ou ONU do parceiro deve mapear as requisições puras `0.0.0.0:80` e `0.0.0.0:443` direto para o IP local (LAN) do servidor (host Debian/Ubuntu) que está rodando a stack Docker.
3.  **Configuração de DNS (Gateway Interno):** Na nossa central, o Node.js já atrelou aquele "IP Público" ao subdomínio dinâmico gerado no PowerDNS da FASE 2.

---

## 2. Orquestração Local (`docker-compose.yml`)
Nosso arquivo Compose será modificado no pacote de distribuição (`disputatio-isp-node`).

```yaml
version: '3.8'

services:
  # PROXY REVERSO E NEGOCIADOR ACME (NOVO)
  caddy:
    image: caddy:2.7-alpine
    restart: unless-stopped
    ports:
      - "80:80"        # Requisito para validação HTTP-01 Let's Encrypt
      - "443:443"      # Tráfego criptografado final 
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile  # Configuração
      - caddy_data:/data                  # Certificados e Chaves (Armazenamento Ativo)
      - caddy_config:/config
    environment:
      - ISP_SUBDOMAIN=${ISP_SUBDOMAIN}    # Variável injetada pelo .env
    depends_on:
      - minio
    networks:
      - disputatio_edge

  # STORAGE ENGINE (MODIFICADO)
  minio:
    image: minio/minio:latest
    restart: unless-stopped
    # PORTS REMOVIDO! Acesso 9000 e 9001 restrito à rede interna do docker "disputatio_edge"
    volumes:
      - data-volume:/data
    environment:
      MINIO_ROOT_USER: ${MINIO_ROOT_USER}
      MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD}
      MINIO_SERVER_URL: "https://${ISP_SUBDOMAIN}"
    command: server /data --console-address ":9001"
    networks:
      - disputatio_edge

volumes:
  data-volume:
  caddy_data:
  caddy_config:

networks:
  disputatio_edge:
    driver: bridge
```

---

## 3. Arquivo Caddyfile (A Mágica)
Na mesma pasta de distribuição do nó ISP, será colocado este arquivo estático mínimo.

```caddy
# Referência Automática: Substituído no build pelo ISP_SUBDOMAIN
{$ISP_SUBDOMAIN} {
    # 1. Reverse Proxy pro tráfego de API Binária do Minio
    reverse_proxy minio:9000 {
        header_up Host {host}
        header_up X-Real-IP {remote}
        header_up X-Forwarded-Port {server_port}
        header_up X-Forwarded-Proto {scheme}
    }
}

# (Opcional Futuro): Habilitar Painel Console no subdomínio de Admin Ex: admin-isp.disputatio.com.br
# admin-{$ISP_SUBDOMAIN} {
#    reverse_proxy minio:9001
# }
```

### O Desafio HTTP-01 (Fluxo Exato)
1.  Ao iniciar, o Caddy lê `{$ISP_SUBDOMAIN}` (ex: `isp-xpto-fiber.disputatio.com.br`).
2.  Caddy contata os servidores do Let's Encrypt: *"Preciso do certificado X. Eu proverei o Token de Validação na URL `/well-known/acme-challenge/...`"*.
3.  Let's Encrypt no mundo externo pergunta ao registro raiz `.com.br` quem é o Gerente (Nosso NS1 e NS2 Master de DNS da Disputatio).
4.  O NS1/NS2 responde em microssegundos: Aquele domínio (Sub-zona) aponta pro IP público dele.
5.  O Let's Encrypt bate na porta 80 do IP público do provedor, requisitando a url daquele Token.
6.  O Caddy (na porta 80 do provedor) atende, valida, o ticket é resolvido. O Provedor adquire criptografia forte e as transmissões de vídeo S2C (Sistema <-> Cliente) passam a rodar via SSL, sem onerar as placas de rede do Master Next.js.
