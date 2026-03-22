"use client"

import Link from "next/link"

export function Hero() {
    return (
        <section
            className="dot-grid"
            style={{
                minHeight: "90vh",
                display: "flex",
                alignItems: "center",
                position: "relative",
                overflow: "hidden",
            }}
        >
            {/* Glow âmbar sutil no centro */}
            <div
                aria-hidden
                style={{
                    position: "absolute",
                    inset: 0,
                    background: "radial-gradient(ellipse 60% 40% at 50% 60%, hsl(38, 95%, 55%, 0.06) 0%, transparent 70%)",
                    pointerEvents: "none",
                }}
            />

            <div className="container" style={{ textAlign: "center", padding: "var(--space-16) var(--space-3)", zIndex: 1 }}>
                <div className="animate-fade-up">
                    <span className="badge badge-amber" style={{ marginBottom: "var(--space-3)" }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)", display: "inline-block" }} />
                        Programa de parceria aberto
                    </span>
                </div>

                <h1
                    className="text-display animate-fade-up"
                    style={{ animationDelay: "0.1s", maxWidth: "900px", margin: "0 auto var(--space-3)" }}
                >
                    Sua infraestrutura ociosa,{" "}
                    <span style={{
                        color: "var(--accent)",
                        display: "block",
                    }}>
                        servindo a liberdade
                    </span>
                    de expressão
                </h1>

                <p
                    className="text-body animate-fade-up"
                    style={{
                        animationDelay: "0.2s",
                        fontSize: "1.125rem",
                        maxWidth: "600px",
                        margin: "0 auto var(--space-6)",
                        lineHeight: 1.7
                    }}
                >
                    O Disputatio é uma plataforma brasileira de debates em vídeo. O{" "}
                    <strong style={{ color: "var(--text-primary)", fontWeight: 600 }}>Disputatio ISP</strong>{" "}
                    é o programa para provedores que querem contribuir com armazenamento e entrega de vídeos.
                    Você tem servidores com espaço sobrando? Vamos conversar.
                </p>

                <div
                    className="animate-fade-up"
                    style={{
                        animationDelay: "0.3s",
                        display: "flex",
                        gap: "1rem",
                        justifyContent: "center",
                        flexWrap: "wrap"
                    }}
                >
                    <Link href="#cadastro" className="btn btn-primary" style={{ fontSize: "1rem", padding: "0.875rem 2rem" }}>
                        Quero ser parceiro ISP →
                    </Link>
                    <Link href="#como-funciona" className="btn btn-outline" style={{ fontSize: "1rem", padding: "0.875rem 2rem" }}>
                        Ver como funciona
                    </Link>
                </div>

                {/* Contadores rápidos */}
                <div
                    className="animate-fade-up"
                    style={{
                        animationDelay: "0.4s",
                        display: "flex",
                        gap: "var(--space-8)",
                        justifyContent: "center",
                        marginTop: "var(--space-12)",
                        flexWrap: "wrap"
                    }}
                >
                    {[
                        { value: "3 comandos", label: "para subir o nó" },
                        { value: "< 5 min", label: "para se cadastrar" },
                        { value: "100%", label: "gratuito para ISPs" },
                    ].map((stat) => (
                        <div key={stat.label} style={{ textAlign: "center" }}>
                            <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--accent)", fontFamily: "var(--font-mono)" }}>
                                {stat.value}
                            </div>
                            <div style={{ fontSize: "0.8125rem", color: "var(--text-muted)", marginTop: "2px" }}>
                                {stat.label}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}
