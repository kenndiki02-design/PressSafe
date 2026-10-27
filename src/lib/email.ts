import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT ?? 465),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

const FROM = process.env.SMTP_FROM ?? 'PressSafe <noreply@presssafe.io>'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

export async function sendVerificationEmail(email: string, token: string) {
  const url = `${APP_URL}/auth/verify-email?token=${token}`
  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: 'Verify your PressSafe account',
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; background: #0B1D3A; color: #fff; padding: 40px; border-radius: 12px;">
        <h1 style="color: #F59E0B; margin-bottom: 8px;">PressSafe</h1>
        <p style="color: #94A3B8; margin-bottom: 32px;">Protect the integrity of the story.</p>
        <h2>Verify your email</h2>
        <p>Click the button below to verify your email address and activate your account.</p>
        <a href="${url}" style="display: inline-block; background: #F59E0B; color: #0B1D3A; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 700; margin: 24px 0;">Verify Email</a>
        <p style="color: #64748B; font-size: 14px;">This link expires in 24 hours. If you didn't create a PressSafe account, you can ignore this email.</p>
        <hr style="border-color: #1e3a5f; margin: 32px 0;" />
        <p style="color: #64748B; font-size: 12px;">© 2025 PressSafe • Media Council of Kenya Partner</p>
      </div>
    `,
  })
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const url = `${APP_URL}/auth/reset-password?token=${token}`
  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: 'Reset your PressSafe password',
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; background: #0B1D3A; color: #fff; padding: 40px; border-radius: 12px;">
        <h1 style="color: #F59E0B;">PressSafe</h1>
        <h2>Reset your password</h2>
        <p>Click the button below to reset your password. This link expires in 1 hour.</p>
        <a href="${url}" style="display: inline-block; background: #F59E0B; color: #0B1D3A; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 700; margin: 24px 0;">Reset Password</a>
        <p style="color: #64748B; font-size: 14px;">If you didn't request this, please ignore this email.</p>
      </div>
    `,
  })
}

export async function sendSOSAlert(opts: {
  to: string
  reporterName: string
  location?: { lat: number; lng: number }
  message?: string
  timestamp: Date
}) {
  const mapUrl = opts.location
    ? `https://maps.google.com/?q=${opts.location.lat},${opts.location.lng}`
    : null

  await transporter.sendMail({
    from: FROM,
    to: opts.to,
    subject: `⚠️ URGENT: PressSafe SOS Alert from ${opts.reporterName}`,
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; background: #1a0000; color: #fff; padding: 40px; border-radius: 12px; border: 2px solid #EF4444;">
        <h1 style="color: #EF4444;">&#9888; SOS ALERT</h1>
        <p style="font-size: 18px; font-weight: bold;">${opts.reporterName} has triggered an emergency alert.</p>
        <p><strong>Time:</strong> ${opts.timestamp.toISOString()}</p>
        ${mapUrl ? `<p><strong>Location:</strong> <a href="${mapUrl}" style="color: #F59E0B;">View on map</a></p>` : ''}
        ${opts.message ? `<p><strong>Message:</strong> ${opts.message}</p>` : ''}
        <p style="color: #94A3B8; margin-top: 32px;">This alert was sent via PressSafe. Please check on the reporter immediately.</p>
      </div>
    `,
  })
}
