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

    const W = 1200 // canvas width

    // ── CONSTANTS ──
    const NAVY = "#0c2340"
    const GOLD = "#c5962a"
    const GOLD_LIGHT = "#d4a843"
    const WHITE = "#ffffff"
    const LIGHT_BG = "#f2f4f7"
    const DARK_TEXT = "#1a2332"
    const GRAY_TEXT = "#5a6577"
    const RED_LENOVO = "#cc1820"
    const TABLE_BORDER = "#d8dce3"

    // ── CALCULATE DYNAMIC HEIGHT ──
    const HEADER_H = 400
    const BRAND_GAP = 35
    const ROW_H = 52
    const TABLE_HEADER_H = 40
    const FOOTER_CARDS_H = 200
    const FOOTER_CONTACT_H = 90
    const BOTTOM_PAD = 40

    let brandsContentH = 0
    const activeBrands = selectedBrands.filter(b => (itemsByBrand[b] || []).length > 0)
    activeBrands.forEach(brand => {
      const count = (itemsByBrand[brand] || []).length
      brandsContentH += TABLE_HEADER_H + count * ROW_H + BRAND_GAP
    })

    const H = HEADER_H + brandsContentH + 30 + FOOTER_CARDS_H + FOOTER_CONTACT_H + BOTTOM_PAD
    canvas.width = W
    canvas.height = H

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
      ctx.font = "500 24px 'Inter', sans-serif"
      ctx.textAlign = "center"
      ctx.textBaseline = "top"
      ctx.fillText(storeName, W / 2, 40 + dh + 8)
    } else {
      ctx.fillStyle = NAVY
      ctx.font = "600 30px 'Inter', sans-serif"
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
    ctx.font = "900 72px 'Inter', sans-serif"
    ctx.fillText("UPDATE", W / 2, 175)

    ctx.fillStyle = GOLD
    ctx.font = "900 92px 'Inter', sans-serif"
    ctx.fillText("STOK LAPTOP", W / 2, 252)

    // ════════════════════════════
    // 6. DATE LINE with gold accent dashes
    // ════════════════════════════
    const dateY = 365
    ctx.fillStyle = GRAY_TEXT
    ctx.font = "500 22px 'Inter', sans-serif"
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
    const MARGIN_L = 60  // left margin for brand name area
    const BRAND_COL_W = 200 // width for brand name column
    const TABLE_X = MARGIN_L + BRAND_COL_W // table starts after brand column
    const TABLE_W = W - TABLE_X - 60 // table width

    // Column positions within the table (relative to TABLE_X)
    const COL_TYPE_X = 20 // left padding for TYPE
    const COL_PRICE_CENTER = TABLE_W * 0.52 // center of HARGA LAPTOP
    const COL_SPECS_X = TABLE_W * 0.66 // left of KETERANGAN

    activeBrands.forEach(brand => {
      const brandItems = itemsByBrand[brand] || []
      if (brandItems.length === 0) return

      const tableH = TABLE_HEADER_H + brandItems.length * ROW_H

      // ── A. BRAND NAME (left column, vertically centered with table) ──
      ctx.save()
      const brandCenterY = curY + tableH / 2
      
      // Brand name text styling per brand
      ctx.textAlign = "left"
      ctx.textBaseline = "middle"
      
      if (brand === "ASUS") {
        ctx.fillStyle = DARK_TEXT
        ctx.font = "italic 900 42px 'Inter', sans-serif"
        ctx.fillText("ASUS", MARGIN_L, brandCenterY - 20)
      } else if (brand === "HP") {
        ctx.fillStyle = "#0284c7"
        ctx.font = "italic 900 48px 'Inter', sans-serif"
        ctx.fillText("hp", MARGIN_L, brandCenterY - 20)
      } else if (brand === "LENOVO") {
        ctx.fillStyle = DARK_TEXT
        ctx.font = "900 40px 'Inter', sans-serif"
        ctx.fillText("Lenovo", MARGIN_L, brandCenterY - 20)
      } else if (brand === "DELL") {
        ctx.fillStyle = "#0076c0"
        ctx.font = "900 40px 'Inter', sans-serif"
        ctx.fillText("DELL", MARGIN_L, brandCenterY - 20)
      } else {
        ctx.fillStyle = DARK_TEXT
        ctx.font = "900 36px 'Inter', sans-serif"
        ctx.fillText(brand, MARGIN_L, brandCenterY - 20)
      }
      ctx.restore()

      // ── B. TABLE HEADER BAR ──
      const headerColor = brand === "LENOVO" ? RED_LENOVO : NAVY
      
      ctx.fillStyle = headerColor
      ctx.beginPath()
      ctx.roundRect(TABLE_X, curY, TABLE_W, TABLE_HEADER_H, [6, 6, 0, 0])
      ctx.fill()

      ctx.fillStyle = WHITE
      ctx.font = "bold 14px 'Inter', sans-serif"
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

        // ── GARANSI RESMI BADGE (in brand column, aligned with this row) ──
        const isOfficial = item.condition === 'NEW' || (item.specs && /resmi|resmy|official/i.test(item.specs))
        if (isOfficial) {
          const badgeX = MARGIN_L + 20
          const badgeY = rowMidY

          // Gold shield shape
          ctx.save()
          ctx.fillStyle = GOLD
          ctx.beginPath()
          ctx.moveTo(badgeX, badgeY - 16)
          ctx.lineTo(badgeX + 14, badgeY - 11)
          ctx.lineTo(badgeX + 14, badgeY + 2)
          ctx.quadraticCurveTo(badgeX + 14, badgeY + 13, badgeX, badgeY + 18)
          ctx.quadraticCurveTo(badgeX - 14, badgeY + 13, badgeX - 14, badgeY + 2)
          ctx.lineTo(badgeX - 14, badgeY - 11)
          ctx.closePath()
          ctx.fill()

          // Dark border on shield
          ctx.strokeStyle = NAVY
          ctx.lineWidth = 2
          ctx.stroke()

          // White checkmark
          ctx.strokeStyle = WHITE
          ctx.lineWidth = 3
          ctx.lineCap = "round"
          ctx.lineJoin = "round"
          ctx.beginPath()
          ctx.moveTo(badgeX - 5, badgeY)
          ctx.lineTo(badgeX - 1, badgeY + 5)
          ctx.lineTo(badgeX + 7, badgeY - 5)
          ctx.stroke()
          ctx.restore()

          // "GARANSI RESMI" text next to badge
          ctx.save()
          ctx.fillStyle = NAVY
          ctx.font = "800 10px 'Inter', sans-serif"
          ctx.textAlign = "left"
          ctx.textBaseline = "middle"
          ctx.fillText("GARANSI", badgeX + 20, badgeY - 6)
          ctx.fillText("RESMI", badgeX + 20, badgeY + 6)
          ctx.restore()
        }

        // ── TYPE column ──
        ctx.fillStyle = DARK_TEXT
        ctx.font = "600 16px 'Inter', sans-serif"
        ctx.textAlign = "left"
        ctx.textBaseline = "middle"
        let typeName = item.itemName
        if (typeName.length > 28) typeName = typeName.substring(0, 26) + "…"
        ctx.fillText(typeName, TABLE_X + COL_TYPE_X, rowMidY)

        // ── HARGA column ──
        ctx.fillStyle = DARK_TEXT
        ctx.font = "800 17px 'Inter', sans-serif"
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"
        const priceStr = showPrice ? formatCurrency(item.sellingPrice) : "Hubungi Admin"
        ctx.fillText(priceStr, TABLE_X + COL_PRICE_CENTER, rowMidY)

        // ── KETERANGAN column ──
        ctx.fillStyle = GRAY_TEXT
        ctx.font = "400 13px 'Inter', sans-serif"
        ctx.textAlign = "left"
        ctx.textBaseline = "middle"
        let specs = item.specs || "-"
        specs = specs.replace(/\||\n/g, ", ")
        if (specs.length > 40) specs = specs.substring(0, 38) + "…"
        ctx.fillText(specs, TABLE_X + COL_SPECS_X, rowMidY)

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
    const cardsY = curY + 20
    const CARD_W = 245
    const CARD_H = 160
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
        desc: "Laptop dengan ikon ini\nberarti masih memiliki\ngaransi resmi.\n\n*S&K berlaku"
      }
    ]

    infoCards.forEach((card, idx) => {
      const cx = cardsStartX + idx * (CARD_W + CARD_GAP)
      
      // Card background
      ctx.save()
      ctx.shadowColor = "rgba(0,0,0,0.06)"
      ctx.shadowBlur = 12
      ctx.shadowOffsetY = 4
      ctx.fillStyle = WHITE
      ctx.beginPath()
      ctx.roundRect(cx, cardsY, CARD_W, CARD_H, 12)
      ctx.fill()
      ctx.restore()

      // Card border
      ctx.strokeStyle = "#e8eaee"
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.roundRect(cx, cardsY, CARD_W, CARD_H, 12)
      ctx.stroke()

      // Icon circle
      const iconCX = cx + CARD_W / 2
      const iconCY = cardsY + 35
      ctx.fillStyle = NAVY
      ctx.beginPath()
      ctx.arc(iconCX, iconCY, 20, 0, Math.PI * 2)
      ctx.fill()

      // Icon shapes (gold on navy circle)
      ctx.save()
      ctx.strokeStyle = GOLD
      ctx.fillStyle = GOLD
      ctx.lineWidth = 2
      ctx.lineCap = "round"
      ctx.lineJoin = "round"

      if (card.icon === "truck") {
        // Truck / delivery icon
        ctx.beginPath()
        ctx.rect(iconCX - 10, iconCY - 5, 12, 10)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(iconCX + 2, iconCY - 5)
        ctx.lineTo(iconCX + 10, iconCY - 5)
        ctx.lineTo(iconCX + 12, iconCY)
        ctx.lineTo(iconCX + 12, iconCY + 5)
        ctx.lineTo(iconCX + 2, iconCY + 5)
        ctx.stroke()
        // Wheels
        ctx.beginPath()
        ctx.arc(iconCX - 5, iconCY + 6, 2.5, 0, Math.PI * 2)
        ctx.fill()
        ctx.beginPath()
        ctx.arc(iconCX + 8, iconCY + 6, 2.5, 0, Math.PI * 2)
        ctx.fill()
      } else if (card.icon === "payment") {
        // Credit card icon
        ctx.beginPath()
        ctx.roundRect(iconCX - 11, iconCY - 8, 22, 16, 2)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(iconCX - 11, iconCY - 3)
        ctx.lineTo(iconCX + 11, iconCY - 3)
        ctx.stroke()
        ctx.fillRect(iconCX - 7, iconCY + 1, 6, 3)
      } else if (card.icon === "chat") {
        // Chat bubble
        ctx.beginPath()
        ctx.roundRect(iconCX - 10, iconCY - 9, 20, 15, 4)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(iconCX - 3, iconCY + 6)
        ctx.lineTo(iconCX - 7, iconCY + 11)
        ctx.lineTo(iconCX + 1, iconCY + 6)
        ctx.fill()
        // Dots inside
        for (let d = -4; d <= 4; d += 4) {
          ctx.beginPath()
          ctx.arc(iconCX + d, iconCY - 2, 1.5, 0, Math.PI * 2)
          ctx.fill()
        }
      } else if (card.icon === "shield") {
        // Shield icon
        ctx.beginPath()
        ctx.moveTo(iconCX, iconCY - 11)
        ctx.lineTo(iconCX + 10, iconCY - 7)
        ctx.lineTo(iconCX + 10, iconCY + 2)
        ctx.quadraticCurveTo(iconCX + 10, iconCY + 9, iconCX, iconCY + 13)
        ctx.quadraticCurveTo(iconCX - 10, iconCY + 9, iconCX - 10, iconCY + 2)
        ctx.lineTo(iconCX - 10, iconCY - 7)
        ctx.closePath()
        ctx.stroke()
        // Check inside
        ctx.beginPath()
        ctx.moveTo(iconCX - 4, iconCY)
        ctx.lineTo(iconCX - 1, iconCY + 3)
        ctx.lineTo(iconCX + 5, iconCY - 3)
        ctx.stroke()
      }
      ctx.restore()

      // Card title (multi-line)
      ctx.fillStyle = DARK_TEXT
      ctx.font = "800 12px 'Inter', sans-serif"
      ctx.textAlign = "center"
      ctx.textBaseline = "top"
      const titleLines = card.title.split("\n")
      titleLines.forEach((line, li) => {
        ctx.fillText(line, cx + CARD_W / 2, cardsY + 65 + li * 15)
      })

      // Card description (multi-line)
      ctx.fillStyle = GRAY_TEXT
      ctx.font = "400 11px 'Inter', sans-serif"
      const descStartY = cardsY + 65 + titleLines.length * 15 + 8
      const descLines = card.desc.split("\n")
      descLines.forEach((line, li) => {
        ctx.fillText(line, cx + CARD_W / 2, descStartY + li * 14)
      })
    })

    // ════════════════════════════
    // 9. BOTTOM CONTACT BAR
    // ════════════════════════════
    const contactY = cardsY + CARD_H + 30
    const BAR_H = 70
    const BAR_X = 50
    const BAR_W = W - 100

    ctx.fillStyle = NAVY
    ctx.beginPath()
    ctx.roundRect(BAR_X, contactY, BAR_W, BAR_H, 14)
    ctx.fill()

    // Dividing the bar into 3 equal columns
    const colW = BAR_W / 3
    const barMidY = contactY + BAR_H / 2

    const storePhone = storeSettings?.storePhone || "0812-3456-7890"
    const storeAddress = storeSettings?.storeAddress || "Bandung, Jawa Barat"

    // Helper: draw a contact column
    const drawContactCol = (colIdx: number, iconDraw: () => void, labelText: string, valueText: string) => {
      const colStartX = BAR_X + colIdx * colW
      const iconX = colStartX + 30

      ctx.save()
      // Gold circle behind icon
      ctx.fillStyle = GOLD
      ctx.beginPath()
      ctx.arc(iconX, barMidY, 15, 0, Math.PI * 2)
      ctx.fill()

      // Icon (navy on gold circle)
      ctx.fillStyle = NAVY
      ctx.strokeStyle = NAVY
      ctx.lineWidth = 2
      ctx.lineCap = "round"
      ctx.lineJoin = "round"
      iconDraw()
      ctx.restore()

      // Label
      ctx.fillStyle = WHITE
      ctx.font = "700 11px 'Inter', sans-serif"
      ctx.textAlign = "left"
      ctx.textBaseline = "bottom"
      ctx.fillText(labelText, iconX + 22, barMidY - 2)

      // Value
      ctx.fillStyle = GOLD_LIGHT
      ctx.font = "600 13px 'Inter', sans-serif"
      ctx.textAlign = "left"
      ctx.textBaseline = "top"
      let val = valueText
      if (val.length > 30) val = val.substring(0, 28) + "…"
      ctx.fillText(val, iconX + 22, barMidY + 3)
    }

    // WhatsApp column
    drawContactCol(0, () => {
      const ix = BAR_X + 30, iy = barMidY
      // Phone receiver shape
      ctx.beginPath()
      ctx.moveTo(ix - 5, iy - 6)
      ctx.quadraticCurveTo(ix - 7, iy - 2, ix - 4, iy + 2)
      ctx.quadraticCurveTo(ix, iy + 6, ix + 5, iy + 6)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(ix - 5, iy - 6)
      ctx.quadraticCurveTo(ix - 1, iy - 8, ix + 3, iy - 4)
      ctx.stroke()
    }, "WHATSAPP", storePhone)

    // Location column
    drawContactCol(1, () => {
      const ix = BAR_X + colW + 30, iy = barMidY
      // Pin shape
      ctx.beginPath()
      ctx.arc(ix, iy - 3, 4, 0, Math.PI * 2)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(ix, iy + 1)
      ctx.lineTo(ix, iy + 7)
      ctx.stroke()
    }, "LOKASI TOKO", storeAddress)

    // Instagram column
    drawContactCol(2, () => {
      const ix = BAR_X + colW * 2 + 30, iy = barMidY
      // Camera square
      ctx.beginPath()
      ctx.roundRect(ix - 7, iy - 7, 14, 14, 3)
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(ix, iy, 4, 0, Math.PI * 2)
      ctx.stroke()
      // Dot
      ctx.beginPath()
      ctx.arc(ix + 4, iy - 4, 1.5, 0, Math.PI * 2)
      ctx.fill()
    }, "INSTAGRAM", customInstagram)

    // ════════════════════════════
    // 10. BOTTOM-LEFT DOT GRID (subtle decoration)
    // ════════════════════════════
    ctx.fillStyle = "#c8cdd5"
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        ctx.beginPath()
        ctx.arc(60 + c * 18, contactY - 100 + r * 18, 2.5, 0, Math.PI * 2)
        ctx.fill()
      }
    }
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
