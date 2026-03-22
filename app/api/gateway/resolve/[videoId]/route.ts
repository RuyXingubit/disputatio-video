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
                        slug: true,
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

        // Tenta priorizar provedores externos (não default)
        const externalLocations = available.filter(l => l.isp.slug !== "default-minio")
        if (externalLocations.length > 0) {
            available = externalLocations
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

        // Proxying the video content to avoid Mixed Content (HTTPS -> HTTP)
        const url = buildPublicUrl(selected.isp.ipv4, videoId)

        try {
            const videoResponse = await fetch(url, {
                // Pass any necessary headers, range request for seeking
                headers: {
                    range: _req.headers.get('range') || ''
                }
            })

            if (!videoResponse.ok) {
                return NextResponse.json(
                    { error: "video_fetch_error", message: "Erro ao buscar vídeo no nó." },
                    { status: videoResponse.status }
                )
            }

            // Create a new response with the video stream and correct headers
            const responseHeaders = new Headers()
            const allowedHeaders = ['content-type', 'content-length', 'content-range', 'accept-ranges', 'cache-control']

            videoResponse.headers.forEach((value, key) => {
                if (allowedHeaders.includes(key.toLowerCase())) {
                    responseHeaders.set(key, value)
                }
            })

            // CORS para Playback
            responseHeaders.set("Access-Control-Allow-Origin", "*")

            return new NextResponse(videoResponse.body, {
                status: videoResponse.status,
                headers: responseHeaders,
            })

        } catch (fetchError) {
            console.error("[gateway/resolve proxy fetch]", fetchError)
            return NextResponse.json({ error: "Erro proxy" }, { status: 502 })
        }


    } catch (error) {
        console.error("[gateway/resolve]", error)
        return NextResponse.json({ error: "Erro interno" }, { status: 500 })
    }
}
