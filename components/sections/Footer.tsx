import Link from "next/link"

export function Footer() {
    return (
        <footer
            style={{
                borderTop: "1px solid var(--border-subtle)",
                padding: "var(--space-8) 0",
                background: "var(--bg)",
            }}
        >
            <div className="container">
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        flexWrap: "wrap",
                        gap: "var(--space-6)",
                    }}
                >
                    {/* Marca */}
                    <div style={{ maxWidth: "280px" }}>
                        <div style={{ fontWeight: 700, fontSize: "1rem", marginBottom: "0.5rem", letterSpacing: "-0.01em" }}>
                            Disputatio <span style={{ color: "var(--accent)" }}>ISP</span>
                        </div>
                        <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", lineHeight: 1.6 }}>
                            Programa de parceria para provedores de internet que querem contribuir com a soberania digital brasileira.
                        </p>
                    </div>

                    {/* Links */}
                    <div style={{ display: "flex", gap: "var(--space-8)", flexWrap: "wrap" }}>
                        <div>
                            <p style={{ fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: "0.75rem" }}>
                                Recursos
                            </p>
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                <Link href="#como-funciona" style={{ fontSize: "0.875rem", color: "var(--text-secondary)", textDecoration: "none" }}>Como funciona</Link>
                                <Link href="#faq" style={{ fontSize: "0.875rem", color: "var(--text-secondary)", textDecoration: "none" }}>FAQ</Link>
                                <Link href="#cadastro" style={{ fontSize: "0.875rem", color: "var(--text-secondary)", textDecoration: "none" }}>Cadastro</Link>
                            </div>
                        </div>
                        <div>
                            <p style={{ fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: "0.75rem" }}>
                                Projeto
                            </p>
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                <a
                                    href="https://disputatio.com.br"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ fontSize: "0.875rem", color: "var(--text-secondary)", textDecoration: "none" }}
                                >
                                    Disputatio ↗
                                </a>
                                <a href="mailto:parceiros@disputatio.com.br" style={{ fontSize: "0.875rem", color: "var(--text-secondary)", textDecoration: "none" }}>
                                    Contato
                                </a>
                            </div>
                        </div>
                    </div>
                </div>

                <div
                    style={{
                        marginTop: "var(--space-6)",
                        paddingTop: "var(--space-3)",
                        borderTop: "1px solid var(--border-subtle)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: "1rem",
                    }}
                >
                    <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>
                        © {new Date().getFullYear()} Disputatio. Todos os direitos reservados.
                    </p>
                    <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>
                        Você é um provedor?{" "}
                        <Link href="#cadastro" style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 500 }}>
                            Junte-se à rede →
                        </Link>
                    </p>
                </div>
            </div>
        </footer>
    )
}
