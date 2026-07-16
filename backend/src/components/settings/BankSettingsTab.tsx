"use client";

import { apiFetch } from "@/lib/api";

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Save, CheckCircle2, Trash2, CreditCard, PlusCircle } from "lucide-react"
import { toast } from "sonner"
import { useUserRole } from "@/hooks/useUserRole"

export function BankSettingsTab() {
  const { isOwner } = useUserRole()
  const [applyToAllBranches, setApplyToAllBranches] = useState(false)
  const [storeName, setStoreName] = useState("HanLaptop")
  const [address, setAddress] = useState("Jl. Komputer Raya No.123")
  const [phone, setPhone] = useState("0812-3456-7890")
  const [storeLogo, setStoreLogo] = useState("")
  const [storeFooter, setStoreFooter] = useState("")
  
  const [banks, setBanks] = useState<{bank: string, account: string, name: string}[]>([])
  const [customBankIndices, setCustomBankIndices] = useState<Record<number, boolean>>({})
  const [savedBanks, setSavedBanks] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    apiFetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data && !data.error) {
          setStoreName(data.storeName || "HanLaptop")
          setAddress(data.storeAddress || "")
          setPhone(data.storePhone || "")
          setStoreLogo(data.storeLogo || "")
          setStoreFooter(data.storeFooter || "")
          if (data.storeBanks) {
            setBanks(data.storeBanks)
          } else {
            setBanks([])
          }
        }
      })
      .catch(() => {
        setBanks([])
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  const handleSaveBanks = async () => {
    try {
      const res = await apiFetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeName,
          storeAddress: address,
          storePhone: phone,
          storeLogo,
          storeFooter,
          storeBanks: banks,
          applyToAllBranches
        })
      });

      if (res.ok) {
        setSavedBanks(true)
        toast.success("Daftar rekening bank berhasil diperbarui!")
        setTimeout(() => setSavedBanks(false), 2000)
      } else {
        const error = await res.json();
        toast.error(`Gagal menyimpan: ${error.error}`)
      }
    } catch (e) {
      toast.error("Terjadi kesalahan jaringan.")
    }
  }

  const updateBank = (index: number, field: string, value: string) => {
    const newBanks = [...banks]
    newBanks[index] = { ...newBanks[index], [field]: value }
    setBanks(newBanks)
  }

  const addBank = () => {
    setBanks([...banks, { bank: "", account: "", name: "" }])
  }

  const removeBank = (index: number) => {
    setBanks(banks.filter((_, i) => i !== index))
    const newCustomIndices: Record<number, boolean> = {}
    Object.entries(customBankIndices).forEach(([key, val]) => {
      const k = parseInt(key)
      if (k < index) {
        newCustomIndices[k] = val
      } else if (k > index) {
        newCustomIndices[k - 1] = val
      }
    })
    setCustomBankIndices(newCustomIndices)
  }

  if (loading) {
    return <div className="text-center py-10 text-muted-foreground text-sm font-medium">Memuat data rekening bank...</div>
  }

  return (
    <Card className="border border-border/80 shadow-sm overflow-hidden rounded-2xl">
      <CardHeader className="border-b border-border/40 pb-4 bg-muted/10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 text-primary rounded-xl">
            <CreditCard className="h-5 w-5" />
          </div>
          <div className="text-left">
            <CardTitle className="text-base font-bold">Rekening Bank Toko</CardTitle>
            <CardDescription className="text-xs">Kelola daftar rekening bank. Rekening ini akan tercetak di bagian bawah nota untuk pembayaran transfer pelanggan.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-6 text-left">
        {banks.length === 0 ? (
          <div className="py-12 border border-dashed rounded-2xl flex flex-col items-center justify-center text-center text-muted-foreground bg-muted/5 gap-3 p-4">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">Belum Ada Rekening Bank</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 max-w-[280px]">Tambahkan rekening bank untuk mempermudah pelanggan melakukan transfer pembayaran.</p>
            </div>
          </div>
        ) : (
          <div className="grid gap-4">
            {banks.map((b, i) => (
              <div key={i} className="group relative flex flex-col gap-4 p-4 border border-border/70 rounded-2xl bg-card hover:bg-muted/5 hover:border-border transition-all shadow-sm">
                <div className="flex items-center justify-between border-b border-border/40 pb-2">
                  <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-primary/15 text-primary text-[10px] flex items-center justify-center font-black">
                      {i + 1}
                    </span>
                    Rekening Pembayaran
                  </span>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive rounded-full"
                    onClick={() => removeBank(i)}
                    title="Hapus Rekening"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Pilih Bank</label>
                    {(() => {
                      const popularBanks = ["BCA", "BRI", "BNI", "Mandiri", "BSI", "Seabank", "OVO", "GoPay", "DANA", "CIMB", "Permata", "Danamon"];
                      const isCustom = customBankIndices[i] || (b.bank !== "" && !popularBanks.includes(b.bank));
                      const selectValue = isCustom ? "Lainnya" : b.bank;
                      return (
                        <div className="space-y-2">
                          <select
                            className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-semibold ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            value={selectValue}
                            onChange={e => {
                              const val = e.target.value;
                              if (val === "Lainnya") {
                                setCustomBankIndices(prev => ({ ...prev, [i]: true }));
                                updateBank(i, "bank", "");
                              } else {
                                setCustomBankIndices(prev => ({ ...prev, [i]: false }));
                                updateBank(i, "bank", val);
                              }
                            }}
                          >
                            <option value="" disabled>Pilih Bank</option>
                            {popularBanks.map(pb => (
                              <option key={pb} value={pb}>{pb}</option>
                            ))}
                            <option value="Lainnya">Lainnya (Tulis Manual)</option>
                          </select>
                          
                          {isCustom && (
                            <Input
                              placeholder="Ketik Nama Bank..."
                              value={b.bank}
                              onChange={e => updateBank(i, "bank", e.target.value)}
                              className="rounded-xl h-9 text-xs"
                            />
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Nomor Rekening</label>
                    <Input 
                      placeholder="Contoh: 0123456789" 
                      value={b.account} 
                      onChange={e => updateBank(i, "account", e.target.value)} 
                      className="rounded-xl h-10 text-xs font-semibold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Atas Nama (Pemilik)</label>
                    <Input 
                      placeholder="Contoh: Budi Susanto" 
                      value={b.name} 
                      onChange={e => updateBank(i, "name", e.target.value)} 
                      className="rounded-xl h-10 text-xs font-semibold"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        <Button 
          variant="outline" 
          onClick={addBank} 
          className="w-full border-dashed rounded-xl h-10 text-xs font-bold gap-2"
        >
          <PlusCircle className="h-4 w-4" /> Tambah Rekening Pembayaran
        </Button>
      </CardContent>
      <CardFooter className="border-t border-border/40 px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/10">
        {isOwner && (
          <label className="flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground cursor-pointer select-none">
            <input 
              type="checkbox" 
              checked={applyToAllBranches}
              onChange={(e) => setApplyToAllBranches(e.target.checked)}
              className="rounded border-input text-primary focus:ring-primary h-4 w-4"
            />
            <span>Terapkan rekening bank ini ke semua cabang</span>
          </label>
        )}
        <Button className="gap-2 rounded-xl font-bold h-9 text-xs sm:ml-auto" onClick={handleSaveBanks} disabled={banks.length === 0}>
          {savedBanks ? <CheckCircle2 className="h-4 w-4" /> : <Save className="h-4 w-4" />} 
          {savedBanks ? "Perubahan Disimpan!" : "Simpan Rekening"}
        </Button>
      </CardFooter>
    </Card>
  )
}
export default BankSettingsTab
