import { useState } from "react"
import { createPortal } from "react-dom"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Building, Edit2, Trash2, MapPin, Plus } from "lucide-react"
import { toast } from "sonner"
import useSWR from "swr"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export function BranchesTab() {
  const { data: branchesList, isLoading: branchesLoading, mutate: mutateBranches } = useSWR((import.meta.env.VITE_API_URL || '') + '/api/stores')
  
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false)
  const [editingBranch, setEditingBranch] = useState<any>(null)
  const [branchName, setBranchName] = useState("")
  const [branchAddress, setBranchAddress] = useState("")
  const [branchPhone, setBranchPhone] = useState("")
  const [branchSubmitting, setBranchSubmitting] = useState(false)

  const handleBranchSubmit = async () => {
    if (!branchName.trim()) {
      toast.error("Nama cabang wajib diisi");
      return;
    }
    setBranchSubmitting(true);
    try {
      const url = (import.meta.env.VITE_API_URL || '') + (editingBranch ? `/api/stores/${editingBranch.id}` : '/api/stores');
      const method = editingBranch ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: branchName, address: branchAddress, phone: branchPhone })
      });
      if (res.ok) {
        toast.success(`Cabang berhasil ${editingBranch ? 'diperbarui' : 'ditambahkan'}`);
        mutateBranches();
        setIsBranchModalOpen(false);
      } else {
        const err = await res.json();
        toast.error(err.error || "Gagal menyimpan cabang");
      }
    } catch (e) {
      toast.error("Terjadi kesalahan jaringan");
    } finally {
      setBranchSubmitting(false);
    }
  };

  const handleBranchDelete = async (id: string) => {
    if (confirm("Yakin ingin menghapus cabang ini? Penghapusan akan gagal jika cabang ini sudah memiliki data transaksi atau jurnal.")) {
      try {
        const res = await fetch((import.meta.env.VITE_API_URL || '') + `/api/stores/${id}`, { method: 'DELETE' });
        if (res.ok) {
          toast.success("Cabang berhasil dihapus");
          mutateBranches();
        } else {
          const err = await res.json();
          toast.error(err.error || "Gagal menghapus cabang");
        }
      } catch (e) {
        toast.error("Terjadi kesalahan jaringan");
      }
    }
  };

  return (
    <Card className="border border-border/80 shadow-sm overflow-hidden rounded-2xl">
      <CardHeader className="border-b border-border/40 pb-4 bg-muted/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 text-primary rounded-xl">
            <MapPin className="h-5 w-5" />
          </div>
          <div className="text-left">
            <CardTitle className="text-base font-bold">Manajemen Cabang Toko</CardTitle>
            <CardDescription className="text-xs">Kelola daftar lokasi, alamat, nomor telepon cabang toko Han Laptop.</CardDescription>
          </div>
        </div>
        <Button onClick={() => {
          setEditingBranch(null);
          setBranchName("");
          setBranchAddress("");
          setBranchPhone("");
          setIsBranchModalOpen(true);
        }} className="gap-1.5 rounded-xl text-xs font-bold h-9 shrink-0">
          <Plus className="h-4 w-4" /> Tambah Cabang
        </Button>
      </CardHeader>
      <CardContent className="p-0 text-left">
        {branchesLoading ? (
          <div className="text-center py-12 text-xs font-semibold text-muted-foreground">Memuat data cabang...</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/5">
                <TableRow>
                  <TableHead className="text-xs font-bold">Nama Cabang</TableHead>
                  <TableHead className="text-xs font-bold">Alamat Lengkap</TableHead>
                  <TableHead className="text-xs font-bold">Nomor Telepon</TableHead>
                  <TableHead className="text-right text-xs font-bold">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {branchesList?.map((branch: any) => (
                  <TableRow key={branch.id} className="hover:bg-muted/10 transition-colors border-b border-border/40">
                    <TableCell className="font-bold text-xs text-foreground py-3.5">
                      <div className="flex flex-col gap-1 text-left">
                        <span>{branch.name}</span>
                        {branch.slug && (
                          <a 
                            href={`/catalog/${branch.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-blue-500 hover:text-blue-600 hover:underline font-medium inline-block w-fit"
                          >
                            Lihat Katalog: /catalog/{branch.slug}
                          </a>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs font-semibold text-muted-foreground max-w-[240px] truncate">
                      {branch.address || '-'}
                    </TableCell>
                    <TableCell className="text-xs font-semibold text-foreground">{branch.phone || '-'}</TableCell>
                    <TableCell className="text-right space-x-1 whitespace-nowrap py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-8 text-[10px] font-bold rounded-xl gap-1"
                          onClick={() => {
                            setEditingBranch(branch);
                            setBranchName(branch.name);
                            setBranchAddress(branch.address || "");
                            setBranchPhone(branch.phone || "");
                            setIsBranchModalOpen(true);
                          }}
                        >
                          <Edit2 className="h-3 w-3" /> Edit
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-destructive hover:bg-destructive/10 rounded-full"
                          onClick={() => handleBranchDelete(branch.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {(!branchesList || branchesList.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-xs text-muted-foreground font-semibold">
                      Belum ada cabang terdaftar.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
      
      {/* Modal Tambah/Edit Cabang */}
      {isBranchModalOpen && createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-md rounded-2xl shadow-xl border p-5 space-y-4 animate-in zoom-in-95 duration-200">
            <h3 className="text-base font-bold text-left">{editingBranch ? "Edit Detail Cabang" : "Tambah Cabang Baru"}</h3>
            <div className="space-y-3 text-left">
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Nama Cabang <span className="text-destructive">*</span></label>
                <Input 
                  placeholder="Misal: Cabang Malang" 
                  value={branchName} 
                  onChange={(e) => setBranchName(e.target.value)} 
                  className="rounded-xl h-10 text-xs font-semibold"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Alamat Lengkap</label>
                <Input 
                  placeholder="Alamat lengkap lokasi cabang" 
                  value={branchAddress} 
                  onChange={(e) => setBranchAddress(e.target.value)} 
                  className="rounded-xl h-10 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Nomor Telepon</label>
                <Input 
                  placeholder="Misal: 081234567890" 
                  value={branchPhone} 
                  onChange={(e) => setBranchPhone(e.target.value)} 
                  className="rounded-xl h-10 text-xs"
                />
              </div>
            </div>
            <div className="flex gap-2 pt-4 border-t border-border mt-4">
              <Button variant="outline" className="flex-1 rounded-xl h-9 text-xs font-bold" onClick={() => setIsBranchModalOpen(false)}>Batal</Button>
              <Button className="flex-1 rounded-xl h-9 text-xs font-bold" onClick={handleBranchSubmit} disabled={branchSubmitting}>
                {branchSubmitting ? "Menyimpan..." : (editingBranch ? "Simpan" : "Tambah Cabang")}
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </Card>
  )
}
export default BranchesTab
