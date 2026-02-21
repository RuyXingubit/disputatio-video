import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { generateUploadUrl } from "@/lib/gateway/minio"

export async function POST(req: NextRequest) {
    try {
        const { contentType } = await req.json()

        if (!contentType) {
            return NextResponse.json({ error: "contentType obrigatório" }, { status: 400 })
        }

        // Seleciona ISP: ativo, saudável, com mais espaço livre
        const isps = await prisma.isp.findMany({
            where: {
                isActive: true,
                healthStatus: { in: ["healthy", "unknown"] },
            },
            orderBy: [
                { diskUsedGb: "asc" },       // menos disco usado primeiro
                { bandwidthOutTodayGb: "asc" }, // menos banda usada depois
            ],
        })

        if (isps.length === 0) {
            return NextResponse.json(
                { error: "Nenhum ISP disponível para upload" },
                { status: 503 },
            )
        }

        // Scoring: 60% espaço livre, 30% saúde, 10% peso
        const scored = isps.map(isp => {
            const diskFree = (isp.diskTotalGb ?? isp.diskOfferedGb) - (isp.diskUsedGb ?? 0)
            const healthScore = isp.healthStatus === "healthy" ? 1 : 0.5
            const weightNorm = isp.weight / 100

            return {
                isp,
                score: diskFree * 0.6 + healthScore * 100 * 0.3 + weightNorm * 100 * 0.1,
            }
        })

        scored.sort((a, b) => b.score - a.score)
        const selected = scored[0].isp

        // Gera presigned URL
        const { uploadUrl, fileKey } = await generateUploadUrl(
            selected.ipv4,
            selected.minioAccessKey,
            selected.minioSecretKey,
            contentType,
        )

        // Registra localização primária
        await prisma.videoLocation.create({
            data: {
                videoId: fileKey,
                ispId: selected.id,
                isPrimary: true,
            },
        })

        const resolveUrl = `/api/gateway/resolve/${fileKey}`

        return NextResponse.json({
            uploadUrl,
            fileKey,
            resolveUrl,
            isp: { id: selected.id, name: selected.name, region: selected.state },
        })
    } catch (error) {
        console.error("[gateway/upload-intent]", error)
        return NextResponse.json({ error: "Erro interno" }, { status: 500 })
    }
}
