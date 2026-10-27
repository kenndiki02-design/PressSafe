import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionByToken, audit } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const token = req.cookies.get('ps_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const session = await getSessionByToken(token)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await db.user.update({
    where: { id: session.userId },
    data: { consentedAt: new Date(), consentVersion: '1.0' },
  })

  await audit('CONSENT_GIVEN', {
    actorId: session.userId,
    resourceType: 'User',
    resourceId: session.userId,
    metadata: { version: '1.0' },
  })

  return NextResponse.json({ message: 'Consent recorded' })
}
