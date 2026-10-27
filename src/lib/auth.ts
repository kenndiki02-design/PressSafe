import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'
import type { Prisma, Role } from '@prisma/client'

// ——————————————————————————————————————————————
// Password Hashing
// ——————————————————————————————————————————————

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

// ——————————————————————————————————————————————
// Session Management
// ——————————————————————————————————————————————

const SESSION_DURATION_DAYS = 30

export async function createSession(
  userId: string,
  deviceInfo?: string,
  ipAddress?: string,
  userAgent?: string
) {
  const token = randomBytes(48).toString('hex')
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + SESSION_DURATION_DAYS)

  const session = await db.session.create({
    data: {
      userId,
      token,
      expiresAt,
      deviceInfo,
      ipAddress,
      userAgent,
    },
  })

  return session
}

export async function getSessionByToken(token: string) {
  const session = await db.session.findUnique({
    where: { token },
    include: { user: true },
  })

  if (!session) return null
  if (session.expiresAt < new Date()) {
    await db.session.delete({ where: { id: session.id } })
    return null
  }

  // Rolling session: extend expiry on activity
  await db.session.update({
    where: { id: session.id },
    data: { lastActiveAt: new Date() },
  })

  return session
}

export async function deleteSession(token: string) {
  await db.session.deleteMany({ where: { token } })
}

export async function deleteAllUserSessions(userId: string) {
  await db.session.deleteMany({ where: { userId } })
}

// ——————————————————————————————————————————————
// Email Verification Tokens
// ——————————————————————————————————————————————

export function generateVerifyToken(): string {
  return randomBytes(32).toString('hex')
}

export async function consumeVerifyToken(token: string) {
  const user = await db.user.findUnique({
    where: { emailVerifyToken: token },
  })
  if (!user) return null

  await db.user.update({
    where: { id: user.id },
    data: {
      emailVerified: new Date(),
      emailVerifyToken: null,
    },
  })

  return user
}

// ——————————————————————————————————————————————
// RBAC Helpers
// ——————————————————————————————————————————————

const ROLE_HIERARCHY: Record<Role, number> = {
  JOURNALIST: 1,
  EDITOR: 2,
  FACT_CHECKER: 2,
  ANALYST: 3,
  ADMIN: 99,
}

/** Returns true if the user's role is at least the required level */
export function hasRole(userRole: Role, requiredRole: Role): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole]
}

/** Returns true if the user has one of the allowed roles */
export function hasAnyRole(userRole: Role, allowedRoles: Role[]): boolean {
  return allowedRoles.includes(userRole)
}

/** Role-based route permissions */
export const ROUTE_PERMISSIONS: Record<string, Role[]> = {
  '/dashboard': ['JOURNALIST', 'EDITOR', 'FACT_CHECKER', 'ANALYST', 'ADMIN'],
  '/verify': ['JOURNALIST', 'EDITOR', 'FACT_CHECKER', 'ADMIN'],
  '/vault': ['JOURNALIST', 'EDITOR', 'ADMIN'],
  '/incidents': ['JOURNALIST', 'EDITOR', 'ADMIN'],
  '/training': ['JOURNALIST', 'EDITOR', 'FACT_CHECKER', 'ADMIN'],
  '/queue': ['FACT_CHECKER', 'EDITOR', 'ADMIN'],
  '/analyst': ['ANALYST', 'ADMIN'],
  '/admin': ['ADMIN'],
}

// ——————————————————————————————————————————————
// Audit Logging Helper
// ——————————————————————————————————————————————

export async function audit(
  action: string,
  opts?: {
    actorId?: string
    resourceType?: string
    resourceId?: string
    metadata?: Prisma.InputJsonObject
    ipAddress?: string
    userAgent?: string
  }
) {
  await db.auditLog.create({
    data: {
      action,
      actorId: opts?.actorId,
      resourceType: opts?.resourceType,
      resourceId: opts?.resourceId,
      metadata: opts?.metadata ?? {},
      ipAddress: opts?.ipAddress,
      userAgent: opts?.userAgent,
    },
  })
}
