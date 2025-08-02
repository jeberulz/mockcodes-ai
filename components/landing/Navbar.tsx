'use client'

import Link from 'next/link'
import { Menu, LogIn } from 'lucide-react'

export default function Navbar() {
  return (
    <header className="container mx-auto px-4 sm:px-6 py-6 flex items-center justify-between">
      <Link href="/" className="flex items-center gap-3 group">
        <div className="relative w-10 h-10 flex group-hover:shadow-orange-500/40 transition-all bg-gradient-to-br from-orange-500 via-pink-500 to-purple-600 rounded-3xl shadow-lg items-center justify-center">
          <svg width="53" height="43" viewBox="0 0 53 43" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-[20px] h-[16px] text-white">
            <path d="M37.5 27.0752C37.5 20.4478 32.1274 15.0752 25.5 15.0752H15.5V27.0752H25.5V42.0752H37.5V27.0752Z" fill="currentColor" />
            <path d="M0.5 28.0752C0.500001 35.8072 6.76801 42.0752 14.5 42.0752L22.5 42.0752L22.5 30.0752H14.5C13.3954 30.0752 12.5 29.1798 12.5 28.0752V27.0752L0.5 27.0752L0.5 28.0752Z" fill="currentColor" />
            <path d="M25.5 0.0751953C40.4117 0.0751953 52.5 12.1635 52.5 27.0752V42.0752H40.5V27.0752C40.5 18.7909 33.7843 12.0752 25.5 12.0752H14.5C13.3954 12.0752 12.5 12.9706 12.5 14.0752V15.0752H0.500001V14.0752C0.500002 6.34321 6.76802 0.0751953 14.5 0.0751953H25.5Z" fill="currentColor" />
          </svg>
        </div>
        <div className="flex flex-col">
          <span className="text-lg font-semibold tracking-tight font-geist">MockCodes</span>
        </div>
      </Link>

      <div className="hidden md:flex gap-4 items-center font-geist">
        <Link href="#" className="text-sm px-4 py-2 rounded-3xl hover:bg-white/10 transition tracking-tight">Features</Link>
        <Link href="#" className="text-sm px-4 py-2 rounded-3xl hover:bg-white/10 transition tracking-tight">Pricing</Link>
        <Link href="#" className="text-sm px-4 py-2 rounded-3xl hover:bg-white/10 transition tracking-tight">Docs</Link>
        <Link href="/sign-up" className="inline-flex items-center gap-2 rounded-3xl border border-white/30 px-4 py-2.5 text-sm font-medium text-white hover:bg-white/10 transition tracking-tight">
          Create Account
        </Link>
        <Link href="/sign-in" className="inline-flex items-center gap-2 rounded-3xl bg-gradient-to-r from-orange-500 to-pink-600 px-4 py-2.5 text-sm font-medium shadow-lg hover:from-orange-400 hover:to-pink-500 transition tracking-tight">
          <LogIn className="w-4 h-4" /> Sign in
        </Link>
      </div>

      <button className="md:hidden w-10 h-10 flex items-center justify-center rounded-3xl border border-white/15 hover:bg-white/10">
        <Menu className="w-5 h-5" />
      </button>
    </header>
  )
}
