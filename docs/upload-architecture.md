# Arquitetura de Roteamento de Vídeo (Upload/CDN)

Este documento exibe a fundação arquitetural que lida com uploads de vídeos originados do aplicativo principal (`disputatio-app`) sendo distribuídos para servidores satélites (ISPs regionais).

## Histórico do Problema (Mixed Content Security)
Durante a fase MVP (Opção 0), os nós ISPs não configuravam SSL e respondiam livremente na porta HTTP (:9000).
A API do Gateway fornecia um URL `http://<IP-ISP>:9000` pre-assinado direto para o frontend.
O navegador das máquinas clientes, contudo, atuam sob o rígido Padrão de Segurança Misto (Mixed Content Protocol), que bloqueia hard-stops qualquer tráfego HTTP originado de uma navegação principal fechada por HTTPS.
Resultado: O navegador bloqueava todos os acessos diretos.

## Opção 1: Relay Intermediário L7 Server-To-Server (Solução Atual)

Decidimos colocar a segurança no roteador L7 principal (Next.js).

**O Fluxo:**
1. O FrontEnd acessa a API e pede para subir um vídeo.
2. O Gateway escolhe o ISP, mas entrega ao FrontEnd o link seguro de _si mesmo_ (`https://video.disputatio.com.br/api/gateway/relay/VIDEO_ID`).
3. O Navegador, estando confortável em canal seguro, envia os Bytes do vídeo via PUT Request.
4. O servidor Next.js recebe o _Stream_ binário e faz um _Push/Forward_ invisível (S2S: Server to Server Fetch) para o MinIO cru (`http://<IP-ISP>:9000`) do parceiro.

**Benefícios:**
* Soluciona perfeitamente o problema do HTTPS Mixed Content e bloqueio CORS para o cliente.
* O cliente jamais enxerga o endereço interno e metadados reais de onde o vídeo caiu, garantindo alta segurança de Topologia de Rede.

**Sintomas de Débito Técnico:**
* A VPS Master (onde fica Gateway) atuará como mestre banda-larga e gargalo. Para cada vídeo de 100MB enviado para um ISP (Nó B), 100MB passam pelas interfaces de rede da máquina Mestra (Nó A).
* Isso consome a Banda Outbound e Memória RAM do processamento NodeJS da máquina Mestra em períodos intensos de *Throughput*. 

---

## Opção 2: SSL/TLS Wildcard Distribuído Caddy (O Futuro Escalável)

A proposta mais avançada exige orquestração SSL, mas livrará a Máquina Mestra (Gateway) totalmente da sobrecarga de banda supracitada. Permite que o upload transite de Client -> Edge (ISP Partner) diretamente.

**O Fluxo Alvo:**
1. O domínio principal `.disputatio.com.br` tem seu DNS na Cloudflare.
2. É criado um registro Wildcard A Record (`*.isp.disputatio.com.br`) apontado não mais para Caddy, mas usando DNS Proxy Inteligente.
3. Para cada novo Provedor cadastrado, geramos dinamicamente (via SDK do Cloudflare) um sub-registro `parceironet.isp.disputatio.com.br` -> `IP-do-Parceiro`.
4. O contêiner de Gateway devolve uma URL `https://parceironet.isp.disputatio...` pre-assinada para o painel Front-End.
5. O cliente baixa em alta banda livre direto do parceiro.

**Requisições do Provedor:**
Ao habilitar isso, precisaria injetar um Proxy (Nginx/Caddy) na stack Docker-Compose que já é fornecida à eles, rodando em port mappings :80 / :443 na máquina do provedor que cuida da conexão S3 (e que renova SSL autonomamente via Let's Encrypt / ZeroSSL ou via chave Origem Cloudflare).
