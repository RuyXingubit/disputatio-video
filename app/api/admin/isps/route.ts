import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
    try {
        const isps = await prisma.isp.findMany({
            select: {
                id: true,
                name: true,
                cnpj: true,
                city: true,
                state: true,
                ipv4: true,
                ipv6: true,
                diskOfferedGb: true,
                techName: true,
                techEmail: true,
                techWhatsapp: true,
                isActive: true,
                healthStatus: true,
                createdAt: true,
            },
            orderBy: { createdAt: "desc" },
        })

        return NextResponse.json({ isps })
    } catch (error) {
        console.error("[admin/isps]", error)
        return NextResponse.json({ isps: [] }, { status: 500 })
    }
}
