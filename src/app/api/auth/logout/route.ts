import { NextRequest, NextResponse } from 'next/server'
import { deleteSession } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const token = req.cookies.get('ps_token')?.value
  if (token) {
    await deleteSession(token).catch(console.error)
  }

  const response = NextResponse.json({ message: 'Logged out' })
  response.cookies.delete('ps_session')
  response.cookies.delete('ps_token')
  return response
}
