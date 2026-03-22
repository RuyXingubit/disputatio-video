"use client"

import { useState, useEffect } from "react"
import { Map, Overlay } from "pigeon-maps"

type IspPoint = {
    id: string
    name: string
    city: string
    state: string
    latitude: number
    longitude: number
    healthStatus: string
}

// CartoDB Dark Matter para o tema do Disputatio
const cartoDarkProvider = (x: number, y: number, z: number) => {
    return `https://cartodb-basemaps-a.global.ssl.fastly.net/dark_all/${z}/${x}/${y}.png`
}

export function IspMap() {
    const [isps, setIsps] = useState<IspPoint[]>([])
    const [hovered, setHovered] = useState<string | null>(null)

    useEffect(() => {
        fetch("/api/public/isps-map")
            .then((r) => r.json())
            .then((data) => setIsps(data.isps ?? []))
            .catch(() => { })
    }, [])

    return (
        <section id="parceiros" className="section">
            <div className="container">
                <div style={{ textAlign: "center", marginBottom: "var(--space-8)" }}>
                    <span className="section-label">Rede ativa</span>
                    <h2 className="text-headline">
                        Nós ativos{" "}
                        <span style={{ color: "var(--accent)" }}>agora</span>
                    </h2>
                    <p className="text-body" style={{ marginTop: "var(--space-2)", maxWidth: "480px", margin: "var(--space-2) auto 0" }}>
                        {isps.length > 0
                            ? `${isps.length} provedor${isps.length > 1 ? "es" : ""} participando da rede.`
                            : "Seja o primeiro ISP parceiro do Brasil a entrar na rede."}
                    </p>
                </div>

                <div
                    style={{
                        maxWidth: "800px",
                        margin: "0 auto",
                        background: "var(--bg-card)",
                        border: "1px solid var(--border-subtle)",
                        borderRadius: "var(--radius-lg)",
                        overflow: "hidden",
                        position: "relative",
                        aspectRatio: "16/10",
                    }}
                >
                    {isps.length === 0 && (
                        <div style={{
                            position: "absolute", inset: 0, zIndex: 10,
                            display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.4)"
                        }}>
                            <p style={{
                                color: "var(--text-muted)", fontSize: "14px",
                                fontFamily: "Space Grotesk, sans-serif"
                            }}>Aguardando primeiros parceiros...</p>
                        </div>
                    )}

                    <Map
                        provider={cartoDarkProvider}
                        defaultCenter={[-14.235, -51.925]} // Centro do Brasil
                        defaultZoom={4}
                        minZoom={3}
                        maxZoom={10}
                        touchEvents={true}
                        mouseEvents={true}
                    >
                        {isps.map((isp) => {
                            const isHovered = hovered === isp.id
                            const color = isp.healthStatus === "healthy"
                                ? "var(--status-healthy)"
                                : isp.healthStatus === "degraded"
                                    ? "var(--status-degraded)"
                                    : "var(--status-offline)"

                            return (
                                <Overlay key={isp.id} anchor={[isp.latitude, isp.longitude]} offset={[12, 12]}>
                                    <div
                                        onMouseEnter={() => setHovered(isp.id)}
                                        onMouseLeave={() => setHovered(null)}
                                        style={{ position: 'relative' }}
                                    >
                                        {/* Ponto / Ping */}
                                        <div style={{
                                            width: isHovered ? 16 : 12,
                                            height: isHovered ? 16 : 12,
                                            borderRadius: "50%",
                                            background: color,
                                            border: "2px solid white",
                                            boxShadow: isHovered ? `0 0 10px ${color}` : "none",
                                            transition: "all 0.2s ease",
                                            cursor: "pointer",
                                            position: "relative",
                                            left: isHovered ? -2 : 0,
                                            top: isHovered ? -2 : 0
                                        }} />

                                        {/* Pulso para ativos */}
                                        {isHovered && (
                                            <div style={{
                                                position: "absolute",
                                                top: -6, left: -6,
                                                width: 28, height: 28,
                                                borderRadius: "50%",
                                                background: color,
                                                opacity: 0.2,
                                                animation: "pulse 1.5s infinite",
                                                pointerEvents: "none"
                                            }} />
                                        )}

                                        {/* Tooltip */}
                                        {isHovered && (
                                            <div style={{
                                                position: "absolute",
                                                bottom: "100%", left: "50%",
                                                transform: "translate(-50%, -8px)",
                                                background: "var(--bg-card)",
                                                border: "1px solid var(--border)",
                                                padding: "4px 8px",
                                                borderRadius: "4px",
                                                whiteSpace: "nowrap",
                                                zIndex: 100,
                                                pointerEvents: "none",
                                                boxShadow: "0 4px 12px rgba(0,0,0,0.5)"
                                            }}>
                                                <div style={{ color: "var(--text-primary)", fontSize: "11px", fontWeight: 600, fontFamily: "Space Grotesk, sans-serif" }}>
                                                    {isp.name}
                                                </div>
                                                <div style={{ color: "var(--text-muted)", fontSize: "10px", fontFamily: "Space Grotesk, sans-serif" }}>
                                                    {isp.city} — {isp.state}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </Overlay>
                            )
                        })}
                    </Map>

                    {/* Legenda */}
                    <div style={{
                        position: "absolute",
                        bottom: "1rem",
                        right: "1rem",
                        background: "hsl(150, 8%, 6%, 0.9)",
                        backdropFilter: "blur(8px)",
                        border: "1px solid var(--border-subtle)",
                        borderRadius: "var(--radius-sm)",
                        padding: "0.5rem 0.75rem",
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.25rem",
                        zIndex: 10
                    }}>
                        {[
                            { color: "var(--status-healthy)", label: "Ativo" },
                            { color: "var(--status-degraded)", label: "Degradado" },
                            { color: "var(--status-offline)", label: "Offline" },
                        ].map((s) => (
                            <div key={s.label} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                                <span style={{ width: 8, height: 8, borderRadius: "50%", background: s.color, flexShrink: 0 }} />
                                {s.label}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    )
}
