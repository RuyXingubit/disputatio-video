import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
    const { password } = await req.json()
    const ADMIN_SECRET = process.env.ADMIN_SECRET ?? "admin"

    if (password !== ADMIN_SECRET) {
        return NextResponse.json({ error: "Senha incorreta" }, { status: 401 })
    }

    const res = NextResponse.json({ ok: true })
    res.cookies.set("admin_auth", ADMIN_SECRET, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7, // 7 dias
        path: "/",
    })
    return res
}

export async function DELETE() {
    const res = NextResponse.json({ ok: true })
    res.cookies.delete("admin_auth")
    return res
}
