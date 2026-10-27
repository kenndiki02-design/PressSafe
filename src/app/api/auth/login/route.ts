import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { SignJWT } from 'jose'
import { db } from '@/lib/db'
import { verifyPassword, createSession, audit } from '@/lib/auth'

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  totpCode: z.string().optional(),
})

const SESSION_DURATION_DAYS = 30

export async function POST(req: NextRequest) {
  try {
    const secretValue = process.env.NEXTAUTH_SECRET
    if (!secretValue || secretValue.length < 32) {
      return NextResponse.json(
        { error: 'Authentication is not configured' },
        { status: 500 }
      )
    }

    const body = await req.json()
    const parsed = LoginSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const { email, password, totpCode } = parsed.data

    const user = await db.user.findUnique({ where: { email } })
    if (!user || user.deletedAt || !user.isActive) {
      // Constant-time response to avoid user enumeration
      await new Promise((r) => setTimeout(r, 200))
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    if (!user.emailVerified) {
      return NextResponse.json(
        { error: 'EMAIL_NOT_VERIFIED' },
        { status: 403 }
      )
    }

    const passwordOk = await verifyPassword(password, user.passwordHash)
    if (!passwordOk) {
      await audit('LOGIN_FAILED_PASSWORD', {
        resourceType: 'User',
        resourceId: user.id,
        ipAddress: req.headers.get('x-forwarded-for') ?? undefined,
      })
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // If 2FA is enabled, verify TOTP code
    if (user.totpEnabled) {
      if (!totpCode) {
        return NextResponse.json(
          { error: 'TOTP_REQUIRED', message: '2FA code required' },
          { status: 200 } // 200 so client can distinguish from auth failure
        )
      }

      const { authenticator } = await import('otplib')
      if (!authenticator.verify({ token: totpCode, secret: user.totpSecret! })) {
        // Check recovery codes
        if (!user.recoveryCodes.includes(totpCode)) {
          return NextResponse.json(
            { error: 'Invalid 2FA code' },
            { status: 401 }
          )
        }
        // Remove used recovery code
        await db.user.update({
          where: { id: user.id },
          data: {
            recoveryCodes: user.recoveryCodes.filter((c) => c !== totpCode),
          },
        })
      }
    }

    // Create DB session
    const session = await createSession(
      user.id,
      req.headers.get('user-agent')?.slice(0, 200),
      req.headers.get('x-forwarded-for') ?? undefined,
      req.headers.get('user-agent') ?? undefined
    )

    // Create a lightweight JWT containing role for middleware (not a full auth token)
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + SESSION_DURATION_DAYS)

    const jwtToken = await new SignJWT({
      sub: user.id,
      role: user.role,
      sessionId: session.id,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime(`${SESSION_DURATION_DAYS}d`)
      .setIssuedAt()
      .sign(new TextEncoder().encode(secretValue))

    await audit('LOGIN_SUCCESS', {
      actorId: user.id,
      resourceType: 'User',
      resourceId: user.id,
      ipAddress: req.headers.get('x-forwarded-for') ?? undefined,
    })

    const response = NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        locale: user.preferredLocale,
        consentedAt: user.consentedAt,
        simplifiedMode: user.simplifiedMode,
      },
    })

    response.cookies.set('ps_session', jwtToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: expiresAt,
    })

    // Also store the DB session token for server-side invalidation
    response.cookies.set('ps_token', session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: expiresAt,
    })

    return response
  } catch (error) {
    console.error('[login]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
