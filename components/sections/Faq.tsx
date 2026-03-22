"use client"

import { useState } from "react"

const faqs = [
    {
        q: "Preciso abrir minha rede para o público?",
        a: "Apenas a porta 9000 (MinIO S3) precisa estar acessível externamente. O console de administração (porta 9001) pode e deve ser bloqueado no firewall.",
    },
    {
        q: "Quanto de armazenamento preciso oferecer?",
        a: "Não há mínimo. Qualquer capacidade é bem-vinda. Você define o tamanho do disco da VM e nosso sistema respeita automaticamente esse limite.",
    },
    {
        q: "E se meu servidor cair?",
        a: "O Gateway detecta automaticamente e redireciona os usuários para outro nó da rede. Nenhum vídeo é perdido — mantemos redundância entre os parceiros.",
    },
    {
        q: "Posso ver o que está armazenado no meu servidor?",
        a: "Sim. Você tem acesso completo ao console local do MinIO. Os vídeos são objetos S3 com chaves opacas (UUIDs) — sem dados pessoais dos usuários expostos.",
    },
    {
        q: "Posso sair da parceria a qualquer momento?",
        a: "Sim, sem burocracia. Execute docker compose down, apague o volume se quiser, e avise-nos. Revogamos seu token no portal imediatamente.",
    },
    {
        q: "Como o Disputatio acessa meu servidor?",
        a: "Apenas via API MinIO (S3) com as credenciais que geramos para você. O node-agent só faz conexões de saída para o gateway — nunca o contrário.",
    },
    {
        q: "Preciso pagar algo?",
        a: "Não. A parceria é totalmente gratuita. Você oferece infraestrutura, nós oferecemos a plataforma e o gerenciamento do gateway.",
    },
    {
        q: "O que é o node-agent que aparece no docker-compose?",
        a: "É um container leve (Alpine) que envia métricas de disco e banda ao gateway a cada 30 segundos e coordena replicações. Mantemos ele atualizado — você não precisa se preocupar.",
    },
]

export function Faq() {
    const [open, setOpen] = useState<number | null>(null)

    return (
        <section
            id="faq"
            className="section"
            style={{ background: "var(--bg-surface)", borderTop: "1px solid var(--border-subtle)" }}
        >
            <div className="container" style={{ maxWidth: "760px" }}>
                <div style={{ textAlign: "center", marginBottom: "var(--space-8)" }}>
                    <span className="section-label">FAQ</span>
                    <h2 className="text-headline">
                        Dúvidas{" "}
                        <span style={{ color: "var(--accent)" }}>frequentes</span>
                    </h2>
                </div>

                <div>
                    {faqs.map((faq, i) => (
                        <div
                            key={i}
                            className="faq-item"
                            data-open={open === i ? "true" : "false"}
                        >
                            <button
                                className="faq-question"
                                onClick={() => setOpen(open === i ? null : i)}
                                aria-expanded={open === i}
                            >
                                <span>{faq.q}</span>
                                <span className="faq-icon" aria-hidden>+</span>
                            </button>
                            <div className="faq-answer" aria-hidden={open !== i}>
                                <p className="faq-answer-inner">{faq.a}</p>
                            </div>
                        </div>
                    ))}
                </div>

                <p style={{ marginTop: "var(--space-6)", textAlign: "center", color: "var(--text-muted)", fontSize: "0.9rem" }}>
                    Ainda tem dúvidas?{" "}
                    <a
                        href="mailto:parceiros@disputatio.com.br"
                        style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 500 }}
                    >
                        parceiros@disputatio.com.br
                    </a>
                </p>
            </div>
        </section>
    )
}
