import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { Role } from '@prisma/client'
import { jwtVerify } from 'jose'

// Route -> allowed roles map
const PROTECTED_ROUTES: Record<string, Role[]> = {
  '/dashboard': ['JOURNALIST', 'EDITOR', 'FACT_CHECKER', 'ANALYST', 'ADMIN'],
  '/verify': ['JOURNALIST', 'EDITOR', 'FACT_CHECKER', 'ADMIN'],
  '/vault': ['JOURNALIST', 'EDITOR', 'ADMIN'],
  '/incidents': ['JOURNALIST', 'EDITOR', 'ADMIN'],
  '/training': ['JOURNALIST', 'EDITOR', 'FACT_CHECKER', 'ADMIN'],
  '/queue': ['FACT_CHECKER', 'EDITOR', 'ADMIN'],
  '/analyst': ['ANALYST', 'ADMIN'],
  '/admin': ['ADMIN'],
}

// Public paths that never require auth
const PUBLIC_PATHS = [
  '/',
  '/auth/login',
  '/auth/register',
  '/auth/verify-email',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/api/auth',
  '/offline',
  '/_next',
  '/favicon',
  '/manifest',
  '/icons',
  '/sw.js',
]

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + '/')
  )
}

function getMatchedRoute(pathname: string): string | null {
  for (const route of Object.keys(PROTECTED_ROUTES)) {
    if (pathname === route || pathname.startsWith(route + '/')) {
      return route
    }
  }
  return null
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public paths
  if (isPublicPath(pathname)) {
    return NextResponse.next()
  }

  // Read session token from cookie
  const token = request.cookies.get('ps_session')?.value

  if (!token) {
    const loginUrl = new URL('/auth/login', request.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Verify the signed JWT before trusting its role claim.
  try {
    const secret = process.env.NEXTAUTH_SECRET
    if (!secret || secret.length < 32) throw new Error('Invalid auth secret')
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(secret),
      { algorithms: ['HS256'] }
    )
    const userRole = payload.role as Role | undefined
    if (!userRole) throw new Error('Missing user role')

    // Check role-based route access
    const matchedRoute = getMatchedRoute(pathname)
    if (matchedRoute) {
      const allowedRoles = PROTECTED_ROUTES[matchedRoute]
      if (!allowedRoles.includes(userRole)) {
        // Redirect to appropriate home based on role
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
    }

    // Pass user info downstream via headers
    const requestHeaders = new Headers(request.headers)
    if (userRole) requestHeaders.set('x-user-role', userRole)

    return NextResponse.next({ request: { headers: requestHeaders } })
  } catch {
    // Invalid token
    const response = NextResponse.redirect(new URL('/auth/login', request.url))
    response.cookies.delete('ps_session')
    return response
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js|offline.html).*)',
  ],
}
