import { useEffect, useMemo, useRef, useState } from 'react'
import { ScrollStore } from './lib/ScrollStore.js'
import Loader from './components/Loader.jsx'
import Navbar from './components/Navbar.jsx'
import Experience from './components/Experience.jsx'
import StageSketch from './components/StageSketch.jsx'
import StageFormation from './components/StageFormation.jsx'
import StageInterior from './components/StageInterior.jsx'
import ProgressRail from './components/ProgressRail.jsx'
import ScrollHint from './components/ScrollHint.jsx'
import QualityToggle from './components/QualityToggle.jsx'
import Contact from './components/Contact.jsx'
import Scrim from './components/Scrim.jsx'
import DragHint from './components/DragHint.jsx'
import { useProgress } from './lib/useProgress.js'

const TRACK_VH = 650 // length of the scroll film, in viewport heights

export default function App() {
  const store = useMemo(() => new ScrollStore(), [])
  const engineRef = useRef(null)
  const trackRef = useRef(null)
  const hudRef = useRef(null)
  const [load, setLoad] = useState({ pct: 0, label: 'Preparing the studio' })
  const [ready, setReady] = useState(false)
  const [done, setDone] = useState(false)
  const [tier, setTier] = useState({ name: 'high', mode: 'auto' })

  // scroll position -> progress (relative to the pinned track)
  useEffect(() => {
    const update = () => {
      const el = trackRef.current
      if (!el) return
      const max = el.offsetHeight - window.innerHeight
      const p = max > 0 ? (window.scrollY - el.offsetTop) / max : 0
      store.setTarget(p)
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [store])

  // lock scrolling while loading; start the pen-draw intro when the loader leaves
  useEffect(() => {
    document.documentElement.style.overflow = ready ? '' : 'hidden'
    if (ready) engineRef.current?.startIntro()
  }, [ready])

  // HUD colour follows the background: ink on paper -> ivory on the lit interior
  useProgress(store, (p) => {
    const t = Math.min(1, Math.max(0, (p - 0.56) / 0.18))
    const e = t * t * (3 - 2 * t)
    const mix = (a, b) => Math.round(a + (b - a) * e)
    hudRef.current?.style.setProperty('--fg', `${mix(29, 244)} ${mix(26, 236)} ${mix(22, 224)}`)
  })

  const goTo = (p) => {
    const el = trackRef.current
    const max = el.offsetHeight - window.innerHeight
    window.scrollTo({ top: el.offsetTop + max * p, behavior: 'smooth' })
  }

  return (
    <>
      {!done && <Loader pct={load.pct} label={load.label} ready={ready} onDone={() => setDone(true)} />}

      <main>
        <section ref={trackRef} style={{ height: `${TRACK_VH}vh` }} className="relative" id="film">
          <div ref={hudRef} className="hud sticky top-0 h-[100svh] w-full touch-pan-y overflow-hidden">
            <Experience
              store={store}
              engineRef={engineRef}
              onProgress={(pct, label) => setLoad({ pct, label })}
              onReady={() => setReady(true)}
              onTier={(name, mode) => setTier({ name, mode })}
            />
            <Scrim store={store} />
            <Navbar onContact={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })} />
            <StageSketch store={store} />
            <StageFormation store={store} />
            <StageInterior store={store} onContact={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })} />
            <ProgressRail store={store} onJump={goTo} />
            <ScrollHint store={store} visible={ready} />
            <DragHint store={store} />
            <QualityToggle tier={tier} onChange={(m) => engineRef.current?.setQuality(m)} />
          </div>
        </section>
        <Contact />
      </main>
    </>
  )
}
