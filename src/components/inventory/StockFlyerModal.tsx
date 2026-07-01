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

// Custom brand logo drawing helper
function drawBrandLogo(ctx: CanvasRenderingContext2D, brand: string, x: number, y: number) {
  ctx.save()
  
  if (brand === "ASUS") {
    // Asus custom wide styled logo
    ctx.strokeStyle = "#0f172a"
    ctx.lineWidth = 5
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    
    // Draw 'A'
    ctx.beginPath()
    ctx.moveTo(x - 55, y + 10)
    ctx.lineTo(x - 43, y - 12)
    ctx.lineTo(x - 31, y + 10)
    ctx.moveTo(x - 49, y + 2)
    ctx.lineTo(x - 37, y + 2)
    ctx.stroke()
    
    // Draw 'S'
    ctx.beginPath()
    ctx.moveTo(x - 21, y - 8)
    ctx.quadraticCurveTo(x - 10, y - 14, x - 5, y - 6)
    ctx.quadraticCurveTo(x - 3, y, x - 13, y + 2)
    ctx.quadraticCurveTo(x - 22, y + 4, x - 15, y + 10)
    ctx.stroke()
    
    // Draw 'U'
    ctx.beginPath()
    ctx.moveTo(x - 1, y - 10)
    ctx.lineTo(x - 1, y + 6)
    ctx.quadraticCurveTo(x - 1, y + 11, x + 7, y + 11)
    ctx.quadraticCurveTo(x + 15, y + 11, x + 15, y + 6)
    ctx.lineTo(x + 15, y - 10)
    ctx.stroke()
    
    // Draw 'S'
    ctx.beginPath()
    ctx.moveTo(x + 23, y - 8)
    ctx.quadraticCurveTo(x + 34, y - 14, x + 39, y - 6)
    ctx.quadraticCurveTo(x + 41, y, x + 31, y + 2)
    ctx.quadraticCurveTo(x + 22, y + 4, x + 29, y + 10)
    ctx.stroke()
    
  } else if (brand === "HP") {
    // HP circle logo
    ctx.fillStyle = "#0284c7"
    ctx.beginPath()
    ctx.arc(x, y, 25, 0, Math.PI * 2)
    ctx.fill()
    
    ctx.fillStyle = "#ffffff"
    ctx.font = "italic bold 32px 'Inter', sans-serif"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillText("hp", x, y - 2)
    
  } else if (brand === "LENOVO") {
    // Lenovo solid red box
    ctx.fillStyle = "#e11d48"
    ctx.beginPath()
    ctx.roundRect(x - 60, y - 18, 120, 36, 4)
    ctx.fill()
    
    ctx.fillStyle = "#ffffff"
    ctx.font = "bold 20px 'Inter', sans-serif"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillText("Lenovo", x, y)
    
  } else if (brand === "DELL") {
    // Dell circle outline + Dell text
    ctx.strokeStyle = "#0076c0"
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(x, y, 25, 0, Math.PI * 2)
    ctx.stroke()
    
    ctx.fillStyle = "#0076c0"
    ctx.font = "bold 16px 'Inter', sans-serif"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    
    // Dell letters with tilted E
    ctx.fillText("D", x - 15, y)
    ctx.save()
    ctx.translate(x - 5, y)
    ctx.rotate(-0.35)
    ctx.fillText("E", 0, 0)
    ctx.restore()
    ctx.fillText("L", x + 5, y)
    ctx.fillText("L", x + 15, y)
    
  } else {
    // Default brand text for others
    ctx.fillStyle = "#0f172a"
    ctx.font = "bold 28px 'Inter', sans-serif"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillText(brand, x, y)
  }
  
  ctx.restore()
}

// Custom vector icon drawer for cards
function drawInfoCardIcon(ctx: CanvasRenderingContext2D, type: string, x: number, y: number) {
  ctx.save()
  
  // Circle Navy Background
  ctx.fillStyle = "#0f172a"
  ctx.beginPath()
  ctx.arc(x, y, 22, 0, Math.PI * 2)
  ctx.fill()
  
  // Icon drawing in Gold
  ctx.strokeStyle = "#fbbf24"
  ctx.fillStyle = "#fbbf24"
  ctx.lineWidth = 2.5
  ctx.lineCap = "round"
  ctx.lineJoin = "round"
  
  if (type === "ship") {
    // House / Store icon
    ctx.beginPath()
    ctx.moveTo(x - 12, y + 2)
    ctx.lineTo(x, y - 10)
    ctx.lineTo(x + 12, y + 2)
    ctx.stroke()
    
    ctx.beginPath()
    ctx.rect(x - 9, y + 2, 18, 9)
    ctx.stroke()
    
    ctx.fillRect(x - 3, y + 5, 6, 6)
    
  } else if (type === "pay") {
    // Document billing / credit list card
    ctx.beginPath()
    ctx.roundRect(x - 11, y - 8, 22, 16, 2)
    ctx.stroke()
    // Stripe line
    ctx.beginPath()
    ctx.moveTo(x - 11, y - 3)
    ctx.lineTo(x + 11, y - 3)
    ctx.stroke()
    // Dot lines
    ctx.fillRect(x - 6, y + 1, 4, 3)
    ctx.fillRect(x + 1, y + 1, 5, 2)
    
  } else if (type === "chat") {
    // WhatsApp bubble outline
    ctx.beginPath()
    ctx.arc(x, y - 1, 10, 0.15 * Math.PI, 1.8 * Math.PI)
    ctx.stroke()
    // Tail
    ctx.beginPath()
    ctx.moveTo(x - 6, y + 8)
    ctx.lineTo(x - 10, y + 10)
    ctx.lineTo(x - 9, y + 5)
    ctx.stroke()
    
    // Tiny inside telephone receiver
    ctx.fillStyle = "#fbbf24"
    ctx.font = "10px sans-serif"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillText("📞", x + 1, y - 1)
    
  } else if (type === "shield") {
    // Shield
    ctx.beginPath()
    ctx.moveTo(x, y - 9)
    ctx.lineTo(x + 8, y - 6)
    ctx.lineTo(x + 8, y + 1)
    ctx.quadraticCurveTo(x + 8, y + 7, x, y + 11)
    ctx.quadraticCurveTo(x - 8, y + 7, x - 8, y + 1)
    ctx.lineTo(x - 8, y - 6)
    ctx.closePath()
    ctx.stroke()
    
    // Checkmark inside shield
    ctx.beginPath()
    ctx.moveTo(x - 3, y)
    ctx.lineTo(x - 1, y + 2)
    ctx.lineTo(x + 3, y - 2)
    ctx.stroke()
  }
  
  ctx.restore()
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
    const headerHeight = 420
    const footerInfoHeight = 280
    const footerContactHeight = 150
    let mainContentHeight = 40
    
    const brandRows: Record<string, number> = {}
    selectedBrands.forEach(brand => {
      const brandItems = itemsByBrand[brand] || []
      if (brandItems.length === 0) return
      // Header brand height (50px) + items * rowHeight (65px) + padding spacing (30px)
      const brandHeight = 50 + (brandItems.length * 65) + 30
      brandRows[brand] = brandHeight
      mainContentHeight += brandHeight
    })

    const height = headerHeight + mainContentHeight + footerInfoHeight + footerContactHeight
    canvas.width = width
    canvas.height = height

    // 1. Background drawing
    ctx.fillStyle = "#f8fafc"
    ctx.fillRect(0, 0, width, height)

    // ── DRAW HEADER ACCENTS (Navy & Gold geometric bands at top-left/right) ──
    ctx.save()
    
    // Navy main diagonal block (Top Left)
    ctx.fillStyle = "#0f172a"
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(480, 0)
    ctx.lineTo(240, 140)
    ctx.lineTo(0, 140)
    ctx.closePath()
    ctx.fill()

    // Gold accent wedge (Top Left)
    ctx.fillStyle = "#fbbf24"
    ctx.beginPath()
    ctx.moveTo(480, 0)
    ctx.lineTo(510, 0)
    ctx.lineTo(260, 140)
    ctx.lineTo(240, 140)
    ctx.closePath()
    ctx.fill()

    // Navy & Gold accent lines (Top Right)
    ctx.strokeStyle = "#e2e8f0"
    ctx.lineWidth = 1.5
    
    // Helper to draw hexagon outline
    const drawHexagon = (hx: number, hy: number, size: number) => {
      ctx.beginPath()
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3
        const px = hx + size * Math.cos(angle)
        const py = hy + size * Math.sin(angle)
        if (i === 0) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
      }
      ctx.closePath()
      ctx.stroke()
    }

    // Interlocking hexagons in the top right
    drawHexagon(width - 120, 80, 50)
    drawHexagon(width - 70, 110, 50)

    // Floating dot pattern
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
    drawDots(width - 240, 60)
    drawDots(60, height - 420)

    ctx.restore()

    // 2. HEADER TITLE SECTION
    const storeName = storeSettings?.storeName || "HAN LAPTOP"
    
    // Draw Logo Curve (styled 'H' or minimalist curve like user reference logo)
    ctx.save()
    ctx.strokeStyle = "#0f172a"
    ctx.lineWidth = 6
    ctx.lineCap = "round"
    ctx.beginPath()
    ctx.moveTo(width / 2 - 25, 80)
    ctx.quadraticCurveTo(width / 2, 45, width / 2 + 15, 90)
    ctx.moveTo(width / 2 - 8, 55)
    ctx.quadraticCurveTo(width / 2 - 18, 90, width / 2 - 12, 100)
    ctx.stroke()
    ctx.restore()

    // Store Name Title
    ctx.fillStyle = "#0f172a"
    ctx.font = "bold 26px 'Inter', sans-serif"
    ctx.textAlign = "center"
    ctx.fillText(storeName.toUpperCase(), width / 2, 140)

    // "UPDATE"
    ctx.fillStyle = "#0f172a"
    ctx.font = "900 68px 'Inter', sans-serif"
    ctx.textAlign = "center"
    ctx.fillText("UPDATE", width / 2, 220)

    // "STOK LAPTOP"
    ctx.fillStyle = "#d97706" // Warm gold/dark amber
    ctx.font = "900 85px 'Inter', sans-serif"
    ctx.fillText("STOK LAPTOP", width / 2, 300)

    // Date/Subtitle
    ctx.fillStyle = "#475569"
    ctx.font = "bold 22px 'Inter', sans-serif"
    ctx.fillText(`Update per ${flyerDate}`, width / 2, 355)

    // Thin accent lines next to date
    ctx.strokeStyle = "#fbbf24"
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(width / 2 - 320, 347)
    ctx.lineTo(width / 2 - 180, 347)
    ctx.moveTo(width / 2 + 180, 347)
    ctx.lineTo(width / 2 + 320, 347)
    ctx.stroke()

    // 3. BRAND LISTINGS (Tables)
    let currentY = headerHeight

    selectedBrands.forEach(brand => {
      const brandItems = itemsByBrand[brand] || []
      if (brandItems.length === 0) return

      const tableX = 270
      const tableW = 870
      const rowH = 65

      // A. Draw Brand Logo inside the left column space
      // Logo area centered at x = 160
      const logoY = currentY + 25 // Center with header bar
      drawBrandLogo(ctx, brand, 160, logoY)

      // B. Draw Table Header Bar
      // Use RED header for Lenovo, Navy blue header for others to match example photo!
      let headerColor = "#0f172a"
      if (brand === "LENOVO") {
        headerColor = "#e11d48" // Lenovo Red
      }
      
      ctx.save()
      ctx.fillStyle = headerColor
      ctx.beginPath()
      ctx.roundRect(tableX, currentY, tableW, 48, [8, 8, 0, 0])
      ctx.fill()

      // Header column labels
      ctx.fillStyle = "#ffffff"
      ctx.font = "bold 15px 'Inter', sans-serif"
      ctx.textAlign = "center"
      ctx.fillText("TYPE", tableX + 170, currentY + 30)
      ctx.fillText("HARGA LAPTOP", tableX + 460, currentY + 30)
      ctx.fillText("KETERANGAN", tableX + tableW - 180, currentY + 30)
      ctx.restore()

      // C. Draw Table Rows
      let itemY = currentY + 48
      brandItems.forEach((item, index) => {
        // Alternating row backgrounds
        ctx.fillStyle = index % 2 === 0 ? "#ffffff" : "#f8fafc"
        ctx.fillRect(tableX, itemY, tableW, rowH)

        // Horizontal bottom border line
        ctx.strokeStyle = "#e2e8f0"
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(tableX, itemY + rowH)
        ctx.lineTo(tableX + tableW, itemY + rowH)
        ctx.stroke()

        // B1. Draw "Garansi Resmi" badge on the LEFT column aligned with this item
        const isOfficialWarranty = item.condition === 'NEW' || (item.specs && /resmi|resmy|official/i.test(item.specs))
        if (isOfficialWarranty) {
          ctx.save()
          // Gold Checkmark Shield
          const shieldX = 100
          const shieldY = itemY + (rowH / 2)
          
          ctx.fillStyle = "#fbbf24"
          ctx.strokeStyle = "#0f172a"
          ctx.lineWidth = 2.5
          
          ctx.beginPath()
          ctx.moveTo(shieldX, shieldY - 14)
          ctx.lineTo(shieldX + 11, shieldY - 9)
          ctx.lineTo(shieldX + 11, shieldY + 1)
          ctx.quadraticCurveTo(shieldX + 11, shieldY + 10, shieldX, shieldY + 15)
          ctx.quadraticCurveTo(shieldX - 11, shieldY + 10, shieldX - 11, shieldY + 1)
          ctx.lineTo(shieldX - 11, shieldY - 9)
          ctx.closePath()
          ctx.fill()
          ctx.stroke()
          
          // White check symbol inside shield
          ctx.strokeStyle = "#ffffff"
          ctx.lineWidth = 2.5
          ctx.lineCap = "round"
          ctx.beginPath()
          ctx.moveTo(shieldX - 5, shieldY)
          ctx.lineTo(shieldX - 1, shieldY + 4)
          ctx.lineTo(shieldX + 5, shieldY - 4)
          ctx.stroke()
          
          // Shield Side Text labels
          ctx.fillStyle = "#0f172a"
          ctx.font = "900 11px 'Inter', sans-serif"
          ctx.textAlign = "left"
          ctx.fillText("GARANSI", shieldX + 18, shieldY - 5)
          ctx.fillText("RESMI", shieldX + 18, shieldY + 8)
          ctx.restore()
        }

        // B2. TYPE Column (aligned left)
        ctx.fillStyle = "#0f172a"
        ctx.font = "bold 18px 'Inter', sans-serif"
        ctx.textAlign = "left"
        let nameToDraw = item.itemName
        if (nameToDraw.length > 30) {
          nameToDraw = nameToDraw.substring(0, 28) + "..."
        }
        ctx.fillText(nameToDraw, tableX + 24, itemY + 38)

        // B3. PRICE Column (aligned center)
        ctx.fillStyle = "#0f172a" // elegant deep black/navy price
        ctx.font = "900 21px 'Inter', sans-serif"
        ctx.textAlign = "center"
        const priceText = showPrice ? formatCurrency(item.sellingPrice) : "Hubungi Admin"
        ctx.fillText(priceText, tableX + 460, itemY + 38)

        // B4. SPECS/KETERANGAN Column (aligned left)
        ctx.fillStyle = "#475569" // gray/slate
        ctx.font = "normal 14px 'Inter', sans-serif"
        ctx.textAlign = "left"
        
        let specsDesc = item.specs || "-"
        specsDesc = specsDesc.replace(/\||\n/g, ", ")
        if (specsDesc.length > 44) {
          specsDesc = specsDesc.substring(0, 42) + "..."
        }
        ctx.fillText(specsDesc, tableX + 560, itemY + 38)

        itemY += rowH
      })

      // Draw border outline around table card
      ctx.strokeStyle = "#cbd5e1"
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.roundRect(tableX, currentY, tableW, 48 + (brandItems.length * rowH), [8, 8, 8, 8])
      ctx.stroke()

      currentY += 50 + (brandItems.length * rowH) + 30
    })

    // 4. FOOTER INFORMATIONAL CARDS
    const infoY = currentY + 20
    ctx.save()

    const cardW = 250
    const cardH = 170
    const cardGap = 20
    const startX = (width - (4 * cardW + 3 * cardGap)) / 2

    const footerCards = [
      {
        type: "ship",
        title: "PENGAMBILAN / KIRIM",
        desc: "Datang ke toko langsung atau kami antar ke alamat Anda."
      },
      {
        type: "pay",
        title: "PEMBAYARAN",
        desc: "Cash, Transfer Bank, QRIS, E-Wallet."
      },
      {
        type: "chat",
        title: "RESPON RAMAH",
        desc: "Hubungi kami via WhatsApp untuk info lebih lanjut dan konsultasi."
      },
      {
        type: "shield",
        title: "GARANSI RESMI",
        desc: "Laptop dengan ikon ini berarti masih memiliki garansi resmi."
      }
    ]

    footerCards.forEach((card, idx) => {
      const cx = startX + idx * (cardW + cardGap)
      
      // Card container background
      ctx.fillStyle = "#ffffff"
      ctx.beginPath()
      ctx.roundRect(cx, infoY, cardW, cardH, 16)
      ctx.fill()
      
      // Subtle Card Shadow
      ctx.shadowColor = "rgba(0, 0, 0, 0.04)"
      ctx.shadowBlur = 8
      ctx.shadowOffsetY = 4
      ctx.strokeStyle = "#e2e8f0"
      ctx.lineWidth = 1.5
      ctx.stroke()
      
      // Disable shadow for text/inner shapes
      ctx.shadowColor = "transparent"

      // Card Icon
      drawInfoCardIcon(ctx, card.type, cx + cardW / 2, infoY + 36)

      // Card Title
      ctx.fillStyle = "#0f172a"
      ctx.font = "bold 13px 'Inter', sans-serif"
      ctx.textAlign = "center"
      ctx.fillText(card.title, cx + cardW / 2, infoY + 85)

      // Card Description
      ctx.fillStyle = "#475569"
      ctx.font = "normal 11px 'Inter', sans-serif"
      
      const words = card.desc.split(" ")
      let line = ""
      let lineCount = 0
      for (const w of words) {
        const testLine = line + w + " "
        const metrics = ctx.measureText(testLine)
        if (metrics.width > cardW - 36) {
          ctx.fillText(line, cx + cardW / 2, infoY + 110 + lineCount * 16)
          line = w + " "
          lineCount++
        } else {
          line = testLine
        }
      }
      ctx.fillText(line, cx + cardW / 2, infoY + 110 + lineCount * 16)
    })

    ctx.restore()

    // 5. FOOTER SOCIAL / CONTACT BAR
    const contactY = infoY + footerInfoHeight + 20
    
    // Draw solid navy footer block with rounded corners
    ctx.fillStyle = "#0f172a"
    ctx.beginPath()
    ctx.roundRect(50, contactY, width - 100, 96, 16)
    ctx.fill()

    const storePhone = storeSettings?.storePhone || "0812-3456-7890"
    const storeAddress = storeSettings?.storeAddress || "Bandung, Jawa Barat"

    const drawContactItem = (iconType: string, label: string, val: string, startX: number, colW: number) => {
      ctx.save()
      
      const itemCenterX = startX + colW / 2
      const centerY = contactY + 48

      // Draw Gold Icon
      ctx.fillStyle = "#fbbf24"
      ctx.strokeStyle = "#fbbf24"
      ctx.lineWidth = 2.5
      
      const iconX = itemCenterX - 90
      
      if (iconType === "wa") {
        // WhatsApp circular call icon
        ctx.beginPath()
        ctx.arc(iconX, centerY, 12, 0, Math.PI * 2)
        ctx.stroke()
        ctx.font = "12px sans-serif"
        ctx.fillText("📞", iconX, centerY + 4)
      } else if (iconType === "loc") {
        // Location pin icon
        ctx.beginPath()
        ctx.arc(iconX, centerY - 4, 6, 0, Math.PI * 2)
        ctx.stroke()
        ctx.moveTo(iconX, centerY - 4)
        ctx.lineTo(iconX, centerY + 8)
        ctx.stroke()
      } else if (iconType === "ig") {
        // Instagram camera square
        ctx.beginPath()
        ctx.roundRect(iconX - 10, centerY - 10, 20, 20, 5)
        ctx.stroke()
        ctx.beginPath()
        ctx.arc(iconX, centerY, 5, 0, Math.PI * 2)
        ctx.stroke()
      }

      // Draw Text Labels next to icon
      ctx.textAlign = "left"
      ctx.fillStyle = "#ffffff"
      ctx.font = "bold 13px 'Inter', sans-serif"
      ctx.fillText(label, iconX + 24, centerY - 5)
      
      ctx.fillStyle = "#fbbf24"
      ctx.font = "normal 14px 'Inter', sans-serif"
      let valShort = val
      if (valShort.length > 25) {
        valShort = valShort.substring(0, 23) + "..."
      }
      ctx.fillText(valShort, iconX + 24, centerY + 13)
      
      ctx.restore()
    }

    const colW = (width - 100) / 3
    drawContactItem("wa", "WHATSAPP", storePhone, 50, colW)
    drawContactItem("loc", "LOKASI TOKO", storeAddress, 50 + colW, colW)
    drawContactItem("ig", "INSTAGRAM", `@${customInstagram}`, 50 + colW * 2, colW)
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
