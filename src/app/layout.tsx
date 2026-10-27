import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'PressSafe',
  description: 'Verification and safety tools for journalists',
  manifest: '/manifest.webmanifest',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#12392e" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="icon" href="/presssafe-mark.svg" type="image/svg+xml" />
        <link rel="stylesheet" href="/presssafe.css" />
      </head>
      <body>{children}</body>
    </html>
  )
}