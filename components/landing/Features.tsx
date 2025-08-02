import FeatureCard from './FeatureCard'
import { Eye, Accessibility } from 'lucide-react'

export default function Features() {
  return (
    <section className="container mx-auto px-4 sm:px-6 py-24 flex flex-col lg:flex-row gap-8 justify-center">
      <FeatureCard
        gradient="bg-gradient-to-br from-[#1e1b4b] via-[#4338ca] to-[#6366f1]"
        icon={Eye}
        iconColor="text-blue-300"
        badge="Visual QA"
        title="Pixel-Perfect Diff"
        description="Detect misalignments, padding issues, and blurred text instantly with sub-pixel precision."
        footer="AI-Driven"
        footerStatusColor="bg-blue-400"
      />

      <FeatureCard
        gradient="bg-gradient-to-br from-[#3a0f33] via-[#be185d] to-[#e11d48]"
        icon={Accessibility}
        iconColor="text-pink-300"
        badge="Accessibility"
        title="WCAG Checks"
        description="Automatically score color contrast, font sizes, and tap-target dimensions."
        footer="Compliance"
        footerStatusColor="bg-emerald-400"
      />
    </section>
  )
}
