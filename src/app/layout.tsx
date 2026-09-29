import type { Metadata } from 'next'
import { DM_Sans, Fraunces } from 'next/font/google'
import './globals.css'

const sans = DM_Sans({ subsets: ['latin'], variable: '--font-sans' })
const display = Fraunces({ subsets: ['latin'], variable: '--font-display' })

export const metadata: Metadata = {
  title: 'Ultimate Planter — make a planter with personality',
  description: 'Design a custom animal planter, preview it in 3D, and prepare it for printing.',
  metadataBase: new URL('https://ultimateplanter.com'),
  openGraph: {
    title: 'Ultimate Planter',
    description: 'Make a planter with personality.',
    url: 'https://ultimateplanter.com',
    siteName: 'Ultimate Planter',
    type: 'website',
  },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable}`}>
      <body>{children}</body>
    </html>
  )
}
