import { Loader2 } from "lucide-react"

export function PageLoading() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative flex flex-col items-center gap-4">
        {/* Glow effect ring */}
        <div className="absolute w-16 h-16 rounded-full bg-primary/20 blur-xl animate-pulse" />
        
        {/* Spinner icon */}
        <Loader2 className="h-10 w-10 animate-spin text-primary relative z-10" />
        
        <p className="text-xs font-bold tracking-wider uppercase text-muted-foreground animate-pulse mt-2">
          Memuat Halaman...
        </p>
      </div>
    </div>
  )
}
export default PageLoading
