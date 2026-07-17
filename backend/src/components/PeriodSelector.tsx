"use client";

import { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Calendar, ChevronDown, Check } from "lucide-react"
import { cn } from "@/lib/utils"

export type PeriodRange = { from: string; to: string; label: string }

type PresetMode = "hari-ini" | "bulan-ini" | "semua" | "kustom"

interface SavedState {
  preset: PresetMode
  customFrom: string
  customTo: string
}

function computePeriodFromState(state: SavedState): PeriodRange {
  const now = new Date()
  if (state.preset === "hari-ini") {
     const today = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split('T')[0]
     return { from: today, to: today, label: "Hari Ini" }
  } else if (state.preset === "bulan-ini") {
     const y = now.getFullYear()
     const m = now.getMonth()
     const firstDay = new Date(y, m, 1)
     const lastDay = new Date(y, m + 1, 0)
     const fDate = new Date(firstDay.getTime() - firstDay.getTimezoneOffset() * 60000).toISOString().split('T')[0]
     const lDate = new Date(lastDay.getTime() - lastDay.getTimezoneOffset() * 60000).toISOString().split('T')[0]
     return { from: fDate, to: lDate, label: "Bulan Ini" }
  } else if (state.preset === "kustom") {
     return { from: state.customFrom, to: state.customTo, label: `${state.customFrom} - ${state.customTo}` }
  }
  return { from: "", to: "", label: "Semua Waktu" }
}

// Reports uses `const [period] = useState(getInitialPeriod)` for its initial
// range. This selector defaults to the current month, so the initial period
// matches what the control shows on first paint.
export function getInitialPeriod(): PeriodRange {
  return computePeriodFromState({ preset: "bulan-ini", customFrom: "", customTo: "" })
}

// `onSelect` is optional and additive: the Dashboard renders <PeriodSelector />
// and relies solely on the URL sync below, while Reports passes onSelect to drive
// its own period state. Both fire together; neither breaks the other.
export function PeriodSelector({ onSelect }: { onSelect?: (range: PeriodRange) => void } = {}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [preset, setPreset] = useState<PresetMode>("bulan-ini")
  const [customFrom, setCustomFrom] = useState("")
  const [customTo, setCustomTo] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Initialize from URL params if present
  useEffect(() => {
    const from = searchParams.get("from")
    const to = searchParams.get("to")
    if (from && to) {
      setPreset("kustom")
      setCustomFrom(from)
      setCustomTo(to)
    }
  }, [searchParams])

  // Sync state changes to URL
  const updateUrl = (state: SavedState) => {
    const range = computePeriodFromState(state)
    const current = new URLSearchParams(Array.from(searchParams.entries()))
    
    if (range.from && range.to) {
      current.set("from", range.from)
      current.set("to", range.to)
    } else {
      current.delete("from")
      current.delete("to")
    }

    const search = current.toString()
    const query = search ? `?${search}` : ""
    router.replace(`${pathname}${query}`, { scroll: false })
  }

  useEffect(() => {
    if (preset === "kustom" && (!customFrom || !customTo)) return;
    onSelect?.(computePeriodFromState({ preset, customFrom, customTo }))
    updateUrl({ preset, customFrom, customTo })
  }, [preset, customFrom, customTo])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const presetLabels = {
    "hari-ini": "Hari Ini",
    "bulan-ini": "Bulan Ini",
    "semua": "Semua Waktu",
    "kustom": "Kustom"
  }

  return (
    <div className="relative w-full md:w-auto" ref={ref}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full md:w-auto gap-2 md:gap-2.5 h-9 md:h-9 px-4 md:px-4 rounded-full border border-border/80 bg-background/80 backdrop-blur-md hover:bg-muted/60 text-[13px] md:text-sm font-medium shadow-sm transition-all duration-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
      >
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 md:h-4 md:w-4 text-primary" />
          <span className="whitespace-nowrap">{presetLabels[preset]}</span>
          
          {preset === "kustom" && customFrom && customTo && (
             <span className="hidden md:inline-flex text-muted-foreground text-[11px] font-normal border-l pl-2.5 ml-1 animate-in fade-in slide-in-from-left-1">
               {new Date(customFrom).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} - {new Date(customTo).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
             </span>
          )}
        </div>
        
        <ChevronDown className={cn("h-4 w-4 md:h-4 md:w-4 text-muted-foreground transition-transform duration-300 ease-spring ml-2", isOpen && "rotate-180")} />
      </button>

      <div className={cn(
        "absolute top-[calc(100%+0.5rem)] right-0 left-0 md:left-auto p-1.5 w-full md:w-[280px] bg-card rounded-xl border shadow-xl transition-all duration-300 origin-top md:origin-top-right z-50",
        isOpen ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 -translate-y-2 pointer-events-none"
      )}>
        <div className="flex flex-col gap-0.5">
          {Object.entries(presetLabels).map(([key, label]) => (
            <button
              key={key}
              onClick={() => {
                setPreset(key as PresetMode)
                if (key !== "kustom") setIsOpen(false)
              }}
              className={cn(
                "flex items-center justify-between w-full text-left px-3 py-2.5 text-[13px] md:text-sm rounded-lg transition-all duration-200",
                preset === key 
                  ? "bg-primary/10 text-primary font-semibold shadow-sm" 
                  : "hover:bg-muted/80 text-foreground hover:pl-4"
              )}
            >
              {label}
              {preset === key && <Check className="h-3.5 w-3.5 md:h-4 md:w-4 animate-in zoom-in" />}
            </button>
          ))}
        </div>

        <div className={cn(
          "overflow-hidden transition-all duration-400 ease-spring",
          preset === "kustom" ? "max-h-[200px] opacity-100 mt-2 pt-2 border-t" : "max-h-0 opacity-0"
        )}>
          <div className="grid grid-cols-2 gap-2 p-1">
            <div className="space-y-1">
              <label className="text-[9px] md:text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Mulai Dari</label>
              <Input 
                type="date" 
                value={customFrom} 
                onChange={e => setCustomFrom(e.target.value)} 
                className="h-8 text-xs px-2 bg-muted/30 focus-visible:bg-background transition-colors" 
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] md:text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Sampai Akhir</label>
              <Input 
                type="date" 
                value={customTo} 
                onChange={e => setCustomTo(e.target.value)} 
                className="h-8 text-xs px-2 bg-muted/30 focus-visible:bg-background transition-colors" 
              />
            </div>
          </div>
          <Button 
            className="w-full mt-2 h-8 text-xs rounded-lg font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]" 
            onClick={() => setIsOpen(false)}
            disabled={!customFrom || !customTo}
          >
            Terapkan Filter Kustom
          </Button>
        </div>
      </div>
    </div>
  )
}
