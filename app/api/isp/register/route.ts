import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { randomBytes } from "crypto"
import nodemailer from "nodemailer"

function generateKey(length = 32) {
    return randomBytes(length).toString("hex").slice(0, length)
}

function toSlug(name: string) {
    return name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
}

function getTransport() {
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT ?? 587),
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const {
            name, cnpj, city, state, ipv4, ipv6,
            diskOfferedGb, techName, techEmail, techWhatsapp,
            latitude, longitude,
        } = body

        if (!name || !cnpj || !city || !state || !ipv4 || !diskOfferedGb || !techName || !techEmail || !techWhatsapp) {
            return NextResponse.json({ error: "Campos obrigatórios faltando" }, { status: 400 })
        }

        let finalLat = latitude ? Number(latitude) : null
        let finalLon = longitude ? Number(longitude) : null

        // Se o usuário não passou coordenada manual exata, nós inferimos através da API do OpenStreetMap
        if (!finalLat || !finalLon) {
            try {
                const geoUrl = `https://nominatim.openstreetmap.org/search?city=${encodeURIComponent(city)}&state=${encodeURIComponent(state)}&country=Brazil&format=json&limit=1`
                const geoRes = await fetch(geoUrl, {
                    headers: { 'User-Agent': 'DisputatioVideoNetwork/1.0' }
                })
                const geoData = await geoRes.json()
                if (geoData && geoData.length > 0) {
                    finalLat = Number(geoData[0].lat)
                    finalLon = Number(geoData[0].lon)
                }
            } catch (geoErr) {
                console.error("[isp/register] Nominatim fetch failed:", geoErr)
            }
        }

        const baseSlug = toSlug(name)
        let slug = baseSlug
        const existing = await prisma.isp.findUnique({ where: { slug } })
        if (existing) slug = `${baseSlug}-${randomBytes(3).toString("hex")}`

        const isp = await prisma.isp.create({
            data: {
                name, slug, cnpj, city, state, ipv4,
                ipv6: ipv6 || null,
                diskOfferedGb: Number(diskOfferedGb),
                techName, techEmail, techWhatsapp,
                latitude: finalLat,
                longitude: finalLon,
                minioAccessKey: generateKey(20),
                minioSecretKey: generateKey(40),
                isActive: false,
            },
        })

        // Notificar admin sobre novo cadastro
        if (process.env.ADMIN_EMAIL && process.env.SMTP_HOST) {
            try {
                const transport = getTransport()
                await transport.sendMail({
                    from: `"Disputatio ISP" <${process.env.SMTP_USER}>`,
                    to: process.env.ADMIN_EMAIL,
                    subject: `🆕 Novo cadastro de ISP — ${name}`,
                    html: `
            <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; color: #e8e8e8; background: #0f1210; padding: 32px; border-radius: 8px;">
              <h2 style="font-size: 1.25rem; margin-bottom: 16px;">Novo ISP aguardando aprovação</h2>
              <table style="width: 100%; border-collapse: collapse; font-size: 0.875rem;">
                ${[
                            ["Provedor", name],
                            ["CNPJ", cnpj],
                            ["Localização", `${city} — ${state}`],
                            ["IP", ipv4],
                            ["Disco ofertado", `${diskOfferedGb} GB`],
                            ["Responsável", techName],
                            ["E-mail", techEmail],
                            ["WhatsApp", techWhatsapp],
                        ].map(([k, v]) => `
                  <tr style="border-bottom: 1px solid #222;">
                    <td style="padding: 8px 0; color: #888; width: 140px;">${k}</td>
                    <td style="padding: 8px 0; color: #e8e8e8;">${v}</td>
                  </tr>
                `).join("")}
              </table>
              <a href="https://video.disputatio.com.br/admin"
                 style="display: inline-block; margin-top: 24px; background: #f5a623; color: #0f1210; padding: 12px 24px; border-radius: 4px; text-decoration: none; font-weight: 700;">
                Revisar no painel →
              </a>
            </div>
          `,
                })
            } catch (emailErr) {
                console.error("[isp/register] Erro ao notificar admin:", emailErr)
            }
        }

        return NextResponse.json({
            success: true,
            message: "Cadastro recebido. Você receberá o docker-compose em breve.",
            ispId: isp.id,
        })
    } catch (error) {
        console.error("[isp/register]", error)
        return NextResponse.json({ error: "Erro interno" }, { status: 500 })
    }
}
