import UploadDropzone from './UploadDropzone'

export default function Hero() {
  return (
    <section className="container sm:px-6 flex flex-col gap-10 items-center text-center mx-auto pt-10 min-h-[calc(100vh-120px)] justify-center">
      <h1 className="text-5xl md:text-7xl font-normal tracking-tight font-instrument-serif">
        Effortless{' '}
        <span className="bg-clip-text text-transparent bg-gradient-to-r from-orange-400 via-pink-400 to-purple-400">
          Screenshot Analysis
        </span>
      </h1>
      <p className="max-w-2xl text-lg leading-relaxed text-white/70 font-geist tracking-tight mx-auto">
        Drag &amp; drop any screenshot to instantly receive UI quality metrics,
        accessibility checks, and color contrast insights.
      </p>

      <UploadDropzone />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-10">
        {[
          { value: '$120K+', label: 'Design Costs Saved', color: 'text-orange-400' },
          { value: '0.5s', label: 'Avg Analysis Time', color: 'text-pink-400' },
          { value: '98%', label: 'Success Accuracy', color: 'text-purple-400' },
          { value: '24/7', label: 'Cloud Availability', color: 'text-orange-400' },
        ].map(({ value, label, color }, i) => (
          <div key={i} className="text-center">
            <div className={`text-2xl md:text-3xl ${color} font-instrument-serif`}>
              {value}
            </div>
            <div className="text-xs uppercase text-white/40 font-geist tracking-tight">
              {label}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
