import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import nodemailer from "nodemailer"

function getTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await req.json()
  const { action, latitude, longitude } = body

  const isp = await prisma.isp.findUnique({ where: { id } })
  if (!isp) return NextResponse.json({ error: "ISP não encontrado" }, { status: 404 })

  if (action === "approve") {
    const updatedIsp = await prisma.isp.update({
      where: { id },
      data: { isActive: true },
    })

    // E-mail ao técnico do ISP com link para baixar o docker-compose
    const composeUrl = `https://video.disputatio.com.br/api/isp/${updatedIsp.ispToken}/compose`
    try {
      const transport = getTransport()
      await transport.sendMail({
        from: `"Disputatio ISP" <${process.env.SMTP_USER}>`,
        to: updatedIsp.techEmail,
        subject: `✅ Cadastro aprovado — ${updatedIsp.name}`,
        html: `
          <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; color: #e8e8e8; background: #0f1210; padding: 32px; border-radius: 8px;">
            <h1 style="font-size: 1.5rem; margin-bottom: 8px;">Bem-vindo ao Disputatio ISP, ${updatedIsp.techName}!</h1>
            <p style="color: #999; margin-bottom: 24px;">
              O cadastro do provedor <strong style="color: #e8e8e8;">${updatedIsp.name}</strong> foi aprovado.
              Siga os passos abaixo para subir seu nó em menos de 5 minutos.
            </p>

            <h2 style="font-size: 1rem; color: #f5a623; margin-bottom: 12px;">1. Baixe sua configuração personalizada</h2>
            <a href="${composeUrl}"
               style="display: inline-block; background: #f5a623; color: #0f1210; padding: 12px 24px; border-radius: 4px; text-decoration: none; font-weight: 700; margin-bottom: 24px;">
              Baixar docker-compose.yml →
            </a>
            <p style="font-size: 0.875rem; color: #666; margin-bottom: 24px;">
              ⚠️ Não compartilhe este arquivo — ele contém credenciais únicas do seu nó.
              <br>Link direto: <code style="color: #f5a623;">${composeUrl}</code>
            </p>

            <h2 style="font-size: 1rem; color: #f5a623; margin-bottom: 12px;">2. Suba o nó (na sua VM)</h2>
            <pre style="background: #0a0d0b; border: 1px solid #222; border-radius: 4px; padding: 16px; font-size: 0.875rem; color: #999; overflow-x: auto;">curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER && newgrp docker

wget ${composeUrl} -O docker-compose.yml
docker compose up -d</pre>

            <p style="margin-top: 24px; color: #666; font-size: 0.875rem;">
              Dúvidas? Responda este e-mail ou entre em contato:<br>
              <a href="mailto:parceiros@disputatio.com.br" style="color: #f5a623;">parceiros@disputatio.com.br</a>
            </p>
          </div>
        `,
      })
    } catch (emailErr) {
      console.error("[admin/approve] Erro ao enviar e-mail:", emailErr)
    }

    return NextResponse.json({ ok: true, message: "ISP aprovado e e-mail enviado" })
  }

  if (action === "reject") {
    await prisma.isp.delete({ where: { id } })

    try {
      const transport = getTransport()
      await transport.sendMail({
        from: `"Disputatio ISP" <${process.env.SMTP_USER}>`,
        to: isp.techEmail,
        subject: `Sobre seu cadastro no Disputatio ISP — ${isp.name}`,
        html: `
          <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; color: #e8e8e8; background: #0f1210; padding: 32px; border-radius: 8px;">
            <h1 style="font-size: 1.5rem; margin-bottom: 8px;">Olá, ${isp.techName}</h1>
            <p style="color: #999;">
              Infelizmente não conseguimos dar prosseguimento ao cadastro do provedor
              <strong style="color: #e8e8e8;">${isp.name}</strong> no momento.
            </p>
            <p style="color: #999; margin-top: 16px;">
              Se tiver dúvidas ou quiser tentar novamente, entre em contato:<br>
              <a href="mailto:parceiros@disputatio.com.br" style="color: #f5a623;">parceiros@disputatio.com.br</a>
            </p>
          </div>
        `,
      })
    } catch (emailErr) {
      console.error("[admin/reject] Erro ao enviar e-mail:", emailErr)
    }

    return NextResponse.json({ ok: true, message: "ISP rejeitado e removido" })
  }

  if (action === "update_coords") {
    await prisma.isp.update({
      where: { id },
      data: {
        latitude: latitude ? Number(latitude) : null,
        longitude: longitude ? Number(longitude) : null,
      }
    })

    return NextResponse.json({ ok: true, message: "Coordenadas atualizadas com sucesso" })
  }

  return NextResponse.json({ error: "Ação inválida" }, { status: 400 })
}
