import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Download, X, Calendar } from "lucide-react"
import { toast } from "sonner"
import useSWR from "swr"

interface StockFlyerModalProps {
  isOpen: boolean
  onClose: () => void
  items: any[]
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value)
}

// Brand helper to group items
function getBrand(itemName: string): string {
  const nameLower = itemName.toLowerCase().trim()
  const brands = [
    { key: "asus", display: "ASUS" },
    { key: "hp", display: "HP" },
    { key: "lenovo", display: "LENOVO" },
    { key: "dell", display: "DELL" },
    { key: "acer", display: "ACER" },
    { key: "macbook", display: "APPLE" },
    { key: "msi", display: "MSI" },
    { key: "thinkpad", display: "LENOVO" }, // Thinkpads are Lenovo
    { key: "rog", display: "ASUS" },
    { key: "tuf", display: "ASUS" },
    { key: "axioo", display: "AXIOO" },
    { key: "infinix", display: "INFINIX" },
    { key: "samsung", display: "SAMSUNG" }
  ]
  
  for (const b of brands) {
    if (nameLower.includes(b.key)) {
      return b.display
    }
  }
  return "LAIN-LAIN"
}

export function StockFlyerModal({ isOpen, onClose, items }: StockFlyerModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const { data: storeSettings } = useSWR<any>((import.meta.env.VITE_API_URL || '') + '/api/settings')
  
  const [flyerDate, setFlyerDate] = useState(() => {
    const today = new Date()
    return today.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
  })

  // Extract only ready stock laptops
  const readyLaptops = items.filter((item: any) => 
    item.quantity > 0 && 
    (item.category?.toLowerCase() === "laptop bekas" || item.category?.toLowerCase() === "laptop")
  )

  // Get all unique brands available in stock
  const allBrands = Array.from(new Set(readyLaptops.map(item => getBrand(item.itemName)))).sort()

  const [selectedBrands, setSelectedBrands] = useState<string[]>([])
  const [showPrice, setShowPrice] = useState(true)
  const [customInstagram, setCustomInstagram] = useState("")

  // Sync selected brands when open
  useEffect(() => {
    if (isOpen && allBrands.length > 0) {
      setSelectedBrands(allBrands)
    }
  }, [isOpen, items])

  // Parse Instagram from storeSettings footer
  useEffect(() => {
    if (storeSettings?.storeFooter) {
      const rawFooter = storeSettings.storeFooter
      if (rawFooter.includes("|||IG:")) {
        const parts = rawFooter.split("|||IG:")
        setCustomInstagram(parts[1] || "hanlaptop")
      } else {
        setCustomInstagram("hanlaptop")
      }
    } else {
      setCustomInstagram("hanlaptop")
    }
  }, [storeSettings])

  // Filter items based on selected brands
  const filteredItems = readyLaptops.filter(item => selectedBrands.includes(getBrand(item.itemName)))

  // Group filtered items by brand
  const itemsByBrand: Record<string, any[]> = {}
  filteredItems.forEach(item => {
    const brand = getBrand(item.itemName)
    if (!itemsByBrand[brand]) {
      itemsByBrand[brand] = []
    }
    itemsByBrand[brand].push(item)
  })

  // Draw the flyer to canvas
  const drawFlyer = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Layout configuration
    const width = 1200
    
    // Dynamic height calculation
    const headerHeight = 360
    const footerInfoHeight = 220
    const footerContactHeight = 120
    let mainContentHeight = 40
    
    const brandRows: Record<string, number> = {}
    selectedBrands.forEach(brand => {
      const brandItems = itemsByBrand[brand] || []
      if (brandItems.length === 0) return
      // Header brand height + items * rowHeight + padding
      const brandHeight = 70 + (brandItems.length * 60) + 30
      brandRows[brand] = brandHeight
      mainContentHeight += brandHeight
    })

    const height = headerHeight + mainContentHeight + footerInfoHeight + footerContactHeight
    canvas.width = width
    canvas.height = height

    // 1. Background drawing
    ctx.fillStyle = "#f8fafc"
    ctx.fillRect(0, 0, width, height)

    // Gold/Navy modern accent shapes top left
    ctx.fillStyle = "#1e3a8a" // Navy Blue
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(250, 0)
    ctx.lineTo(180, 80)
    ctx.lineTo(0, 80)
    ctx.closePath()
    ctx.fill()

    ctx.fillStyle = "#fbbf24" // Gold
    ctx.beginPath()
    ctx.moveTo(250, 0)
    ctx.lineTo(280, 0)
    ctx.lineTo(205, 80)
    ctx.lineTo(180, 80)
    ctx.closePath()
    ctx.fill()

    // Gold/Navy accent shapes bottom right
    ctx.fillStyle = "#fbbf24" // Gold
    ctx.beginPath()
    ctx.moveTo(width, height)
    ctx.lineTo(width - 250, height)
    ctx.lineTo(width - 180, height - 80)
    ctx.lineTo(width, height - 80)
    ctx.closePath()
    ctx.fill()

    ctx.fillStyle = "#1e3a8a" // Navy
    ctx.beginPath()
    ctx.moveTo(width - 250, height)
    ctx.lineTo(width - 280, height)
    ctx.lineTo(width - 205, height - 80)
    ctx.lineTo(width - 180, height - 80)
    ctx.closePath()
    ctx.fill()

    // Draw floating dots pattern
    const drawDots = (startX: number, startY: number) => {
      ctx.fillStyle = "#cbd5e1"
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
          ctx.beginPath()
          ctx.arc(startX + c * 20, startY + r * 20, 3, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    }
    drawDots(width - 150, 60)
    drawDots(40, height - 380)

    // 2. HEADER
    const storeName = storeSettings?.storeName || "HAN LAPTOP"
    
    // Draw Logo Curve (styled 'H' or minimalist curve like user reference logo)
    ctx.strokeStyle = "#1e3a8a"
    ctx.lineWidth = 6
    ctx.lineCap = "round"
    ctx.beginPath()
    ctx.moveTo(width / 2 - 20, 75)
    ctx.quadraticCurveTo(width / 2, 45, width / 2 + 10, 85)
    ctx.moveTo(width / 2 - 5, 55)
    ctx.quadraticCurveTo(width / 2 - 15, 85, width / 2 - 10, 95)
    ctx.stroke()

    // Store Name Title
    ctx.fillStyle = "#0f172a"
    ctx.font = "bold 26px sans-serif"
    ctx.textAlign = "center"
    ctx.fillText(storeName.toUpperCase(), width / 2, 130)

    // "UPDATE"
    ctx.fillStyle = "#0f172a"
    ctx.font = "900 65px sans-serif"
    ctx.textAlign = "center"
    ctx.fillText("UPDATE", width / 2, 205)

    // "STOK LAPTOP"
    ctx.fillStyle = "#d97706" // Warm gold/dark amber
    ctx.font = "bold 80px sans-serif"
    ctx.fillText("STOK LAPTOP", width / 2, 280)

    // Date/Subtitle
    ctx.fillStyle = "#475569"
    ctx.font = "normal 22px sans-serif"
    ctx.fillText(`Update per ${flyerDate}`, width / 2, 325)

    // Thin accent lines next to date
    ctx.strokeStyle = "#fbbf24"
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(width / 2 - 320, 317)
    ctx.lineTo(width / 2 - 180, 317)
    ctx.moveTo(width / 2 + 180, 317)
    ctx.lineTo(width / 2 + 320, 317)
    ctx.stroke()

    // 3. BRAND LISTINGS
    let currentY = headerHeight

    selectedBrands.forEach(brand => {
      const brandItems = itemsByBrand[brand] || []
      if (brandItems.length === 0) return

      ctx.save()

      // Brand Logo Text / Custom Icon
      ctx.textAlign = "left"
      ctx.fillStyle = "#0f172a"
      ctx.font = "bold 32px sans-serif"

      // Special branding drawings
      if (brand === "ASUS") {
        ctx.font = "italic bold 36px sans-serif"
        ctx.fillText("ASUS", 60, currentY + 38)
      } else if (brand === "HP") {
        // Draw HP styled circle logo
        ctx.fillStyle = "#0284c7"
        ctx.beginPath()
        ctx.arc(85, currentY + 25, 25, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = "#ffffff"
        ctx.font = "italic bold 32px sans-serif"
        ctx.textAlign = "center"
        ctx.fillText("hp", 85, currentY + 34)
      } else if (brand === "LENOVO") {
        // Lenovo solid red box logo
        ctx.fillStyle = "#e11d48" // Lenovo Red
        ctx.fillRect(60, currentY + 5, 140, 42)
        ctx.fillStyle = "#ffffff"
        ctx.font = "bold 26px sans-serif"
        ctx.textAlign = "center"
        ctx.fillText("Lenovo", 130, currentY + 34)
      } else if (brand === "DELL") {
        ctx.fillStyle = "#0284c7"
        ctx.font = "bold 36px sans-serif"
        ctx.fillText("DELL", 60, currentY + 38)
      } else {
        // Default brand text
        ctx.fillText(brand, 60, currentY + 38)
      }

      ctx.restore()

      // Main Table Layout per brand
      const tableX = 220
      const tableW = 920
      const rowH = 60

      // Table Header Navy Blue
      ctx.fillStyle = "#0f172a"
      // Draw rounded rectangle top corners for header
      ctx.beginPath()
      ctx.roundRect(tableX, currentY, tableW, 46, [8, 8, 0, 0])
      ctx.fill()

      // Header labels
      ctx.fillStyle = "#ffffff"
      ctx.font = "bold 15px sans-serif"
      ctx.textAlign = "center"
      ctx.fillText("TYPE", tableX + 160, currentY + 28)
      ctx.fillText("HARGA LAPTOP", tableX + tableW - 480, currentY + 28)
      ctx.fillText("KETERANGAN", tableX + tableW - 200, currentY + 28)

      // Rows
      let itemY = currentY + 46
      brandItems.forEach((item, index) => {
        // Alternating background color
        ctx.fillStyle = index % 2 === 0 ? "#ffffff" : "#f1f5f9"
        ctx.fillRect(tableX, itemY, tableW, rowH)

        // Bottom border line
        ctx.strokeStyle = "#e2e8f0"
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(tableX, itemY + rowH)
        ctx.lineTo(tableX + tableW, itemY + rowH)
        ctx.stroke()

        // Left sidebar badge column (Inside row)
        // Check if item is NEW or specs has 'garansi resmi'
        const isOfficialWarranty = item.condition === 'NEW' || (item.specs && /resmi|resmy|official/i.test(item.specs))
        if (isOfficialWarranty) {
          ctx.save()
          // Draw mini shield gold/black check badge on the left margin
          ctx.fillStyle = "#fbbf24"
          ctx.strokeStyle = "#1e3a8a"
          ctx.lineWidth = 2
          
          const shieldX = tableX - 110
          const shieldY = itemY + 12
          
          // Draw custom gold badge/shield
          ctx.beginPath()
          ctx.arc(shieldX, shieldY, 15, 0, Math.PI * 2)
          ctx.fill()
          ctx.stroke()
          
          ctx.fillStyle = "#1e3a8a"
          ctx.font = "bold 9px sans-serif"
          ctx.textAlign = "center"
          ctx.fillText("GARANSI", shieldX, shieldY - 2)
          ctx.fillText("RESMI", shieldX, shieldY + 8)
          ctx.restore()
        }

        // 1. TYPE
        ctx.fillStyle = "#0f172a"
        ctx.font = "bold 18px sans-serif"
        ctx.textAlign = "left"
        // Prevent name overflow
        let nameToDraw = item.itemName
        if (nameToDraw.length > 28) {
          nameToDraw = nameToDraw.substring(0, 26) + "..."
        }
        ctx.fillText(nameToDraw, tableX + 24, itemY + 36)

        // 2. PRICE
        ctx.fillStyle = "#1e3a8a"
        ctx.font = "bold 20px sans-serif"
        ctx.textAlign = "center"
        const priceText = showPrice ? formatCurrency(item.sellingPrice) : "Hubungi Admin"
        ctx.fillText(priceText, tableX + tableW - 480, itemY + 36)

        // 3. DETAILS/SPECS
        ctx.fillStyle = "#334155"
        ctx.font = "normal 14px sans-serif"
        ctx.textAlign = "left"
        
        // Split specs by | or \n and make it inline comma-separated
        let specsDesc = item.specs || "-"
        specsDesc = specsDesc.replace(/\||\n/g, ", ")
        if (specsDesc.length > 50) {
          specsDesc = specsDesc.substring(0, 48) + "..."
        }
        ctx.fillText(specsDesc, tableX + tableW - 390, itemY + 36)

        itemY += rowH
      })

      // Draw border outline around table
      ctx.strokeStyle = "#cbd5e1"
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.roundRect(tableX, currentY, tableW, 46 + (brandItems.length * rowH), [8, 8, 8, 8])
      ctx.stroke()

      currentY += 70 + (brandItems.length * rowH) + 30
    })

    // 4. FOOTER INFORMATIONAL CARDS
    const infoY = currentY + 20
    ctx.save()

    const cardW = 250
    const cardH = 150
    const cardGap = 20
    const startX = (width - (4 * cardW + 3 * cardGap)) / 2

    const footerCards = [
      {
        title: "PENGAMBILAN / KIRIM",
        desc: "Bisa COD, instant delivery, atau langsung datang ke outlet resmi kami.",
        icon: "🚚"
      },
      {
        title: "PEMBAYARAN",
        desc: "Menerima Cash, Transfer Bank, QRIS, dan cicilan kartu kredit.",
        icon: "💳"
      },
      {
        title: "RESPON RAMAH",
        desc: "Konsultasi kebutuhan laptop gratis. Hubungi WA admin fast response.",
        icon: "💬"
      },
      {
        title: "GARANSI RESMI",
        desc: "Laptop dengan tanda khusus dijamin memiliki garansi distributor resmi.",
        icon: "🛡️"
      }
    ]

    footerCards.forEach((card, idx) => {
      const cx = startX + idx * (cardW + cardGap)
      
      // Card container background
      ctx.fillStyle = "#ffffff"
      ctx.beginPath()
      ctx.roundRect(cx, infoY, cardW, cardH, 12)
      ctx.fill()
      ctx.strokeStyle = "#e2e8f0"
      ctx.lineWidth = 1
      ctx.stroke()

      // Card Icon/Circle
      ctx.fillStyle = "#1e3a8a"
      ctx.beginPath()
      ctx.arc(cx + cardW / 2, infoY + 40, 22, 0, Math.PI * 2)
      ctx.fill()

      ctx.font = "20px sans-serif"
      ctx.textAlign = "center"
      ctx.fillText(card.icon, cx + cardW / 2, infoY + 47)

      // Card Title
      ctx.fillStyle = "#0f172a"
      ctx.font = "bold 13px sans-serif"
      ctx.fillText(card.title, cx + cardW / 2, infoY + 86)

      // Card Description
      ctx.fillStyle = "#64748b"
      ctx.font = "normal 11px sans-serif"
      
      // Multi-line drawing helper for description
      const words = card.desc.split(" ")
      let line = ""
      let lineCount = 0
      for (const w of words) {
        const testLine = line + w + " "
        const metrics = ctx.measureText(testLine)
        if (metrics.width > cardW - 30) {
          ctx.fillText(line, cx + cardW / 2, infoY + 108 + lineCount * 14)
          line = w + " "
          lineCount++
        } else {
          line = testLine
        }
      }
      ctx.fillText(line, cx + cardW / 2, infoY + 108 + lineCount * 14)
    })

    ctx.restore()

    // 5. FOOTER SOCIAL / CONTACT BAR
    const contactY = infoY + footerInfoHeight + 20
    ctx.fillStyle = "#0f172a" // Navy Dark Black
    ctx.fillRect(0, contactY, width, footerContactHeight)

    // WA, Location, IG Columns
    ctx.fillStyle = "#ffffff"
    ctx.textAlign = "center"
    const colW = width / 3

    const storePhone = storeSettings?.storePhone || "0812-3456-7890"
    const storeAddress = storeSettings?.storeAddress || "Bandung, Jawa Barat"

    // Col 1: WA
    ctx.font = "bold 18px sans-serif"
    ctx.fillText("WHATSAPP", colW / 2, contactY + 45)
    ctx.font = "normal 15px sans-serif"
    ctx.fillStyle = "#fbbf24" // gold text
    ctx.fillText(storePhone, colW / 2, contactY + 75)

    // Col 2: LOKASI
    ctx.fillStyle = "#ffffff"
    ctx.font = "bold 18px sans-serif"
    ctx.fillText("LOKASI TOKO", colW + colW / 2, contactY + 45)
    ctx.font = "normal 13px sans-serif"
    ctx.fillStyle = "#fbbf24"
    let addressShort = storeAddress
    if (addressShort.length > 45) {
      addressShort = addressShort.substring(0, 42) + "..."
    }
    ctx.fillText(addressShort, colW + colW / 2, contactY + 75)

    // Col 3: IG
    ctx.fillStyle = "#ffffff"
    ctx.font = "bold 18px sans-serif"
    ctx.fillText("INSTAGRAM", colW * 2 + colW / 2, contactY + 45)
    ctx.font = "normal 15px sans-serif"
    ctx.fillStyle = "#fbbf24"
    ctx.fillText(`@${customInstagram}`, colW * 2 + colW / 2, contactY + 75)
  }

  // Redraw whenever date, price setting, custom instagram or brand list changes
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(drawFlyer, 100) // Ensure canvas is rendered in DOM first
      return () => clearTimeout(timer)
    }
  }, [isOpen, flyerDate, selectedBrands, showPrice, customInstagram, filteredItems])

  const handleDownload = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    try {
      const link = document.createElement("a")
      link.download = `stok-laptop-${flyerDate.replace(/\s+/g, "-")}.png`
      link.href = canvas.toDataURL("image/png")
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      toast.success("Flyer berhasil didownload!")
    } catch (err) {
      toast.error("Gagal mendownload flyer")
    }
  }

  const toggleBrand = (brand: string) => {
    setSelectedBrands(prev => 
      prev.includes(brand) ? prev.filter(b => b !== brand) : [...prev, brand]
    )
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card w-full max-w-5xl rounded-2xl shadow-2xl border flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-border flex flex-row items-center justify-between shrink-0">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              🖼️ Stock Flyer Generator
            </h2>
            <p className="text-muted-foreground text-xs mt-1">Buat poster info update stok laptop ready untuk disebarkan di sosial media.</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Controls Panel */}
          <div className="w-full md:w-80 border-r border-border p-5 flex flex-col gap-5 shrink-0 overflow-y-auto bg-muted/10">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500">TANGGAL UPDATE</Label>
              <div className="relative">
                <Input 
                  value={flyerDate}
                  onChange={(e) => setFlyerDate(e.target.value)}
                  placeholder="Contoh: 9 Oktober 2024"
                  className="pl-9 h-9 text-xs"
                />
                <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500">INSTAGRAM TOKO</Label>
              <Input 
                value={customInstagram}
                onChange={(e) => setCustomInstagram(e.target.value.replace(/@/g, ""))}
                placeholder="Contoh: hanlaptop11"
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-3">
              <Label className="text-xs font-bold text-slate-500">PENGATURAN HARGA</Label>
              <div className="flex items-center space-x-2">
                <input 
                  type="checkbox"
                  id="showPrice" 
                  checked={showPrice} 
                  onChange={(e) => setShowPrice(e.target.checked)}
                  className="rounded border-slate-300 h-4 w-4 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <Label htmlFor="showPrice" className="text-xs font-medium cursor-pointer">Tampilkan Harga Laptop</Label>
              </div>
            </div>

            <div className="space-y-3 flex-1">
              <Label className="text-xs font-bold text-slate-500">PILIH BRAND READY STOCK</Label>
              {allBrands.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">Tidak ada laptop ready stock.</p>
              ) : (
                <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto pr-2">
                  {allBrands.map(brand => (
                    <div key={brand} className="flex items-center space-x-2">
                      <input 
                        type="checkbox"
                        id={`brand-${brand}`} 
                        checked={selectedBrands.includes(brand)} 
                        onChange={() => toggleBrand(brand)}
                        className="rounded border-slate-300 h-4 w-4 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                      <Label htmlFor={`brand-${brand}`} className="text-xs font-medium cursor-pointer">
                        {brand} ({readyLaptops.filter(i => getBrand(i.itemName) === brand).length} unit)
                      </Label>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="border-t border-border pt-4 shrink-0">
              <Button onClick={handleDownload} className="w-full h-10 font-bold bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
                <Download className="h-4 w-4" /> Download Poster PNG
              </Button>
            </div>
          </div>

          {/* Live Canvas Preview Panel */}
          <div className="flex-1 bg-slate-800 flex items-center justify-center p-6 overflow-y-auto select-none">
            <div className="max-w-full max-h-full overflow-auto shadow-2xl rounded-lg border border-slate-700/80 bg-slate-900 flex justify-center">
              <canvas 
                ref={canvasRef} 
                className="max-w-[400px] md:max-w-[500px] lg:max-w-[540px] shadow-lg origin-top"
                style={{ height: 'auto', display: 'block' }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
