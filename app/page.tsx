import { auth } from '@clerk/nextjs/server'

import Navbar from '../components/landing/Navbar'
import Hero from '../components/landing/Hero'
import Features from '../components/landing/Features'
import CTA from '../components/landing/CTA'

export default async function Home() {
  const { userId } = await auth()

  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-x-hidden">
      <div className="spline-container fixed top-0 w-full h-screen -z-10">
        <iframe
          src="https://my.spline.design/glowingplanetparticles-oNju9tQxB1nyaHSc0bBhpEAE"
          frameBorder={0}
          width="100%"
          height="100%"
        />
      </div>
      <Navbar isSignedIn={!!userId} />
      <Hero isSignedIn={!!userId} />
      <Features />
      <CTA isSignedIn={!!userId} />
    </div>
  )
}
