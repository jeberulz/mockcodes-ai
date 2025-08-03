import type { Metadata } from 'next'
import localFont from 'next/font/local'
import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'
import TanstackClientProvider from '@/components/providers/tanstack-client-provider'
import { Toaster } from '@/components/ui/toaster'

const geistSans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-geist-sans',
  weight: '100 900',
})
const geistMono = localFont({
  src: './fonts/GeistMonoVF.woff',
  variable: '--font-geist-mono',
  weight: '100 900',
})

export const metadata: Metadata = {
  title: 'Mockcodes - Turn UI Screenshots into Working Code',
  description: 'Upload UI screenshots and get optimized prompts that scaffold complete projects with Tailwind CSS and shadcn UI.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
          <TanstackClientProvider>{children}</TanstackClientProvider>
          <Toaster />
        </body>
      </html>
    </ClerkProvider>
  )
}
