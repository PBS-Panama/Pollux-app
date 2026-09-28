interface Props { title: string; icon: string; description: string }

export default function AdminPlaceholder({ title, icon, description }: Props) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[60vh] text-center px-8">
      <div className="text-5xl mb-5 opacity-60">{icon}</div>
      <h2 className="text-xl font-bold text-white/70 mb-2">{title}</h2>
      <p className="text-sm text-white/35 max-w-sm leading-relaxed mb-5">{description}</p>
      <span className="text-[10px] font-bold tracking-widest uppercase px-3 py-1.5 rounded-full border border-cyan-400/20 text-cyan-400/50 bg-cyan-400/5">
        Coming in next sprint
      </span>
    </div>
  )
}
