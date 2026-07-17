"use client";

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Printer, ChevronDown, Download, FileSpreadsheet } from "lucide-react"
import { cn } from "@/lib/utils"

interface ExportDropdownProps {
  printType: "all" | "pnl" | "balance";
  setPrintType: (value: "all" | "pnl" | "balance") => void;
  onPrint: () => void;
  onPdf: () => void;
  onExcel: () => void;
}

export function ExportDropdown({ printType, setPrintType, onPrint, onPdf, onExcel }: ExportDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative w-auto" ref={ref}>
      <Button 
        variant="outline" 
        onClick={() => setIsOpen(!isOpen)} 
        className="flex items-center justify-between gap-2 h-9 px-3 md:px-4 rounded-full border-border/80 bg-background/80 backdrop-blur-md hover:bg-muted/60 text-[12px] md:text-sm font-medium shadow-sm transition-all duration-300 w-auto focus-visible:ring-2 focus-visible:ring-primary/50"
      >
        <div className="flex items-center gap-1.5 md:gap-2">
          <Printer className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary" />
          <span className="whitespace-nowrap hidden sm:inline">Ekspor Laporan</span>
          <span className="whitespace-nowrap sm:hidden">Ekspor</span>
        </div>
        <ChevronDown className={cn("h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground transition-transform duration-300 ease-spring ml-0.5", isOpen && "rotate-180")} />
      </Button>
      <div 
        className={cn(
          "absolute top-[calc(100%+0.5rem)] right-0 p-2 w-[240px] md:w-[260px] bg-card rounded-xl border shadow-xl transition-all duration-300 origin-top-right z-50", 
          isOpen ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 -translate-y-2 pointer-events-none"
        )}
      >
         <div className="flex flex-col gap-1">
           <label className="text-[10px] font-bold text-muted-foreground px-2 py-1 uppercase tracking-wider">Format Laporan</label>
           <select 
             className="h-8 rounded-md border bg-muted/30 px-2 py-1 text-xs mb-2 mx-1 focus-visible:ring-1 focus-visible:outline-none" 
             value={printType} 
             onChange={e => setPrintType(e.target.value as any)}
           >
              <option value="all">Keduanya (Laba Rugi & Neraca)</option>
              <option value="pnl">Hanya Laba Rugi</option>
              <option value="balance">Hanya Neraca</option>
           </select>
           <div className="grid grid-cols-1 gap-1">
             <Button variant="ghost" size="sm" className="justify-start text-[13px] h-8" onClick={() => { setIsOpen(false); onPrint(); }}>
               <Printer className="h-3.5 w-3.5 mr-2" /> Cetak (Print)
             </Button>
             <Button variant="ghost" size="sm" className="justify-start text-[13px] h-8" onClick={() => { setIsOpen(false); onPdf(); }}>
               <Download className="h-3.5 w-3.5 mr-2 text-red-500" /> Unduh PDF
             </Button>
             <Button variant="ghost" size="sm" className="justify-start text-[13px] h-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" onClick={() => { setIsOpen(false); onExcel(); }}>
               <FileSpreadsheet className="h-3.5 w-3.5 mr-2" /> Ekspor Excel
             </Button>
           </div>
         </div>
      </div>
    </div>
  )
}
