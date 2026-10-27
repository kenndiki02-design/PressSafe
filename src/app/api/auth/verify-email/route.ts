import { NextRequest, NextResponse } from 'next/server'
import { consumeVerifyToken } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) {
    return NextResponse.redirect(new URL('/auth/login?error=invalid_token', req.url))
  }

  const user = await consumeVerifyToken(token)
  if (!user) {
    return NextResponse.redirect(new URL('/auth/login?error=invalid_token', req.url))
  }

  return NextResponse.redirect(new URL('/auth/login?verified=1', req.url))
}
