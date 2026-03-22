export class PowerDNSService {
    private static readonly API_URL = process.env.POWERDNS_API_URL || 'http://localhost:8081/api/v1/servers/localhost/zones';
    private static readonly API_KEY = process.env.POWERDNS_API_KEY || '';
    private static readonly DNS_ZONE = process.env.POWERDNS_ZONE || 'disputatio.com.br.'; // Sempre termine com ponto (.)

    /**
     * Helper base para as requisições REST do PowerDNS.
     */
    private static async request(endpoint: string, method: 'GET' | 'POST' | 'PATCH' | 'DELETE' = 'GET', body?: any) {
        if (!this.API_KEY) {
            console.warn('⚠️ PowerDNS API_KEY não configurada no .env. Ignorando chamada DNS.');
            return null;
        }

        const url = `${this.API_URL}/${this.DNS_ZONE}${endpoint}`;

        try {
            const response = await fetch(url, {
                method,
                headers: {
                    'X-API-Key': this.API_KEY,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: body ? JSON.stringify(body) : undefined,
            });

            if (!response.ok) {
                const errorData = await response.text();
                throw new Error(`PowerDNS Erro ${response.status}: ${errorData}`);
            }

            if (response.status === 204) return true; // Sucesso sem conteúdo
            return await response.json();
        } catch (error) {
            console.error('[PowerDNS] Falha na comunicação com NS1:', error);
            throw error; // Repassa erro para ser tratado pela Action do Admin
        }
    }

    /**
     * Cria ou Substitui um apontamento DNS dinâmico (A Record) para um Provedor ISP.
     * Ex: addISPRecord('isp-xpto-fiber', '200.150.10.1') -> Cria isp-xpto-fiber.disputatio.com.br.
     */
    static async addISPRecord(subdomainSegment: string, ipAddress: string) {
        // Garante formato correto FQDN exigido pelo PDNS
        const fqdn = `${subdomainSegment}.${this.DNS_ZONE}`;

        const payload = {
            rrsets: [
                {
                    name: fqdn,
                    type: 'A',
                    ttl: 60, // Baixo TTL para propagação rápida (1 min)
                    changetype: 'REPLACE',
                    records: [
                        {
                            content: ipAddress,
                            disabled: false,
                        },
                    ],
                },
            ],
        };

        console.log(`[PowerDNS] Solicitando criação de rota Edge: ${fqdn} -> ${ipAddress}`);
        return this.request('', 'PATCH', payload);
    }

    /**
     * Remove ativamente um nó da topologia (Se o provedor cancelar o contrato).
     */
    static async removeISPRecord(subdomainSegment: string, ipAddress: string) {
        const fqdn = `${subdomainSegment}.${this.DNS_ZONE}`;

        const payload = {
            rrsets: [
                {
                    name: fqdn,
                    type: 'A',
                    changetype: 'DELETE',
                },
            ],
        };

        console.log(`[PowerDNS] Removendo sub-zona ISP: ${fqdn}`);
        return this.request('', 'PATCH', payload);
    }
}
