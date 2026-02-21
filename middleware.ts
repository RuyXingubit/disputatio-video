import { NextRequest, NextResponse } from "next/server"

export function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl

    if (pathname.startsWith("/admin")) {
        const auth = req.headers.get("authorization")
        const ADMIN_SECRET = process.env.ADMIN_SECRET ?? "admin"

        if (!auth || auth !== `Bearer ${ADMIN_SECRET}`) {
            const basicAuth = req.cookies.get("admin_auth")?.value
            if (basicAuth !== ADMIN_SECRET) {
                // Redireciona para login
                const loginUrl = req.nextUrl.clone()
                loginUrl.pathname = "/admin/login"
                if (pathname !== "/admin/login") {
                    return NextResponse.redirect(loginUrl)
                }
            }
        }
    }

    return NextResponse.next()
}

export const config = {
    matcher: ["/admin/:path*"],
}
