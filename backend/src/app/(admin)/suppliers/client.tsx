"use client";

import { useState } from "react"
import { toast } from "sonner"
import useSWR from "swr"
import { useConfirmDialog } from "@/components/ui/confirm-dialog"
import { SupplierToolbar } from "@/components/suppliers/SupplierToolbar"
import { SupplierTable } from "@/components/suppliers/SupplierTable"
import { SupplierDialogs } from "@/components/suppliers/SupplierDialogs"

import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { apiFetch } from "@/lib/api"

export function ClientSuppliers({ user }: { user: any }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const isOwner = user?.role === 'owner'
  const isManager = user?.role === 'manager'
  const canWrite = isOwner || isManager

  const searchQuery = searchParams.get("search") || ""
  const pageQuery = searchParams.get("page") || "1"
  
  const [showModal, setShowModal] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<any>(null)
  
  // Form State
  const [formName, setFormName] = useState("")
  const [formPhone, setFormPhone] = useState("")
  const [formEmail, setFormEmail] = useState("")
  const [formAddress, setFormAddress] = useState("")
  const [formNotes, setFormNotes] = useState("")
  const [submitting, setSubmitting] = useState(false)
  
  const { confirm, dialog } = useConfirmDialog()

  const storeId = typeof window !== 'undefined' ? localStorage.getItem('selectedStoreId') || 'all' : 'all'

  const handleSearchChange = (query: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (query) {
      params.set("search", query)
      params.set("page", "1") // reset page on search
    } else {
      params.delete("search")
      params.delete("page")
    }
    router.replace(`${pathname}?${params.toString()}`)
  }

  // Custom fetcher to handle structured array keys [route, storeId, search]
  const supplierFetcher = async ([route, store, search]: [string, string, string]) => {
    const url = `${route}${search ? `?search=${encodeURIComponent(search)}` : ''}`;
    const res = await apiFetch(url);
    if (!res.ok) {
      if (res.status === 401) window.location.href = "/login";
      const errorBody = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(errorBody.error || `HTTP ${res.status}`);
    }
    return res.json();
  }

  // Using '/api/suppliers' as base key ensures BroadcastChannel invalidates perfectly
  const { data: suppliers, error: suppliersError, mutate, isLoading } = useSWR(
    ['/api/suppliers', storeId, searchQuery],
    supplierFetcher
  )

  const openAddModal = () => {
    setEditingSupplier(null)
    setFormName("")
    setFormPhone("")
    setFormEmail("")
    setFormAddress("")
    setFormNotes("")
    setShowModal(true)
  }

  const openEditModal = (s: any) => {
    setEditingSupplier(s)
    setFormName(s.name || "")
    setFormPhone(s.phone || "")
    setFormEmail(s.email || "")
    setFormAddress(s.address || "")
    setFormNotes(s.notes || "")
    setShowModal(true)
  }

  const handleSubmit = async () => {
    if (!formName.trim()) {
      toast.error("Nama supplier wajib diisi")
      return
    }
    setSubmitting(true)
    try {
      const bodyPayload = {
        name: formName,
        phone: formPhone || null,
        email: formEmail || null,
        address: formAddress || null,
        notes: formNotes || null
      }

      if (editingSupplier) {
        // Update existing
        const res = await apiFetch(`/api/suppliers/${editingSupplier.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyPayload)
        })
        if (res.ok) {
          toast.success("Data supplier berhasil diperbarui!")
          mutate()
          setShowModal(false)
        } else {
          const err = await res.json()
          toast.error(err.error || "Gagal memperbarui")
        }
      } else {
        // Create new
        const res = await apiFetch(`/api/suppliers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyPayload)
        })
        if (res.ok) {
          toast.success("Supplier baru berhasil ditambahkan!")
          mutate()
          setShowModal(false)
        } else {
          const err = await res.json()
          toast.error(err.error || "Gagal menambahkan")
        }
      }
    } catch {
      toast.error("Terjadi kesalahan jaringan")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (s: any) => {
    const ok = await confirm({
      title: "Hapus Supplier",
      description: `Yakin ingin menghapus supplier "${s.name}"? Data tidak bisa dikembalikan.`,
      confirmLabel: "Hapus",
      variant: "destructive"
    })
    if (!ok) return
    try {
      const res = await apiFetch(`/api/suppliers/${s.id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success("Supplier berhasil dihapus")
        mutate()
      } else {
        toast.error("Gagal menghapus supplier")
      }
    } catch {
      toast.error("Terjadi kesalahan jaringan")
    }
  }

  return (
    <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      {dialog}
      
      <SupplierToolbar 
        searchQuery={searchQuery}
        setSearchQuery={handleSearchChange}
        openAddModal={openAddModal}
        canWrite={canWrite}
        storeId={storeId}
      />

      <div className="flex-1 overflow-y-auto space-y-4 px-1 pb-20 md:pb-4 animate-in fade-in">
        {/* TODO: Backend pagination setelah migrasi selesai */}
        <SupplierTable 
          suppliers={suppliers || []}
          suppliersError={suppliersError}
          isLoading={isLoading}
          canWrite={canWrite}
          storeId={storeId}
          openAddModal={openAddModal}
          openEditModal={openEditModal}
          handleDelete={handleDelete}
          mutate={mutate}
        />
      </div>

      <SupplierDialogs 
        showModal={showModal}
        setShowModal={setShowModal}
        editingSupplier={editingSupplier}
        formName={formName}
        setFormName={setFormName}
        formPhone={formPhone}
        setFormPhone={setFormPhone}
        formEmail={formEmail}
        setFormEmail={setFormEmail}
        formAddress={formAddress}
        setFormAddress={setFormAddress}
        formNotes={formNotes}
        setFormNotes={setFormNotes}
        submitting={submitting}
        handleSubmit={handleSubmit}
        handleDelete={handleDelete}
        canWrite={canWrite}
      />
    </div>
  )
}
