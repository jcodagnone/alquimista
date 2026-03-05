import React from 'react'
import type { Metadata, Viewport } from 'next'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL('https://alquimista.app'),
  title: 'El Alquimista - Calculadora de Destilación',
  description:
    'Herramienta de precisión gravimétrica para destiladores artesanales. Pesaje, dilución y corrección de alcoholímetro.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'El Alquimista',
  },
  icons: {
    icon: '/icon-32x32.png',
    apple: '/apple-icon.png',
  },
  openGraph: {
    title: 'El Alquimista - Calculadora de Destilación',
    description:
      'Herramienta de precisión gravimétrica para destiladores artesanales. Pesaje, dilución y corrección de alcoholímetro.',
    url: 'https://alquimista.app',
    siteName: 'El Alquimista',
    images: [
      {
        url: '/icon-512x512.png',
        width: 512,
        height: 512,
        alt: 'El Alquimista Logo',
      },
    ],
    locale: 'es-UY',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'El Alquimista - Calculadora de Destilación',
    description:
      'Herramienta de precisión gravimétrica para destiladores artesanales. Pesaje, dilución y corrección de alcoholímetro.',
    images: ['/icon-512x512.png'],
  },
}

export const viewport: Viewport = {
  themeColor: '#000000',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className="dark" suppressHydrationWarning>
      <body className="font-sans antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  )
}
