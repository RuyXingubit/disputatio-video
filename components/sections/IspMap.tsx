"use client"

import { useState, useEffect } from "react"

type IspPoint = {
    id: string
    name: string
    city: string
    state: string
    latitude: number
    longitude: number
    healthStatus: string
}

// Converter lat/lon para coordenadas SVG do mapa do Brasil
// Bounding box aproximado: lat -33.75 até 5.27, lon -73.98 até -28.85
function geoToSvg(lat: number, lon: number, svgW: number, svgH: number) {
    const minLat = -33.75, maxLat = 5.27
    const minLon = -73.98, maxLon = -28.85
    const x = ((lon - minLon) / (maxLon - minLon)) * svgW
    const y = ((maxLat - lat) / (maxLat - minLat)) * svgH
    return { x, y }
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

    const svgW = 500
    const svgH = 480

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
                        maxWidth: "600px",
                        margin: "0 auto",
                        background: "var(--bg-card)",
                        border: "1px solid var(--border-subtle)",
                        borderRadius: "var(--radius-lg)",
                        overflow: "hidden",
                        position: "relative",
                    }}
                >
                    <svg
                        viewBox={`0 0 ${svgW} ${svgH}`}
                        style={{ width: "100%", height: "auto", display: "block" }}
                        aria-label="Mapa do Brasil com localização dos ISPs parceiros"
                    >
                        {/* Silhueta simplificada do Brasil (SVG path) */}
                        <path
                            d="M170,30 L200,20 L250,25 L310,40 L360,30 L410,50 L450,80 L470,120
                 L465,160 L450,200 L440,240 L460,270 L470,310 L450,350 L420,380
                 L390,410 L360,430 L330,440 L290,445 L260,435 L230,420 L200,400
                 L175,370 L150,340 L130,300 L120,260 L110,220 L100,180 L90,140
                 L100,100 L120,70 L150,45 Z"
                            fill="hsl(150, 6%, 10%)"
                            stroke="var(--border)"
                            strokeWidth="1.5"
                        />

                        {/* Se não há ISPs, mostrar mensagem dentro do SVG */}
                        {isps.length === 0 && (
                            <text
                                x={svgW / 2}
                                y={svgH / 2 + 30}
                                textAnchor="middle"
                                fill="var(--text-muted)"
                                fontSize="14"
                                fontFamily="Space Grotesk, sans-serif"
                            >
                                Aguardando primeiros parceiros...
                            </text>
                        )}

                        {/* Pontos dos ISPs */}
                        {isps.map((isp) => {
                            const pos = geoToSvg(isp.latitude, isp.longitude, svgW, svgH)
                            const isHovered = hovered === isp.id
                            const color = isp.healthStatus === "healthy"
                                ? "var(--status-healthy)"
                                : isp.healthStatus === "degraded"
                                    ? "var(--status-degraded)"
                                    : "var(--status-offline)"

                            return (
                                <g
                                    key={isp.id}
                                    className="map-point"
                                    onMouseEnter={() => setHovered(isp.id)}
                                    onMouseLeave={() => setHovered(null)}
                                >
                                    {/* Anel de pulso */}
                                    {isHovered && (
                                        <circle cx={pos.x} cy={pos.y} r="14" fill={color} opacity="0.15" />
                                    )}
                                    <circle cx={pos.x} cy={pos.y} r={isHovered ? 8 : 6} fill={color} opacity="0.9" />
                                    <circle cx={pos.x} cy={pos.y} r="2" fill="white" opacity="0.8" />

                                    {/* Tooltip */}
                                    {isHovered && (
                                        <g>
                                            <rect
                                                x={pos.x + 12}
                                                y={pos.y - 20}
                                                width="140"
                                                height="40"
                                                rx="4"
                                                fill="var(--bg-card)"
                                                stroke="var(--border)"
                                                strokeWidth="1"
                                            />
                                            <text
                                                x={pos.x + 20}
                                                y={pos.y - 5}
                                                fill="var(--text-primary)"
                                                fontSize="11"
                                                fontWeight="600"
                                                fontFamily="Space Grotesk, sans-serif"
                                            >
                                                {isp.name}
                                            </text>
                                            <text
                                                x={pos.x + 20}
                                                y={pos.y + 10}
                                                fill="var(--text-muted)"
                                                fontSize="10"
                                                fontFamily="Space Grotesk, sans-serif"
                                            >
                                                {isp.city} — {isp.state}
                                            </text>
                                        </g>
                                    )}
                                </g>
                            )
                        })}
                    </svg>

                    {/* Legenda */}
                    <div style={{
                        position: "absolute",
                        bottom: "1rem",
                        right: "1rem",
                        background: "hsl(150, 8%, 6%, 0.85)",
                        backdropFilter: "blur(8px)",
                        border: "1px solid var(--border-subtle)",
                        borderRadius: "var(--radius-sm)",
                        padding: "0.5rem 0.75rem",
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.25rem",
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
