import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

const STATE_COORDS: Record<string, [number, number]> = {
    'AC': [-9.02, -70.81], 'AL': [-9.57, -36.78], 'AP': [1.41, -51.77], 'AM': [-3.41, -65.85],
    'BA': [-12.57, -41.70], 'CE': [-5.49, -39.32], 'DF': [-15.79, -47.88], 'ES': [-19.18, -40.30],
    'GO': [-15.82, -49.83], 'MA': [-4.96, -45.27], 'MT': [-12.68, -56.92], 'MS': [-20.77, -54.78],
    'MG': [-18.51, -44.55], 'PA': [-3.20, -52.21], 'PB': [-7.11, -36.14], 'PR': [-25.25, -52.02],
    'PE': [-8.81, -36.95], 'PI': [-7.71, -42.72], 'RJ': [-22.90, -43.20], 'RN': [-5.40, -36.95],
    'RS': [-30.03, -51.23], 'RO': [-11.50, -63.58], 'RR': [2.73, -62.05], 'SC': [-27.24, -50.21],
    'SP': [-23.55, -46.63], 'SE': [-10.57, -37.38], 'TO': [-10.17, -48.29],
}

export async function GET() {
    try {
        const dbIsps = await prisma.isp.findMany({
            where: {
                isActive: true,
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

        const isps = dbIsps.map(isp => {
            if (isp.latitude !== null && isp.longitude !== null) return isp

            // Fallback usando o estado ou a capital SP se não especificado
            const [lat, lon] = STATE_COORDS[isp.state] || STATE_COORDS['SP']

            // Adiciona pequeno ruído para provedores no mesmo estado não sobreporem 100% visualmente
            const jitterLat = (Math.random() - 0.5) * 1.5
            const jitterLon = (Math.random() - 0.5) * 1.5

            return {
                ...isp,
                latitude: lat + jitterLat,
                longitude: lon + jitterLon,
            }
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
