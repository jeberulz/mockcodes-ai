'use client'

import { Rocket, Calendar } from 'lucide-react'
import Link from 'next/link'

export default function CTA() {
  return (
    <section className="container mx-auto px-4 sm:px-6 text-center pb-24 animate-fade-up">
      <h2 className="text-2xl md:text-3xl font-instrument-serif mb-6">
        Ready to level-up your screenshots?
      </h2>
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Link
          href="/sign-up"
          className="inline-flex items-center gap-2 rounded-3xl bg-gradient-to-r from-orange-500 to-pink-600 px-6 py-3 text-base font-medium shadow-lg hover:from-orange-400 hover:to-pink-500 transition font-geist tracking-tight"
        >
          <Rocket className="w-5 h-5" /> Start Free Trial
        </Link>
        <Link
          href="#"
          className="inline-flex items-center gap-2 rounded-3xl border border-white/20 px-6 py-3 text-base font-medium hover:bg-white/10 transition font-geist tracking-tight"
        >
          <Calendar className="w-5 h-5" /> Book Demo
        </Link>
      </div>
    </section>
  )
}
