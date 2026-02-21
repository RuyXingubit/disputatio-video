import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { randomBytes } from "crypto"

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

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const {
            name, cnpj, city, state, ipv4, ipv6,
            diskOfferedGb, techName, techEmail, techWhatsapp,
        } = body

        if (!name || !cnpj || !city || !state || !ipv4 || !diskOfferedGb || !techName || !techEmail || !techWhatsapp) {
            return NextResponse.json({ error: "Campos obrigatórios faltando" }, { status: 400 })
        }

        const baseSlug = toSlug(name)
        // Garante slug único com sufixo aleatório se necessário
        let slug = baseSlug
        const existing = await prisma.isp.findUnique({ where: { slug } })
        if (existing) slug = `${baseSlug}-${randomBytes(3).toString("hex")}`

        const isp = await prisma.isp.create({
            data: {
                name,
                slug,
                cnpj,
                city,
                state,
                ipv4,
                ipv6: ipv6 || null,
                diskOfferedGb: Number(diskOfferedGb),
                techName,
                techEmail,
                techWhatsapp,
                minioAccessKey: generateKey(20),
                minioSecretKey: generateKey(40),
                isActive: false,
            },
        })

        // TODO: enviar e-mail ao admin notificando novo cadastro
        // TODO: enviar e-mail de confirmação ao técnico

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
