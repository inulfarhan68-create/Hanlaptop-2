"use client";

import { useState, useEffect } from "react"
import { apiFetch } from "@/lib/api";
import { toast } from "sonner"
import useSWR from "swr"
import { useUserRole } from "@/hooks/useUserRole"
import { useConfirmDialog } from "@/components/ui/confirm-dialog"
import { CustomerToolbar } from "@/components/customers/CustomerToolbar"
import { CustomerTable } from "@/components/customers/CustomerTable"
import { CustomerDialogs } from "@/components/customers/CustomerDialogs"
import { CrmManagement } from "@/components/customers/CrmManagement"

import { useRouter, usePathname, useSearchParams } from "next/navigation"

export function ClientCustomers() {
  const { isOwner } = useUserRole()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [mainTab, setMainTab] = useState<"database" | "crm">("database")
  const searchQuery = searchParams.get("search") || ""
  const pageQuery = searchParams.get("page") || "1"
  
  const [showModal, setShowModal] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<any>(null)
  
  // Form State
  const [formName, setFormName] = useState("")
  const [formPhone, setFormPhone] = useState("")
  const [formAddress, setFormAddress] = useState("")
  const [formNotes, setFormNotes] = useState("")
  const [submitting, setSubmitting] = useState(false)
  
  const { confirm, dialog } = useConfirmDialog()

  const [storeId, setStoreId] = useState<string | null>(null)
  
  useEffect(() => {
    setStoreId(localStorage.getItem('selectedStoreId') || 'all')
  }, [])

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

  // TODO: Backend pagination setelah migrasi selesai
  // Saat ini fetch semua data pelanggan, ini akan berat jika data mencapai puluhan ribu.
  const queryUrl = `/api/customers${searchQuery ? `?search=${encodeURIComponent(searchQuery)}` : ''}`
  // SWR Key with Array format to ensure cache invalidates correctly on store switch
  const { data: customers, error: customersError, mutate, isLoading } = useSWR(
    [queryUrl, storeId]
  )

  const openAddModal = () => {
    setEditingCustomer(null)
    setFormName("")
    setFormPhone("")
    setFormAddress("")
    setFormNotes("")
    setShowModal(true)
  }

  const openEditModal = (c: any) => {
    setEditingCustomer(c)
    setFormName(c.name || "")
    setFormPhone(c.phone || "")
    setFormAddress(c.address || "")
    setFormNotes(c.notes || "")
    setShowModal(true)
  }

  const handleSubmit = async () => {
    if (!formName.trim()) {
      toast.error("Nama pelanggan wajib diisi")
      return
    }
    setSubmitting(true)
    try {
      if (editingCustomer) {
        // Update existing
        const res = await apiFetch(`/api/customers/${editingCustomer.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: formName, phone: formPhone, address: formAddress, notes: formNotes })
        })
        if (res.ok) {
          toast.success("Data pelanggan berhasil diperbarui!")
          mutate()
          setShowModal(false)
        } else {
          const err = await res.json()
          toast.error(err.error || "Gagal memperbarui")
        }
      } else {
        // Create new
        const res = await apiFetch(`/api/customers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: formName, phone: formPhone, address: formAddress, notes: formNotes })
        })
        if (res.ok) {
          toast.success("Pelanggan baru berhasil ditambahkan!")
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

  const handleDelete = async (c: any) => {
    const ok = await confirm({
      title: "Hapus Pelanggan",
      description: `Yakin ingin menghapus pelanggan "${c.name}"? Data tidak bisa dikembalikan.`,
      confirmLabel: "Hapus",
      variant: "destructive"
    })
    if (!ok) return
    try {
      const res = await apiFetch(`/api/customers/${c.id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success("Pelanggan berhasil dihapus")
        mutate()
      } else {
        toast.error("Gagal menghapus pelanggan")
      }
    } catch {
      toast.error("Terjadi kesalahan jaringan")
    }
  }

  return (
    <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      {dialog}
      
      <CustomerToolbar 
        mainTab={mainTab}
        setMainTab={setMainTab}
        searchQuery={searchQuery}
        setSearchQuery={handleSearchChange}
        openAddModal={openAddModal}
      />

      {mainTab === "database" ? (
        <div className="flex-1 overflow-y-auto space-y-4 px-1 pb-20 md:pb-4 animate-in fade-in">
          <CustomerTable 
            customers={customers || []}
            customersError={customersError}
            isLoading={isLoading}
            openAddModal={openAddModal}
            openEditModal={openEditModal}
            handleDelete={handleDelete}
            mutate={mutate}
            storeId={storeId}
          />
        </div>
      ) : (
        <div className="flex-1 overflow-hidden animate-in fade-in">
          <CrmManagement embedded={true} />
        </div>
      )}

      <CustomerDialogs 
        showModal={showModal}
        setShowModal={setShowModal}
        editingCustomer={editingCustomer}
        formName={formName}
        setFormName={setFormName}
        formPhone={formPhone}
        setFormPhone={setFormPhone}
        formAddress={formAddress}
        setFormAddress={setFormAddress}
        formNotes={formNotes}
        setFormNotes={setFormNotes}
        submitting={submitting}
        handleSubmit={handleSubmit}
        handleDelete={handleDelete}
        isOwner={isOwner}
      />
    </div>
  )
}
