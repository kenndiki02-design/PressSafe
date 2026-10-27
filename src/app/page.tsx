import Script from 'next/script'

export default function HomePage() {
  return (
    <>
      <main id="app" className="boot-screen" aria-live="polite">
        <p>Loading PressSafe...</p>
      </main>
      <Script src="/presssafe.js" strategy="afterInteractive" />
    </>
  )
}