import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const {
            ispToken,
            diskUsedGb,
            diskTotalGb,
            bandwidthOutTodayGb,
            minioStatus,
        } = body

        if (!ispToken) {
            return NextResponse.json({ error: "ispToken obrigatório" }, { status: 400 })
        }

        const isp = await prisma.isp.findUnique({ where: { ispToken } })
        if (!isp) {
            return NextResponse.json({ error: "ISP não encontrado" }, { status: 404 })
        }

        if (!isp.isActive) {
            return NextResponse.json({ error: "ISP não está ativo" }, { status: 403 })
        }

        // Determinar health status baseado no report
        let healthStatus = "healthy"
        if (minioStatus !== "ok") {
            healthStatus = "degraded"
        }

        await prisma.isp.update({
            where: { id: isp.id },
            data: {
                diskUsedGb: diskUsedGb != null ? Number(diskUsedGb) : undefined,
                diskTotalGb: diskTotalGb != null ? Number(diskTotalGb) : undefined,
                bandwidthOutTodayGb: bandwidthOutTodayGb != null ? Number(bandwidthOutTodayGb) : undefined,
                healthStatus,
                lastHealthCheck: new Date(),
            },
        })

        return NextResponse.json({ ok: true, healthStatus })
    } catch (error) {
        console.error("[gateway/heartbeat]", error)
        return NextResponse.json({ error: "Erro interno" }, { status: 500 })
    }
}
