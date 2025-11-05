import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request)

  const isAuthPage = request.nextUrl.pathname.startsWith('/sign-in') ||
                     request.nextUrl.pathname.startsWith('/sign-up')

  // If user is authenticated and trying to access auth pages, redirect to home
  if (user && isAuthPage) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // If user is not authenticated and trying to access protected pages, redirect to sign-in
  if (!user && !isAuthPage) {
    return NextResponse.redirect(new URL('/sign-in', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
