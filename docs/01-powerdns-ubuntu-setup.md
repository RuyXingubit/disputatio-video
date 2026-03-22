# Setup PowerDNS Autoritativo (Ubuntu 24.04/25.04)

Este guia documenta o passo a passo para levantar nossos dois servidores Master (NS1) e Slave (NS2) usando o **PowerDNS Authoritative Server**. O objetivo é que o NS1 tenha sua API operante para que nosso backend (Next.js) automatize o roteamento via HTTP.

> **📌 Requisitos Prévios (VMs Cloud)**
> *   Duas instâncias **Ubuntu 24.04 ou 25.04 LTS**.
> *   IP Fixo público em ambas.
> *   Firewall liberado: **Porta 53 (TCP e UDP)** para o tráfego global DNS, e **Porta 8081 (TCP)** no NS1 (limitada ao IP da nossa VPC/Servidor Web, onde roda o Next.js).

---

## 🔹 PARTE 1: Instalação Básica (Rodar no NS1 e NS2)

Por questões de leveza e flexibilidade, utilizaremos o banco de dados interno **SQLite3** em cada ponta. O pacote nativo do Ubuntu já cuida da criação e estabilidade do serviço.

1. **Atualize os pacotes do SO:**
   ```bash
   sudo apt update && sudo apt upgrade -y
   sudo apt install pdns-server pdns-backend-sqlite3 sqlite3 -y
   ```

2. **Crie a Base de Dados SQL:**
   Vamos criar um banco vazio no diretório padrão do PDNS e injetar o Schema inicial:
   ```bash
   sudo mkdir -p /var/lib/powerdns
   sudo sqlite3 /var/lib/powerdns/pdns.sqlite3 < /usr/share/doc/pdns-backend-sqlite3/schema.sqlite3.sql
   sudo chown -R pdns:pdns /var/lib/powerdns
   sudo chmod 660 /var/lib/powerdns/pdns.sqlite3
   ```

3. **Vincular o Backend no Arquivo de Configuração:**
   Edite o arquivo principal `/etc/powerdns/pdns.conf`:
   ```bash
   sudo nano /etc/powerdns/pdns.conf
   ```
   Remova as referências a `bind` e adicione/atualize as linhas do SQLite3:
   ```ini
   # Remover/Comentar: launch=bind
   launch=gsqlite3
   gsqlite3-database=/var/lib/powerdns/pdns.sqlite3
   gsqlite3-dnssec=yes
   ```

---

## 🔹 PARTE 2: Configurando o Mestre - NS1 (API e Master Mode)

O NS1 será o cérebro da operação. É ele quem vai conversar com o nosso **Admin Node.js**.

1. **Ative a API e o Master Mode no `pdns.conf` do NS1:**
   Edite `/etc/powerdns/pdns.conf` e acrescente no final:
   ```ini
   # NS1 é o mestre das zonas
   master=yes

   # Habilitar Servidor Web Embutido (Onde roda a API REST)
   webserver=yes
   webserver-address=0.0.0.0
   webserver-port=8081
   
   # Opcional mas recomendado: Limitar quem pode chamar a API (Ex: IP do nosso Next.js)
   webserver-allow-from=127.0.0.1,::1,SEU_IP_DO_NEXTJS/32
   
   # Senha Mestra (X-API-Key) para o Node.js se autenticar
   api=yes
   api-key=super_senha_gerada_no_1password_api_dns
   ```

2. **Reinicie o PDNS:**
   ```bash
   sudo systemctl restart pdns
   sudo systemctl enable pdns
   ```

3. **Teste Primário da API:**
   Dentro do próprio NS1, valide se a API subiu (deve retornar array JSON vazio `[]` inicial):
   ```bash
   curl -H 'X-API-Key: super_senha_gerada_no_1password_api_dns' http://127.0.0.1:8081/api/v1/servers/localhost/zones
   ```

---

## 🔹 PARTE 3: Configurando o Réplica - NS2 (Slave Mode)

O NS2 age como backup e tolerância a falhas, assumindo tráfego global se o NS1 cair. 

1. **Ative o Slave e o Supermaster no `pdns.conf` do NS2:**
   Vá no NS2 (`/etc/powerdns/pdns.conf`) e acesse as últimas linhas:
   ```ini
   # NS2 atua como escravo (Slave) recebendo transferências AXFR
   slave=yes
   # Permite receber notificações de atualização do Supermaster
   supermaster=yes 
   allow-axfr-ips=IP_DO_NS1
   ```

2. **Diga ao NS2 quem é o "Chefe" (NS1) no banco de dados:**
   Abra o shell SQL no banco do **NS2** e injete o IP do NS1 como Supermaster autorizado:
   ```bash
   sudo sqlite3 /var/lib/powerdns/pdns.sqlite3
   sqlite> INSERT INTO supermasters (ip, nameserver, account) VALUES ('IP_DO_NS1', 'ns1.disputatio.com.br', 'admin');
   sqlite> .quit
   ```

3. **Reinicie o PDNS no NS2:**
   ```bash
   sudo systemctl restart pdns
   sudo systemctl enable pdns
   ```

*(Nota: Sempre que o Node.js criar/editar uma zona via API no NS1, o PowerDNS NS1 enviará um pacote "NOTIFY" para o NS2. O NS2 consultará a base, sincronizará os dados via AXFR e se manterá espelhado em milissegundos).*

---

## 🔹 PARTE 4: Criação da Zona Global (disputatio.com.br)

Para a infraestrutura rodar perfeitamente, precisamos que nosso NS1 possua a "casca" principal. Você pode usar a ferramenta de linha de comando `pdnsutil` direto no servidor NS1 para evitar de gastarmos tempo montando via API.

No **NS1**, crie a base do seu domínio:
```bash
sudo pdnsutil create-zone disputatio.com.br ns1.disputatio.com.br
sudo pdnsutil add-record disputatio.com.br @ NS ns2.disputatio.com.br
```

---

## 🚀 Próximas Etapas no Código (Frontend/Next.js)

Agora que os 2 servidores estão de pé e a API viva no `http://<IP_NS1>:8081`, o próximo passo é **ir para a IDE (VS Code)** e construirmos a ponte na nossa aplicação:

1. Vamos criar no nosso Node.js um arquivo de requisições API (ex: `PowerDNSService.ts`).
2. Fazer 1 POST Request disparado pelo painel Administrador que enviará isso ao NS1 (quando o Admin cadastrar ISP "XPTO"):
   ```json
   {
     "rrsets": [
       {
         "name": "isp-xpto.disputatio.com.br.",
         "type": "A",
         "ttl": 60,
         "changetype": "REPLACE",
         "records": [ { "content": "200.150.10.1", "disabled": false } ]
       }
     ]
   }
   ```
3. O Node envia, o NS1 atende na mesma hora, e o Cloud de vídeo é destravado sem Proxy.
