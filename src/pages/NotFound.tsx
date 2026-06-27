import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Home, ArrowLeft, SearchX } from "lucide-react"
import { motion } from "framer-motion"

export function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      {/* Subtle background gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative text-center max-w-md mx-auto"
      >
        {/* 404 Number */}
        <div className="relative mb-6">
          <span className="text-[120px] md:text-[160px] font-black leading-none tracking-tighter text-primary/10 select-none">
            404
          </span>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="p-4 rounded-full bg-primary/10 border border-primary/20">
              <SearchX className="h-10 w-10 md:h-12 md:w-12 text-primary" />
            </div>
          </div>
        </div>

        {/* Message */}
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">
          Halaman Tidak Ditemukan
        </h1>
        <p className="text-muted-foreground text-sm md:text-base mb-8 max-w-sm mx-auto">
          Maaf, halaman yang Anda cari tidak ada atau sudah dipindahkan. Silakan kembali ke halaman utama.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild size="lg" className="gap-2">
            <Link to="/">
              <Home className="h-4 w-4" />
              Ke Dashboard
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="gap-2">
            <Link to="#" onClick={() => window.history.back()}>
              <ArrowLeft className="h-4 w-4" />
              Kembali
            </Link>
          </Button>
        </div>
      </motion.div>
    </div>
  )
}
