import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { generateUploadUrl } from "@/lib/gateway/minio"

export async function POST(req: NextRequest) {
    try {
        const { contentType } = await req.json()

        if (!contentType) {
            return NextResponse.json({ error: "contentType obrigatório" }, { status: 400 })
        }

        // Seleciona ISP: ativo, saudável, com mais espaço livre (excluindo o minio padrão)
        const isps = await prisma.isp.findMany({
            where: {
                isActive: true,
                healthStatus: { in: ["healthy", "unknown"] },
                slug: { not: "default-minio" }
            },
            orderBy: [
                { diskUsedGb: "asc" },       // menos disco usado primeiro
                { bandwidthOutTodayGb: "asc" }, // menos banda usada depois
            ],
        })

        let availableIsps = isps;

        if (availableIsps.length === 0) {
            // Nenhum provedor externo disponível, fallback para o MinIO padrão
            const defaultIsp = await prisma.isp.upsert({
                where: { slug: "default-minio" },
                update: {
                    ipv4: "minio", // Nome da rede interna do docker
                    minioAccessKey: process.env.MINIO_ROOT_USER || "admin",
                    minioSecretKey: process.env.MINIO_ROOT_PASSWORD || "MinioAdminPassword123!",
                    isActive: true,
                    healthStatus: "healthy",
                },
                create: {
                    name: "Disputatio Storage (Default)",
                    slug: "default-minio",
                    cnpj: "00000000000000",
                    city: "São Paulo",
                    state: "SP",
                    ipv4: "minio",
                    techName: "Admin",
                    techEmail: "admin@disputatio.com.br",
                    techWhatsapp: "00000000000",
                    diskOfferedGb: 1000,
                    minioAccessKey: process.env.MINIO_ROOT_USER || "admin",
                    minioSecretKey: process.env.MINIO_ROOT_PASSWORD || "MinioAdminPassword123!",
                    isActive: true,
                    healthStatus: "healthy",
                    weight: 10,
                },
            });
            availableIsps = [defaultIsp];
        }

        // Scoring: 60% espaço livre, 30% saúde, 10% peso
        const scored = availableIsps.map(isp => {
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

        // Configuração de URL personalizada para MinIO interno via Proxy HTTPS do Caddy
        let customEndpoint;
        if (selected.slug === "default-minio") {
            const publicHost = req.headers.get("host")?.split(":")[0] || "localhost";
            // Usa https e porta padrão (443 invisível) para a presigned url para evitar erro de Mixed Content
            customEndpoint = `https://${publicHost}`;
        }

        // Gera presigned URL
        const { uploadUrl, fileKey } = await generateUploadUrl(
            selected.ipv4,
            selected.minioAccessKey,
            selected.minioSecretKey,
            contentType,
            undefined,
            customEndpoint
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
