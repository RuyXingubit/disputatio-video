import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

const COMPOSE_TEMPLATE = (isp: {
  name: string
  slug: string
  ispToken: string
  minioAccessKey: string
  minioSecretKey: string
}) => `# Disputatio Node — ${isp.name}
# Gerado em: ${new Date().toISOString()}
# ISP Token: ${isp.ispToken}
# NÃO compartilhe este arquivo — ele contém credenciais únicas do seu nó.

version: '3.8'

services:
  minio:
    image: minio/minio:RELEASE.2025-01-20T14-49-07Z
    container_name: disputatio-node
    restart: always
    environment:
      MINIO_ROOT_USER: ${isp.minioAccessKey}
      MINIO_ROOT_PASSWORD: ${isp.minioSecretKey}
      MINIO_SITE_NAME: ${isp.slug}
    command: server /data --console-address ":9001"
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio_data:/data
    networks:
      - disputatio
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 30s
      timeout: 10s
      retries: 3

  node-agent:
    image: disputatio/node-agent:latest
    container_name: disputatio-agent
    restart: always
    environment:
      ISP_TOKEN: ${isp.ispToken}
      MINIO_ENDPOINT: http://minio:9000
      MINIO_ACCESS_KEY: ${isp.minioAccessKey}
      MINIO_SECRET_KEY: ${isp.minioSecretKey}
      MINIO_BUCKET: disputatio-videos
      GATEWAY_URL: https://video.disputatio.com.br
      REPORT_INTERVAL_SECONDS: "30"
    networks:
      - disputatio
    depends_on:
      - minio

  minio-setup:
    image: minio/mc:latest
    container_name: disputatio-setup
    restart: "no"
    depends_on:
      - minio
    environment:
      MINIO_ROOT_USER: ${isp.minioAccessKey}
      MINIO_ROOT_PASSWORD: ${isp.minioSecretKey}
    entrypoint: >
      /bin/sh -c "
        sleep 5;
        /usr/bin/mc alias set node http://minio:9000 \$\${MINIO_ROOT_USER} \$\${MINIO_ROOT_PASSWORD};
        /usr/bin/mc mb node/disputatio-videos --ignore-existing;
        /usr/bin/mc anonymous set download node/disputatio-videos;
        echo 'Nó Disputatio configurado com sucesso!';
        exit 0;
      "
    networks:
      - disputatio

volumes:
  minio_data:
    name: disputatio_minio_data

networks:
  disputatio:
    name: disputatio_network
    driver: bridge
`

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    const isp = await prisma.isp.findUnique({
      where: { ispToken: token },
      select: {
        name: true,
        slug: true,
        ispToken: true,
        minioAccessKey: true,
        minioSecretKey: true,
        isActive: true,
      },
    })

    if (!isp) {
      return NextResponse.json({ error: "Token inválido" }, { status: 404 })
    }

    const yaml = COMPOSE_TEMPLATE(isp)

    return new NextResponse(yaml, {
      headers: {
        "Content-Type": "application/yaml",
        "Content-Disposition": `attachment; filename="docker-compose-disputatio-${isp.slug}.yml"`,
      },
    })
  } catch (error) {
    console.error("[compose]", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
