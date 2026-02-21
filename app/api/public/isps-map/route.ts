import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
    try {
        const isps = await prisma.isp.findMany({
            where: {
                isActive: true,
                latitude: { not: null },
                longitude: { not: null },
            },
            select: {
                id: true,
                name: true,
                city: true,
                state: true,
                latitude: true,
                longitude: true,
                healthStatus: true,
            },
            orderBy: { createdAt: "asc" },
        })

        return NextResponse.json(
            { isps },
            {
                headers: {
                    "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
                },
            }
        )
    } catch (error) {
        console.error("[isps-map]", error)
        return NextResponse.json({ isps: [] }, { status: 500 })
    }
}
