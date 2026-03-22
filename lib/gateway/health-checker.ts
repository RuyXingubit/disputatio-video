import { prisma } from "@/lib/prisma"

const DEGRADED_THRESHOLD_MS = 2 * 60 * 1000 // 2 min sem heartbeat → degraded
const OFFLINE_THRESHOLD_MS = 5 * 60 * 1000  // 5 min sem heartbeat → offline
const CHECK_INTERVAL_MS = 60 * 1000          // checa a cada 60s

let running = false

export async function runHealthCheck() {
    if (running) return
    running = true

    try {
        const activeIsps = await prisma.isp.findMany({
            where: { isActive: true },
            select: {
                id: true,
                ipv4: true,
                healthStatus: true,
                lastHealthCheck: true,
            },
        })

        const now = Date.now()

        for (const isp of activeIsps) {
            const lastCheck = isp.lastHealthCheck?.getTime() ?? 0
            const elapsed = now - lastCheck

            let newStatus = isp.healthStatus

            if (elapsed > OFFLINE_THRESHOLD_MS) {
                newStatus = "offline"
            } else if (elapsed > DEGRADED_THRESHOLD_MS) {
                newStatus = "degraded"
            }
            // Se está recebendo heartbeats normais, o status já é atualizado pelo endpoint /heartbeat

            if (newStatus !== isp.healthStatus) {
                await prisma.isp.update({
                    where: { id: isp.id },
                    data: { healthStatus: newStatus },
                })
                console.log(`[health-checker] ISP ${isp.id} (${isp.ipv4}): ${isp.healthStatus} → ${newStatus}`)
            }
        }
    } catch (error) {
        console.error("[health-checker] Erro:", error)
    } finally {
        running = false
    }
}

let intervalId: ReturnType<typeof setInterval> | null = null

export function startHealthChecker() {
    if (intervalId) return
    console.log("[health-checker] Iniciado (intervalo: 60s)")
    intervalId = setInterval(runHealthCheck, CHECK_INTERVAL_MS)
    // Roda imediatamente na primeira vez
    runHealthCheck()
}

export function stopHealthChecker() {
    if (intervalId) {
        clearInterval(intervalId)
        intervalId = null
        console.log("[health-checker] Parado")
    }
}
