"use client";

import { apiFetch } from "@/lib/api";

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AlertCircle, Database, Download, Shield, Upload, FileText } from "lucide-react"
import { toast } from "sonner"

export function BackupTab() {
  const [storeName, setStoreName] = useState("HanLaptop")
  const [uploadedBackupFile, setUploadedBackupFile] = useState<any | null>(null)
  const [restoreLoading, setRestoreLoading] = useState(false)
  const storeId = localStorage.getItem('selectedStoreId') || 'all'

  useEffect(() => {
    apiFetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data && !data.error) {
          setStoreName(data.storeName || "HanLaptop")
        }
      })
      .catch(() => {})
  }, [])

  const handleDownloadBackup = async () => {
    if (storeId === 'all') {
      toast.error("Silakan pilih cabang tertentu terlebih dahulu.");
      return;
    }
    const loadingToast = toast.loading("Sedang membuat file cadangan...");
    try {
      const res = await apiFetch('/api/settings/backup', {
        headers: {
          'x-store-id': storeId
        }
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Gagal membuat cadangan");
      }
      const data = await res.json();
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data, null, 2))}`;
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", jsonString);
      downloadAnchor.setAttribute("download", `cadangan_hanlaptop_${storeName.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      toast.success("File cadangan berhasil diunduh!", { id: loadingToast });
    } catch (e: any) {
      toast.error(e.message || "Gagal mengunduh cadangan", { id: loadingToast });
    }
  };

  const handleRestoreBackup = async () => {
    if (storeId === 'all') {
      toast.error("Silakan pilih cabang tertentu terlebih dahulu.");
      return;
    }
    if (!uploadedBackupFile) return;
    
    const confirmAction = window.confirm("PENTING: Apakah Anda yakin ingin memulihkan data? Seluruh data operasional (transaksi, inventori, pelanggan, dll) pada cabang ini akan DIHAPUS dan DIGANTIKAN dengan data dari file cadangan!");
    if (!confirmAction) return;

    setRestoreLoading(true);
    const loadingToast = toast.loading("Sedang memulihkan database...");
    try {
      const res = await apiFetch('/api/settings/backup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-store-id': storeId
        },
        body: JSON.stringify(uploadedBackupFile)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Gagal memulihkan data");
      }
      toast.success("Database cabang berhasil dipulihkan!", { id: loadingToast });
      setUploadedBackupFile(null);
      const fileInput = document.getElementById("backup-file-upload") as HTMLInputElement;
      if (fileInput) fileInput.value = "";
      
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (e: any) {
      toast.error(e.message || "Gagal memulihkan database", { id: loadingToast });
    } finally {
      setRestoreLoading(false);
    }
  };

  if (storeId === "all") {
    return (
      <Card className="border border-amber-500/20 bg-amber-500/[0.02] shadow-sm animate-in fade-in duration-300 text-left rounded-2xl">
        <CardHeader className="border-b border-amber-500/10 pb-4">
          <CardTitle className="text-amber-600 dark:text-amber-500 flex items-center gap-2">
            <AlertCircle className="h-5 w-5" /> Tentukan Cabang Terlebih Dahulu
          </CardTitle>
          <CardDescription className="text-amber-600/80 text-xs mt-0.5">
            Menu Cadangkan & Pulihkan data dinonaktifkan saat Anda memilih filter "Semua Cabang".
          </CardDescription>
        </CardHeader>
        <CardContent className="text-xs space-y-2 pt-6 font-semibold leading-relaxed">
          <p>
            Silakan pilih salah satu cabang spesifik di dropdown header/sidebar terlebih dahulu (misal: Cabang Bekasi atau Cabang Bandung) sebelum Anda dapat mencadangkan atau memulihkan data.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Card Backup */}
      <Card className="border border-border/80 shadow-sm overflow-hidden rounded-2xl">
        <CardHeader className="border-b border-border/40 pb-4 bg-muted/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 text-primary rounded-xl">
              <Database className="h-5 w-5" />
            </div>
            <div className="text-left">
              <CardTitle className="text-base font-bold">Cadangkan Data Cabang</CardTitle>
              <CardDescription className="text-xs">Ekspor seluruh data operasional cabang aktif saat ini ke format JSON.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-6 text-left">
          <p className="text-xs text-muted-foreground font-medium leading-relaxed">
            File cadangan yang diunduh mencakup informasi pengaturan cabang, data pelanggan, stok barang (inventori), seluruh riwayat transaksi (penjualan, servis, restock), jurnal akuntansi, dan log aktivitas dari cabang <strong>{storeName}</strong>.
          </p>
          
          <div className="p-4 bg-muted/20 rounded-2xl border border-border/85 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-2">
            <div className="grid grid-cols-2 gap-4 flex-1">
              <div>
                <p className="text-[9px] font-extrabold uppercase tracking-wider text-muted-foreground mb-0.5">Nama Cabang</p>
                <p className="font-bold text-xs text-foreground">{storeName}</p>
              </div>
              <div>
                <p className="text-[9px] font-extrabold uppercase tracking-wider text-muted-foreground mb-0.5">Format Berkas</p>
                <p className="font-bold text-xs text-cyan-600 dark:text-cyan-500">JSON (.json)</p>
              </div>
            </div>
            <Button className="gap-2 rounded-xl font-bold h-9 text-xs shrink-0 shadow-sm" onClick={handleDownloadBackup}>
              <Download className="h-4 w-4" /> Unduh File Cadangan
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Card Restore */}
      <Card className="border border-rose-500/20 overflow-hidden rounded-2xl shadow-sm">
        <CardHeader className="bg-rose-500/[0.03] border-b border-rose-500/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-500/10 text-rose-500 rounded-xl">
              <Shield className="h-5 w-5" />
            </div>
            <div className="text-left">
              <CardTitle className="text-base font-bold text-rose-600 dark:text-rose-500">ZONA BAHAYA: Pulihkan Data Cabang</CardTitle>
              <CardDescription className="text-xs text-rose-500/80">Tindakan ini akan menghapus total data cabang aktif dan menggantinya dengan data berkas JSON.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-6 text-left">
          <div className="flex gap-3 p-3.5 bg-rose-500/[0.04] text-rose-700 dark:text-rose-500/90 text-xs font-medium rounded-xl border border-rose-500/20 leading-relaxed">
            <AlertCircle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold mb-1">PENTING: Harap Baca Sebelum Melanjutkan!</p>
              <p>Seluruh transaksi, stok barang, jurnal keuangan, order servis, dan pelanggan pada cabang <strong>{storeName}</strong> saat ini akan DIHAPUS PERMANEN. Cabang lain tidak akan terpengaruh. Pastikan berkas cadangan JSON yang Anda unggah benar.</p>
            </div>
          </div>

          <div className="grid gap-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Pilih Berkas Cadangan (.json)</label>
            <Input 
              id="backup-file-upload"
              type="file" 
              accept=".json"
              className="bg-muted/10 rounded-xl h-10 border-input text-xs pt-2"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) {
                  const reader = new FileReader()
                  reader.onload = (evt) => {
                    try {
                      const parsed = JSON.parse(evt.target?.result as string);
                      if (parsed.version !== "1.0" || !parsed.data) {
                        toast.error("File cadangan tidak valid atau versi tidak didukung.");
                        setUploadedBackupFile(null);
                        e.target.value = "";
                        return;
                      }
                      setUploadedBackupFile(parsed);
                      toast.success("File cadangan berhasil dimuat. Silakan verifikasi detail di bawah.");
                    } catch (err) {
                      toast.error("Gagal membaca file JSON.");
                      setUploadedBackupFile(null);
                      e.target.value = "";
                    }
                  }
                  reader.readAsText(file)
                }
              }}
            />
          </div>

          {uploadedBackupFile && (
            <div className="p-4 bg-muted/20 border border-border/80 rounded-2xl space-y-3.5 mt-2 animate-in slide-in-from-top-2 duration-300">
              <h4 className="font-bold text-xs border-b pb-2 text-foreground flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-primary" /> Detail File Cadangan Terbaca:
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-[11px] leading-tight font-semibold">
                <div>
                  <p className="text-muted-foreground uppercase text-[9px] tracking-wider mb-0.5">Tanggal Cadangan</p>
                  <p className="text-foreground">{new Date(uploadedBackupFile.backupDate).toLocaleString('id-ID')}</p>
                </div>
                <div>
                  <p className="text-muted-foreground uppercase text-[9px] tracking-wider mb-0.5">Total Inventori</p>
                  <p className="text-foreground">{uploadedBackupFile.data.inventory?.length || 0} barang</p>
                </div>
                <div>
                  <p className="text-muted-foreground uppercase text-[9px] tracking-wider mb-0.5">Total Pelanggan</p>
                  <p className="text-foreground">{uploadedBackupFile.data.customers?.length || 0} orang</p>
                </div>
                <div>
                  <p className="text-muted-foreground uppercase text-[9px] tracking-wider mb-0.5">Total Transaksi</p>
                  <p className="text-foreground">{uploadedBackupFile.data.transactions?.length || 0} nota</p>
                </div>
                <div>
                  <p className="text-muted-foreground uppercase text-[9px] tracking-wider mb-0.5">Order Servis</p>
                  <p className="text-foreground">{uploadedBackupFile.data.serviceOrders?.length || 0} order</p>
                </div>
                <div>
                  <p className="text-muted-foreground uppercase text-[9px] tracking-wider mb-0.5">Versi Cadangan</p>
                  <p className="text-primary font-black">v{uploadedBackupFile.version}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="border-t border-rose-500/10 px-6 py-3.5 flex justify-between bg-rose-500/[0.02] items-center gap-4">
          <p className="text-[10px] text-muted-foreground font-medium leading-normal w-2/3">Pastikan berkas sudah terverifikasi dengan benar. Data cabang aktif saat ini akan tertimpa permanen.</p>
          <Button 
            className="gap-2 rounded-xl font-bold h-9 text-xs shrink-0 shadow-sm" 
            variant="destructive" 
            disabled={restoreLoading || !uploadedBackupFile}
            onClick={handleRestoreBackup}
          >
            {restoreLoading ? "Sedang Memulihkan..." : <><Upload className="h-4 w-4" /> Pulihkan Data Cabang</>}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
export default BackupTab
