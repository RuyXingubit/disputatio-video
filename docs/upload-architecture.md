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

## Opção 2: SSL/TLS Distribuído com DNS Autoritativo Próprio (PowerDNS) e Fallback (O Futuro Escalável)

Esta é a arquitetura definitiva e autônoma, projetada para livrar a Máquina Mestra (Gateway) da sobrecarga de banda (I/O) sem depender de APIs de terceiros (como Cloudflare). Ela permite que os arquivos transitem diretamente entre o cliente (Navegador/App) e a borda (ISP Partner) usando HTTPS válido, mantendo total governança sobre a infraestrutura de DNS.

### 1. A Estratégia do Domínio (Servidor DNS Autoritativo Próprio)
Para contornar as limitações do Registro.br (que não suporta registros Wildcard `*` nativamente, nem possui API amigável para gestão dinâmica), assumiremos a **autoridade total DNS**:
*   **No Registro.br:** Alteraremos a delegação (apontamento NS) de `disputatio.com.br` para apontar diretamente para os nossos dois servidores DNS próprios (ex: `ns1.disputatio.com.br` e `ns2.disputatio.com.br`).
*   **Na Nossa Infraestrutura (PowerDNS):** Subiremos instâncias de um servidor DNS robusto e autoritativo, como o **PowerDNS**. Ele passará a ser a autoridade global para todas as zonas do nosso domínio (Site principal, E-mails, e os nós ISPs).

### 2. Roteamento Dinâmico (API e Automação no PowerDNS)
O uso de um DNS próprio nos dá flexibilidade técnica de nível Enterprise para automatizar a rede de entrega:
*   **Gestão via API:** Quando um novo ISP for cadastrado ou tiver seu IP alterado no painel Admin, o nosso backend Node.js fará uma requisição REST diretamente para a API do PowerDNS (em background) para provisionar e atualizar os registros `A` ou `AAAA`.
*   **Poder de Resposta:** O PowerDNS suporta backends em banco de dados e até uso prático de LUA/Regex internamente. Assim, podemos designar apontamentos legíveis (Ex: `isp-nome-cidade.disputatio.com.br -> 200.150.50.10`) ou habilitar regras mais automatizadas.
*   **Exemplo Prático:** O Gateway gera e envia ao front-end a URL `https://isp-nome-cidade.disputatio.com.br/video.mp4`. Como o PowerDNS detém a entrada atualizada, ele resolve o IP instantaneamente para o roteador do parceiro local.

### 3. A Geração de SSL na Ponta (ISP)
A responsabilidade por responder em HTTPS passa a ser da infraestrutura do provedor:
1.  A stack Docker Compose distribuída ao parceiro ganha um proxy reverso **Caddy** atuando como front-end do MinIO.
2.  É fundamental que o parceiro garanta que as **Portas TCP 80 e 443 estejam expostas publicamente** em seu roteador (Sem bloqueios corporativos ou restrições severas de CGNAT).
3.  Quando a máquina de ISP liga e inicializa o contêiner, o Caddy identifica o seu subdomínio DNS mapeado (ex: `isp-nome-cidade.disputatio.com.br`) e inicia um desafio `HTTP-01` automático com a autoridade global **Let's Encrypt**.
4.  Sendo o desafio completado via porta 80, o certificado SSL é estabelecido (e auto-renovado continuamente), permitindo a conexão segura de ponta a ponta sem o uso de "Man-in-the-Middle".

### 4. A Tolerância a Falhas: O Sistema de "Fallback"
Devido à diversidade de topologias dos nossos provedores, precisaremos assumir que muitos falharão em abrir as portas 80/443 corretamente, frustrando o Let's Encrypt e inviabilizando o HTTPS na ponta. 
Para garantir que a plataforma Disputatio nunca pare de receber e enviar vídeos, um plano de contigência degradativo entra em ação automatizada por parte do serviço Gateway:

*   **Health Check Criptográfico:** O serviço Node.js (Gateway) realiza verificações contínuas nas URLs HTTPS de todos os IPs de provedores registrados para atestar a solidez do certificado SSL deles.
*   **ISP Nível Tier 1 (Conexão Direta Habilitada):** Se o SSL estiver validado: O Gateway devolve as URLs do *Magic DNS* ao Front-End. O ISP assume 100% da carga de transferência de vídeo, aliviando nossa rede hospedada em Cloud (Cenário Ideal).
*   **ISP Nível Tier 2 (Relay Intermediário - Opção 1):** Se o SSL do ISP for inválido ou causar "Time-out": O modelo degraus da rede falha com controle. O Gateway marca esse ISP temporariamente na base de dados como "sem-SSL". Nesse caso, o Gateway retoma a postura clássica Server-To-Server. O tráfego do cliente é coberto pelo SSL da nossa VPS Mestra (Gateway), re-mascarando toda a entrega pela rede principal. Isso assegura 100% de disponibilidade até que o parceiro ajuste e resolva os problemas técnicos do firewall dele.
