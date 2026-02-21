"use client"

export function HowItWorks() {
    const steps = [
        {
            num: "01",
            title: "Cadastre sua empresa",
            desc: "Preencha o formulário abaixo com os dados do seu provedor e a VM que vai dedicar. Levamos menos de 24h para aprovar.",
        },
        {
            num: "02",
            title: "Receba sua configuração",
            desc: "Geramos um docker-compose.yml único, com suas credenciais e token exclusivos. Chega por e-mail e fica disponível no portal.",
        },
        {
            num: "03",
            title: "Suba em 3 comandos",
            desc: "Instale o Docker CE na VM, baixe o arquivo e execute docker compose up -d. Pronto — seu nó entra no pool automaticamente.",
        },
        {
            num: "04",
            title: "Atualizações automáticas",
            desc: "Quando publicamos melhorias, basta rodar docker compose pull && docker compose up -d. Seus dados nunca são apagados.",
        },
    ]

    return (
        <section id="como-funciona" className="section" style={{ borderTop: "1px solid var(--border-subtle)" }}>
            <div className="container">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-12)", alignItems: "start" }}>

                    {/* Coluna esquerda: título + timeline */}
                    <div>
                        <span className="section-label">Como funciona</span>
                        <h2 className="text-headline" style={{ marginBottom: "var(--space-8)" }}>
                            De zero a nó ativo{" "}
                            <span style={{ color: "var(--accent)" }}>em minutos</span>
                        </h2>

                        <div className="timeline">
                            {steps.map((step) => (
                                <div key={step.num} className="timeline-item">
                                    <div className="timeline-dot">{step.num}</div>
                                    <h3 style={{ fontWeight: 600, fontSize: "1.0625rem", marginBottom: "0.375rem" }}>
                                        {step.title}
                                    </h3>
                                    <p style={{ color: "var(--text-secondary)", fontSize: "0.9375rem", lineHeight: 1.65 }}>
                                        {step.desc}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Coluna direita: bloco de código */}
                    <div style={{ position: "sticky", top: "100px" }}>
                        <div className="code-block">
                            <div className="code-block-header">
                                <div className="code-dot" style={{ background: "hsl(0, 65%, 55%)" }} />
                                <div className="code-dot" style={{ background: "hsl(38, 95%, 55%)" }} />
                                <div className="code-dot" style={{ background: "hsl(142, 70%, 45%)" }} />
                                <span style={{ marginLeft: "8px", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                                    terminal — sua VM Linux
                                </span>
                            </div>
                            <div className="code-body">
                                <span className="code-comment"># 1. Instalar Docker CE</span>{"\n"}
                                <span className="code-command">curl -fsSL https://get.docker.com | sh</span>{"\n"}
                                <span className="code-command">sudo usermod -aG docker $USER && newgrp docker</span>{"\n\n"}
                                <span className="code-comment"># 2. Baixar sua configuração personalizada</span>{"\n"}
                                <span className="code-command">wget </span>
                                <span className="code-accent">https://video.disputatio.com.br</span>
                                <span className="code-command">/api/isp/</span>
                                <span className="code-accent">SEU_TOKEN</span>
                                <span className="code-command">/compose \</span>{"\n"}
                                <span className="code-command">     -O docker-compose.yml</span>{"\n\n"}
                                <span className="code-comment"># 3. Subir o nó</span>{"\n"}
                                <span className="code-command">docker compose up -d</span>{"\n\n"}
                                <span className="code-accent"># ✓ Nó registrado e ativo!</span>
                            </div>
                        </div>

                        {/* Nota de atualização */}
                        <div
                            className="card"
                            style={{ marginTop: "var(--space-3)", borderColor: "hsl(38, 60%, 55%, 0.2)" }}
                        >
                            <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
                                <span style={{ fontSize: "1.1rem", flexShrink: 0 }}>🔄</span>
                                <div>
                                    <p style={{ fontWeight: 600, fontSize: "0.9375rem", marginBottom: "0.25rem" }}>
                                        Atualizar é simples
                                    </p>
                                    <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", fontFamily: "var(--font-mono)" }}>
                                        docker compose pull && docker compose up -d
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style jsx>{`
        @media (max-width: 768px) {
          .two-col {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
        </section>
    )
}
