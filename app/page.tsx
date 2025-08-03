import { auth } from '@clerk/nextjs/server'

import Navbar from '../components/landing/Navbar'
import Hero from '../components/landing/Hero'
import Features from '../components/landing/Features'
import CTA from '../components/landing/CTA'
import SplineBackground from '../components/landing/SplineBackground'

export default async function Home() {
  const { userId } = await auth()

  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-x-hidden">
      <SplineBackground />
      <Navbar isSignedIn={!!userId} />
      <Hero isSignedIn={!!userId} />
      <Features />
      <CTA isSignedIn={!!userId} />
    </div>
  )
}
