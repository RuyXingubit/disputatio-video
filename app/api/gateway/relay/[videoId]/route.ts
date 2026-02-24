import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { generateUploadUrl } from "@/lib/gateway/minio"

export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ videoId: string }> },
) {
    const { videoId } = await params

    try {
        // Encontra o provedor destinado para este videoId
        const location = await prisma.videoLocation.findFirst({
            where: { videoId: videoId },
            include: { isp: true }
        })

        if (!location) {
            return NextResponse.json({ error: "Upload intent não encontrado ou expirado." }, { status: 404 })
        }

        const isp = location.isp

        // Configuração de URL personalizada para MinIO interno via Proxy Caddy HTTPS
        let customEndpoint;
        if (isp.slug === "default-minio") {
            const publicHost = req.headers.get("host")?.split(":")[0] || "localhost";
            if (process.env.NODE_ENV === "production" || req.headers.get("x-forwarded-proto") === "https") {
                customEndpoint = `https://${publicHost}`;
            } else {
                customEndpoint = `http://${publicHost}:9000`;
            }
        }

        // Recupera o Content-Type original enviado pelo frontend
        const contentType = req.headers.get("content-type") || "video/mp4"

        // Regenera a Presigned URL real do destino agora que temos o stream
        const { uploadUrl } = await generateUploadUrl(
            isp.ipv4,
            isp.minioAccessKey,
            isp.minioSecretKey,
            contentType,
            videoId,
            customEndpoint
        )

        // Roteia o Stream binário HTTP inteiro nativamente para a URL de destino (Proxy L7)
        const response = await fetch(uploadUrl, {
            method: 'PUT',
            headers: {
                'Content-Type': contentType,
                'Content-Length': req.headers.get('content-length') || '',
            },
            body: req.body as unknown as BodyInit,
            // Next.js/Node suporta Web Streams transparentemente mas a tipografia oficial às vezes falha
            // @ts-expect-error Typescript não sabe lidar bem nativamente com TS 18 duplex streams params
            duplex: 'half'
        })

        if (!response.ok) {
            const errorText = await response.text()
            console.error(`[gateway/relay] Falha S2S S3: ${response.status}`, errorText)
            return NextResponse.json({ error: `Upload falhou no provedor parceiro (${response.status})` }, { status: response.status })
        }

        return NextResponse.json({ success: true, message: "Vídeo salvo com sucesso na rede." })
    } catch (error) {
        console.error("[gateway/relay]", error)
        return NextResponse.json({ error: "Erro interno ao trafegar o arquivo." }, { status: 500 })
    }
}
