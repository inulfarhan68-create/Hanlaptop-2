import { useState } from "react"
import { apiFetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, Percent, Users, MessageSquare, Send, CheckCircle, Clock, AlertCircle, Eye, History, Award, ShieldCheck, Wrench, Trash2 } from "lucide-react"
import { toast } from "sonner"
import useSWR from "swr"
import { ModernSelect } from "@/components/ui/modern-select"

export function CrmManagement({ embedded = false }: { embedded?: boolean }) {
  const [activeTab, setActiveTab] = useState<"membership" | "reminders" | "warranty" | "leads">("membership")
  const [searchQuery, setSearchQuery] = useState("")
  
  // Queries
  // For hydration safety, we shouldn't rely on localStorage during initial render,
  // but since we assume this runs in client, we can fetch storeId directly,
  // or use a safe check. The global fetcher will use the current localStorage anyway,
  // but for SWR key, we need it to trigger re-fetch on change.
  const storeId = typeof window !== 'undefined' ? localStorage.getItem('selectedStoreId') || 'all' : 'all';

  const { data: pointsData, mutate: mutatePoints, isLoading: pointsLoading } = useSWR<any[]>(
    ['/api/crm/points', storeId]
  )
  const { data: remindersData, mutate: mutateReminders, isLoading: remindersLoading } = useSWR<any[]>(
    ['/api/crm/reminders', storeId]
  )
  const { data: warrantyData, mutate: mutateWarranty, isLoading: warrantyLoading } = useSWR<any[]>(
    ['/api/crm/warranty', storeId] // Placeholder endpoint based on PRD
  )
  const { data: leadsData, mutate: mutateLeads, isLoading: leadsLoading } = useSWR<any[]>(
    ['/api/crm/leads', storeId]
  )

  const [selectedCustomerHistory, setSelectedCustomerHistory] = useState<any | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const handleSendReminder = async (reminder: any) => {
    setActionLoading(reminder.id)
    try {
      // 1. Mark as sent in database
      const res = await apiFetch(`/api/crm/reminders/${reminder.id}/send`, {
        method: 'POST',
      })

      if (res.ok) {
        toast.success("Pengingat berhasil ditandai terkirim!");
        mutateReminders();

        // 2. Open WhatsApp link with prefilled template
        const text = encodeURIComponent(
          `Halo Kak ${reminder.customer?.name || 'Pelanggan'},\n\nSekadar mengabarkan bahwa sudah 6 bulan sejak laptop Kakak diservis di HanLaptop. Kami menyarankan untuk melakukan perawatan berkala seperti pembersihan debu kipas & penggantian thermal paste secara rutin agar laptop tetap dingin, tidak lemot, dan awet.\n\nYuk mampir kembali ke cabang kami! Terima kasih.`
        );
        const formattedPhone = (reminder.customerPhone || reminder.customer?.phone || "").replace(/\D/g, "");
        const waPhone = formattedPhone.startsWith("0") ? "62" + formattedPhone.slice(1) : formattedPhone;
        
        if (waPhone) {
          window.open(`https://wa.me/${waPhone}?text=${text}`, "_blank");
        } else {
          toast.error("Nomor WhatsApp pelanggan tidak valid atau kosong");
        }
      } else {
        toast.error("Gagal menandai pengingat");
      }
    } catch (e) {
      toast.error("Terjadi kesalahan jaringan");
    } finally {
      setActionLoading(null)
    }
  }

  const handleUpdateWarrantyStatus = async (claimId: string, newStatus: string) => {
    setActionLoading(claimId)
    try {
      const res = await apiFetch(`/api/crm/warranty/${claimId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })

      if (res.ok) {
        toast.success(`Status klaim diubah menjadi ${newStatus}`)
        if (newStatus === "REPAIRING") {
          toast.success("Service Order (Rp 0) telah dibuat secara otomatis untuk klaim ini.")
        }
        mutateWarranty()
      } else {
        toast.error("Gagal mengubah status klaim")
      }
    } catch (e) {
      toast.error("Terjadi kesalahan jaringan")
    } finally {
      setActionLoading(null)
    }
  }

  // Filter Membership Points
  const filteredPoints = (pointsData || []).filter((p: any) =>
    p.customer?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.customer?.phone?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Filter Reminders
  const filteredReminders = (remindersData || []).filter((r: any) =>
    r.customer?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (r.customerPhone && r.customerPhone.includes(searchQuery))
  )

  // Filter Warranty
  const filteredWarranty = (warrantyData || []).filter((w: any) =>
    w.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    w.claimId?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Filter Leads
  const filteredLeads = (leadsData || []).filter((l: any) =>
    l.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.customerPhone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.brand?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleUpdateLeadStatus = async (leadId: string, newStatus: string) => {
    setActionLoading(leadId)
    try {
      const res = await apiFetch(`/api/crm/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })

      if (res.ok) {
        toast.success(`Status lead diubah menjadi ${newStatus}`)
        mutateLeads()
      } else {
        toast.error("Gagal mengubah status lead")
      }
    } catch (e) {
      toast.error("Terjadi kesalahan jaringan")
    } finally {
      setActionLoading(null)
    }
  }

  const handleDeleteLead = async (leadId: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus lead ini?")) return;
    setActionLoading(leadId)
    try {
      const res = await apiFetch(`/api/crm/leads/${leadId}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        toast.success("Lead berhasil dihapus")
        mutateLeads()
      } else {
        toast.error("Gagal menghapus lead")
      }
    } catch (e) {
      toast.error("Terjadi kesalahan jaringan")
    } finally {
      setActionLoading(null)
    }
  }

  const handleSendLeadMessage = (lead: any) => {
    let text = "";
    if (lead.type === "TUKAR_TAMBAH") {
      text = `Halo Kak ${lead.customerName},\n\nTerima kasih telah menggunakan simulator Tukar Tambah di website Han Laptop.\n\nBerikut ringkasan pengajuan Tukar Tambah Kakak:\n- Unit Lama: ${lead.brand}\n- Spesifikasi: ${lead.processor}, RAM ${lead.ram}, Storage ${lead.storage}\n- Nilai Taksiran Unit Lama: Rp ${lead.estimatedOfferPriceMin.toLocaleString("id-ID")}\n- Target Unit Baru: ${lead.targetLaptopName}\n- Harga Unit Baru: Rp ${lead.targetLaptopPrice?.toLocaleString("id-ID")}\n- Sisa Biaya Dibayar: Rp ${(lead.targetLaptopPrice - lead.estimatedOfferPriceMin).toLocaleString("id-ID")}\n\nSilakan kunjungi cabang ${lead.store?.name || 'terdekat'} kami untuk melakukan pencocokan fisik unit lama dan membawa pulang unit baru pilihan Kakak!\n\nJika ada pertanyaan, jangan ragu untuk membalas pesan ini. Terima kasih.`;
    } else {
      text = `Halo Kak ${lead.customerName},\n\nTerima kasih telah mengajukan taksiran harga jual laptop di website Han Laptop.\n\nBerikut ringkasan taksiran laptop Kakak:\n- Unit: ${lead.brand}\n- Spesifikasi: ${lead.processor}, RAM ${lead.ram}, Storage ${lead.storage}\n- Kondisi: ${lead.condition} | Kelengkapan: ${lead.completeness}\n- Estimasi Penawaran Kami: Rp ${lead.estimatedOfferPriceMin.toLocaleString("id-ID")} - Rp ${lead.estimatedOfferPriceMax.toLocaleString("id-ID")}\n\nSilakan bawa unit laptop Kakak ke cabang ${lead.store?.name || 'terdekat'} kami untuk dilakukan cek fisik langsung oleh teknisi. Kami siap melakukan pembayaran secara instan jika kondisi sesuai!\n\nDitunggu kehadirannya ya Kak. Terima kasih.`;
    }

    const formattedPhone = (lead.customerPhone || "").replace(/\D/g, "");
    const waPhone = formattedPhone.startsWith("0") ? "62" + formattedPhone.slice(1) : formattedPhone;
    
    if (waPhone) {
      window.open(`https://wa.me/${waPhone}?text=${encodeURIComponent(text)}`, "_blank");
    } else {
      toast.error("Nomor WhatsApp pelanggan tidak valid");
    }
  }

  return (
    <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-500 text-left">
      <div className={`sticky top-0 z-40 shrink-0 flex flex-col md:flex-row ${embedded ? 'justify-end' : 'justify-between'} gap-2 md:items-center ${embedded ? 'mb-2' : 'p-3 md:px-5 md:py-3 bg-white/80 dark:bg-card backdrop-blur-xl rounded-xl md:rounded-[2rem] border border-border shadow-sm mt-0 mb-4'}`}>
        {!embedded && (
          <div>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight flex items-center gap-2">
              <Percent className="h-6 w-6 text-primary" /> CRM & Loyalitas Member
            </h2>
            <p className="text-muted-foreground text-xs md:text-sm">Kelola poin loyalitas pelanggan dan pengingat servis otomatis.</p>
          </div>
        )}
        <div className={`flex gap-1.5 p-1 bg-muted/40 rounded-xl border ${embedded ? 'w-full md:w-auto overflow-x-auto overflow-y-hidden whitespace-nowrap' : ''}`}>
          <Button 
            size="sm" 
            variant={activeTab === "membership" ? "default" : "ghost"}
            onClick={() => { setActiveTab("membership"); setSearchQuery(""); }}
            className="rounded-lg text-xs"
          >
            <Users className="w-3.5 h-3.5 mr-1.5" /> Poin Member
          </Button>
          <Button 
            size="sm" 
            variant={activeTab === "reminders" ? "default" : "ghost"}
            onClick={() => { setActiveTab("reminders"); setSearchQuery(""); }}
            className="rounded-lg text-xs"
          >
            <MessageSquare className="w-3.5 h-3.5 mr-1.5" /> Pengingat 6 Bulan
          </Button>
          <Button 
            size="sm" 
            variant={activeTab === "warranty" ? "default" : "ghost"}
            onClick={() => { setActiveTab("warranty"); setSearchQuery(""); }}
            className="rounded-lg text-xs"
          >
            <ShieldCheck className="w-3.5 h-3.5 mr-1.5" /> Klaim Garansi
          </Button>
          <Button 
            size="sm" 
            variant={activeTab === "leads" ? "default" : "ghost"}
            onClick={() => { setActiveTab("leads"); setSearchQuery(""); }}
            className="rounded-lg text-xs"
          >
            <MessageSquare className="w-3.5 h-3.5 mr-1.5" /> Leads Masuk
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-3 mb-4 shrink-0">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input 
            type="search" 
            placeholder={
              activeTab === "membership" ? "Cari member berdasarkan nama, nomor telepon..." : 
              activeTab === "reminders" ? "Cari pengingat..." : 
              activeTab === "warranty" ? "Cari ID Klaim atau Nama..." :
              "Cari leads berdasarkan nama, telepon, merek..."
            } 
            className="pl-9 bg-card rounded-xl h-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 overflow-hidden">
        {/* Left Side: Main Tables */}
        <Card className="lg:col-span-2 overflow-hidden border-border/60 shadow-sm flex flex-col h-full">
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {activeTab === "membership" ? (
              pointsLoading ? (
                <div className="flex h-full items-center justify-center text-muted-foreground">Memuat data poin member...</div>
              ) : filteredPoints.length === 0 ? (
                <div className="flex flex-col h-full items-center justify-center p-8 text-center">
                  <AlertCircle className="w-12 h-12 text-muted-foreground mb-3" />
                  <h3 className="font-bold text-slate-800 dark:text-slate-200">Tidak ada member terdaftar</h3>
                  <p className="text-xs text-muted-foreground mt-1 max-w-[280px]">Poin membership akan otomatis terakumulasi dari transaksi penjualan dan servis.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader className="bg-muted/40 sticky top-0 z-10">
                    <TableRow>
                      <TableHead className="font-bold text-xs">Nama Member</TableHead>
                      <TableHead className="font-bold text-xs">Telepon</TableHead>
                      <TableHead className="font-bold text-xs text-right">Poin Loyalitas</TableHead>
                      <TableHead className="font-bold text-xs text-right">Update Terakhir</TableHead>
                      <TableHead className="font-bold text-xs text-center w-[80px]">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPoints.map((item: any) => (
                      <TableRow key={item.id} className="hover:bg-muted/30">
                        <TableCell className="text-xs py-3.5 font-bold">
                          {item.customer?.name || "Pelanggan Umum"}
                        </TableCell>
                        <TableCell className="text-xs py-3.5 text-muted-foreground font-mono">
                          {item.customer?.phone || "-"}
                        </TableCell>
                        <TableCell className="text-xs py-3.5 text-right font-bold text-indigo-600 dark:text-indigo-400 font-mono">
                          <span className="inline-flex items-center gap-1">
                            <Award className="w-3.5 h-3.5 text-yellow-500" />
                            {item.points} pts
                          </span>
                        </TableCell>
                        <TableCell className="text-xs py-3.5 text-right text-muted-foreground font-mono">
                          {new Date(item.updatedAt).toLocaleDateString("id-ID", { day: '2-digit', month: 'short', year: 'numeric' })}
                        </TableCell>
                        <TableCell className="text-xs py-3.5 text-center">
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-7 w-7 rounded-full text-indigo-600 hover:bg-indigo-50"
                            onClick={() => setSelectedCustomerHistory(item)}
                          >
                            <History className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )
            ) : activeTab === "reminders" ? (
              remindersLoading ? (
                <div className="flex h-full items-center justify-center text-muted-foreground">Memuat jadwal pengingat servis...</div>
              ) : filteredReminders.length === 0 ? (
                <div className="flex flex-col h-full items-center justify-center p-8 text-center">
                  <AlertCircle className="w-12 h-12 text-muted-foreground mb-3" />
                  <h3 className="font-bold text-slate-800 dark:text-slate-200">Tidak ada jadwal pengingat</h3>
                  <p className="text-xs text-muted-foreground mt-1 max-w-[280px]">Jadwal pengingat servis 6 bulanan akan dibuat saat nota diserahkan (Diambil).</p>
                </div>
              ) : (
                <Table>
                  <TableHeader className="bg-muted/40 sticky top-0 z-10">
                    <TableRow>
                      <TableHead className="font-bold text-xs">Jadwal Pengingat</TableHead>
                      <TableHead className="font-bold text-xs">Pelanggan</TableHead>
                      <TableHead className="font-bold text-xs">No. Telepon</TableHead>
                      <TableHead className="font-bold text-xs">Status</TableHead>
                      <TableHead className="font-bold text-xs text-right w-[150px]">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredReminders.map((item: any) => (
                      <TableRow key={item.id} className="hover:bg-muted/30">
                        <TableCell className="text-xs py-3.5 font-bold font-mono text-indigo-600 dark:text-indigo-400">
                          {item.scheduledDate}
                        </TableCell>
                        <TableCell className="text-xs py-3.5 font-semibold">
                          {item.customer?.name || "Pelanggan Umum"}
                        </TableCell>
                        <TableCell className="text-xs py-3.5 text-muted-foreground font-mono">
                          {item.customerPhone || item.customer?.phone || "-"}
                        </TableCell>
                        <TableCell className="text-xs py-3.5">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            item.status === 'SENT' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {item.status === 'SENT' ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                            {item.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs py-3.5 text-right">
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="h-7 text-[10px] text-blue-600 border-blue-200 hover:bg-blue-50"
                            onClick={() => handleSendReminder(item)}
                            disabled={item.status === 'SENT' || actionLoading === item.id}
                          >
                            <Send className="w-3 h-3 mr-1.5" />
                            {actionLoading === item.id ? "Memproses..." : "Kirim WA"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )
            ) : activeTab === "warranty" ? (
              warrantyLoading ? (
                <div className="flex h-full items-center justify-center text-muted-foreground">Memuat data klaim garansi...</div>
              ) : filteredWarranty.length === 0 ? (
                <div className="flex flex-col h-full items-center justify-center p-8 text-center">
                  <ShieldCheck className="w-12 h-12 text-muted-foreground mb-3" />
                  <h3 className="font-bold text-slate-800 dark:text-slate-200">Tidak ada klaim garansi aktif</h3>
                  <p className="text-xs text-muted-foreground mt-1 max-w-[280px]">Daftar klaim garansi yang diajukan pelanggan akan muncul di sini.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader className="bg-muted/40 sticky top-0 z-10">
                    <TableRow>
                      <TableHead className="font-bold text-xs">ID Klaim</TableHead>
                      <TableHead className="font-bold text-xs">Pelanggan</TableHead>
                      <TableHead className="font-bold text-xs">Kendala</TableHead>
                      <TableHead className="font-bold text-xs">Status</TableHead>
                      <TableHead className="font-bold text-xs text-right w-[160px]">Aksi Lifecycle</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredWarranty.map((item: any) => (
                      <TableRow key={item.id} className="hover:bg-muted/30">
                        <TableCell className="text-xs py-3.5 font-bold font-mono text-indigo-600 dark:text-indigo-400">
                          {item.claimId || item.id.substring(0,8).toUpperCase()}
                        </TableCell>
                        <TableCell className="text-xs py-3.5 font-semibold">
                          {item.customerName || "Pelanggan"}
                        </TableCell>
                        <TableCell className="text-xs py-3.5 text-muted-foreground max-w-[200px] truncate">
                          {item.issueDescription || "-"}
                        </TableCell>
                        <TableCell className="text-xs py-3.5">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${
                            item.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                            item.status === 'REPAIRING' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                            item.status === 'INSPECTING' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                            'bg-slate-100 text-slate-700 border-slate-200'
                          }`}>
                            {item.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs py-3.5 text-right">
                          {item.status === "SUBMITTED" && (
                            <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => handleUpdateWarrantyStatus(item.id, "INSPECTING")} disabled={actionLoading === item.id}>
                              Mulai Inspeksi
                            </Button>
                          )}
                          {item.status === "INSPECTING" && (
                            <Button size="sm" variant="outline" className="h-7 text-[10px] border-blue-200 text-blue-700 hover:bg-blue-50" onClick={() => handleUpdateWarrantyStatus(item.id, "REPAIRING")} disabled={actionLoading === item.id}>
                              <Wrench className="w-3 h-3 mr-1" /> Proses Servis (Rp 0)
                            </Button>
                          )}
                          {item.status === "REPAIRING" && (
                            <Button size="sm" variant="outline" className="h-7 text-[10px] border-emerald-200 text-emerald-700 hover:bg-emerald-50" onClick={() => handleUpdateWarrantyStatus(item.id, "COMPLETED")} disabled={actionLoading === item.id}>
                              <CheckCircle className="w-3 h-3 mr-1" /> Selesai
                            </Button>
                          )}
                          {item.status === "COMPLETED" && (
                            <span className="text-[10px] text-muted-foreground italic">Garansi Selesai</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )
            ) : (
              leadsLoading ? (
                <div className="flex h-full items-center justify-center text-muted-foreground">Memuat data leads...</div>
              ) : filteredLeads.length === 0 ? (
                <div className="flex flex-col h-full items-center justify-center p-8 text-center">
                  <MessageSquare className="w-12 h-12 text-muted-foreground mb-3" />
                  <h3 className="font-bold text-slate-800 dark:text-slate-200">Tidak ada leads aktif</h3>
                  <p className="text-xs text-muted-foreground mt-1 max-w-[280px]">Leads penawaran dari landing page akan muncul di sini.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader className="bg-muted/40 sticky top-0 z-10">
                    <TableRow>
                      <TableHead className="font-bold text-xs">Tanggal</TableHead>
                      <TableHead className="font-bold text-xs">Pelanggan</TableHead>
                      <TableHead className="font-bold text-xs">Tipe / Cabang</TableHead>
                      <TableHead className="font-bold text-xs">Detail Spesifikasi Unit</TableHead>
                      <TableHead className="font-bold text-xs text-right">Taksiran Harga</TableHead>
                      <TableHead className="font-bold text-xs">Status</TableHead>
                      <TableHead className="font-bold text-xs text-center w-[160px]">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLeads.map((item: any) => (
                      <TableRow key={item.id} className="hover:bg-muted/30">
                        <TableCell className="text-xs py-3 font-mono text-muted-foreground">
                          {new Date(item.createdAt).toLocaleDateString("id-ID", { day: '2-digit', month: 'short' })}
                        </TableCell>
                        <TableCell className="text-xs py-3">
                          <div className="font-bold">{item.customerName}</div>
                          <div className="text-[10px] text-muted-foreground font-mono">{item.customerPhone}</div>
                        </TableCell>
                        <TableCell className="text-xs py-3">
                          <span className={`inline-block px-1.5 py-0.5 rounded-[4px] text-[9px] font-bold ${
                            item.type === 'TUKAR_TAMBAH' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                          }`}>
                            {item.type === 'TUKAR_TAMBAH' ? 'Tukar Tambah' : 'Jual Laptop'}
                          </span>
                          <div className="text-[10px] text-slate-500 font-semibold truncate max-w-[120px] mt-0.5">
                            📍 {item.store?.name || 'Cabang Utama'}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs py-3 max-w-[220px]">
                          <div className="font-bold truncate">{item.brand}</div>
                          <div className="text-[10px] text-muted-foreground truncate">
                            {item.processor} | {item.ram} | {item.storage}
                          </div>
                          <div className="text-[10px] text-amber-600 dark:text-amber-500 font-semibold mt-0.5">
                            Kondisi: {item.condition} | {item.completeness}
                          </div>
                          {item.type === "TUKAR_TAMBAH" && (
                            <div className="text-[10px] text-blue-600 dark:text-blue-400 font-bold mt-1 bg-blue-50 dark:bg-blue-950/20 p-1.5 rounded-lg border border-blue-100 dark:border-blue-900/30">
                              Target: {item.targetLaptopName} (Rp {item.targetLaptopPrice?.toLocaleString("id-ID")})
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-xs py-3 text-right font-bold font-mono">
                          {item.type === "TUKAR_TAMBAH" ? (
                            <div className="text-blue-600 dark:text-blue-400">
                              Lama: Rp {item.estimatedOfferPriceMin.toLocaleString("id-ID")}
                            </div>
                          ) : (
                            <div className="text-emerald-600 dark:text-emerald-400">
                              Rp {item.estimatedOfferPriceMin.toLocaleString("id-ID")} - {item.estimatedOfferPriceMax.toLocaleString("id-ID")}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-xs py-3">
                          <select 
                            value={item.status} 
                            disabled={actionLoading === item.id}
                            onChange={(e) => handleUpdateLeadStatus(item.id, e.target.value)}
                            className="bg-muted text-[11px] font-bold rounded-lg border px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                          >
                            <option value="PENDING">Pending</option>
                            <option value="APPROVED">Disetujui</option>
                            <option value="REJECTED">Ditolak</option>
                            <option value="COMPLETED">Selesai</option>
                          </select>
                        </TableCell>
                        <TableCell className="text-xs py-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="h-7 text-[10px] text-blue-600 border-blue-200 hover:bg-blue-50"
                              onClick={() => handleSendLeadMessage(item)}
                              disabled={actionLoading === item.id}
                            >
                              <Send className="w-3 h-3 mr-1" /> WA
                            </Button>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-7 w-7 text-red-500 hover:bg-red-50 hover:text-red-700"
                              onClick={() => handleDeleteLead(item.id)}
                              disabled={actionLoading === item.id}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )
            )}
          </div>
        </Card>

        {/* Right Side: Details / Points Logs */}
        <Card className="border-border/60 shadow-sm flex flex-col h-full overflow-hidden">
          <CardHeader className="pb-3 pt-4 px-4 border-b shrink-0">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <History className="w-4 h-4 text-primary" /> Log Riwayat Poin
            </CardTitle>
            <CardDescription className="text-[10px]">Pilih salah satu member di kiri untuk melacak detail perolehan poin.</CardDescription>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-y-auto custom-scrollbar">
            {!selectedCustomerHistory ? (
              <div className="flex flex-col h-full items-center justify-center text-center p-6 text-muted-foreground text-xs">
                <Users className="w-8 h-8 mb-2 opacity-50" />
                Klik ikon riwayat untuk melihat detail log poin.
              </div>
            ) : (
              <div className="p-4 space-y-4">
                <div className="bg-muted/40 p-3 rounded-lg border border-border/50 text-xs">
                  <div className="font-bold text-sm text-slate-800 dark:text-slate-200">
                    {selectedCustomerHistory.customer?.name}
                  </div>
                  <div className="text-muted-foreground mt-0.5 font-mono">{selectedCustomerHistory.customer?.phone}</div>
                  <div className="mt-3 flex justify-between items-center">
                    <span className="text-muted-foreground text-[10px]">Total Akumulasi:</span>
                    <span className="text-lg font-black text-indigo-600 dark:text-indigo-400 font-mono">
                      {selectedCustomerHistory.points} pts
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-bold text-muted-foreground">Catatan Log Mutasi Poin</span>
                  <div className="space-y-2">
                    {JSON.parse(selectedCustomerHistory.history || "[]").length === 0 ? (
                      <div className="text-center py-6 text-xs text-muted-foreground">Belum ada mutasi poin.</div>
                    ) : (
                      JSON.parse(selectedCustomerHistory.history || "[]").map((log: any, idx: number) => (
                        <div key={log.id || idx} className="p-2.5 rounded-lg border border-border/40 text-xs flex justify-between items-center bg-card">
                          <div className="space-y-0.5 text-left">
                            <div className="font-semibold text-slate-800 dark:text-slate-200">{log.description}</div>
                            <div className="text-[9px] text-muted-foreground font-mono">
                              {new Date(log.date).toLocaleDateString("id-ID", { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                          <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">
                            +{log.points}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
