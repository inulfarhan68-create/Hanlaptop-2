import { useState, useCallback } from "react"
import { createPortal } from "react-dom"
import { Button } from "@/components/ui/button"
import { AlertCircle, AlertTriangle, Trash2, X } from "lucide-react"

interface ConfirmDialogProps {
  open: boolean
  onConfirm: () => void
  onCancel: () => void
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: "destructive" | "warning" | "default"
  loading?: boolean
}

export function ConfirmDialog({
  open,
  onConfirm,
  onCancel,
  title,
  description,
  confirmLabel = "Konfirmasi",
  cancelLabel = "Batal",
  variant = "destructive",
  loading = false,
}: ConfirmDialogProps) {
  if (!open) return null

  const iconMap = {
    destructive: <Trash2 className="h-5 w-5 text-destructive" />,
    warning: <AlertTriangle className="h-5 w-5 text-amber-500" />,
    default: <AlertCircle className="h-5 w-5 text-primary" />,
  }

  const buttonVariantMap = {
    destructive: "destructive" as const,
    warning: "default" as const,
    default: "default" as const,
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onCancel}
      />

      {/* Dialog */}
      <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
        {/* Close button */}
        <button
          onClick={onCancel}
          className="absolute top-3 right-3 p-1 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="p-6">
          {/* Icon + Title */}
          <div className="flex items-start gap-3 mb-3">
            <div className={`p-2.5 rounded-xl shrink-0 ${
              variant === "destructive" ? "bg-destructive/10" :
              variant === "warning" ? "bg-amber-500/10" :
              "bg-primary/10"
            }`}>
              {iconMap[variant]}
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-base leading-tight">{title}</h3>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{description}</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 px-6 pb-5">
          <Button
            variant="outline"
            className="flex-1 h-10 font-semibold"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={buttonVariantMap[variant]}
            className="flex-1 h-10 font-semibold"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "Memproses..." : confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  )
}

// Custom hook for easy usage
export function useConfirmDialog() {
  const [state, setState] = useState<{
    open: boolean
    title: string
    description: string
    confirmLabel?: string
    variant?: "destructive" | "warning" | "default"
    onConfirm: () => void | Promise<void>
  }>({
    open: false,
    title: "",
    description: "",
    onConfirm: () => {},
  })

  const [loading, setLoading] = useState(false)

  const confirm = useCallback(
    (opts: {
      title: string
      description: string
      confirmLabel?: string
      variant?: "destructive" | "warning" | "default"
    }) => {
      return new Promise<boolean>((resolve) => {
        setState({
          open: true,
          ...opts,
          onConfirm: () => resolve(true),
        })
      })
    },
    []
  )

  const dialog = (
    <ConfirmDialog
      open={state.open}
      title={state.title}
      description={state.description}
      confirmLabel={state.confirmLabel}
      variant={state.variant}
      loading={loading}
      onConfirm={async () => {
        setLoading(true)
        try {
          await state.onConfirm()
        } finally {
          setLoading(false)
          setState((s) => ({ ...s, open: false }))
        }
      }}
      onCancel={() => setState((s) => ({ ...s, open: false }))}
    />
  )

  return { confirm, dialog }
}
