const http = require("http")
const https = require("https")

const GATEWAY_URL = process.env.GATEWAY_URL || "https://video.disputatio.com.br"
const ISP_TOKEN = process.env.ISP_TOKEN
const MINIO_ENDPOINT = process.env.MINIO_ENDPOINT || "http://minio:9000"
const REPORT_INTERVAL = Number(process.env.REPORT_INTERVAL_SECONDS || "30") * 1000

if (!ISP_TOKEN) {
    console.error("[node-agent] ISP_TOKEN não definido. Encerrando.")
    process.exit(1)
}

async function getMinioMetrics() {
    try {
        const res = await fetch(`${MINIO_ENDPOINT}/minio/health/live`)
        return { minioStatus: res.ok ? "ok" : "error" }
    } catch {
        return { minioStatus: "error" }
    }
}

async function getDiskUsage() {
    // Lê uso de disco do container MinIO via /minio/v2/metrics/cluster
    // Fallback: retorna valores nulos (gateway aceita heartbeat parcial)
    try {
        const res = await fetch(`${MINIO_ENDPOINT}/minio/v2/metrics/cluster`)
        if (!res.ok) return {}

        const text = await res.text()
        const usedMatch = text.match(/minio_cluster_usage_total_bytes\s+(\d+)/)
        const freeMatch = text.match(/minio_cluster_usage_free_bytes\s+(\d+)/)

        const usedBytes = usedMatch ? Number(usedMatch[1]) : null
        const freeBytes = freeMatch ? Number(freeMatch[1]) : null

        return {
            diskUsedGb: usedBytes !== null ? usedBytes / (1024 ** 3) : null,
            diskTotalGb: usedBytes !== null && freeBytes !== null
                ? (usedBytes + freeBytes) / (1024 ** 3)
                : null,
        }
    } catch {
        return {}
    }
}

async function sendHeartbeat() {
    try {
        const [minio, disk] = await Promise.all([getMinioMetrics(), getDiskUsage()])

        const payload = JSON.stringify({
            ispToken: ISP_TOKEN,
            ...minio,
            ...disk,
            bandwidthOutTodayGb: null, // TODO: coletar do MinIO metrics
        })

        const url = `${GATEWAY_URL}/api/gateway/heartbeat`
        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: payload,
        })

        const data = await res.json()
        console.log(`[heartbeat] ${new Date().toISOString()} → ${data.healthStatus ?? "sent"}`)
    } catch (error) {
        console.error(`[heartbeat] Erro:`, error.message)
    }
}

// Loop principal
console.log(`[node-agent] Iniciado`)
console.log(`  Gateway: ${GATEWAY_URL}`)
console.log(`  MinIO: ${MINIO_ENDPOINT}`)
console.log(`  Intervalo: ${REPORT_INTERVAL / 1000}s`)

sendHeartbeat()
setInterval(sendHeartbeat, REPORT_INTERVAL)
