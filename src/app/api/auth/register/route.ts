import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { hashPassword, generateVerifyToken, audit } from '@/lib/auth'
import { sendVerificationEmail } from '@/lib/email'

const RegisterSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128),
  phone: z.string().optional(),
  locale: z.enum(['en', 'sw']).default('en'),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = RegisterSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation error', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { name, email, password, phone, locale } = parsed.data

    // Check for existing user
    const existing = await db.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 409 }
      )
    }

    const passwordHash = await hashPassword(password)
    const verifyToken = generateVerifyToken()

    const user = await db.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: 'JOURNALIST',
        phone,
        preferredLocale: locale,
        emailVerifyToken: verifyToken,
      },
      select: { id: true, email: true, name: true, role: true },
    })

    // Send verification email (non-blocking)
    sendVerificationEmail(email, verifyToken).catch(console.error)

    await audit('USER_REGISTERED', {
      actorId: user.id,
      resourceType: 'User',
      resourceId: user.id,
      ipAddress: req.headers.get('x-forwarded-for') ?? undefined,
    })

    return NextResponse.json(
      { message: 'Account created. Please check your email to verify.', userId: user.id },
      { status: 201 }
    )
  } catch (error) {
    console.error('[register]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
