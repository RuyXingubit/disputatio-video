"use client"

import Link from "next/link"

export function Navbar() {
    return (
        <nav className="navbar">
            <div className="container" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: "64px" }}>
                <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "32px",
                        height: "32px",
                        background: "var(--accent)",
                        borderRadius: "var(--radius-sm)",
                        fontWeight: 700,
                        fontSize: "0.875rem",
                        color: "hsl(150, 8%, 6%)",
                        fontFamily: "var(--font-mono)"
                    }}>D</span>
                    <span style={{ fontWeight: 600, fontSize: "1rem", color: "var(--text-primary)", letterSpacing: "-0.01em" }}>
                        Disputatio <span style={{ color: "var(--accent)" }}>ISP</span>
                    </span>
                </Link>

                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                    <Link
                        href="https://disputatio.com.br"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: "0.875rem", color: "var(--text-secondary)", textDecoration: "none", transition: "color 0.2s" }}
                    >
                        Plataforma
                    </Link>
                    <Link href="#cadastro" className="btn btn-primary" style={{ padding: "0.5rem 1.25rem", fontSize: "0.875rem" }}>
                        Seja parceiro
                    </Link>
                </div>
            </div>
        </nav>
    )
}
