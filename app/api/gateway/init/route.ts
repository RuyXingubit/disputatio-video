import { NextResponse } from "next/server"
import { startHealthChecker } from "@/lib/gateway/health-checker"

// Inicializa o health checker no startup do primeiro request
let initialized = false

export async function GET() {
    if (!initialized) {
        startHealthChecker()
        initialized = true
    }
    return NextResponse.json({ health_checker: "running" })
}
