import { LucideIcon } from 'lucide-react'

interface FeatureCardProps {
  gradient: string
  icon: LucideIcon
  iconColor: string
  badge: string
  title: string
  description: string
  footer: string
  footerStatusColor: string
}

export default function FeatureCard({
  gradient,
  icon: Icon,
  iconColor,
  badge,
  title,
  description,
  footer,
  footerStatusColor,
}: FeatureCardProps) {
  return (
    <article
      className={`w-80 md:w-96 rounded-[2.5rem] overflow-hidden shadow-2xl ring-1 ring-white/10 ${gradient} relative group`}
    >
      <div className="absolute inset-0 bg-gradient-to-t from-black/40" />
      <div className="relative p-8 flex flex-col gap-6">
        <div className="flex items-center gap-2 text-white/80">
          <Icon className="w-4 h-4" />
          <span className="text-xs uppercase font-medium font-geist tracking-tight">
            {badge}
          </span>
        </div>

        <div className="w-16 h-16 flex items-center justify-center rounded-3xl bg-white/10 ring-1 ring-white/20">
          <Icon className={`w-8 h-8 ${iconColor}`} />
        </div>

        <h2 className="text-2xl leading-tight font-instrument-serif tracking-tight">
          {title}
        </h2>

        <p className="text-sm text-white/70 leading-relaxed font-geist tracking-tight">
          {description}
        </p>

        <div className="flex items-center justify-between pt-6 mt-auto text-white/60 text-xs font-geist tracking-tight">
          {footer}
          <span className="flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full ${footerStatusColor}`} />
            Live
          </span>
        </div>
      </div>
    </article>
  )
}
