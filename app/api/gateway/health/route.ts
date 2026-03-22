import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
    try {
        const [healthy, degraded, offline, unknown, totalVideos] = await Promise.all([
            prisma.isp.count({ where: { isActive: true, healthStatus: "healthy" } }),
            prisma.isp.count({ where: { isActive: true, healthStatus: "degraded" } }),
            prisma.isp.count({ where: { isActive: true, healthStatus: "offline" } }),
            prisma.isp.count({ where: { isActive: true, healthStatus: "unknown" } }),
            prisma.videoLocation.groupBy({ by: ["videoId"] }).then(r => r.length),
        ])

        const totalIsps = healthy + degraded + offline + unknown
        const totalDiskGb = await prisma.isp.aggregate({
            where: { isActive: true },
            _sum: { diskTotalGb: true, diskUsedGb: true },
        })

        return NextResponse.json({
            status: "ok",
            timestamp: new Date().toISOString(),
            isps: {
                total: totalIsps,
                healthy,
                degraded,
                offline,
                unknown,
            },
            storage: {
                totalGb: totalDiskGb._sum.diskTotalGb ?? 0,
                usedGb: totalDiskGb._sum.diskUsedGb ?? 0,
            },
            videos: {
                unique: totalVideos,
            },
        })
    } catch (error) {
        console.error("[gateway/health]", error)
        return NextResponse.json({ status: "error" }, { status: 500 })
    }
}
