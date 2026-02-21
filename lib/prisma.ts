import { Pool } from "pg"
import { PrismaPg } from "@prisma/adapter-pg"

// Importação dinâmica para evitar conflito com edge runtime
const { PrismaClient } = require("@prisma/client")

const globalForPrisma = globalThis as unknown as { prisma: InstanceType<typeof PrismaClient> }

function createPrismaClient() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL })
    const adapter = new PrismaPg(pool)
    return new PrismaClient({ adapter })
}

export const prisma: InstanceType<typeof PrismaClient> =
    globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
