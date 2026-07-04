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
  return "Rp. " + new Intl.NumberFormat('id-ID', { minimumFractionDigits: 0 }).format(value)
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
    { key: "thinkpad", display: "LENOVO" },
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

  const readyLaptops = items.filter((item: any) => 
    item.quantity > 0 && 
    (item.category?.toLowerCase() === "laptop bekas" || item.category?.toLowerCase() === "laptop")
  )

  const allBrands = Array.from(new Set(readyLaptops.map(item => getBrand(item.itemName)))).sort()

  const [selectedBrands, setSelectedBrands] = useState<string[]>([])
  const [showPrice, setShowPrice] = useState(true)
  const [customInstagram, setCustomInstagram] = useState("")
  const [logoImgElement, setLogoImgElement] = useState<HTMLImageElement | null>(null)

  useEffect(() => {
    if (isOpen && allBrands.length > 0) {
      setSelectedBrands(allBrands)
    }
  }, [isOpen, items])

  useEffect(() => {
    if (storeSettings?.storeLogo) {
      const img = new Image()
      img.crossOrigin = "anonymous"
      img.src = storeSettings.storeLogo
      img.onload = () => setLogoImgElement(img)
      img.onerror = () => setLogoImgElement(null)
    } else {
      setLogoImgElement(null)
    }
  }, [storeSettings])

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

  const filteredItems = readyLaptops.filter(item => selectedBrands.includes(getBrand(item.itemName)))

  const itemsByBrand: Record<string, any[]> = {}
  filteredItems.forEach(item => {
    const brand = getBrand(item.itemName)
    if (!itemsByBrand[brand]) {
      itemsByBrand[brand] = []
    }
    itemsByBrand[brand].push(item)
  })

  // ══════════════════════════════════════════════════════
  // MAIN CANVAS DRAW FUNCTION
  // ══════════════════════════════════════════════════════
  const drawFlyer = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const W = 1080 // canvas width (standard square Instagram feed post)

    // ── CONSTANTS ──
    const NAVY = "#0c2340"
    const GOLD = "#c5962a"
    const GOLD_LIGHT = "#d4a843"
    const WHITE = "#ffffff"
    const LIGHT_BG = "#f2f4f7"
    const DARK_TEXT = "#000000"
    const GRAY_TEXT = "#2b3442"
    const RED_LENOVO = "#cc1820"
    const TABLE_BORDER = "#d8dce3"

    // ── CALCULATE DYNAMIC HEIGHT ──
    const HEADER_H = 400
    const BRAND_GAP = 35
    const ROW_H = 86
    const TABLE_HEADER_H = 50
    const FOOTER_CARDS_H = 240
    const FOOTER_CONTACT_H = 110
    const BOTTOM_PAD = 50

    let brandsContentH = 0
    const activeBrands = selectedBrands.filter(b => (itemsByBrand[b] || []).length > 0)
    activeBrands.forEach(brand => {
      const count = (itemsByBrand[brand] || []).length
      brandsContentH += TABLE_HEADER_H + count * ROW_H + BRAND_GAP
    })

    const H = HEADER_H + brandsContentH + 30 + FOOTER_CARDS_H + FOOTER_CONTACT_H + BOTTOM_PAD
    const HD_SCALE = 2 // 2x export resolution for Crisp HD on WhatsApp
    canvas.width = W * HD_SCALE
    canvas.height = H * HD_SCALE
    ctx.scale(HD_SCALE, HD_SCALE)

    // ── VECTOR LOGO DRAWING HELPERS ──
    // Helper: Draw authentic WhatsApp vector logo (green speech bubble + white handset)
    const drawWhatsAppLogo = (cx: number, cy: number, size: number) => {
      ctx.save()
      ctx.translate(cx, cy)
      ctx.scale(size / 24, size / 24)
      ctx.translate(-12, -12)

      // 1. Official WhatsApp Brand Green Speech Bubble
      const bubblePath = new Path2D("M 12 2 C 6.48 2 2 6.48 2 12 C 2 13.8 2.48 15.5 3.36 17 L 2 21 L 6.15 19.65 C 7.9 21.12 10.15 22 12.03 22 C 17.55 22 22 17.52 22 12 C 22 6.48 17.55 2 12 2 Z")
      ctx.fillStyle = "#25D366" // Official WhatsApp Brand Green
      ctx.fill(bubblePath)

      // 2. White Telephone Handset
      const phonePath = new Path2D("M 17.47 14.38 C 17.17 14.23 15.71 13.52 15.44 13.42 C 15.17 13.32 14.97 13.27 14.77 13.57 C 14.57 13.87 14 14.53 13.83 14.73 C 13.66 14.93 13.48 14.96 13.19 14.81 C 12.89 14.66 11.93 14.35 10.8 13.34 C 9.91 12.55 9.32 11.58 9.14 11.28 C 8.97 10.98 9.13 10.82 9.27 10.67 C 9.4 10.54 9.57 10.33 9.72 10.16 C 9.87 9.98 9.92 9.86 10.02 9.66 C 10.12 9.46 10.07 9.29 9.99 9.14 C 9.92 8.99 9.32 7.53 9.08 6.94 C 8.84 6.36 8.59 6.44 8.42 6.43 C 8.25 6.42 8.05 6.42 7.85 6.42 C 7.65 6.42 7.33 6.49 7.06 6.79 C 6.79 7.09 6.02 7.81 6.02 9.27 C 6.02 10.73 7.09 12.15 7.24 12.35 C 7.39 12.55 9.33 15.55 12.31 16.84 C 13.02 17.15 13.58 17.33 14.01 17.47 C 14.72 17.69 15.37 17.66 15.88 17.58 C 16.45 17.5 17.64 16.86 17.89 16.17 C 18.14 15.48 18.14 14.88 18.06 14.76 C 17.99 14.64 17.79 14.57 17.47 14.38 Z")
      ctx.fillStyle = "#FFFFFF"
      ctx.fill(phonePath)
      ctx.restore()
    }

    // Helper: Draw authentic Google Maps style vibrant red map pin vector logo
    const drawLocationLogo = (cx: number, cy: number, size: number) => {
      ctx.save()
      ctx.translate(cx, cy)
      ctx.scale(size / 24, size / 24)
      ctx.translate(-12, -12)

      // Outer drop pin with rich red gradient
      const pinGrad = ctx.createLinearGradient(12, 2, 12, 22)
      pinGrad.addColorStop(0, '#FF5252')
      pinGrad.addColorStop(1, '#D32F2F')
      ctx.fillStyle = pinGrad
      const pinPath = new Path2D("M 12 2 C 8.13 2 5 5.13 5 9 C 5 14.25 12 22 12 22 C 12 22 19 14.25 19 9 C 19 5.13 15.87 2 12 2 Z")
      ctx.fill(pinPath)

      // Inner white dot
      ctx.fillStyle = "#FFFFFF"
      ctx.beginPath()
      ctx.arc(12, 9, 3.5, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }

    // Helper: Draw authentic Instagram brand gradient vector logo
    const drawInstagramLogo = (cx: number, cy: number, size: number) => {
      ctx.save()
      ctx.translate(cx, cy)
      const r = size / 2
      
      // Instagram vibrant diagonal gradient background
      const igGrad = ctx.createLinearGradient(-r, r, r, -r)
      igGrad.addColorStop(0, '#f09433')
      igGrad.addColorStop(0.25, '#e6683c')
      igGrad.addColorStop(0.5, '#dc2743')
      igGrad.addColorStop(0.75, '#cc2366')
      igGrad.addColorStop(1, '#833ab4')
      ctx.fillStyle = igGrad
      ctx.beginPath()
      ctx.roundRect(-r, -r, size, size, size * 0.28)
      ctx.fill()

      // Crisp white camera outline inside
      ctx.strokeStyle = "#FFFFFF"
      ctx.lineWidth = size * 0.08
      ctx.lineCap = "round"
      ctx.lineJoin = "round"
      const innerW = size * 0.62
      ctx.beginPath()
      ctx.roundRect(-innerW / 2, -innerW / 2, innerW, innerW, innerW * 0.26)
      ctx.stroke()

      // Lens circle
      ctx.beginPath()
      ctx.arc(0, 0, size * 0.16, 0, Math.PI * 2)
      ctx.stroke()

      // Flash dot
      ctx.fillStyle = "#FFFFFF"
      ctx.beginPath()
      ctx.arc(size * 0.2, -size * 0.2, size * 0.05, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }

    // Helper: Draw authentic 3D Golden Warranty Shield logo (matches Info Card #4)
    const drawWarrantyShieldLogo = (cx: number, cy: number, size: number) => {
      ctx.save()
      const scale = size / 28
      ctx.translate(cx, cy)
      ctx.scale(scale, scale)

      // Outer gold gradient shield
      const shieldGrad = ctx.createLinearGradient(0, -14, 0, 14)
      shieldGrad.addColorStop(0, '#FCE081')
      shieldGrad.addColorStop(0.5, '#E5B842')
      shieldGrad.addColorStop(1, '#8A6614')
      ctx.fillStyle = shieldGrad
      ctx.beginPath()
      ctx.moveTo(0, -13)
      ctx.lineTo(12, -8)
      ctx.lineTo(12, 2)
      ctx.quadraticCurveTo(12, 11, 0, 15)
      ctx.quadraticCurveTo(-12, 11, -12, 2)
      ctx.lineTo(-12, -8)
      ctx.closePath()
      ctx.fill()

      // Inner dark navy shield
      ctx.fillStyle = NAVY
      ctx.beginPath()
      ctx.moveTo(0, -10)
      ctx.lineTo(9, -6)
      ctx.lineTo(9, 1)
      ctx.quadraticCurveTo(9, 8, 0, 12)
      ctx.quadraticCurveTo(-9, 8, -9, 1)
      ctx.lineTo(-9, -6)
      ctx.closePath()
      ctx.fill()

      // Glowing Gold Checkmark inside
      ctx.strokeStyle = '#FCE081'
      ctx.lineWidth = 2.5
      ctx.lineCap = "round"
      ctx.lineJoin = "round"
      ctx.beginPath()
      ctx.moveTo(-4, 1)
      ctx.lineTo(-1, 4)
      ctx.lineTo(5, -3)
      ctx.stroke()
      ctx.restore()
    }

    // ════════════════════════════
    // 1. BACKGROUND
    // ════════════════════════════
    ctx.fillStyle = LIGHT_BG
    ctx.fillRect(0, 0, W, H)

    // ════════════════════════════
    // 2. TOP-LEFT NAVY DIAGONAL RIBBON
    // ════════════════════════════
    ctx.save()
    ctx.fillStyle = NAVY
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(420, 0)
    ctx.lineTo(200, 160)
    ctx.lineTo(0, 160)
    ctx.closePath()
    ctx.fill()

    // Gold accent stripe
    ctx.fillStyle = GOLD
    ctx.beginPath()
    ctx.moveTo(420, 0)
    ctx.lineTo(450, 0)
    ctx.lineTo(220, 160)
    ctx.lineTo(200, 160)
    ctx.closePath()
    ctx.fill()
    ctx.restore()

    // ════════════════════════════
    // 3. TOP-RIGHT HEXAGONS + DOT GRID
    // ════════════════════════════
    ctx.save()
    const drawHex = (cx: number, cy: number, r: number, color: string, lw: number) => {
      ctx.strokeStyle = color
      ctx.lineWidth = lw
      ctx.beginPath()
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i - Math.PI / 6
        const px = cx + r * Math.cos(a)
        const py = cy + r * Math.sin(a)
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)
      }
      ctx.closePath()
      ctx.stroke()
    }
    // Two overlapping hexagons
    drawHex(W - 115, 65, 50, NAVY, 3)
    drawHex(W - 65, 100, 50, GOLD, 2.5)

    // Dot grid pattern top-right
    ctx.fillStyle = "#c8cdd5"
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 6; c++) {
        ctx.beginPath()
        ctx.arc(W - 260 + c * 18, 50 + r * 18, 2.5, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    ctx.restore()

    // ════════════════════════════
    // 4. STORE LOGO + NAME (centered)
    // ════════════════════════════
    const storeName = storeSettings?.storeName || "Han Laptop"

    if (logoImgElement) {
      const maxW = 90, maxH = 90
      let dw = logoImgElement.width, dh = logoImgElement.height
      const ratio = Math.min(maxW / dw, maxH / dh)
      dw *= ratio; dh *= ratio
      ctx.drawImage(logoImgElement, W / 2 - dw / 2, 40, dw, dh)
      
      // Store name below logo
      ctx.fillStyle = NAVY
      ctx.font = "500 24px 'Outfit', sans-serif"
      ctx.textAlign = "center"
      ctx.textBaseline = "top"
      ctx.fillText(storeName, W / 2, 40 + dh + 8)
    } else {
      ctx.fillStyle = NAVY
      ctx.font = "600 30px 'Outfit', sans-serif"
      ctx.textAlign = "center"
      ctx.textBaseline = "top"
      ctx.fillText(storeName, W / 2, 60)
    }

    // ════════════════════════════
    // 5. "UPDATE" + "STOK LAPTOP" titles
    // ════════════════════════════
    ctx.textAlign = "center"
    ctx.textBaseline = "top"

    ctx.fillStyle = NAVY
    ctx.font = "900 72px 'Outfit', sans-serif"
    ctx.fillText("UPDATE", W / 2, 175)

    ctx.fillStyle = GOLD
    ctx.font = "900 92px 'Outfit', sans-serif"
    ctx.fillText("STOK LAPTOP", W / 2, 252)

    // ════════════════════════════
    // 6. DATE LINE with gold accent dashes
    // ════════════════════════════
    const dateY = 365
    ctx.fillStyle = GRAY_TEXT
    ctx.font = "500 24px 'Outfit', sans-serif"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillText(`Update per ${flyerDate}`, W / 2, dateY)

    // Gold dashes left and right of date
    ctx.strokeStyle = GOLD
    ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.moveTo(W / 2 - 280, dateY)
    ctx.lineTo(W / 2 - 160, dateY)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(W / 2 + 160, dateY)
    ctx.lineTo(W / 2 + 280, dateY)
    ctx.stroke()

    // ════════════════════════════
    // 7. BRAND TABLE SECTIONS
    // ════════════════════════════
    let curY = HEADER_H

    // Table layout constants
    const MARGIN_L = 40  // left margin for brand name area
    const BRAND_COL_W = 140 // width for brand name column
    const TABLE_X = MARGIN_L + BRAND_COL_W // table starts after brand column
    const TABLE_W = W - TABLE_X - 40 // table width

    // Column positions within the table (relative to TABLE_X)
    const COL_TYPE_X = 20 // left padding for TYPE
    const COL_PRICE_CENTER = TABLE_W * 0.44 // center of HARGA LAPTOP
    const COL_SPECS_X = TABLE_W * 0.58 // left of KETERANGAN
    const COL_SPECS_MAX_W = TABLE_W - COL_SPECS_X - 20 // max width for specs text wrapping

    // Helper: wrap text into multiple lines (with character-level fallback wrapping for long model codes)
    const wrapText = (text: string, maxWidth: number, font: string): string[] => {
      ctx.font = font
      const words = text.split(' ')
      const lines: string[] = []
      let currentLine = ''
      for (const word of words) {
        const wordW = ctx.measureText(word).width
        if (wordW > maxWidth) {
          // If the word itself is too wide, we force wrap it character by character
          if (currentLine) {
            lines.push(currentLine)
            currentLine = ''
          }
          let tempWord = ''
          for (let i = 0; i < word.length; i++) {
            const char = word[i]
            const testLine = tempWord + char
            if (ctx.measureText(testLine).width > maxWidth) {
              if (tempWord) lines.push(tempWord)
              tempWord = char
            } else {
              tempWord = testLine
            }
          }
          currentLine = tempWord
        } else {
          const testLine = currentLine ? currentLine + ' ' + word : word
          if (ctx.measureText(testLine).width > maxWidth) {
            if (currentLine) lines.push(currentLine)
            currentLine = word
          } else {
            currentLine = testLine
          }
        }
      }
      if (currentLine) lines.push(currentLine)
      return lines
    }

    activeBrands.forEach(brand => {
      const brandItems = itemsByBrand[brand] || []
      if (brandItems.length === 0) return

      const tableH = TABLE_HEADER_H + brandItems.length * ROW_H

      // ── A. BRAND NAME (left column, vertically centered with table) ──
      ctx.save()
      const brandCenterY = curY + tableH / 2
      
      // Brand name text styling — unified to use the identical bold Outfit font
      ctx.fillStyle = DARK_TEXT
      ctx.font = "900 32px 'Outfit', sans-serif"
      ctx.textAlign = "left"
      ctx.textBaseline = "middle"
      ctx.fillText(brand, MARGIN_L, brandCenterY)
      ctx.restore()

      // ── B. TABLE HEADER BAR ──
      const headerColor = NAVY // Unified table header color (no longer red for Lenovo)
      
      ctx.fillStyle = headerColor
      ctx.beginPath()
      ctx.roundRect(TABLE_X, curY, TABLE_W, TABLE_HEADER_H, [6, 6, 0, 0])
      ctx.fill()

      ctx.fillStyle = WHITE
      ctx.font = "900 18px 'Outfit', sans-serif"
      ctx.textBaseline = "middle"
      const headerMidY = curY + TABLE_HEADER_H / 2

      ctx.textAlign = "left"
      ctx.fillText("TYPE", TABLE_X + COL_TYPE_X, headerMidY)

      ctx.textAlign = "center"
      ctx.fillText("HARGA LAPTOP", TABLE_X + COL_PRICE_CENTER, headerMidY)

      ctx.textAlign = "left"
      ctx.fillText("KETERANGAN", TABLE_X + COL_SPECS_X, headerMidY)

      // ── C. TABLE ROWS ──
      let rowY = curY + TABLE_HEADER_H

      brandItems.forEach((item: any, idx: number) => {
        const isLast = idx === brandItems.length - 1

        // Row background (alternating white/light gray)
        ctx.fillStyle = idx % 2 === 0 ? WHITE : "#f7f8fa"
        if (isLast) {
          ctx.beginPath()
          ctx.roundRect(TABLE_X, rowY, TABLE_W, ROW_H, [0, 0, 6, 6])
          ctx.fill()
        } else {
          ctx.fillRect(TABLE_X, rowY, TABLE_W, ROW_H)
        }

        // Row bottom border
        if (!isLast) {
          ctx.strokeStyle = TABLE_BORDER
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.moveTo(TABLE_X, rowY + ROW_H)
          ctx.lineTo(TABLE_X + TABLE_W, rowY + ROW_H)
          ctx.stroke()
        }

        const rowMidY = rowY + ROW_H / 2

        // ── GARANSI RESMI BADGE — only show when Kondisi is "Garansi Resmi" ──
        const isOfficialWarranty = item.specs && /Kondisi:\s*Garansi Resmi/i.test(item.specs)
        
        // ── TYPE column (multi-line wrapping to prevent truncation or price collision) ──
        ctx.fillStyle = DARK_TEXT
        const typeFont = "700 20px 'Outfit', sans-serif"
        ctx.font = typeFont
        ctx.textAlign = "left"
        ctx.textBaseline = "middle"
        let typeName = item.itemName
        
        let typeStartX = TABLE_X + COL_TYPE_X
        if (isOfficialWarranty) {
          typeStartX += 28 // shift right to make space for the shield icon
        }

        // Calculate a safe maximum width so the name doesn't overlap the centered price
        const safeRightX = COL_PRICE_CENTER - 85 // padding from the center of the price column
        const typeMaxW = safeRightX - (typeStartX - TABLE_X)
        const typeLines = wrapText(typeName, typeMaxW, typeFont)
        const typeStartY = rowMidY - ((typeLines.length - 1) * 22) / 2

        typeLines.forEach((line, li) => {
          ctx.fillText(line, typeStartX, typeStartY + li * 22)
        })

        if (isOfficialWarranty) {
          // Authentic Info Garansi Resmi icon (matches Info Card #4)
          const badgeSize = 24
          const badgeCX = TABLE_X + COL_TYPE_X + badgeSize / 2
          const badgeCY = typeStartY
          drawWarrantyShieldLogo(badgeCX, badgeCY, badgeSize)
        }

        // ── HARGA column ──
        ctx.fillStyle = DARK_TEXT
        ctx.font = "900 22px 'Outfit', sans-serif"
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"
        const priceStr = showPrice ? formatCurrency(item.sellingPrice) : "Hubungi Admin"
        ctx.fillText(priceStr, TABLE_X + COL_PRICE_CENTER, rowMidY)

        // ── KETERANGAN column (multi-line wrapping) ──
        const specsFont = "500 16px 'Outfit', sans-serif"
        
        // Clean specs description: strip prefixes dynamically and format with clean commas
        const cleanSpecs = (specs: string): string => {
          if (!specs) return "-"
          return specs
            .split(/[|\n]/)
            .map(part => part.trim().replace(/^[^:]+:\s*/i, "").trim())
            .filter(Boolean)
            .join(", ")
        }
        let specsRaw = cleanSpecs(item.specs)
        
        const specsLines = wrapText(specsRaw, COL_SPECS_MAX_W, specsFont)
        const maxLines = 3
        const displayLines = specsLines.slice(0, maxLines)
        if (specsLines.length > maxLines) {
          const lastLine = displayLines[maxLines - 1]
          displayLines[maxLines - 1] = lastLine.substring(0, lastLine.length - 2) + '…'
        }

        ctx.fillStyle = DARK_TEXT // Set specs text color to pure black
        ctx.font = specsFont
        ctx.textAlign = "left"
        ctx.textBaseline = "top"
        const specsStartY = rowMidY - (displayLines.length * 18) / 2
        displayLines.forEach((line, li) => {
          ctx.fillText(line, TABLE_X + COL_SPECS_X, specsStartY + li * 18)
        })

        rowY += ROW_H
      })

      // ── D. TABLE OUTER BORDER ──
      ctx.strokeStyle = TABLE_BORDER
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.roundRect(TABLE_X, curY, TABLE_W, tableH, 6)
      ctx.stroke()

      curY += tableH + BRAND_GAP
    })

    // ════════════════════════════
    // 8. FOOTER INFO CARDS
    // ════════════════════════════
    const cardsY = curY + 25
    const CARD_W = 225
    const CARD_H = 180
    const CARD_GAP = 18
    const totalCardsW = 4 * CARD_W + 3 * CARD_GAP
    const cardsStartX = (W - totalCardsW) / 2

    const infoCards = [
      {
        icon: "truck",
        title: "PENGAMBILAN /\nPENGIRIMAN",
        desc: "Datang ke toko langsung\natau kami antar ke alamat Anda."
      },
      {
        icon: "payment",
        title: "PEMBAYARAN",
        desc: "• Cash\n• Transfer Bank\n• QRIS\n• E-Wallet"
      },
      {
        icon: "chat",
        title: "INFORMASI CEPAT\n& RESPON RAMAH",
        desc: "Hubungi kami via WhatsApp\nuntuk info lebih lanjut\ndan konsultasi."
      },
      {
        icon: "shield",
        title: "GARANSI RESMI",
        desc: "Laptop dengan badge emas\nberarti masih memiliki\ngaransi resmi.\n\n*S&K berlaku"
      }
    ]

    infoCards.forEach((card, idx) => {
      const cx = cardsStartX + idx * (CARD_W + CARD_GAP)
      
      // Card background with subtle shadow
      ctx.save()
      ctx.shadowColor = "rgba(0,0,0,0.08)"
      ctx.shadowBlur = 16
      ctx.shadowOffsetY = 4
      ctx.fillStyle = WHITE
      ctx.beginPath()
      ctx.roundRect(cx, cardsY, CARD_W, CARD_H, 14)
      ctx.fill()
      ctx.restore()

      // Card border
      ctx.strokeStyle = "#e2e5ea"
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.roundRect(cx, cardsY, CARD_W, CARD_H, 14)
      ctx.stroke()

      // Icon circle — larger and with gradient
      const iconCX = cx + CARD_W / 2
      const iconCY = cardsY + 38
      const iconR = 22

      // Navy gradient circle for all badges
      const iconGrad = ctx.createRadialGradient(iconCX - 3, iconCY - 3, 2, iconCX, iconCY, iconR)
      iconGrad.addColorStop(0, '#1a3a5c')
      iconGrad.addColorStop(1, NAVY)
      ctx.fillStyle = iconGrad
      ctx.beginPath()
      ctx.arc(iconCX, iconCY, iconR, 0, Math.PI * 2)
      ctx.fill()

      // Subtle ring around icon circle
      ctx.strokeStyle = 'rgba(197, 150, 42, 0.3)'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.arc(iconCX, iconCY, iconR + 2, 0, Math.PI * 2)
      ctx.stroke()

      // Icon shapes — refined, cleaner, more precise
      ctx.save()
      ctx.strokeStyle = GOLD
      ctx.fillStyle = GOLD
      ctx.lineWidth = 2
      ctx.lineCap = "round"
      ctx.lineJoin = "round"

      if (card.icon === "truck") {
        // Modern Delivery Box & Truck Vector Icon
        ctx.fillStyle = GOLD_LIGHT
        ctx.beginPath()
        ctx.roundRect(iconCX - 13, iconCY - 7, 14, 13, 2)
        ctx.fill()
        ctx.fillStyle = GOLD
        ctx.beginPath()
        ctx.moveTo(iconCX + 3, iconCY - 3)
        ctx.lineTo(iconCX + 10, iconCY - 3)
        ctx.lineTo(iconCX + 13, iconCY + 2)
        ctx.lineTo(iconCX + 13, iconCY + 6)
        ctx.lineTo(iconCX + 3, iconCY + 6)
        ctx.closePath()
        ctx.fill()
        // White detail lines
        ctx.strokeStyle = WHITE
        ctx.lineWidth = 1.2
        ctx.beginPath()
        ctx.moveTo(iconCX - 6, iconCY - 7)
        ctx.lineTo(iconCX - 6, iconCY + 6)
        ctx.stroke()
        // Dark Wheels with Gold Rims
        ctx.fillStyle = NAVY
        ctx.beginPath()
        ctx.arc(iconCX - 7, iconCY + 7, 3.5, 0, Math.PI * 2)
        ctx.arc(iconCX + 8, iconCY + 7, 3.5, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = GOLD_LIGHT
        ctx.beginPath()
        ctx.arc(iconCX - 7, iconCY + 7, 1.5, 0, Math.PI * 2)
        ctx.arc(iconCX + 8, iconCY + 7, 1.5, 0, Math.PI * 2)
        ctx.fill()
      } else if (card.icon === "payment") {
        // Premium Dual Gold Wallet / Credit Card Vector Icon
        ctx.fillStyle = 'rgba(197, 150, 42, 0.4)'
        ctx.beginPath()
        ctx.roundRect(iconCX - 10, iconCY - 10, 22, 15, 3)
        ctx.fill()
        // Front Gold Card
        const cardGrad = ctx.createLinearGradient(iconCX - 14, iconCY - 5, iconCX + 10, iconCY + 9)
        cardGrad.addColorStop(0, '#FCE081')
        cardGrad.addColorStop(1, '#C5962A')
        ctx.fillStyle = cardGrad
        ctx.beginPath()
        ctx.roundRect(iconCX - 14, iconCY - 5, 24, 15, 3.5)
        ctx.fill()
        // Magnetic dark stripe
        ctx.fillStyle = NAVY
        ctx.fillRect(iconCX - 14, iconCY - 2, 24, 3)
        // EMV Chip
        ctx.fillStyle = WHITE
        ctx.beginPath()
        ctx.roundRect(iconCX - 10, iconCY + 3, 5, 4, 1)
        ctx.fill()
        // Contactless waves
        ctx.strokeStyle = NAVY
        ctx.lineWidth = 1.2
        ctx.beginPath()
        ctx.arc(iconCX + 5, iconCY + 5, 2.5, 1.1 * Math.PI, 1.9 * Math.PI)
        ctx.arc(iconCX + 5, iconCY + 5, 5, 1.1 * Math.PI, 1.9 * Math.PI)
        ctx.stroke()
      } else if (card.icon === "chat") {
        // Premium 3D Golden Chat / WhatsApp Badge inside Navy Circle
        const chatGrad = ctx.createLinearGradient(iconCX - 12, iconCY - 12, iconCX + 12, iconCY + 12)
        chatGrad.addColorStop(0, '#FCE081')
        chatGrad.addColorStop(0.5, '#E5B842')
        chatGrad.addColorStop(1, '#8A6614')
        ctx.fillStyle = chatGrad
        ctx.save()
        ctx.translate(iconCX, iconCY)
        ctx.scale(26 / 24, 26 / 24)
        ctx.translate(-12, -12)
        const bubblePath = new Path2D("M 12 2 C 6.48 2 2 6.48 2 12 C 2 13.8 2.48 15.5 3.36 17 L 2 21 L 6.15 19.65 C 7.9 21.12 10.15 22 12.03 22 C 17.55 22 22 17.52 22 12 C 22 6.48 17.55 2 12 2 Z")
        ctx.fill(bubblePath)
        const phonePath = new Path2D("M 17.47 14.38 C 17.17 14.23 15.71 13.52 15.44 13.42 C 15.17 13.32 14.97 13.27 14.77 13.57 C 14.57 13.87 14 14.53 13.83 14.73 C 13.66 14.93 13.48 14.96 13.19 14.81 C 12.89 14.66 11.93 14.35 10.8 13.34 C 9.91 12.55 9.32 11.58 9.14 11.28 C 8.97 10.98 9.13 10.82 9.27 10.67 C 9.4 10.54 9.57 10.33 9.72 10.16 C 9.87 9.98 9.92 9.86 10.02 9.66 C 10.12 9.46 10.07 9.29 9.99 9.14 C 9.92 8.99 9.32 7.53 9.08 6.94 C 8.84 6.36 8.59 6.44 8.42 6.43 C 8.25 6.42 8.05 6.42 7.85 6.42 C 7.65 6.42 7.33 6.49 7.06 6.79 C 6.79 7.09 6.02 7.81 6.02 9.27 C 6.02 10.73 7.09 12.15 7.24 12.35 C 7.39 12.55 9.33 15.55 12.31 16.84 C 13.02 17.15 13.58 17.33 14.01 17.47 C 14.72 17.69 15.37 17.66 15.88 17.58 C 16.45 17.5 17.64 16.86 17.89 16.17 C 18.14 15.48 18.14 14.88 18.06 14.76 C 17.99 14.64 17.79 14.57 17.47 14.38 Z")
        ctx.fillStyle = NAVY
        ctx.fill(phonePath)
        ctx.restore()
      } else if (card.icon === "shield") {
        // Authentic Info Garansi Resmi icon
        drawWarrantyShieldLogo(iconCX, iconCY, 30)
      }
      ctx.restore()

      // Card title (multi-line) — refined typography
      ctx.fillStyle = DARK_TEXT
      ctx.font = "900 16px 'Outfit', sans-serif"
      ctx.textBaseline = "top"
      const titleLines = card.title.split("\n")
      titleLines.forEach((line, li) => {
        ctx.textAlign = "center"
        ctx.fillText(line, cx + CARD_W / 2, cardsY + 70 + li * 18)
      })

      // Card description (multi-line)
      ctx.fillStyle = GRAY_TEXT
      ctx.font = "500 14px 'Outfit', sans-serif"
      const descStartY = cardsY + 70 + titleLines.length * 18 + 10
      const descLines = card.desc.split("\n")
      descLines.forEach((line, li) => {
        if (card.icon === "payment") {
          ctx.textAlign = "left"
          ctx.fillText(line, cx + 65, descStartY + li * 16)
        } else {
          ctx.textAlign = "center"
          ctx.fillText(line, cx + CARD_W / 2, descStartY + li * 16)
        }
      })
    })

    // ════════════════════════════
    // 9. BOTTOM CONTACT BAR — Modern & Elegant
    // ════════════════════════════
    const contactY = cardsY + CARD_H + 30
    const BAR_H = 92
    const BAR_X = 40
    const BAR_W = W - 80

    // Transparent minimalist background (subtle light tint with border)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'
    ctx.beginPath()
    ctx.roundRect(BAR_X, contactY, BAR_W, BAR_H, 16)
    ctx.fill()

    ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)'
    ctx.lineWidth = 1.2
    ctx.beginPath()
    ctx.roundRect(BAR_X, contactY, BAR_W, BAR_H, 16)
    ctx.stroke()

    // Dividing the bar into 3 equal columns
    const colW = BAR_W / 3
    const barMidY = contactY + BAR_H / 2

    const storePhone = storeSettings?.storePhone || "0812-3456-7890"
    const storeAddress = storeSettings?.storeAddress || "Bandung, Jawa Barat"

    // Vertical dividers between columns — clean minimalist gray
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)'
    ctx.lineWidth = 1
    for (let d = 1; d < 3; d++) {
      const dx = BAR_X + colW * d
      ctx.beginPath()
      ctx.moveTo(dx, contactY + 16)
      ctx.lineTo(dx, contactY + BAR_H - 16)
      ctx.stroke()
    }

    // Helper: draw a contact column — redesigned
    const drawContactCol = (colIdx: number, iconDraw: (ix: number, iy: number) => void, labelText: string, valueText: string) => {
      const colStartX = BAR_X + colIdx * colW
      const iconX = colStartX + 30
      const iconR = 16

      ctx.save()
      // Authentic brand vector logo
      iconDraw(iconX, barMidY)
      ctx.restore()

      // Label — bolder, slightly larger, clean dark gray
      const textX = iconX + iconR + 14
      ctx.fillStyle = '#4b5563' // Clean minimal gray label
      ctx.font = "800 14px 'Outfit', sans-serif"
      ctx.textAlign = "left"
      ctx.textBaseline = "bottom"

      // Value — pure black font for maximum clarity and minimalist elegance
      ctx.fillStyle = "#000000" // Pure black text
      let val = valueText
      const maxValW = colW - (textX - colStartX) - 16

      if (labelText === "LOKASI TOKO" && val.length > 22) {
        ctx.fillText(labelText, textX, barMidY - 8)
        ctx.font = "700 14.5px 'Outfit', sans-serif"
        ctx.textBaseline = "top"
        const lines = wrapText(val, maxValW, "700 14.5px 'Outfit', sans-serif")
        lines.slice(0, 2).forEach((line, li) => {
          ctx.fillText(line, textX, barMidY + 2 + li * 15)
        })
      } else {
        ctx.fillText(labelText, textX, barMidY - 2)
        ctx.font = "800 18px 'Outfit', sans-serif"
        ctx.textBaseline = "top"
        if (ctx.measureText(val).width > maxValW) {
          while (ctx.measureText(val + '…').width > maxValW && val.length > 0) {
            val = val.slice(0, -1)
          }
          val += '…'
        }
        ctx.fillText(val, textX, barMidY + 3)
      }
    }

    // WhatsApp column — authentic WhatsApp vector logo
    drawContactCol(0, (ix, iy) => {
      drawWhatsAppLogo(ix, iy, 34)
    }, "WHATSAPP", storePhone)

    // Location column — authentic Google Maps style red pin
    drawContactCol(1, (ix, iy) => {
      drawLocationLogo(ix, iy, 34)
    }, "LOKASI TOKO", storeAddress)

    // Instagram column — authentic Instagram brand gradient vector logo
    drawContactCol(2, (ix, iy) => {
      drawInstagramLogo(ix, iy, 34)
    }, "INSTAGRAM", customInstagram)


  }

  // ═══ REDRAW TRIGGER ═══
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(drawFlyer, 100)
      return () => clearTimeout(timer)
    }
  }, [isOpen, flyerDate, selectedBrands, showPrice, customInstagram, filteredItems, logoImgElement])

  const handleDownload = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    try {
      const link = document.createElement("a")
      link.download = `stok-laptop-${flyerDate.replace(/\s+/g, "-")}.jpg`
      link.href = canvas.toDataURL("image/jpeg", 1.0) // HD quality JPG for better social media posting
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
                <Download className="h-4 w-4" /> Download Poster HD (JPG)
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
