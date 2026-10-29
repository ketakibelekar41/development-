const MODES = ['auto', 'high', 'medium', 'low']


export default function QualityToggle({ tier, onChange }) {
  return (
    <div className="absolute bottom-6 right-6 z-20 flex items-center gap-3 text-[10px] uppercase tracking-[0.22em] md:right-12">
      <span className="hidden opacity-50 md:inline">Quality · {tier.name}</span>
      <div className="flex">
        {MODES.map((m) => (
          <button
            key={m}
            onClick={() => onChange(m)}
            className={`hud-border cursor-pointer border px-2 py-1 transition-opacity -ml-px first:ml-0 ${
              tier.mode === m ? 'bg-[rgb(var(--fg)/0.18)] opacity-100' : 'opacity-50 hover:opacity-90'
            }`}
          >
            {m}
          </button>
        ))}
      </div>
    </div>
  )
}
