/** Section: top bar. Colour comes from the HUD's --fg variable. */
export default function Navbar({ onContact }) {
  return (
    <header className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-6 py-6 md:px-12 md:py-8">
      <a href="#film" className="font-serif text-xl tracking-[0.14em] md:text-2xl">
        ARDENT <span className="font-light italic">&amp;</span> VALE
      </a>
      <nav className="flex items-center gap-8 text-[11px] uppercase tracking-[0.28em]">
        <span className="hidden opacity-70 md:inline">Architecture</span>
        <span className="hidden opacity-70 md:inline">Interiors</span>
        <button
          onClick={onContact}
          className="hud-border border px-4 py-2 transition-colors hover:bg-[rgb(var(--fg)/0.1)] cursor-pointer"
        >
          Enquire
        </button>
      </nav>
    </header>
  )
}
