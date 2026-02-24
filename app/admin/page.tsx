"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"

type Isp = {
    id: string
    name: string
    cnpj: string
    city: string
    state: string
    ipv4: string
    ipv6: string | null
    diskOfferedGb: number
    techName: string
    techEmail: string
    techWhatsapp: string
    isActive: boolean
    healthStatus: string
    createdAt: string
}

type Tab = "pending" | "active"

export default function AdminPage() {
    const [isps, setIsps] = useState<Isp[]>([])
    const [tab, setTab] = useState<Tab>("pending")
    const [loading, setLoading] = useState(true)
    const [acting, setActing] = useState<string | null>(null)
    const router = useRouter()

    const fetchIsps = useCallback(async () => {
        setLoading(true)
        const res = await fetch("/api/admin/isps")
        if (res.status === 401) { router.push("/admin/login"); return }
        const data = await res.json()
        setIsps(data.isps ?? [])
        setLoading(false)
    }, [router])

    useEffect(() => { fetchIsps() }, [fetchIsps])

    async function handleAction(id: string, action: "approve" | "reject") {
        if (!confirm(action === "approve" ? "Aprovar este ISP e enviar e-mail?" : "Rejeitar e remover este ISP?")) return
        setActing(id)
        await fetch(`/api/admin/isp/${id}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action }),
        })
        setActing(null)
        fetchIsps()
    }

    async function handleLogout() {
        await fetch("/api/admin/auth", { method: "DELETE" })
        router.push("/admin/login")
    }

    const pending = isps.filter(i => !i.isActive)
    const active = isps.filter(i => i.isActive)
    const displayed = tab === "pending" ? pending : active

    const tabStyle = (t: Tab) => ({
        padding: "0.5rem 1.25rem",
        background: tab === t ? "var(--accent)" : "transparent",
        color: tab === t ? "hsl(150, 8%, 6%)" : "var(--text-secondary)",
        border: "1px solid",
        borderColor: tab === t ? "var(--accent)" : "var(--border)",
        borderRadius: "var(--radius-sm)",
        fontFamily: "var(--font-sans)",
        fontWeight: 600,
        fontSize: "0.875rem",
        cursor: "pointer",
        transition: "all 0.2s",
    })

    return (
        <div style={{ minHeight: "100vh", background: "var(--bg)", padding: "var(--space-6)" }}>
            {/* Header */}
            <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-6)" }}>
                    <div>
                        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, letterSpacing: "-0.02em" }}>
                            Admin <span style={{ color: "var(--accent)" }}>ISP</span>
                        </h1>
                        <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginTop: "2px" }}>
                            Gerenciamento de parceiros — video.disputatio.com.br
                        </p>
                    </div>
                    <button
                        onClick={handleLogout}
                        style={{ padding: "0.5rem 1rem", background: "transparent", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", color: "var(--text-secondary)", fontFamily: "var(--font-sans)", fontSize: "0.875rem", cursor: "pointer" }}
                    >
                        Sair
                    </button>
                </div>

                {/* Resumo */}
                <div style={{ display: "flex", gap: "var(--space-3)", marginBottom: "var(--space-4)", flexWrap: "wrap" }}>
                    {[
                        { label: "Pendentes", value: pending.length, color: "var(--accent)" },
                        { label: "Ativos", value: active.length, color: "var(--status-healthy)" },
                        { label: "Total", value: isps.length, color: "var(--text-primary)" },
                    ].map(s => (
                        <div key={s.label} className="card" style={{ flex: "1", minWidth: "140px", padding: "var(--space-3)" }}>
                            <div style={{ fontSize: "1.75rem", fontWeight: 700, color: s.color, fontFamily: "var(--font-mono)" }}>{s.value}</div>
                            <div style={{ fontSize: "0.8125rem", color: "var(--text-muted)", marginTop: "2px" }}>{s.label}</div>
                        </div>
                    ))}
                </div>

                {/* Tabs */}
                <div style={{ display: "flex", gap: "0.5rem", marginBottom: "var(--space-4)" }}>
                    <button style={tabStyle("pending")} onClick={() => setTab("pending")}>
                        Pendentes {pending.length > 0 && `(${pending.length})`}
                    </button>
                    <button style={tabStyle("active")} onClick={() => setTab("active")}>
                        Ativos {active.length > 0 && `(${active.length})`}
                    </button>
                </div>

                {/* Lista */}
                {loading ? (
                    <p style={{ color: "var(--text-muted)" }}>Carregando...</p>
                ) : displayed.length === 0 ? (
                    <div className="card" style={{ textAlign: "center", padding: "var(--space-8)", color: "var(--text-muted)" }}>
                        {tab === "pending" ? "Nenhum ISP aguardando aprovação 🎉" : "Nenhum ISP ativo ainda."}
                    </div>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                        {displayed.map(isp => (
                            <div key={isp.id} className="card" style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "var(--space-3)", alignItems: "start" }}>
                                <div>
                                    {/* Cabeçalho */}
                                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
                                        <h3 style={{ fontWeight: 600, fontSize: "1rem" }}>{isp.name}</h3>
                                        <span style={{
                                            fontSize: "0.6875rem", fontWeight: 600, padding: "2px 8px",
                                            borderRadius: "999px", fontFamily: "var(--font-mono)",
                                            background: isp.isActive ? "hsl(142,70%,45%,0.1)" : "hsl(38,95%,55%,0.1)",
                                            color: isp.isActive ? "var(--status-healthy)" : "var(--accent)",
                                        }}>
                                            {isp.isActive ? "ATIVO" : "PENDENTE"}
                                        </span>
                                    </div>

                                    {/* Dados */}
                                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "0.375rem" }}>
                                        {[
                                            { label: "CNPJ", value: isp.cnpj },
                                            { label: "Localização", value: `${isp.city} — ${isp.state}` },
                                            { label: "IP", value: isp.ipv4 + (isp.ipv6 ? ` / ${isp.ipv6}` : "") },
                                            { label: "Disco", value: `${isp.diskOfferedGb} GB` },
                                            { label: "Responsável", value: isp.techName },
                                            { label: "E-mail", value: isp.techEmail },
                                            { label: "WhatsApp", value: isp.techWhatsapp },
                                            { label: "Cadastrado em", value: new Date(isp.createdAt).toLocaleDateString("pt-BR") },
                                        ].map(f => (
                                            <div key={f.label}>
                                                <span style={{ fontSize: "0.6875rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-muted)" }}>
                                                    {f.label}
                                                </span>
                                                <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginTop: "1px", fontFamily: f.label === "IP" ? "var(--font-mono)" : undefined }}>
                                                    {f.value}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Ações */}
                                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", minWidth: "120px" }}>
                                    {!isp.isActive && (
                                        <button
                                            className="btn btn-primary"
                                            disabled={acting === isp.id}
                                            onClick={() => handleAction(isp.id, "approve")}
                                            style={{ padding: "0.5rem 1rem", fontSize: "0.875rem", justifyContent: "center" }}
                                        >
                                            {acting === isp.id ? "..." : "✓ Aprovar"}
                                        </button>
                                    )}
                                    <button
                                        disabled={acting === isp.id}
                                        onClick={() => handleAction(isp.id, "reject")}
                                        style={{
                                            padding: "0.5rem 1rem", fontSize: "0.875rem", fontFamily: "var(--font-sans)",
                                            fontWeight: 600, cursor: "pointer", borderRadius: "var(--radius-sm)",
                                            background: "transparent", border: "1px solid hsl(0,65%,50%,0.4)",
                                            color: "hsl(0,65%,60%)", transition: "all 0.2s",
                                        }}
                                    >
                                        ✕ {isp.isActive ? "Remover provedor" : "Rejeitar"}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
