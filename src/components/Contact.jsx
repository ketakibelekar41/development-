/** Section: closing content after the scroll film — a normal, static page section. */
export default function Contact() {
  return (
    <section id="contact" className="relative z-10 bg-[#171310] px-6 py-32 text-[#f4ece0] md:px-12">
      <div className="mx-auto max-w-5xl">
        <p className="text-[11px] uppercase tracking-[0.32em] opacity-60">Studio</p>
        <h2 className="mt-6 max-w-3xl font-serif text-5xl font-light leading-[1.05] md:text-7xl">
          Let’s draw the first line <em className="italic">together.</em>
        </h2>
        <div className="mt-16 grid gap-12 border-t border-white/15 pt-10 md:grid-cols-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] opacity-50">Enquiries</p>
            <a href="mailto:studio@ardentvale.example" className="mt-3 block font-serif text-2xl">
              studio@ardentvale.example
            </a>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] opacity-50">Studio</p>
            <p className="mt-3 font-serif text-2xl">14 Marlowe Yard, London</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] opacity-50">Services</p>
            <p className="mt-3 font-serif text-2xl">Architecture · Interiors · Joinery</p>
          </div>
        </div>
        <p className="mt-24 text-[10px] uppercase tracking-[0.3em] opacity-40">
          © Ardent &amp; Vale — a fictional studio for a Three.js assignment
        </p>
      </div>
    </section>
  )
}
