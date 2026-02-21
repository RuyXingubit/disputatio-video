export function Benefits() {
    const items = [
        {
            icon: "🏅",
            title: "Selo de Parceiro",
            desc: "Seu nome e logo exibidos na plataforma e no mapa de nós. Visibilidade nacional sem custo de marketing.",
        },
        {
            icon: "📊",
            title: "Dashboard em tempo real",
            desc: "Acompanhe banda e armazenamento usados. Descontamos o tráfego local — você vê apenas o impacto externo real.",
        },
        {
            icon: "🔒",
            title: "Zero risco técnico",
            desc: "Você controla o servidor. Um docker compose down e você saiu da parceria. Sem contratos, sem penalidades.",
        },
        {
            icon: "🔄",
            title: "Atualizações sem trabalho",
            desc: "Nosso agente se atualiza com um único comando. Sem manutenção manual, sem janelas de manutenção programadas.",
        },
        {
            icon: "🌐",
            title: "Infraestrutura nacional",
            desc: "Ajude a construir uma plataforma de debate livre de monopólios de CDN estrangeiros. Soberania digital brasileira.",
        },
        {
            icon: "💡",
            title: "Capacidade bem usada",
            desc: "Servidores com espaço ocioso passam a gerar valor. Sem custo adicional de hardware — o que você já tem basta.",
        },
    ]

    return (
        <section
            id="beneficios"
            className="section"
            style={{ background: "var(--bg-surface)", borderTop: "1px solid var(--border-subtle)", borderBottom: "1px solid var(--border-subtle)" }}
        >
            <div className="container">
                <div style={{ textAlign: "center", marginBottom: "var(--space-8)" }}>
                    <span className="section-label">Por que participar</span>
                    <h2 className="text-headline">
                        O que você ganha sendo{" "}
                        <span style={{ color: "var(--accent)" }}>parceiro</span>
                    </h2>
                </div>

                <div className="benefits-grid">
                    {items.map((item) => (
                        <div key={item.title} className="card" style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
                            <span style={{ fontSize: "1.5rem", flexShrink: 0, lineHeight: 1 }}>{item.icon}</span>
                            <div>
                                <h3 style={{ fontWeight: 600, fontSize: "1rem", marginBottom: "0.375rem" }}>
                                    {item.title}
                                </h3>
                                <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", lineHeight: 1.6 }}>
                                    {item.desc}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}
