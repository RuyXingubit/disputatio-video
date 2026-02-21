import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { buildPublicUrl } from "@/lib/gateway/minio"

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ videoId: string }> },
) {
    const { videoId } = await params

    try {
        // Busca todos ISPs que possuem o vídeo
        const locations = await prisma.videoLocation.findMany({
            where: { videoId },
            include: {
                isp: {
                    select: {
                        id: true,
                        ipv4: true,
                        weight: true,
                        healthStatus: true,
                        isActive: true,
                    },
                },
            },
        })

        if (locations.length === 0) {
            return NextResponse.json(
                { error: "video_not_found", message: "Vídeo não encontrado na rede." },
                { status: 404 },
            )
        }

        // Filtra apenas ISPs ativos e saudáveis
        let available = locations.filter(
            l => l.isp.isActive && l.isp.healthStatus === "healthy",
        )

        // Fallback: aceitar degraded se nenhum healthy
        if (available.length === 0) {
            available = locations.filter(
                l => l.isp.isActive && l.isp.healthStatus === "degraded",
            )
        }

        if (available.length === 0) {
            return NextResponse.json(
                {
                    error: "video_unavailable",
                    message: "Vídeo temporariamente indisponível. Tente novamente em instantes.",
                    retry_after: 30,
                },
                { status: 503 },
            )
        }

        // Round-robin ponderado por weight
        const totalWeight = available.reduce((sum, l) => sum + l.isp.weight, 0)
        let random = Math.random() * totalWeight
        let selected = available[0]

        for (const loc of available) {
            random -= loc.isp.weight
            if (random <= 0) {
                selected = loc
                break
            }
        }

        // HTTP 302 redirect para o MinIO do ISP
        const url = buildPublicUrl(selected.isp.ipv4, videoId)
        return NextResponse.redirect(url, 302)
    } catch (error) {
        console.error("[gateway/resolve]", error)
        return NextResponse.json({ error: "Erro interno" }, { status: 500 })
    }
}
