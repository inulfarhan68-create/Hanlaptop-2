import React, { useState } from 'react';
import useSWR from 'swr';
import { Search, History, ShieldAlert, CheckCircle2, AlertTriangle, Crosshair, Wrench, Package, RefreshCw, XCircle, ShieldCheck, HelpCircle, ArrowRight, NotebookText, Clock, Monitor, Wifi, Key, Battery, Cpu, Plus, Edit } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from 'sonner';
import { useNavigate } from "react-router-dom";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { DeviceLifecycleTimeline } from '@/components/accounting/DeviceLifecycleTimeline';
import { HardwareIdForm } from '@/components/HardwareIdForm';
import { RefurbishmentForm } from '@/components/RefurbishmentForm';

export function DigitalPassport() {
  const [activeTab, setActiveTab] = useState<"check" | "claims">("check");
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSn, setActiveSn] = useState('');

  // For seeding new SN
  const [showSeeding, setShowSeeding] = useState(false);
  const [inventoryId, setInventoryId] = useState('');

  // UI state for forms
  const [showHardwareIdForm, setShowHardwareIdForm] = useState(false);
  const [showRefurbishForm, setShowRefurbishForm] = useState(false);

  const navigate = useNavigate();

  // Fetch passport data
  const { data: passport, error: passportError, mutate: mutatePassport } = useSWR(
    activeSn ? `${import.meta.env.VITE_API_URL || ''}/api/inventory/passports/${encodeURIComponent(activeSn)}` : null
  );

  // Fetch warranty data
  const { data: warrantyData } = useSWR(
    activeSn ? `${import.meta.env.VITE_API_URL || ''}/api/warranty/check?sn=${encodeURIComponent(activeSn)}` : null
  );

  // Fetch claims
  const { data: claims, mutate: mutateClaims } = useSWR(
    activeTab === "claims" ? `${import.meta.env.VITE_API_URL || ''}/api/warranty-claims` : null
  );

  // Fetch lifecycle data (timeline)
  const { data: lifecycleData, mutate: mutateLifecycle } = useSWR(
    passport?.id ? `${import.meta.env.VITE_API_URL || ''}/api/inventory/passports/${passport.id}/lifecycle` : null
  );

  // Fetch technicians for refurbishment form
  const { data: technicians } = useSWR(`${import.meta.env.VITE_API_URL || ''}/api/technicians`);

  // Fetch inventory for autocomplete during seeding
  const { data: inventoryItems } = useSWR(showSeeding ? `${import.meta.env.VITE_API_URL || ''}/api/inventory` : null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      toast.error("Masukkan Serial Number (SN) terlebih dahulu")
      return;
    }
    setActiveSn(searchQuery.trim());
    setShowSeeding(false);
  };

  const handleSeed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inventoryId || !activeSn) {
      toast.error('Inventory ID & Serial Number harus diisi');
      return;
    }
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/inventory/passports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serialNumber: activeSn, inventoryId })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success('Serial Number berhasil diregistrasi!');
      setShowSeeding(false);
      mutatePassport();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleClaimWarranty = (result: any) => {
    navigate("/services?mode=claim", {
      state: {
        customerName: result.tx?.customerName,
        customerPhone: result.tx?.customerPhone || "",
        customerAddress: result.tx?.customerAddress || "",
        deviceDesc: `${result.itemName} (SN: ${activeSn})`,
        originalTxId: result.transactionId
      }
    })
  };

  const handleResolveClaim = async (claimId: string) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/warranty-claims/${claimId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'COMPLETED',
          resolutionNotes: 'Diselesaikan via sistem',
          partsUsed: []
        })
      });
      if (res.ok) {
        toast.success("Klaim berhasil diselesaikan");
        mutateClaims();
      } else {
        toast.error("Gagal menyelesaikan klaim");
      }
    } catch (err) {
      toast.error("Terjadi kesalahan");
    }
  };

  const handleSaveHardwareId = async (data: any) => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || '';
      const res = await fetch(`${apiUrl}/api/inventory/passports/${passport.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal menyimpan Hardware ID');
      }

      toast.success('Hardware ID berhasil disimpan!');
      setShowHardwareIdForm(false);
      mutatePassport();
      mutateLifecycle();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // Status map to icons & colors
  const statusConfig: Record<string, { icon: any, color: string, label: string }> = {
    'PROCURED': { icon: Package, color: 'bg-slate-500', label: 'Procured' },
    'INBOUND_QC': { icon: ShieldAlert, color: 'bg-yellow-500', label: 'Inbound QC' },
    'READY_FOR_SALE': { icon: CheckCircle2, color: 'bg-emerald-500', label: 'Ready for Sale' },
    'RESERVED': { icon: Crosshair, color: 'bg-orange-500', label: 'Reserved' },
    'SOLD': { icon: CheckCircle2, color: 'bg-blue-500', label: 'Sold' },
    'UNDER_SERVICE': { icon: Wrench, color: 'bg-purple-500', label: 'Under Service' },
    'TRADED_IN': { icon: RefreshCw, color: 'bg-indigo-500', label: 'Traded In' },
    'WRITTEN_OFF': { icon: XCircle, color: 'bg-red-500', label: 'Written Off' },
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="sticky top-0 z-40 shrink-0 flex flex-col gap-2 p-4 md:px-5 md:py-4 bg-white/80 light-blue:bg-white dark:bg-card backdrop-blur-xl rounded-2xl md:rounded-[2rem] border border-border shadow-sm mt-0 mb-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg md:text-xl font-bold tracking-tight flex items-center gap-2">
              <ShieldCheck className="h-6 w-6 text-emerald-500" />
              Passport & Garansi
            </h2>
            <p className="text-muted-foreground mt-0.5 text-xs font-medium">Pusat pelacakan riwayat fisik unit dan validasi garansi pelanggan</p>
          </div>
          <div className="flex gap-2 bg-muted p-1 rounded-xl">
            <Button variant={activeTab === "check" ? "default" : "ghost"} size="sm" onClick={() => setActiveTab("check")} className="rounded-lg h-8">Lacak Unit</Button>
            <Button variant={activeTab === "claims" ? "default" : "ghost"} size="sm" onClick={() => setActiveTab("claims")} className="rounded-lg h-8">Daftar Klaim</Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-1 md:px-0">
        <div className="max-w-5xl mx-auto space-y-6 pb-8">
          {activeTab === "check" ? (
            <>
              <Card className="border-border/50 shadow-sm">
                <CardHeader className="pb-3 bg-muted/20">
                  <CardTitle className="text-base font-semibold">Pindai Serial Number</CardTitle>
                  <CardDescription>Gunakan barcode scanner atau ketik secara manual</CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  <form onSubmit={handleSearch} className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                      <Input 
                        placeholder="Contoh: SN-123456789" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 h-10 border-primary/20 focus-visible:ring-primary/30 text-base"
                        autoFocus
                      />
                    </div>
                    <Button type="submit" className="h-10 px-6 font-bold shadow-sm">
                      Lacak Unit
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* ERROR / NOT FOUND STATE */}
              {passportError?.status === 404 && (
                <Card className="border-dashed border-2 border-red-500/50 bg-red-500/5">
                  <CardHeader>
                    <CardTitle className="text-red-500 flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5" />
                      Passport Tidak Ditemukan
                    </CardTitle>
                    <CardDescription>
                      Serial Number <b>{activeSn}</b> belum terdaftar di Buku Besar Fisik. Jika ini adalah stok lama, Anda wajib meregistrasikannya sekarang (*Seeding*).
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {!showSeeding ? (
                      <Button onClick={() => setShowSeeding(true)} variant="default">
                        Registrasi SN Sekarang (Seeding)
                      </Button>
                    ) : (
                      <form onSubmit={handleSeed} className="space-y-4 max-w-md">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Pilih Master Inventory (SKU)</label>
                          <select 
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            value={inventoryId}
                            onChange={(e) => setInventoryId(e.target.value)}
                            required
                          >
                            <option value="">-- Pilih Model Barang --</option>
                            {inventoryItems?.map((item: any) => (
                              <option key={item.id} value={item.id}>
                                {item.itemName} ({item.quantity} in stock)
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="flex gap-2">
                          <Button type="submit">Simpan & Registrasi</Button>
                          <Button type="button" variant="outline" onClick={() => setShowSeeding(false)}>Batal</Button>
                        </div>
                      </form>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* TIMELINE & WARRANTY VIEW */}
              {passport && (
                <div className="grid gap-6 md:grid-cols-3">
                  {/* Passport Info & Warranty Data */}
                  <div className="md:col-span-1 space-y-6">
                    <Card className="border-primary/50 shadow-md shadow-primary/10">
                      <CardHeader className="bg-primary/5 rounded-t-lg border-b border-border/50">
                        <CardTitle className="flex justify-between items-center text-xl">
                          <span>{passport.serialNumber}</span>
                          {(() => {
                            const sc = statusConfig[passport.status] || { color: 'bg-slate-500', label: passport.status };
                            return <Badge className={`${sc.color}`}>{sc.label}</Badge>;
                          })()}
                        </CardTitle>
                        <CardDescription className="text-base text-foreground font-medium">
                          {passport.inventory?.itemName || "Unknown Item"}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-6 space-y-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Kategori Master</p>
                          <p className="font-medium">{passport.inventory?.category || "-"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Kondisi Fisik (Grade)</p>
                          <Badge variant="outline">{passport.grade}</Badge>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Tanggal Registrasi</p>
                          <p className="font-medium">{new Date(passport.createdAt).toLocaleDateString('id-ID')}</p>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Show Warranty Data if Available */}
                    {warrantyData && warrantyData.length > 0 && (
                      <Card className="overflow-hidden border-border shadow-md">
                        <div className={`h-1.5 w-full ${warrantyData[0].warrantyStatus === 'Aktif' ? 'bg-emerald-500' : 'bg-destructive'}`}></div>
                        <CardHeader className="bg-muted/20 pb-3">
                          <CardTitle className="text-base flex items-center gap-2">
                            <ShieldCheck className="h-5 w-5" /> Status Garansi Penjualan
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-4">
                          <div className="flex justify-between items-center">
                            {warrantyData[0].warrantyStatus === 'Aktif' ? (
                              <span className="inline-flex items-center rounded-md border text-xs text-white bg-emerald-500 font-bold px-2 py-1 flex items-center gap-1">
                                <ShieldCheck className="h-3.5 w-3.5" /> Garansi Aktif
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-md border text-xs text-white bg-destructive font-bold px-2 py-1 flex items-center gap-1">
                                <ShieldAlert className="h-3.5 w-3.5" /> Garansi Habis
                              </span>
                            )}
                          </div>
                          
                          <div className="space-y-1">
                            <p className="text-[11px] text-muted-foreground font-semibold uppercase">Sisa Garansi</p>
                            {warrantyData[0].warrantyStatus === 'Aktif' ? (
                              <p className="text-sm font-bold text-emerald-600 flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5" /> {warrantyData[0].warrantyDaysRemaining} Hari
                              </p>
                            ) : (
                              <p className="text-sm font-medium text-destructive">0 Hari (Habis)</p>
                            )}
                          </div>

                          <div className="space-y-1">
                            <p className="text-[11px] text-muted-foreground font-semibold uppercase">Nama Pelanggan</p>
                            <p className="text-sm font-medium">{warrantyData[0].tx?.customerName || "Pelanggan Umum"}</p>
                          </div>

                          <div className="space-y-1">
                            <p className="text-[11px] text-muted-foreground font-semibold uppercase">Tanggal Pembelian</p>
                            <p className="text-sm font-medium">{new Date(warrantyData[0].tx?.transactionDate).toLocaleDateString('id-ID')}</p>
                          </div>
                          
                          <Button
                            className="w-full justify-between mt-2"
                            onClick={() => handleClaimWarranty(warrantyData[0])}
                          >
                            <span className="flex items-center gap-2"><NotebookText className="h-4 w-4"/> Buat Klaim</span>
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        </CardContent>
                      </Card>
                    )}

                    {/* Hardware ID Card */}
                    {(passport.macAddress || passport.windowsKey || passport.batterySerial || passport.motherboardSerial) ? (
                      <Card className="border-purple-200">
                        <CardHeader className="pb-3 bg-purple-50/50 dark:bg-purple-950/20">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Monitor className="h-4 w-4 text-purple-500" />
                            Hardware ID
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-3">
                          {passport.macAddress && (
                            <div className="flex justify-between items-center text-sm">
                              <span className="flex items-center gap-1 text-muted-foreground"><Wifi className="h-3 w-3" /> MAC Address</span>
                              <code className="font-mono text-xs bg-muted px-2 py-0.5 rounded">{passport.macAddress}</code>
                            </div>
                          )}
                          {passport.windowsKey && (
                            <div className="flex justify-between items-center text-sm">
                              <span className="flex items-center gap-1 text-muted-foreground"><Key className="h-3 w-3" /> Windows Key</span>
                              <Badge variant="secondary" className="text-xs">Registered</Badge>
                            </div>
                          )}
                          {passport.batterySerial && (
                            <div className="flex justify-between items-center text-sm">
                              <span className="flex items-center gap-1 text-muted-foreground"><Battery className="h-3 w-3" /> Battery Serial</span>
                              <code className="font-mono text-xs">{passport.batterySerial}</code>
                            </div>
                          )}
                          {passport.motherboardSerial && (
                            <div className="flex justify-between items-center text-sm">
                              <span className="flex items-center gap-1 text-muted-foreground"><Cpu className="h-3 w-3" /> Motherboard</span>
                              <code className="font-mono text-xs">{passport.motherboardSerial}</code>
                            </div>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full mt-2"
                            onClick={() => setShowHardwareIdForm(!showHardwareIdForm)}
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            {showHardwareIdForm ? 'Sembunyikan' : 'Edit Hardware ID'}
                          </Button>
                          {showHardwareIdForm && (
                            <HardwareIdForm
                              passportId={passport.id}
                              initialData={{
                                macAddress: passport.macAddress,
                                windowsKey: passport.windowsKey,
                                batterySerial: passport.batterySerial,
                                motherboardSerial: passport.motherboardSerial,
                              }}
                              onSave={handleSaveHardwareId}
                              onClose={() => setShowHardwareIdForm(false)}
                            />
                          )}
                        </CardContent>
                      </Card>
                    ) : (
                      <Card className="border-dashed border-purple-300">
                        <CardContent className="pt-4">
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full gap-2"
                            onClick={() => setShowHardwareIdForm(!showHardwareIdForm)}
                          >
                            <Plus className="h-4 w-4" />
                            Tambah Hardware ID
                          </Button>
                          {showHardwareIdForm && (
                            <div className="mt-3">
                              <HardwareIdForm
                                passportId={passport.id}
                                onSave={handleSaveHardwareId}
                                onClose={() => setShowHardwareIdForm(false)}
                              />
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )}

                    {/* Refurbishment Section */}
                    <Card className="border-blue-200">
                      <CardHeader className="pb-3 bg-blue-50/50 dark:bg-blue-950/20">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Wrench className="h-4 w-4 text-blue-500" />
                          Refurbishment & Upgrade
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-4 space-y-3">
                        <RefurbishmentForm
                          passportId={passport.id}
                          serialNumber={passport.serialNumber}
                          technicians={technicians || []}
                          onSuccess={() => {
                            mutateLifecycle();
                            mutatePassport();
                          }}
                        />
                        {/* Show recent refurbishments if available */}
                        {lifecycleData?.refurbishments?.length > 0 && (
                          <div className="border-t pt-3 mt-3">
                            <p className="text-xs text-muted-foreground mb-2">Riwayat Refurbishment:</p>
                            <div className="space-y-2">
                              {lifecycleData.refurbishments.slice(0, 3).map((r: any) => (
                                <div key={r.id} className="text-xs p-2 bg-muted rounded flex justify-between">
                                  <span>{r.description}</span>
                                  <span className="text-muted-foreground">
                                    {new Date(r.createdAt).toLocaleDateString('id-ID')}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Timeline Events - NEW ENHANCED VERSION */}
                  <Card className="md:col-span-2">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <History className="h-5 w-5" />
                          Riwayat Perjalanan (Lifecycle)
                        </span>
                        {lifecycleData?.device?.healthScore && (
                          <Badge variant={lifecycleData.device.healthScore >= 80 ? "default" : "secondary"}>
                            Health: {lifecycleData.device.healthScore}%
                          </Badge>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {/* Use enhanced timeline if available */}
                      {lifecycleData?.timeline ? (
                        <DeviceLifecycleTimeline
                          events={lifecycleData.timeline}
                          healthScore={lifecycleData.device?.healthScore}
                        />
                      ) : (
                        // Fallback to simple timeline
                        <div className="relative border-l border-muted-foreground/20 ml-3 space-y-8 pb-4">
                          {passport.logs?.map((log: any) => {
                            const scTo = statusConfig[log.toStatus] || { color: 'bg-slate-500', icon: History, label: log.toStatus };
                            const Icon = scTo.icon;
                          
                          return (
                            <div key={log.id} className="relative pl-8">
                              <div className={`absolute -left-3 top-1 flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-background ${scTo.color}`}>
                                <Icon className="h-3 w-3 text-white" />
                              </div>
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <time>{new Date(log.createdAt).toLocaleString('id-ID')}</time>
                                  <span>•</span>
                                  <span>Oleh: {log.actor?.name || 'Sistem'}</span>
                                </div>
                                <h4 className="font-semibold text-foreground">
                                  Status berubah menjadi <span className="text-primary">{scTo.label || log.toStatus}</span>
                                </h4>
                                {log.fromStatus && (
                                  <p className="text-sm text-muted-foreground">
                                    Dari sebelumnya {log.fromStatus}
                                  </p>
                                )}
                                {log.notes && (
                                  <p className="text-sm bg-muted/50 p-3 rounded-md mt-2 italic">
                                    "{log.notes}"
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })}

                        {passport.logs?.length === 0 && (
                          <div className="pl-8 text-muted-foreground italic">Belum ada riwayat tercatat.</div>
                        )}
                      </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}
            </>
          ) : (
            <Card className="border shadow-sm">
              <div className="bg-slate-50 border-b p-3">
                <h3 className="font-semibold">Daftar Klaim Garansi Aktif</h3>
              </div>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tanggal Klaim</TableHead>
                      <TableHead>No. Invoice</TableHead>
                      <TableHead>Keluhan</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {claims?.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Belum ada klaim garansi</TableCell></TableRow>
                    ) : (
                      claims?.map((claim: any) => (
                        <TableRow key={claim.id}>
                          <TableCell className="font-medium">{new Date(claim.createdAt).toLocaleDateString('id-ID')}</TableCell>
                          <TableCell className="text-blue-600">{claim.transaction?.invoiceNumber}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{claim.issueDescription}</TableCell>
                          <TableCell>
                            <Badge variant={['SUBMITTED', 'INSPECTING', 'REPAIRING'].includes(claim.status) ? 'destructive' : claim.status === 'REJECTED' ? 'secondary' : 'default'}>{claim.status}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {['SUBMITTED', 'INSPECTING', 'REPAIRING'].includes(claim.status) && (
                              <Button size="sm" onClick={() => handleResolveClaim(claim.id)}>Selesaikan</Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
