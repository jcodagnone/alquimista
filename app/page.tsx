'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Scale,
  Droplets,
  Thermometer,
  FlaskConical,
  Beaker,
  ArrowRight,
  Info,
  AlertTriangle,
  Download,
  X,
  Github,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  InputField,
  TemperatureField,
  ResultDisplay,
  NerdCard,
  ModuleCard,
} from '@/components/ui-components'
import {
  calculateDensity,
  calculateDilutionWater,
  correctHydrometerReading,
  calculateVolumeFromMass,
  validateTemperature,
} from '@/lib/density'

// ============================================================================
// Types
// ============================================================================

type ModuleId = 'weighing' | 'dilution' | 'hydrometer' | 'volume'

interface AppState {
  module: ModuleId
  temp: string // shared across all modules
  weighing: { targetMl: string; abv: string }
  dilution: { sourceMass: string; sourceAbv: string; targetAbv: string }
  hydrometer: { readingAbv: string }
  volume: { mass: string; abv: string }
}

const DEFAULT_STATE: AppState = {
  module: 'weighing',
  temp: '20',
  weighing: { targetMl: '', abv: '96' },
  dilution: { sourceMass: '', sourceAbv: '96', targetAbv: '60' },
  hydrometer: { readingAbv: '80' },
  volume: { mass: '', abv: '' },
}

const MODULES = [
  {
    id: 'weighing' as const,
    title: 'Pesaje de Alcohol Puro',
    description: 'Obtener gramos a pesar para un volumen objetivo',
    icon: Scale,
  },
  {
    id: 'dilution' as const,
    title: 'Dilución para Maceración/Embotellado',
    description: 'Calcular agua necesaria para diluir a graduación objetivo',
    icon: Droplets,
  },
  {
    id: 'hydrometer' as const,
    title: 'Corrección de Alcoholímetro',
    description: 'Corregir lectura del alcoholímetro por temperatura',
    icon: Thermometer,
  },
  {
    id: 'volume' as const,
    title: 'Volumen por Peso',
    description: 'Calcular volumen preciso a partir de masa y ABV',
    icon: FlaskConical,
  },
]

// ============================================================================
// URL Fragment State Management (using ~ separator to avoid CSS selector issues)
// ============================================================================

function encodeState(state: AppState): string {
  const parts: string[] = [state.module, state.temp]

  // Add weighing data
  parts.push(state.weighing.targetMl || '_', state.weighing.abv || '_')

  // Add dilution data
  parts.push(
    state.dilution.sourceMass || '_',
    state.dilution.sourceAbv || '_',
    state.dilution.targetAbv || '_'
  )

  // Add hydrometer data
  parts.push(state.hydrometer.readingAbv || '_')

  // Add volume data
  parts.push(state.volume.mass || '_', state.volume.abv || '_')

  return parts.join('~')
}

function decodeState(hash: string): AppState {
  if (!hash || hash === '#') return { ...DEFAULT_STATE }

  const parts = hash.replace('#', '').split('~')
  const get = (i: number, def: string) =>
    parts[i] && parts[i] !== '_' ? parts[i] : def

  return {
    module: (get(0, 'weighing') as ModuleId) || 'weighing',
    temp: get(1, '20'),
    weighing: {
      targetMl: get(2, ''),
      abv: get(3, '96'),
    },
    dilution: {
      sourceMass: get(4, ''),
      sourceAbv: get(5, '96'),
      targetAbv: get(6, '60'),
    },
    hydrometer: {
      readingAbv: get(7, '80'),
    },
    volume: {
      mass: get(8, ''),
      abv: get(9, ''),
    },
  }
}

// ============================================================================
// Install Banner Component
// ============================================================================

function InstallBanner({ onDismiss }: { onDismiss: () => void }) {
  const [isIOS, setIsIOS] = useState(false)
  const [isAndroid, setIsAndroid] = useState(false)

  useEffect(() => {
    const ua = navigator.userAgent
    setIsIOS(/iPad|iPhone|iPod/.test(ua))
    setIsAndroid(/Android/.test(ua))
  }, [])

  return (
    <div className="bg-card border-border fixed right-0 bottom-0 left-0 z-50 border-t p-4 shadow-lg">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="bg-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
              <Download className="text-primary-foreground h-5 w-5" />
            </div>
            <div>
              <p className="text-foreground font-medium">
                Instalar El Alquimista
              </p>
              <p className="text-muted-foreground mt-1 text-sm">
                {isIOS && (
                  <>
                    Tocá el botón <strong>Compartir</strong> y luego{' '}
                    <strong>Agregar a inicio</strong>
                  </>
                )}
                {isAndroid && (
                  <>
                    Tocá el menú <strong>⋮</strong> y luego{' '}
                    <strong>Instalar app</strong>
                  </>
                )}
                {!isIOS && !isAndroid && (
                  <>
                    En el menú de tu navegador, buscá{' '}
                    <strong>Instalar app</strong> o{' '}
                    <strong>Agregar a inicio</strong>
                  </>
                )}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            className="h-8 w-8 shrink-0 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Main App Component
// ============================================================================

export default function Home() {
  // State
  const [state, setState] = useState<AppState>(DEFAULT_STATE)
  const [isLoadingGeo, setIsLoadingGeo] = useState(false)
  const [geoError, setGeoError] = useState<string | null>(null)
  const [showInstallBanner, setShowInstallBanner] = useState(false)
  const [isHydrated, setIsHydrated] = useState(false)

  // Initialize from URL fragment on mount
  useEffect(() => {
    setState(decodeState(window.location.hash))
    setIsHydrated(true)

    // Check if we should show install banner
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone
    const dismissed = localStorage.getItem('install-banner-dismissed')

    if (!isStandalone && !dismissed) {
      // Show after 3 seconds
      const timer = setTimeout(() => setShowInstallBanner(true), 3000)
      return () => clearTimeout(timer)
    }
  }, [])

  // Sync state to URL fragment (use History API to avoid querySelector issues)
  useEffect(() => {
    if (isHydrated) {
      const newHash = '#' + encodeState(state)
      history.replaceState(null, '', newHash)
    }
  }, [state, isHydrated])

  // Update helpers
  const updateModule = useCallback((module: ModuleId) => {
    setState((s) => ({ ...s, module }))
  }, [])

  const updateTemp = useCallback((temp: string) => {
    setState((s) => ({ ...s, temp }))
  }, [])

  const updateWeighing = useCallback(
    (field: keyof AppState['weighing'], value: string) => {
      setState((s) => ({
        ...s,
        weighing: { ...s.weighing, [field]: value },
      }))
    },
    []
  )

  const updateDilution = useCallback(
    (field: keyof AppState['dilution'], value: string) => {
      setState((s) => ({
        ...s,
        dilution: { ...s.dilution, [field]: value },
      }))
    },
    []
  )

  const updateHydrometer = useCallback(
    (field: keyof AppState['hydrometer'], value: string) => {
      setState((s) => ({
        ...s,
        hydrometer: { ...s.hydrometer, [field]: value },
      }))
    },
    []
  )

  const updateVolume = useCallback(
    (field: keyof AppState['volume'], value: string) => {
      setState((s) => ({
        ...s,
        volume: { ...s.volume, [field]: value },
      }))
    },
    []
  )

  // Flow: Weighing -> Dilution
  const useWeighingInDilution = useCallback((massG: string, abv: string) => {
    setState((s) => ({
      ...s,
      module: 'dilution',
      dilution: { ...s.dilution, sourceMass: massG, sourceAbv: abv },
    }))
  }, [])

  // Flow: Hydrometer -> Volume
  const useHydrometerInVolume = useCallback((abv: string) => {
    setState((s) => ({
      ...s,
      module: 'volume',
      volume: { ...s.volume, abv },
    }))
  }, [])

  // Fetch geo temperature
  const fetchGeoTemp = useCallback(async () => {
    setIsLoadingGeo(true)
    setGeoError(null)

    try {
      const geoRes = await fetch('https://ipapi.co/json/', {
        cache: 'force-cache',
      })
      if (!geoRes.ok) throw new Error('No se pudo obtener ubicación')
      const geo = await geoRes.json()

      const weatherRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${geo.latitude}&longitude=${geo.longitude}&current=temperature_2m`,
        { cache: 'no-store' }
      )
      if (!weatherRes.ok) throw new Error('No se pudo obtener temperatura')
      const weather = await weatherRes.json()

      updateTemp(Math.round(weather.current.temperature_2m).toString())
    } catch (err) {
      setGeoError(
        err instanceof Error ? err.message : 'Error al obtener temperatura'
      )
    } finally {
      setIsLoadingGeo(false)
    }
  }, [updateTemp])

  // Dismiss install banner
  const dismissInstallBanner = useCallback(() => {
    setShowInstallBanner(false)
    localStorage.setItem('install-banner-dismissed', 'true')
  }, [])

  const currentModule = MODULES.find((m) => m.id === state.module) || MODULES[0]

  if (!isHydrated) {
    return (
      <main className="bg-background flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">Cargando...</div>
      </main>
    )
  }

  return (
    <main className="bg-background min-h-screen pb-20">
      {/* Header */}
      <header className="border-border bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10 border-b backdrop-blur">
        <div className="mx-auto max-w-2xl px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-primary flex h-10 w-10 items-center justify-center rounded-lg">
                <Beaker className="text-primary-foreground h-5 w-5" />
              </div>
              <div>
                <h1 className="text-foreground text-lg font-semibold">
                  El Alquimista
                </h1>
                <p className="text-muted-foreground text-xs">
                  Calculadora de Destilación
                </p>
              </div>
            </div>
            <a
              href="https://github.com/jcodagnone/alquimista"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Ver código fuente en GitHub"
              title="Ver código fuente en GitHub"
            >
              <Github className="h-6 w-6" />
            </a>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-6">
        {/* Module Selector */}
        <nav className="mb-8 space-y-3" aria-label="Módulos de cálculo">
          {MODULES.map((m) => (
            <ModuleCard
              key={m.id}
              title={m.title}
              description={m.description}
              icon={m.icon}
              active={state.module === m.id}
              onClick={() => updateModule(m.id)}
            />
          ))}
        </nav>

        {/* Active Calculator */}
        <section
          className="border-border bg-card rounded-xl border p-6"
          aria-label={currentModule.title}
        >
          <h2 className="text-foreground mb-6 text-xl font-semibold">
            {currentModule.title}
          </h2>

          {state.module === 'weighing' && (
            <WeighingCalc
              data={state.weighing}
              temp={state.temp}
              onUpdate={updateWeighing}
              onTempChange={updateTemp}
              onFetchGeo={fetchGeoTemp}
              isLoadingGeo={isLoadingGeo}
              geoError={geoError}
              onUseDilution={useWeighingInDilution}
            />
          )}

          {state.module === 'dilution' && (
            <DilutionCalc
              data={state.dilution}
              temp={state.temp}
              onUpdate={updateDilution}
              onTempChange={updateTemp}
              onFetchGeo={fetchGeoTemp}
              isLoadingGeo={isLoadingGeo}
              geoError={geoError}
            />
          )}

          {state.module === 'hydrometer' && (
            <HydrometerCalc
              data={state.hydrometer}
              temp={state.temp}
              onUpdate={updateHydrometer}
              onTempChange={updateTemp}
              onFetchGeo={fetchGeoTemp}
              isLoadingGeo={isLoadingGeo}
              geoError={geoError}
              onUseVolume={useHydrometerInVolume}
            />
          )}

          {state.module === 'volume' && (
            <VolumeCalc
              data={state.volume}
              temp={state.temp}
              onUpdate={updateVolume}
              onTempChange={updateTemp}
              onFetchGeo={fetchGeoTemp}
              isLoadingGeo={isLoadingGeo}
              geoError={geoError}
            />
          )}
        </section>

        {/* Footer */}
        <footer className="text-muted-foreground mt-8 text-center text-xs">
          <p>Cálculos basados en OIML R 22</p>
          <p className="mt-1">Tablas Alcohólometricas Internacionales</p>
          <a
            href="https://github.com/jcodagnone/alquimista"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground mt-3 inline-flex items-center gap-1.5 transition-colors"
          >
            <Github className="h-4 w-4" />
            <span>Ver código fuente</span>
          </a>
        </footer>
      </div>

      {/* Install Banner */}
      {showInstallBanner && <InstallBanner onDismiss={dismissInstallBanner} />}
    </main>
  )
}

// ============================================================================
// Calculator Components (inlined to reduce file count)
// ============================================================================

interface CalcProps<T> {
  data: T
  temp: string
  onUpdate: (field: keyof T, value: string) => void
  onTempChange: (temp: string) => void
  onFetchGeo: () => Promise<void>
  isLoadingGeo: boolean
  geoError: string | null
}

// ---------- Weighing Calculator ----------

function WeighingCalc({
  data,
  temp,
  onUpdate,
  onTempChange,
  onFetchGeo,
  isLoadingGeo,
  geoError,
  onUseDilution,
}: CalcProps<AppState['weighing']> & {
  onUseDilution: (massG: string, abv: string) => void
}) {
  const tempVal = validateTemperature(parseFloat(temp) || 20)

  const result = useMemo(() => {
    const targetMl = parseFloat(data.targetMl)
    const abv = parseFloat(data.abv)
    const t = parseFloat(temp)

    if (
      isNaN(targetMl) ||
      targetMl <= 0 ||
      isNaN(abv) ||
      abv < 0 ||
      abv > 100 ||
      isNaN(t) ||
      t < -10 ||
      t > 50
    )
      return null

    const density = calculateDensity(abv, t)
    return { massG: parseFloat((targetMl * density).toFixed(2)), density }
  }, [data, temp])

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <InputField
          label="Volumen objetivo"
          type="number"
          inputMode="decimal"
          step="1"
          placeholder="1000"
          unit="mL"
          value={data.targetMl}
          onChange={(e) => onUpdate('targetMl', e.target.value)}
          hint="Cantidad de volumen de alcohol que querés obtener"
          maxWidth="max-w-[200px]"
        />
        <InputField
          label="Grado alcohólico (ABV)"
          type="number"
          inputMode="decimal"
          step="0.1"
          min="0"
          max="100"
          placeholder="96"
          unit="%"
          value={data.abv}
          onChange={(e) => onUpdate('abv', e.target.value)}
          hint="Concentración del alcohol base (ej: 96% para etanol)"
          maxWidth="max-w-[200px]"
        />
        <TemperatureField
          value={temp}
          onChange={(e) => onTempChange(e.target.value)}
          onFetchGeo={onFetchGeo}
          isLoadingGeo={isLoadingGeo}
          geoError={geoError}
          warning={tempVal.warning !== 'none' ? tempVal.message : undefined}
        />
      </div>

      {result && (
        <div className="border-border space-y-4 border-t pt-4">
          <ResultDisplay
            label="Peso a medir"
            value={result.massG.toLocaleString('es-UY', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
            unit="g"
            highlight
          />
          <ResultDisplay
            label="Densidad de la mezcla"
            value={result.density.toFixed(4)}
            unit="g/mL"
          />
          <Button
            onClick={() => onUseDilution(result.massG.toFixed(2), data.abv)}
            variant="secondary"
            size="lg"
            className="w-full"
          >
            <span>Usar en Dilución</span>
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <NerdCard>
            <p>
              <span className="text-foreground">Fórmula:</span> m = V × ρ
            </p>
            <p className="pl-4">
              V = {data.targetMl} mL, ρ = {result.density} g/mL
            </p>
            <p className="pl-4">
              m = {data.targetMl} × {result.density} = {result.massG} g
            </p>
          </NerdCard>
        </div>
      )}
    </div>
  )
}

// ---------- Dilution Calculator ----------

function DilutionCalc({
  data,
  temp,
  onUpdate,
  onTempChange,
  onFetchGeo,
  isLoadingGeo,
  geoError,
}: CalcProps<AppState['dilution']>) {
  const result = useMemo(() => {
    const sourceMass = parseFloat(data.sourceMass)
    const sourceAbv = parseFloat(data.sourceAbv)
    const targetAbv = parseFloat(data.targetAbv)
    const t = parseFloat(temp)

    if (
      isNaN(sourceMass) ||
      sourceMass <= 0 ||
      isNaN(sourceAbv) ||
      sourceAbv <= 0 ||
      sourceAbv > 100 ||
      isNaN(targetAbv) ||
      targetAbv <= 0 ||
      targetAbv >= sourceAbv ||
      isNaN(t) ||
      t < -10 ||
      t > 50
    )
      return null

    return calculateDilutionWater(sourceMass, sourceAbv, targetAbv)
  }, [data, temp])

  const isMassLinked = data.sourceMass !== ''

  return (
    <div className="space-y-6">
      {isMassLinked && (
        <div className="border-primary/30 bg-primary/5 flex items-start gap-3 rounded-lg border p-3">
          <Info className="text-primary mt-0.5 h-4 w-4 shrink-0" />
          <p className="text-muted-foreground text-xs">
            Podés vincular la masa desde el pesaje de alcohol puro.
          </p>
        </div>
      )}

      <div className="space-y-4">
        <InputField
          label="Masa del alcohol base"
          type="number"
          inputMode="decimal"
          step="0.1"
          placeholder="0.0"
          unit="g"
          value={data.sourceMass}
          onChange={(e) => onUpdate('sourceMass', e.target.value)}
          hint="Peso del espíritu a diluir"
          maxWidth="max-w-[200px]"
        />
        <div className="grid grid-cols-2 gap-4">
          <InputField
            label="ABV inicial"
            type="number"
            inputMode="decimal"
            step="0.1"
            placeholder="96"
            unit="%"
            value={data.sourceAbv}
            onChange={(e) => onUpdate('sourceAbv', e.target.value)}
          />
          <InputField
            label="ABV objetivo"
            type="number"
            inputMode="decimal"
            step="0.1"
            placeholder="60"
            unit="%"
            value={data.targetAbv}
            onChange={(e) => onUpdate('targetAbv', e.target.value)}
          />
        </div>
        <TemperatureField
          value={temp}
          onChange={(e) => onTempChange(e.target.value)}
          onFetchGeo={onFetchGeo}
          isLoadingGeo={isLoadingGeo}
          geoError={geoError}
        />
      </div>

      {result && (
        <div className="border-border space-y-4 border-t pt-4">
          <ResultDisplay
            label="Agua a agregar"
            value={result.waterToAddG.toLocaleString('es-UY', {
              minimumFractionDigits: 1,
              maximumFractionDigits: 1,
            })}
            unit="g"
            highlight
          />
          <div className="grid grid-cols-2 gap-4">
            <ResultDisplay
              label="Masa final"
              value={result.finalMassG.toLocaleString('es-UY')}
              unit="g"
            />
            <ResultDisplay
              label="Etanol puro"
              value={result.ethanolMassG.toLocaleString('es-UY')}
              unit="g"
            />
          </div>
          <NerdCard>
            <p>
              <span className="text-foreground">Método gravimétrico</span>
            </p>
            <p>
              W₁ = {(result.sourceMassFraction * 100).toFixed(2)}% (fracción
              másica origen)
            </p>
            <p>
              m_eth = {data.sourceMass} × {result.sourceMassFraction.toFixed(4)}{' '}
              = {result.ethanolMassG} g
            </p>
            <p>
              W₂ = {(result.targetMassFraction * 100).toFixed(2)}% (fracción
              másica destino)
            </p>
            <p>
              m_final = {result.ethanolMassG} /{' '}
              {result.targetMassFraction.toFixed(4)} = {result.finalMassG} g
            </p>
            <p>
              H₂O = {result.finalMassG} - {data.sourceMass} ={' '}
              {result.waterToAddG} g
            </p>
          </NerdCard>
        </div>
      )}
    </div>
  )
}

// ---------- Hydrometer Calculator ----------

function HydrometerCalc({
  data,
  temp,
  onUpdate,
  onTempChange,
  onFetchGeo,
  isLoadingGeo,
  geoError,
  onUseVolume,
}: CalcProps<AppState['hydrometer']> & {
  onUseVolume: (abv: string) => void
}) {
  const tempVal = validateTemperature(parseFloat(temp) || 20)

  const result = useMemo(() => {
    const reading = parseFloat(data.readingAbv)
    const t = parseFloat(temp)

    if (
      isNaN(reading) ||
      reading < 0 ||
      reading > 100 ||
      isNaN(t) ||
      t < -10 ||
      t > 50
    )
      return null

    return correctHydrometerReading(reading, t)
  }, [data, temp])

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <InputField
          label="Lectura del alcoholímetro"
          type="number"
          inputMode="decimal"
          step="0.1"
          placeholder="80"
          unit="%"
          value={data.readingAbv}
          onChange={(e) => onUpdate('readingAbv', e.target.value)}
          hint="Valor que indica el alcoholímetro"
        />
        <TemperatureField
          value={temp}
          onChange={(e) => onTempChange(e.target.value)}
          onFetchGeo={onFetchGeo}
          isLoadingGeo={isLoadingGeo}
          geoError={geoError}
          warning={tempVal.warning !== 'none' ? tempVal.message : undefined}
        />
      </div>

      {result?.outsideTableRange && (
        <div className="border-destructive bg-destructive/10 flex items-start gap-3 rounded-lg border p-4">
          <AlertTriangle className="text-destructive mt-0.5 h-5 w-5 shrink-0" />
          <p className="text-muted-foreground text-sm">
            Temperatura fuera de tabla (10-30°C). El resultado puede ser
            impreciso.
          </p>
        </div>
      )}

      {result && (
        <div className="border-border space-y-4 border-t pt-4">
          <ResultDisplay
            label="ABV real (a 20°C)"
            value={result.trueAbv.toFixed(1)}
            unit="%"
            highlight
          />
          <ResultDisplay
            label="Corrección aplicada"
            value={
              result.correction >= 0
                ? `+${result.correction.toFixed(1)}`
                : result.correction.toFixed(1)
            }
            unit="%"
          />
          <Button
            onClick={() => onUseVolume(result.trueAbv.toFixed(1))}
            variant="secondary"
            size="lg"
            className="w-full"
          >
            <span>Usar en Volumen por Peso</span>
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <NerdCard>
            <p>
              <span className="text-foreground">
                Corrección por temperatura
              </span>
            </p>
            <p>
              Lectura: {data.readingAbv}% a {temp}°C
            </p>
            <p>Rango ABV: {result.abvRange}%</p>
            <p>
              Factor: {result.correction >= 0 ? '+' : ''}
              {result.correction.toFixed(1)}%
            </p>
            <p>
              ABV_real = {data.readingAbv} + (
              {result.correction >= 0 ? '+' : ''}
              {result.correction.toFixed(1)}) = {result.trueAbv.toFixed(1)}%
            </p>
          </NerdCard>
        </div>
      )}
    </div>
  )
}

// ---------- Volume Calculator ----------

function VolumeCalc({
  data,
  temp,
  onUpdate,
  onTempChange,
  onFetchGeo,
  isLoadingGeo,
  geoError,
}: CalcProps<AppState['volume']>) {
  const tempVal = validateTemperature(parseFloat(temp) || 20)

  const result = useMemo(() => {
    const mass = parseFloat(data.mass)
    const abv = parseFloat(data.abv)
    const t = parseFloat(temp)

    if (
      isNaN(mass) ||
      mass <= 0 ||
      isNaN(abv) ||
      abv < 0 ||
      abv > 100 ||
      isNaN(t) ||
      t < -10 ||
      t > 50
    )
      return null

    return calculateVolumeFromMass(mass, abv, t)
  }, [data, temp])

  const isAbvLinked = data.abv !== ''

  return (
    <div className="space-y-6">
      {isAbvLinked && (
        <div className="border-primary/30 bg-primary/5 flex items-start gap-3 rounded-lg border p-3">
          <Info className="text-primary mt-0.5 h-4 w-4 shrink-0" />
          <p className="text-muted-foreground text-xs">
            Podés vincular el ABV desde la corrección de alcoholímetro.
          </p>
        </div>
      )}

      <div className="space-y-4">
        <InputField
          label="Masa"
          type="number"
          inputMode="decimal"
          step="0.1"
          placeholder="0.0"
          unit="g"
          value={data.mass}
          onChange={(e) => onUpdate('mass', e.target.value)}
          hint="Peso del líquido en gramos"
        />
        <InputField
          label="Grado alcohólico (ABV)"
          type="number"
          inputMode="decimal"
          step="0.1"
          placeholder="40"
          unit="%"
          value={data.abv}
          onChange={(e) => onUpdate('abv', e.target.value)}
          hint="Porcentaje de alcohol por volumen"
        />
        <TemperatureField
          value={temp}
          onChange={(e) => onTempChange(e.target.value)}
          onFetchGeo={onFetchGeo}
          isLoadingGeo={isLoadingGeo}
          geoError={geoError}
          warning={tempVal.warning !== 'none' ? tempVal.message : undefined}
        />
      </div>

      {result && (
        <div className="border-border space-y-4 border-t pt-4">
          <ResultDisplay
            label="Volumen calculado"
            value={result.volumeMl.toLocaleString('es-UY', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
            unit="mL"
            highlight
          />
          <ResultDisplay
            label="Densidad de la mezcla"
            value={result.density.toFixed(4)}
            unit="g/mL"
          />
          <NerdCard>
            <p>
              <span className="text-foreground">Fórmula:</span> V = m / ρ
            </p>
            <p className="pl-4">
              m = {data.mass} g, ρ = {result.density} g/mL
            </p>
            <p className="pl-4">
              V = {data.mass} / {result.density} = {result.volumeMl.toFixed(2)}{' '}
              mL
            </p>
          </NerdCard>
        </div>
      )}
    </div>
  )
}
