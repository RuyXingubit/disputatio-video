"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export default function AdminLoginPage() {
    const [password, setPassword] = useState("")
    const [error, setError] = useState(false)
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        setError(false)

        const res = await fetch("/api/admin/auth", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ password }),
        })

        if (res.ok) {
            router.push("/admin")
            router.refresh()
        } else {
            setError(true)
            setLoading(false)
        }
    }

    return (
        <div style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--bg)",
        }}>
            <div style={{
                width: "100%",
                maxWidth: "360px",
                padding: "var(--space-6)",
                background: "var(--bg-card)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-lg)",
            }}>
                <div style={{ textAlign: "center", marginBottom: "var(--space-4)" }}>
                    <span style={{
                        display: "inline-flex", alignItems: "center", justifyContent: "center",
                        width: 40, height: 40, background: "var(--accent)", borderRadius: "var(--radius-sm)",
                        fontWeight: 700, fontSize: "1rem", color: "hsl(150, 8%, 6%)", fontFamily: "var(--font-mono)",
                        marginBottom: "var(--space-2)",
                    }}>D</span>
                    <h1 style={{ fontSize: "1.125rem", fontWeight: 600, letterSpacing: "-0.01em" }}>
                        Admin <span style={{ color: "var(--accent)" }}>ISP</span>
                    </h1>
                    <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                        Painel de aprovação de parceiros
                    </p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: "var(--space-3)" }}>
                        <label style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--text-secondary)", display: "block", marginBottom: "0.375rem" }}>
                            Senha
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            autoFocus
                            style={{
                                width: "100%", padding: "0.75rem 1rem",
                                background: "var(--bg)", border: `1px solid ${error ? "hsl(0,65%,50%)" : "var(--border)"}`,
                                borderRadius: "var(--radius-sm)", color: "var(--text-primary)",
                                fontFamily: "var(--font-sans)", fontSize: "0.9375rem",
                            }}
                        />
                        {error && (
                            <p style={{ fontSize: "0.8125rem", color: "hsl(0,65%,60%)", marginTop: "0.25rem" }}>
                                Senha incorreta
                            </p>
                        )}
                    </div>
                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={loading}
                        style={{ width: "100%", justifyContent: "center", padding: "0.875rem" }}
                    >
                        {loading ? "Entrando..." : "Entrar →"}
                    </button>
                </form>
            </div>
        </div>
    )
}
