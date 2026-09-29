'use client'

import dynamic from 'next/dynamic'
import { Check, ChevronDown, Download, Eye, Flower2, RotateCcw, Save, ScanLine, Sparkles, UserRound } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import {
  CAT_PRESET,
  clonePreset,
  finalBounds,
  updateAtPath,
  validateDesign,
  type PlanterDesign,
} from '@/lib/design'

const PlanterPreview = dynamic(() => import('./PlanterPreview'), {
  ssr: false,
  loading: () => <div className="preview-loading">Growing your preview…</div>,
})

type Control = {
  label: string
  path: string
  min: number
  max: number
  step?: number
  unit?: string
}

const bodyControls: Control[] = [
  { label: 'Width', path: 'body.width', min: 70, max: 180, unit: 'mm' },
  { label: 'Depth', path: 'body.depth', min: 65, max: 160, unit: 'mm' },
  { label: 'Height', path: 'body.height', min: 60, max: 160, unit: 'mm' },
  { label: 'Roundness', path: 'body.roundness', min: 0, max: 1, step: 0.01 },
  { label: 'Taper', path: 'body.taper', min: -0.08, max: 0.2, step: 0.01 },
]

const openingControls: Control[] = [
  { label: 'Opening width', path: 'opening.width', min: 40, max: 165, unit: 'mm' },
  { label: 'Opening depth', path: 'opening.depth', min: 40, max: 145, unit: 'mm' },
  { label: 'Wall', path: 'opening.wall', min: 2, max: 8, step: 0.1, unit: 'mm' },
  { label: 'Floor', path: 'opening.floor', min: 2, max: 12, step: 0.5, unit: 'mm' },
]

const animalControls: Control[] = [
  { label: 'Ear height', path: 'animalFeatures.earHeight', min: 15, max: 45, unit: 'mm' },
  { label: 'Ear width', path: 'animalFeatures.earWidth', min: 14, max: 38, unit: 'mm' },
  { label: 'Paw size', path: 'animalFeatures.pawScale', min: 0.65, max: 1.5, step: 0.05 },
]

const faceControls: Control[] = [
  { label: 'Eye spacing', path: 'face.spacing', min: 24, max: 65, unit: 'mm' },
  { label: 'Face height', path: 'face.vertical', min: 28, max: 100, unit: 'mm' },
  { label: 'Feature scale', path: 'face.scale', min: 0.65, max: 1.5, step: 0.05 },
  { label: 'Relief depth', path: 'face.depth', min: 1, max: 5, step: 0.1, unit: 'mm' },
]

function readNumber(design: PlanterDesign, path: string): number {
  const [section, key] = path.split('.') as [keyof PlanterDesign, string]
  return (design[section] as unknown as Record<string, number>)[key]
}

function Slider({
  control,
  design,
  setDesign,
}: {
  control: Control
  design: PlanterDesign
  setDesign: (value: PlanterDesign) => void
}) {
  const value = readNumber(design, control.path)
  return (
    <label className="slider-row">
      <span>{control.label}</span>
      <span className="value">{value}{control.unit && <small>{control.unit}</small>}</span>
      <input
        aria-label={control.label}
        type="range"
        min={control.min}
        max={control.max}
        step={control.step ?? 1}
        value={value}
        onChange={(event) => setDesign(updateAtPath(design, control.path, Number(event.target.value)))}
      />
    </label>
  )
}

function Group({
  title,
  controls,
  design,
  setDesign,
  children,
  open = false,
}: {
  title: string
  controls: Control[]
  design: PlanterDesign
  setDesign: (value: PlanterDesign) => void
  children?: React.ReactNode
  open?: boolean
}) {
  return (
    <details className="control-group" open={open}>
      <summary>{title}<ChevronDown size={17} /></summary>
      <div className="control-content">
        {controls.map((control) => <Slider key={control.path} control={control} design={design} setDesign={setDesign} />)}
        {children}
      </div>
    </details>
  )
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="toggle-row">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <i aria-hidden="true" />
    </label>
  )
}

export function PlanterEditor() {
  const [design, setDesignState] = useState<PlanterDesign>(CAT_PRESET)
  const [lastValid, setLastValid] = useState<PlanterDesign>(CAT_PRESET)
  const setDesign = (next: PlanterDesign) => {
    if (validateDesign(next).length === 0) setLastValid(next)
    setDesignState(next)
  }
  const [inspect, setInspect] = useState(false)
  const [resetToken, setResetToken] = useState(0)
  const [saved, setSaved] = useState(false)
  const issues = useMemo(() => validateDesign(design), [design])
  const bounds = useMemo(() => finalBounds(design), [design])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const draft = localStorage.getItem('ultimate-planter:draft')
      if (!draft) return
      try {
        const parsed = JSON.parse(draft) as PlanterDesign
        if (parsed.version === 1 && parsed.animal === 'cat') setDesign(parsed)
      } catch {
        localStorage.removeItem('ultimate-planter:draft')
      }
    }, 0)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    localStorage.setItem('ultimate-planter:draft', JSON.stringify(design))
  }, [design])

  const saveDesign = () => {
    const blob = new Blob([JSON.stringify(design, null, 2)], { type: 'application/json' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'ultimate-planter-cat.json'
    link.click()
    URL.revokeObjectURL(link.href)
    setSaved(true)
    window.setTimeout(() => setSaved(false), 1800)
  }

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#" aria-label="Ultimate Planter home">
          <span className="brand-mark"><Flower2 size={22} /></span>
          <span>ultimate<strong>planter</strong></span>
          <em>beta</em>
        </a>
        <nav>
          <span className="credits"><Sparkles size={15} /> Credits shared with Ultimate Cutter</span>
          <button className="ghost"><UserRound size={17} /> Sign in</button>
        </nav>
      </header>

      <section className="workspace">
        <aside className="sidebar">
          <div className="intro">
            <span className="eyebrow">Animal studio</span>
            <h1>Make a planter<br />with personality.</h1>
            <p>Start with a cat, then shape every detail for your space and your printer.</p>
          </div>

          <div className="preset">
            <span className="cat-avatar">🐱</span>
            <div><small>Current animal</small><strong>Curious cat</strong></div>
            <span className="ready"><Check size={13} /> Ready</span>
          </div>

          <div className="groups">
            <Group title="Body" controls={bodyControls} design={design} setDesign={setDesign} open />
            <Group title="Opening & base" controls={openingControls} design={design} setDesign={setDesign}>
              <Toggle label="Drainage hole" checked={design.opening.drainage} onChange={(value) => setDesign(updateAtPath(design, 'opening.drainage', value))} />
              {design.opening.drainage && <Slider control={{ label: 'Hole diameter', path: 'opening.drainDiameter', min: 4, max: 20, unit: 'mm' }} design={design} setDesign={setDesign} />}
            </Group>
            <Group title="Animal" controls={animalControls} design={design} setDesign={setDesign}>
              <Toggle label="Front paws" checked={design.animalFeatures.paws} onChange={(value) => setDesign(updateAtPath(design, 'animalFeatures.paws', value))} />
            </Group>
            <Group title="Face" controls={faceControls} design={design} setDesign={setDesign}>
              <div className="segmented">
                <button className={design.face.eyeStyle === 'round' ? 'active' : ''} onClick={() => setDesign(updateAtPath(design, 'face.eyeStyle', 'round'))}>Round eyes</button>
                <button className={design.face.eyeStyle === 'sleepy' ? 'active' : ''} onClick={() => setDesign(updateAtPath(design, 'face.eyeStyle', 'sleepy'))}>Sleepy</button>
              </div>
              <Toggle label="Cheeks" checked={design.face.cheeks} onChange={(value) => setDesign(updateAtPath(design, 'face.cheeks', value))} />
            </Group>
          </div>

          <button className="reset" onClick={() => setDesign(clonePreset())}><RotateCcw size={15} /> Reset to cat preset</button>
        </aside>

        <section className="preview-panel">
          <div className="preview-toolbar">
            <div>
              <span>Live 3D preview</span>
              <small>Drag to orbit · scroll to zoom</small>
            </div>
            <div className="toolbar-actions">
              <button className={inspect ? 'active' : ''} onClick={() => setInspect(!inspect)}><ScanLine size={16} /> Inspect inside</button>
              <button onClick={() => setResetToken((value) => value + 1)}><Eye size={16} /> Reset view</button>
            </div>
          </div>
          <div className="preview-stage">
            <PlanterPreview design={issues.length ? lastValid : design} inspect={inspect} resetToken={resetToken} />
            <div className="dimension-pill">
              <span>Final bounds</span>
              <strong>{bounds.width.toFixed(0)} × {bounds.depth.toFixed(0)} × {bounds.height.toFixed(0)} mm</strong>
            </div>
            <span className="scale-note">10 mm grid</span>
          </div>
          <footer className="export-bar">
            <div className="status">
              <span className={issues.length ? 'status-dot invalid' : 'status-dot'} />
              <div>
                <strong>{issues.length ? 'Check your design' : 'Geometry looks healthy'}</strong>
                <small>{issues[0]?.message ?? 'Closed vessel preview · base on Z = 0'}</small>
              </div>
            </div>
            <button className="save" onClick={saveDesign}><Save size={17} /> {saved ? 'Saved' : 'Save design'}</button>
            <button className="export" disabled={issues.length > 0} title="Secure manifold STL export is the next implementation milestone">
              <Download size={18} />
              <span>Prepare STL<small>shared-credit export coming next</small></span>
            </button>
          </footer>
        </section>
      </section>
    </main>
  )
}
