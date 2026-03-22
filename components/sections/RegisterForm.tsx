"use client"

import { useState, useEffect } from "react"

const ESTADOS_BR = [
    "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS",
    "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC",
    "SP", "SE", "TO",
]

type FormState = "idle" | "loading" | "success" | "error"

export function RegisterForm() {
    const [form, setForm] = useState({
        name: "", cnpj: "", city: "", state: "", ipv4: "",
        diskOfferedGb: "", techName: "", techEmail: "", techWhatsapp: "",
        hasIpv6: false, ipv6: "", latitude: "", longitude: "",
    })
    const [errors, setErrors] = useState<Record<string, string>>({})
    const [status, setStatus] = useState<FormState>("idle")
    const [cities, setCities] = useState<{ id: number, nome: string }[]>([])

    useEffect(() => {
        if (!form.state) {
            setCities([])
            set("city", "")
            return
        }
        fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${form.state}/municipios`)
            .then(res => res.json())
            .then(data => setCities(data))
            .catch(() => setCities([]))
    }, [form.state])

    function set(field: string, value: string | boolean) {
        setForm((f) => ({ ...f, [field]: value }))
        setErrors((e) => { const n = { ...e }; delete n[field]; return n })
    }

    function validate() {
        const e: Record<string, string> = {}
        if (!form.name.trim()) e.name = "Informe o nome do provedor"
        if (!form.cnpj.trim()) e.cnpj = "Informe o CNPJ"
        if (!form.city.trim()) e.city = "Informe a cidade"
        if (!form.state) e.state = "Selecione o estado"
        if (!form.ipv4.trim()) e.ipv4 = "Informe o IP público da VM"
        if (!form.diskOfferedGb || Number(form.diskOfferedGb) < 1) e.diskOfferedGb = "Informe a capacidade em GB"
        if (!form.techName.trim()) e.techName = "Informe o nome do responsável"
        if (!form.techEmail.trim()) e.techEmail = "Informe o e-mail"
        if (!form.techWhatsapp.trim()) e.techWhatsapp = "Informe o WhatsApp"
        if (form.hasIpv6 && !form.ipv6.trim()) e.ipv6 = "Informe o IPv6"
        return e
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        const errs = validate()
        if (Object.keys(errs).length > 0) { setErrors(errs); return }

        setStatus("loading")
        try {
            const res = await fetch("/api/isp/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...form,
                    diskOfferedGb: Number(form.diskOfferedGb),
                }),
            })
            if (!res.ok) throw new Error()
            setStatus("success")
        } catch {
            setStatus("error")
        }
    }

    if (status === "success") {
        return (
            <section id="cadastro" className="section" style={{ borderTop: "1px solid var(--border-subtle)" }}>
                <div className="container" style={{ maxWidth: "600px", textAlign: "center" }}>
                    <div style={{
                        width: 64, height: 64, borderRadius: "50%",
                        background: "hsl(142, 70%, 45%, 0.1)",
                        border: "2px solid var(--status-healthy)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        margin: "0 auto var(--space-4)", fontSize: "1.75rem"
                    }}>✓</div>
                    <h2 className="text-headline" style={{ color: "var(--status-healthy)", marginBottom: "var(--space-2)" }}>
                        Cadastro recebido!
                    </h2>
                    <p className="text-body" style={{ marginBottom: "var(--space-4)" }}>
                        Em breve você receberá o <strong style={{ color: "var(--text-primary)" }}>docker-compose.yml</strong> personalizado no e-mail cadastrado. Enquanto isso, leia nosso{" "}
                        <a href="/docs/operations/isp-update-guide" style={{ color: "var(--accent)", textDecoration: "none" }}>
                            guia de instalação →
                        </a>
                    </p>
                </div>
            </section>
        )
    }

    const inputStyle = (field: string) => ({
        width: "100%",
        padding: "0.75rem 1rem",
        background: "var(--bg-card)",
        border: `1px solid ${errors[field] ? "hsl(0, 65%, 50%)" : "var(--border)"}`,
        borderRadius: "var(--radius-sm)",
        color: "var(--text-primary)" as const,
        fontFamily: "var(--font-sans)",
        fontSize: "0.9375rem",
        transition: "border-color 0.2s",
        appearance: "none" as const,
        outline: "none",
    })

    const labelStyle = {
        fontSize: "0.875rem",
        fontWeight: 500,
        color: "var(--text-secondary)" as const,
        display: "block",
        marginBottom: "0.375rem",
    }

    return (
        <section id="cadastro" className="section" style={{ borderTop: "1px solid var(--border-subtle)" }}>
            <div className="container" style={{ maxWidth: "720px" }}>
                <div style={{ textAlign: "center", marginBottom: "var(--space-8)" }}>
                    <span className="section-label">Cadastro</span>
                    <h2 className="text-headline">
                        Que tal fazer{" "}
                        <span style={{ color: "var(--accent)" }}>parte disso?</span>
                    </h2>
                    <p className="text-body" style={{ marginTop: "var(--space-2)" }}>
                        O cadastro leva menos de 5 minutos. Após aprovação, você recebe o docker-compose personalizado por e-mail.
                    </p>
                </div>

                <form onSubmit={handleSubmit} noValidate>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>

                        {/* Nome do provedor */}
                        <div style={{ gridColumn: "1 / -1" }}>
                            <label style={labelStyle}>Nome do provedor *</label>
                            <input
                                style={inputStyle("name")}
                                value={form.name}
                                onChange={e => set("name", e.target.value)}
                                placeholder="Alfa Telecom Ltda"
                            />
                            {errors.name && <p style={{ fontSize: "0.8125rem", color: "hsl(0,65%,60%)", marginTop: "0.25rem" }}>{errors.name}</p>}
                        </div>

                        {/* CNPJ */}
                        <div>
                            <label style={labelStyle}>CNPJ *</label>
                            <input
                                style={inputStyle("cnpj")}
                                value={form.cnpj}
                                onChange={e => set("cnpj", e.target.value)}
                                placeholder="00.000.000/0001-00"
                            />
                            {errors.cnpj && <p style={{ fontSize: "0.8125rem", color: "hsl(0,65%,60%)", marginTop: "0.25rem" }}>{errors.cnpj}</p>}
                        </div>

                        {/* Estado */}
                        <div>
                            <label style={labelStyle}>Estado *</label>
                            <select
                                style={inputStyle("state")}
                                value={form.state}
                                onChange={e => set("state", e.target.value)}
                            >
                                <option value="">Selecione...</option>
                                {ESTADOS_BR.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                            </select>
                            {errors.state && <p style={{ fontSize: "0.8125rem", color: "hsl(0,65%,60%)", marginTop: "0.25rem" }}>{errors.state}</p>}
                        </div>

                        {/* Cidade */}
                        <div>
                            <label style={labelStyle}>Cidade *</label>
                            <select
                                style={inputStyle("city")}
                                value={form.city}
                                onChange={e => set("city", e.target.value)}
                                disabled={!form.state || cities.length === 0}
                            >
                                <option value="">Selecione...</option>
                                {cities.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
                            </select>
                            {errors.city && <p style={{ fontSize: "0.8125rem", color: "hsl(0,65%,60%)", marginTop: "0.25rem" }}>{errors.city}</p>}
                        </div>

                        {/* IP público */}
                        <div>
                            <label style={labelStyle}>IP Público da VM (IPv4) *</label>
                            <input
                                style={inputStyle("ipv4")}
                                value={form.ipv4}
                                onChange={e => set("ipv4", e.target.value)}
                                placeholder="179.xxx.xxx.xxx"
                                spellCheck={false}
                            />
                            {errors.ipv4 && <p style={{ fontSize: "0.8125rem", color: "hsl(0,65%,60%)", marginTop: "0.25rem" }}>{errors.ipv4}</p>}
                        </div>

                        {/* Capacidade */}
                        <div>
                            <label style={labelStyle}>Capacidade de armazenamento (GB) *</label>
                            <input
                                type="number"
                                min={1}
                                style={inputStyle("diskOfferedGb")}
                                value={form.diskOfferedGb}
                                onChange={e => set("diskOfferedGb", e.target.value)}
                                placeholder="500"
                            />
                            {errors.diskOfferedGb && <p style={{ fontSize: "0.8125rem", color: "hsl(0,65%,60%)", marginTop: "0.25rem" }}>{errors.diskOfferedGb}</p>}
                        </div>

                        {/* IPv6 */}
                        <div style={{ gridColumn: "1 / -1" }}>
                            <label style={{ ...labelStyle, display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                                <input
                                    type="checkbox"
                                    checked={form.hasIpv6}
                                    onChange={e => set("hasIpv6", e.target.checked)}
                                    style={{ width: "16px", height: "16px", accentColor: "var(--accent)" }}
                                />
                                A VM também tem IPv6
                            </label>
                        </div>

                        {form.hasIpv6 && (
                            <div style={{ gridColumn: "1 / -1" }}>
                                <label style={labelStyle}>IPv6 da VM</label>
                                <input
                                    style={inputStyle("ipv6")}
                                    value={form.ipv6}
                                    onChange={e => set("ipv6", e.target.value)}
                                    placeholder="2804:xxxx:xxxx::1"
                                    spellCheck={false}
                                />
                                {errors.ipv6 && <p style={{ fontSize: "0.8125rem", color: "hsl(0,65%,60%)", marginTop: "0.25rem" }}>{errors.ipv6}</p>}
                            </div>
                        )}

                        {/* Divisor */}
                        <div style={{ gridColumn: "1 / -1", borderTop: "1px solid var(--border-subtle)", paddingTop: "var(--space-3)", marginTop: "var(--space-1)" }}>
                            <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)", marginBottom: "var(--space-3)" }}>
                                (Opcional) Localização avançada — para fixar ponto exato no mapa
                            </p>
                        </div>

                        {/* Latitude */}
                        <div>
                            <label style={labelStyle}>Latitude</label>
                            <input
                                type="number"
                                step="any"
                                style={inputStyle("latitude")}
                                value={form.latitude}
                                onChange={e => set("latitude", e.target.value)}
                                placeholder="ex: -23.5505"
                            />
                        </div>

                        {/* Longitude */}
                        <div>
                            <label style={labelStyle}>Longitude</label>
                            <input
                                type="number"
                                step="any"
                                style={inputStyle("longitude")}
                                value={form.longitude}
                                onChange={e => set("longitude", e.target.value)}
                                placeholder="ex: -46.6333"
                            />
                        </div>

                        {/* Divisor */}
                        <div style={{ gridColumn: "1 / -1", borderTop: "1px solid var(--border-subtle)", paddingTop: "var(--space-3)", marginTop: "var(--space-1)" }}>
                            <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)", marginBottom: "var(--space-3)" }}>
                                Contato técnico — para enviarmos o docker-compose e suporte
                            </p>
                        </div>

                        {/* Técnico nome */}
                        <div style={{ gridColumn: "1 / -1" }}>
                            <label style={labelStyle}>Nome do responsável técnico *</label>
                            <input
                                style={inputStyle("techName")}
                                value={form.techName}
                                onChange={e => set("techName", e.target.value)}
                                placeholder="João Silva"
                            />
                            {errors.techName && <p style={{ fontSize: "0.8125rem", color: "hsl(0,65%,60%)", marginTop: "0.25rem" }}>{errors.techName}</p>}
                        </div>

                        {/* E-mail técnico */}
                        <div>
                            <label style={labelStyle}>E-mail *</label>
                            <input
                                type="email"
                                style={inputStyle("techEmail")}
                                value={form.techEmail}
                                onChange={e => set("techEmail", e.target.value)}
                                placeholder="joao@alfabroadband.com.br"
                            />
                            {errors.techEmail && <p style={{ fontSize: "0.8125rem", color: "hsl(0,65%,60%)", marginTop: "0.25rem" }}>{errors.techEmail}</p>}
                        </div>

                        {/* WhatsApp */}
                        <div>
                            <label style={labelStyle}>WhatsApp *</label>
                            <input
                                style={inputStyle("techWhatsapp")}
                                value={form.techWhatsapp}
                                onChange={e => set("techWhatsapp", e.target.value)}
                                placeholder="+55 (11) 99999-9999"
                            />
                            {errors.techWhatsapp && <p style={{ fontSize: "0.8125rem", color: "hsl(0,65%,60%)", marginTop: "0.25rem" }}>{errors.techWhatsapp}</p>}
                        </div>

                    </div>

                    {status === "error" && (
                        <div style={{
                            marginTop: "var(--space-3)",
                            padding: "0.75rem 1rem",
                            background: "hsl(0, 65%, 50%, 0.1)",
                            border: "1px solid hsl(0, 65%, 50%, 0.3)",
                            borderRadius: "var(--radius-sm)",
                            color: "hsl(0, 65%, 70%)",
                            fontSize: "0.9rem",
                        }}>
                            Ocorreu um erro. Tente novamente ou entre em contato: parceiros@disputatio.com.br
                        </div>
                    )}

                    <div style={{ marginTop: "var(--space-4)" }}>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={status === "loading"}
                            style={{ width: "100%", justifyContent: "center", padding: "1rem", fontSize: "1rem" }}
                        >
                            {status === "loading" ? "Enviando..." : "Enviar cadastro →"}
                        </button>
                    </div>
                </form>
            </div>
        </section>
    )
}
