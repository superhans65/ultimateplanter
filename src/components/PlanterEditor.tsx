'use client'

import dynamic from 'next/dynamic'
import { ArrowDown, ArrowUp, Check, ChevronDown, Download, Eye, Flower2, RotateCcw, Save, ScanLine, Sparkles, UserRound } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { CameraView } from './PlanterPreview'
import {
  BODY_SHAPES,
  BODY_HEIGHT,
  DOG_PRESET,
  EYE_STYLES,
  LEG_HEIGHT,
  NOSE_STYLES,
  clonePreset,
  finalBounds,
  hasMouth,
  parseDesign,
  updateAtPath,
  validateDesign,
  type Animal,
  type PlanterDesign,
} from '@/lib/design'
import { planterThemeVariables } from '@/lib/theme'

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
  { label: 'Height', path: 'body.height', min: BODY_HEIGHT.min, max: BODY_HEIGHT.max, unit: 'mm' },
  { label: 'Roundness', path: 'body.roundness', min: 0, max: 1, step: 0.01 },
  { label: 'Taper', path: 'body.taper', min: -0.08, max: 0.2, step: 0.01 },
]

const openingControls: Control[] = [
  { label: 'Opening width', path: 'opening.width', min: 40, max: 165, unit: 'mm' },
  { label: 'Opening depth', path: 'opening.depth', min: 40, max: 145, unit: 'mm' },
  { label: 'Wall', path: 'opening.wall', min: 2, max: 8, step: 0.1, unit: 'mm' },
  { label: 'Floor', path: 'opening.floor', min: 2, max: 12, step: 0.5, unit: 'mm' },
]

// A round body's opening is cut by the rim, so only wall and floor apply.
const roundOpeningControls = openingControls.slice(2)

const animalControls: Control[] = [
  { label: 'Ear height', path: 'animalFeatures.earHeight', min: 15, max: 45, unit: 'mm' },
  { label: 'Ear width', path: 'animalFeatures.earWidth', min: 14, max: 38, unit: 'mm' },
]

const pawSizeControl: Control = { label: 'Paw size', path: 'animalFeatures.pawScale', min: 0.65, max: 1.5, step: 0.05 }
const pawHeightControl: Control = { label: 'Paw height', path: 'animalFeatures.pawHeight', min: 6, max: 70, unit: 'mm' }

const faceControls: Control[] = [
  { label: 'Eye spacing', path: 'face.spacing', min: 24, max: 65, unit: 'mm' },
  { label: 'Face height', path: 'face.vertical', min: 28, max: 100, unit: 'mm' },
  { label: 'Overall feature scale', path: 'face.scale', min: 0.65, max: 1.5, step: 0.05 },
  { label: 'Relief depth', path: 'face.depth', min: 1, max: 5, step: 0.1, unit: 'mm' },
]

const legHeightControl: Control = { label: 'Leg height', path: 'animalFeatures.legHeight', min: LEG_HEIGHT.min, max: LEG_HEIGHT.max, unit: 'mm' }
const eyeSizeControl: Control = { label: 'Eye size', path: 'face.eyeScale', min: 0.5, max: 1.8, step: 0.05 }
const noseSizeControl: Control = { label: 'Nose size', path: 'face.noseScale', min: 0.5, max: 1.8, step: 0.05 }
const mouthSizeControl: Control = { label: 'Mouth size', path: 'face.mouthScale', min: 0.5, max: 1.8, step: 0.05 }
const cheekSizeControl: Control = { label: 'Cheek size', path: 'face.cheekScale', min: 0.5, max: 1.8, step: 0.05 }

const characterNames: Record<Animal, string> = {
  cat: 'Curious cat',
  dog: 'Playful pup',
  koala: 'Cuddly koala',
  panda: 'Playful panda',
  mushroom: 'Kawaii mushroom',
  duck: 'Cheerful duck',
  pig: 'Pocket pig',
  kawaii: 'Kawaii classic',
  bunny: 'Sleepy bunny',
}

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
  const [design, setDesignState] = useState<PlanterDesign>(DOG_PRESET)
  const [lastValid, setLastValid] = useState<PlanterDesign>(DOG_PRESET)
  const setDesign = (next: PlanterDesign) => {
    if (validateDesign(next).length === 0) setLastValid(next)
    setDesignState(next)
  }
  const [inspect, setInspect] = useState(false)
  const [resetToken, setResetToken] = useState(0)
  const [cameraView, setCameraView] = useState<CameraView>('perspective')
  const [saved, setSaved] = useState(false)
  const issues = useMemo(() => validateDesign(design), [design])
  const bounds = useMemo(() => finalBounds(design), [design])

  // Hold off saving until the stored draft has been read; otherwise the
  // initial preset overwrites it before it can be restored.
  const [draftRestored, setDraftRestored] = useState(false)
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const draft = localStorage.getItem('ultimate-planter:draft')
      try {
        if (draft) setDesign(parseDesign(draft))
      } catch {
        localStorage.removeItem('ultimate-planter:draft')
      }
      setDraftRestored(true)
    }, 0)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (draftRestored) localStorage.setItem('ultimate-planter:draft', JSON.stringify(design))
  }, [design, draftRestored])

  const saveDesign = () => {
    const blob = new Blob([JSON.stringify(design, null, 2)], { type: 'application/json' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `ultimate-planter-${design.animal}.json`
    link.click()
    URL.revokeObjectURL(link.href)
    setSaved(true)
    window.setTimeout(() => setSaved(false), 1800)
  }

  const chooseAnimal = (animal: Animal) => {
    const preset = clonePreset(animal)
    setDesign(preset)
    setLastValid(preset)
  }

  const showCameraView = (view: CameraView) => {
    setCameraView(view)
    setResetToken((value) => value + 1)
  }

  const animalName = characterNames[design.animal]
  const previewNote = design.animal === 'mushroom'
    ? 'Two-part cap + stem assembly · separate spot pieces'
    : design.face.flatEyeMounts ? 'Shallow pads for post-print glass eyes'
      : design.animalFeatures.legs ? 'Legs lift the base · print with supports under the body'
        : 'Matte relief · accent colors require parts or paint'

  const hasEars = design.animal === 'cat' || design.animal === 'dog' || design.animal === 'koala' || design.animal === 'panda' || design.animal === 'bunny'
  const characterControls = hasEars ? animalControls : []
  return (
    <main className="product-shell" data-product-theme="planter" style={planterThemeVariables}>
      <header className="topbar">
        <a className="brand" href="#" aria-label="Ultimate Planter home">
          <span className="brand-mark"><Flower2 size={22} /></span>
          <span>ultimate<strong>planter</strong></span>
          <em>beta</em>
        </a>
        <nav>
          <span className="credits"><Sparkles size={15} /> Credits shared with Ultimate Cutter</span>
          <button className="ghost" type="button"><UserRound size={17} /> Sign in</button>
        </nav>
      </header>

      <section className="workspace">
        <aside className="sidebar">
          <div className="intro">
            <span className="eyebrow">Character studio</span>
            <h1>Make a planter<br />with personality.</h1>
            <p>Choose a printable character, then shape every detail for your space and your printer.</p>
          </div>

          <div className="preset-heading">
            <span>Start with a character</span>
            <span className="ready"><Check size={13} /> Ready</span>
          </div>
          <div className="animal-picker" aria-label="Character preset">
            <button className={design.animal === 'dog' ? 'active' : ''} onClick={() => chooseAnimal('dog')} aria-pressed={design.animal === 'dog'}>
              <span className="animal-avatar dog-avatar">🐶</span>
              <span><small>Floppy ears</small><strong>Playful pup</strong></span>
            </button>
            <button className={design.animal === 'cat' ? 'active' : ''} onClick={() => chooseAnimal('cat')} aria-pressed={design.animal === 'cat'}>
              <span className="animal-avatar cat-avatar">🐱</span>
              <span><small>Raised paws</small><strong>Curious cat</strong></span>
            </button>
            <button className={design.animal === 'koala' ? 'active' : ''} onClick={() => chooseAnimal('koala')} aria-pressed={design.animal === 'koala'}>
              <span className="animal-avatar koala-avatar">🐨</span>
              <span><small>Round ears</small><strong>Cuddly koala</strong></span>
            </button>
            <button className={design.animal === 'panda' ? 'active' : ''} onClick={() => chooseAnimal('panda')} aria-pressed={design.animal === 'panda'}>
              <span className="animal-avatar panda-avatar">🐼</span>
              <span><small>Eye patches</small><strong>Playful panda</strong></span>
            </button>
            <button className={design.animal === 'mushroom' ? 'active' : ''} onClick={() => chooseAnimal('mushroom')} aria-pressed={design.animal === 'mushroom'}>
              <span className="animal-avatar mushroom-avatar">🍄</span>
              <span><small>Two-part cap</small><strong>Kawaii mushroom</strong></span>
            </button>
            <button className={design.animal === 'duck' ? 'active' : ''} onClick={() => chooseAnimal('duck')} aria-pressed={design.animal === 'duck'}>
              <span className="animal-avatar duck-avatar">🐤</span>
              <span><small>Beak & feet</small><strong>Cheerful duck</strong></span>
            </button>
            <button className={design.animal === 'pig' ? 'active' : ''} onClick={() => chooseAnimal('pig')} aria-pressed={design.animal === 'pig'}>
              <span className="animal-avatar pig-avatar">🐷</span>
              <span><small>Snout detail</small><strong>Pocket pig</strong></span>
            </button>
            <button className={design.animal === 'kawaii' ? 'active' : ''} onClick={() => chooseAnimal('kawaii')} aria-pressed={design.animal === 'kawaii'}>
              <span className="animal-avatar kawaii-avatar">😊</span>
              <span><small>Arms & feet</small><strong>Kawaii classic</strong></span>
            </button>
            <button className={design.animal === 'bunny' ? 'active' : ''} onClick={() => chooseAnimal('bunny')} aria-pressed={design.animal === 'bunny'}>
              <span className="animal-avatar bunny-avatar">🐰</span>
              <span><small>Long ears</small><strong>Sleepy bunny</strong></span>
            </button>
          </div>

          <div className="groups">
            <Group title="Body" controls={bodyControls} design={design} setDesign={setDesign} open>
              <span className="option-label">Shape</span>
              <div className="segmented" aria-label="Body shape">
                {BODY_SHAPES.map((shape) => (
                  <button key={shape.value} className={design.body.shape === shape.value ? 'active' : ''} aria-pressed={design.body.shape === shape.value} onClick={() => setDesign(updateAtPath(design, 'body.shape', shape.value))}>{shape.label}</button>
                ))}
              </div>
            </Group>
            <Group title="Opening & base" controls={design.body.shape === 'round' ? roundOpeningControls : openingControls} design={design} setDesign={setDesign}>
              {design.body.shape === 'round' && <span className="option-label">The opening follows the round rim. Roundness and wall set its size.</span>}
              <Toggle label="Drainage hole" checked={design.opening.drainage} onChange={(value) => setDesign(updateAtPath(design, 'opening.drainage', value))} />
              {design.opening.drainage && <Slider control={{ label: 'Hole diameter', path: 'opening.drainDiameter', min: 4, max: 20, unit: 'mm' }} design={design} setDesign={setDesign} />}
            </Group>
            <Group title="Character" controls={characterControls} design={design} setDesign={setDesign}>
              <Toggle label="Front paws" checked={design.animalFeatures.paws} onChange={(value) => setDesign(updateAtPath(design, 'animalFeatures.paws', value))} />
              {design.animalFeatures.paws && (
                <>
                  <Slider control={pawSizeControl} design={design} setDesign={setDesign} />
                  <Slider control={pawHeightControl} design={design} setDesign={setDesign} />
                </>
              )}
              <Toggle label="Separate feet" checked={design.animalFeatures.feet} onChange={(value) => setDesign(updateAtPath(design, 'animalFeatures.feet', value))} />
              {/* Paw size also scales the feet, so it follows them when the front paws are off. */}
              {design.animalFeatures.feet && !design.animalFeatures.paws && <Slider control={pawSizeControl} design={design} setDesign={setDesign} />}
              <Toggle label="Legs" checked={design.animalFeatures.legs} onChange={(value) => setDesign(updateAtPath(design, 'animalFeatures.legs', value))} />
              {design.animalFeatures.legs && <Slider control={legHeightControl} design={design} setDesign={setDesign} />}
            </Group>
            <Group title="Face" controls={faceControls} design={design} setDesign={setDesign}>
              {!design.face.flatEyeMounts && (
                <>
                  <span className="option-label">Eyes</span>
                  <div className="segmented three" aria-label="Eye style">
                    {EYE_STYLES.map((style) => (
                      <button key={style.value} className={design.face.eyeStyle === style.value ? 'active' : ''} aria-pressed={design.face.eyeStyle === style.value} onClick={() => setDesign(updateAtPath(design, 'face.eyeStyle', style.value))}>{style.label}</button>
                    ))}
                  </div>
                </>
              )}
              <Slider control={design.face.flatEyeMounts ? { ...eyeSizeControl, label: 'Eye mount size' } : eyeSizeControl} design={design} setDesign={setDesign} />
              <Toggle label="Flat mounts for glass eyes" checked={design.face.flatEyeMounts} onChange={(value) => setDesign(updateAtPath(design, 'face.flatEyeMounts', value))} />
              <span className="option-label">Nose</span>
              <div className="segmented four" aria-label="Nose style">
                {NOSE_STYLES.map((style) => (
                  <button key={style.value} className={design.face.noseStyle === style.value ? 'active' : ''} aria-pressed={design.face.noseStyle === style.value} onClick={() => setDesign(updateAtPath(design, 'face.noseStyle', style.value))}>{style.label}</button>
                ))}
              </div>
              {design.face.noseStyle !== 'none' && <Slider control={noseSizeControl} design={design} setDesign={setDesign} />}
              {hasMouth(design.animal) && <Slider control={mouthSizeControl} design={design} setDesign={setDesign} />}
              <Toggle label="Cheeks" checked={design.face.cheeks} onChange={(value) => setDesign(updateAtPath(design, 'face.cheeks', value))} />
              {design.face.cheeks && <Slider control={cheekSizeControl} design={design} setDesign={setDesign} />}
              {design.animal === 'cat' && <Toggle label="Whiskers" checked={design.face.whiskers ?? false} onChange={(value) => setDesign(updateAtPath(design, 'face.whiskers', value))} />}
            </Group>
          </div>

          <button type="button" className="reset" onClick={() => setDesign(clonePreset(design.animal))}><RotateCcw size={15} /> Reset {animalName.toLowerCase()}</button>
        </aside>

        <section className="preview-panel">
          <div className="preview-toolbar">
            <div>
              <span>Live 3D preview · {animalName}</span>
              <small>Drag to orbit · scroll to zoom</small>
            </div>
            <div className="toolbar-actions">
              <button className={inspect ? 'active' : ''} onClick={() => setInspect(!inspect)}><ScanLine size={16} /> Inspect inside</button>
              <button className={cameraView === 'perspective' ? 'active' : ''} onClick={() => showCameraView('perspective')} title="Return to angled 3D view"><RotateCcw size={16} /> 3D</button>
              <button className={cameraView === 'front' ? 'active' : ''} onClick={() => showCameraView('front')} title="Front view"><Eye size={16} /> Front</button>
              <button className={cameraView === 'top' ? 'active' : ''} onClick={() => showCameraView('top')} title="Top view"><ArrowUp size={16} /> Top</button>
              <button className={cameraView === 'bottom' ? 'active' : ''} onClick={() => showCameraView('bottom')} title="Bottom view"><ArrowDown size={16} /> Bottom</button>
            </div>
          </div>
          <div className="preview-stage">
            <PlanterPreview design={issues.length ? lastValid : design} inspect={inspect} resetToken={resetToken} cameraView={cameraView} />
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
                <strong>{issues.length ? 'Check your design' : 'Design parameters valid'}</strong>
                <small>{issues[0]?.message ?? previewNote}</small>
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
