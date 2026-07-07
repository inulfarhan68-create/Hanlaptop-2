import { useState, useMemo, useRef, useEffect } from "react"
import { Navigate } from "react-router-dom"
import { createPortal } from "react-dom"
import useSWR from "swr"
import { toast } from "sonner"
import { 
  Users, 
  Wallet, 
  CreditCard, 
  PlusCircle, 
  Edit2, 
  Trash2, 
  Printer, 
  Download, 
  Search, 
  AlertCircle, 
  Calendar, 
  CheckCircle,
  FileText,
  Lock,
  TrendingDown,
  Camera,
  MapPin,
  Clock,
  Video,
  RefreshCw,
  Eye,
  Map,
  UserCog,
  Phone,
  MessageCircle,
  UserCheck,
  X,
  Star
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ModernSelect } from "@/components/ui/modern-select"
import { useConfirmDialog } from "@/components/ui/confirm-dialog"
import { useUserRole } from "@/hooks/useUserRole"
import { useSession } from "@/lib/auth-client"
import { cn } from "@/lib/utils"

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(value)
}

export function Payroll() {
  const { isOwner, isManager, isKasir } = useUserRole()
  const canWrite = isOwner || isManager
  const { confirm, dialog } = useConfirmDialog()

  const selectedStoreId = localStorage.getItem('selectedStoreId') || 'all'

  // Tabs: 'karyawan' | 'kasbon' | 'penggajian' | 'absensi' | 'teknisi'
  const [activeTab, setActiveTab] = useState<"karyawan" | "kasbon" | "penggajian" | "absensi" | "teknisi">(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get("tab") as any;
    if (tabParam && ["karyawan", "kasbon", "penggajian", "absensi", "teknisi"].includes(tabParam)) {
      return tabParam;
    }
    return isKasir ? "absensi" : "karyawan"
  })

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("tab") !== activeTab) {
      params.set("tab", activeTab);
      window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
    }
  }, [activeTab])

  // Technician Tab States & SWR Queries
  const [techSearchQuery, setTechSearchQuery] = useState("")
  const { data: techListData, error: techListError, mutate: mutateTechList, isLoading: techListLoading } = useSWR<any[]>(
    (import.meta.env.VITE_API_URL || '') + `/api/technicians${techSearchQuery ? `?search=${encodeURIComponent(techSearchQuery)}` : ''}`
  )
  const techList = Array.isArray(techListData) ? techListData : []

  const [showTechModal, setShowTechModal] = useState(false)
  const [editingTechnician, setEditingTechnician] = useState<any>(null)
  const [techFormName, setTechFormName] = useState("")
  const [techFormPhone, setTechFormPhone] = useState("")
  const [techFormIsActive, setTechFormIsActive] = useState(true)
  const [techFormCommissionType, setTechFormCommissionType] = useState<string>("percentage")
  const [techFormCommissionValue, setTechFormCommissionValue] = useState<string>("0")
  const [techSubmitting, setTechSubmitting] = useState(false)

  const [showTechCommissionsModal, setShowTechCommissionsModal] = useState(false)
  const [selectedTechForCommissions, setSelectedTechForCommissions] = useState<any>(null)
  const { data: techCommissions, isLoading: isLoadingCommissions } = useSWR(
    selectedTechForCommissions ? (import.meta.env.VITE_API_URL || '') + `/api/technicians/${selectedTechForCommissions.id}/commissions` : null
  )

  const handleTechWA = (tech: any) => {
    const storeName = localStorage.getItem("storeName") || "HanLaptop";
    const text = `Halo *${tech.name}*, ini dari *${storeName}*. Ingin berkoordinasi mengenai pekerjaan servis unit pelanggan. Terima kasih.`;
    const encodedText = encodeURIComponent(text)
    const phoneNum = tech.phone || ''
    let waNumber = phoneNum.replace(/\D/g, '')
    if (waNumber.startsWith('0')) waNumber = '62' + waNumber.substring(1)
    window.open(`https://wa.me/${waNumber}?text=${encodedText}`, '_blank')
  }

  const openAddTechModal = () => {
    setEditingTechnician(null)
    setTechFormName("")
    setTechFormPhone("")
    setTechFormIsActive(true)
    setTechFormCommissionType("percentage")
    setTechFormCommissionValue("0")
    setShowTechModal(true)
  }

  const openEditTechModal = (t: any) => {
    setEditingTechnician(t)
    setTechFormName(t.name || "")
    setTechFormPhone(t.phone || "")
    setTechFormIsActive(t.isActive !== false)
    setTechFormCommissionType(t.commissionType || "percentage")
    setTechFormCommissionValue((t.commissionValue || 0).toString())
    setShowTechModal(true)
  }

  const handleSubmitTech = async () => {
    if (!techFormName.trim()) {
      toast.error("Nama teknisi wajib diisi")
      return
    }
    setTechSubmitting(true)
    try {
      const apiBase = import.meta.env.VITE_API_URL || ''
      const bodyPayload = {
        name: techFormName,
        phone: techFormPhone || null,
        isActive: techFormIsActive,
        commissionType: techFormCommissionType,
        commissionValue: Number(techFormCommissionValue) || 0
      }

      if (editingTechnician) {
        const res = await fetch(`${apiBase}/api/technicians/${editingTechnician.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyPayload)
        })
        if (res.ok) {
          toast.success("Data teknisi berhasil diperbarui!")
          mutateTechList()
          setShowTechModal(false)
        } else {
          const err = await res.json()
          toast.error(err.error || "Gagal memperbarui")
        }
      } else {
        const res = await fetch(`${apiBase}/api/technicians`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyPayload)
        })
        if (res.ok) {
          toast.success("Teknisi baru berhasil ditambahkan!")
          mutateTechList()
          setShowTechModal(false)
        } else {
          const err = await res.json()
          toast.error(err.error || "Gagal menambahkan")
        }
      }
    } catch {
      toast.error("Terjadi kesalahan jaringan")
    } finally {
      setTechSubmitting(false)
    }
  }

  const handleDeleteTech = async (t: any) => {
    const ok = await confirm({
      title: "Hapus Teknisi",
      description: `Yakin ingin menghapus teknisi "${t.name}"? Data tidak bisa dikembalikan.`,
      confirmLabel: "Hapus",
      variant: "destructive"
    })
    if (!ok) return
    try {
      const res = await fetch((import.meta.env.VITE_API_URL || '') + `/api/technicians/${t.id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success("Teknisi berhasil dihapus")
        mutateTechList()
      } else {
        toast.error("Gagal menghapus teknisi")
      }
    } catch {
      toast.error("Terjadi kesalahan jaringan")
    }
  }

  // SWR Queries
  const { data: employeesData, mutate: mutateEmployees, isLoading: employeesLoading } = useSWR(
    (import.meta.env.VITE_API_URL || '') + '/api/employees'
  )
  const { data: loansData, mutate: mutateLoans, isLoading: loansLoading } = useSWR(
    (import.meta.env.VITE_API_URL || '') + '/api/employees/loans'
  )
  
  // Period filter for Payroll Tab
  const [periodFilter, setPeriodFilter] = useState(() => {
    const d = new Date()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    return `${d.getFullYear()}-${month}`
  })

  const { data: payrollsData, mutate: mutatePayrolls, isLoading: payrollsLoading } = useSWR(
    (import.meta.env.VITE_API_URL || '') + `/api/payrolls?period=${periodFilter}`
  )

  const { data: storeUsers } = useSWR<any[]>(
    (import.meta.env.VITE_API_URL || '') + '/api/employees/users'
  )
  const { data: technicians } = useSWR<any[]>(
    (import.meta.env.VITE_API_URL || '') + '/api/technicians?active=true'
  )
  const { data: branches } = useSWR<any[]>(
    (import.meta.env.VITE_API_URL || '') + '/api/stores'
  )

  const employeesList = Array.isArray(employeesData) ? employeesData : []
  const loansList = Array.isArray(loansData) ? loansData : []
  const payrollsList = Array.isArray(payrollsData) ? payrollsData : []

  // Searches
  const [searchEmployee, setSearchEmployee] = useState("")
  const [searchLoan, setSearchLoan] = useState("")

  // Filter lists
  const filteredEmployees = useMemo(() => {
    return employeesList.filter(e => 
      e.name.toLowerCase().includes(searchEmployee.toLowerCase()) || 
      (e.role || '').toLowerCase().includes(searchEmployee.toLowerCase())
    )
  }, [employeesList, searchEmployee])

  const filteredLoans = useMemo(() => {
    return loansList.filter(l => 
      l.employee?.name.toLowerCase().includes(searchLoan.toLowerCase()) || 
      (l.description || '').toLowerCase().includes(searchLoan.toLowerCase())
    )
  }, [loansList, searchLoan])

  // Modals state
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<any>(null)
  const [employeeForm, setEmployeeForm] = useState({
    name: "",
    phone: "",
    email: "",
    role: "Lainnya",
    userId: "",
    technicianId: "",
    basicSalary: "",
    allowance: "",
    isActive: true,
    storeId: ""
  })

  const [isLoanModalOpen, setIsLoanModalOpen] = useState(false)
  const [loanForm, setLoanForm] = useState({
    employeeId: "",
    amount: "",
    description: "",
    paymentMethod: "Cash",
    loanDate: new Date().toISOString().split('T')[0]
  })

  const [isPayrollModalOpen, setIsPayrollModalOpen] = useState(false)
  const [payrollForm, setPayrollForm] = useState({
    employeeId: "",
    period: periodFilter,
    basicSalary: 0,
    allowance: 0,
    commissions: 0,
    overtime: "",
    deductions: "",
    notes: ""
  })
  const [isCalculating, setIsCalculating] = useState(false)
  const [suggestedDeduction, setSuggestedDeduction] = useState(0)
  const [attendanceSummary, setAttendanceSummary] = useState<any>(null)

  const [payoutSlip, setPayoutSlip] = useState<any>(null)
  const [payoutMethod, setPayoutMethod] = useState("Cash")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Session to map cashier/staff to employee record
  const { data: session } = useSession()
  
  const currentEmployee = useMemo(() => {
    if (!session?.user?.id) return null
    return employeesList.find((e: any) => e.userId === session.user.id)
  }, [employeesList, session?.user?.id])

  // Filter for Owner/Manager to view specific employee log
  const [selectedEmployeeFilter, setSelectedEmployeeFilter] = useState("all")

  // Attendance SWR query
  const { data: attendanceRes, mutate: mutateAttendance, isLoading: attendanceLoading, error: attendanceError } = useSWR<any>(
    (import.meta.env.VITE_API_URL || '') + `/api/employees/attendance?period=${periodFilter}${!isKasir && selectedEmployeeFilter !== 'all' ? `&employeeId=${selectedEmployeeFilter}` : ''}`
  )

  const attendanceData = useMemo(() => {
    return Array.isArray(attendanceRes) 
      ? attendanceRes 
      : (attendanceRes && Array.isArray(attendanceRes.attendances) ? attendanceRes.attendances : [])
  }, [attendanceRes])

  const backendCurrentEmployee = useMemo(() => {
    return attendanceRes && attendanceRes.employee ? attendanceRes.employee : null
  }, [attendanceRes])

  // Use either frontend mapped currentEmployee or backend-validated currentEmployee
  const activeEmployee = currentEmployee || backendCurrentEmployee

  const getLocalDateString = () => {
    const d = new Date()
    const offset = d.getTimezoneOffset()
    const localDate = new Date(d.getTime() - (offset * 60 * 1000))
    return localDate.toISOString().split('T')[0]
  }

  // Find if employee has attendance record today
  const todayDate = getLocalDateString()
  const todayAttendance = useMemo(() => {
    return attendanceData.find((a: any) => a.date === todayDate)
  }, [attendanceData, todayDate])

  // Camera & Geolocation state
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [photoData, setPhotoData] = useState<string | null>(null)
  
  const [gpsCoords, setGpsCoords] = useState<{ latitude: number, longitude: number } | null>(null)
  const [gpsLoading, setGpsLoading] = useState(false)
  const [gpsError, setGpsError] = useState<string | null>(null)
  const [attendanceNotes, setAttendanceNotes] = useState("")

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Start/Stop camera on tab change
  useEffect(() => {
    if (activeTab === "absensi" && activeEmployee && !todayAttendance?.clockOut) {
      startCamera()
      getGeolocation()
    } else {
      stopCamera()
    }
    return () => {
      stopCamera()
    }
  }, [activeTab, activeEmployee, todayAttendance?.clockOut])

  const startCamera = async () => {
    try {
      setCameraError(null)
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 400, height: 300, facingMode: "user" }
      })
      setStream(mediaStream)
      streamRef.current = mediaStream
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
      setCameraActive(true)
    } catch (err: any) {
      console.error("Camera access error:", err)
      setCameraError("Gagal mengakses kamera. Mohon pastikan izin kamera diaktifkan di browser Anda.")
      setCameraActive(false)
    }
  }

  const stopCamera = () => {
    const activeStream = streamRef.current || stream
    if (activeStream) {
      activeStream.getTracks().forEach(track => track.stop())
      streamRef.current = null
      setStream(null)
    }
    setCameraActive(false)
    setPhotoData(null)
  }

  const getGeolocation = () => {
    setGpsLoading(true)
    setGpsError(null)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGpsCoords({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        })
        setGpsLoading(false)
      },
      (error) => {
        console.error("Geolocation error:", error)
        setGpsError("Gagal mendeteksi lokasi GPS.")
        setGpsLoading(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current
      const canvas = canvasRef.current
      const context = canvas.getContext("2d")
      if (context) {
        canvas.width = video.videoWidth || 400
        canvas.height = video.videoHeight || 300
        context.drawImage(video, 0, 0, canvas.width, canvas.height)
        const dataUrl = canvas.toDataURL("image/jpeg")
        setPhotoData(dataUrl)
      }
    }
  }

  const handleRetake = () => {
    setPhotoData(null)
    startCamera()
  }

  const handleClockIn = async () => {
    if (!photoData) {
      toast.error("Foto wajah wajib diambil terlebih dahulu.")
      return
    }
    if (gpsLoading) {
      toast.error("Sedang mendeteksi koordinat lokasi GPS Anda...")
      return
    }

    const locationStr = gpsCoords ? `${gpsCoords.latitude},${gpsCoords.longitude}` : null

    setIsSubmitting(true)
    try {
      const res = await fetch((import.meta.env.VITE_API_URL || '') + '/api/employees/attendance', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-store-id': selectedStoreId === 'all' ? (activeEmployee?.storeId || '') : selectedStoreId
        },
        body: JSON.stringify({
          date: getLocalDateString(),
          photo: photoData,
          location: locationStr,
          notes: attendanceNotes
        })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Gagal memproses Clock In")

      toast.success("Clock In berhasil tercatat!")
      mutateAttendance()
      setPhotoData(null)
      setAttendanceNotes("")
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClockOut = async () => {
    if (!photoData) {
      toast.error("Foto wajah wajib diambil terlebih dahulu.")
      return
    }
    if (gpsLoading) {
      toast.error("Sedang mendeteksi koordinat lokasi GPS Anda...")
      return
    }

    const locationStr = gpsCoords ? `${gpsCoords.latitude},${gpsCoords.longitude}` : null

    setIsSubmitting(true)
    try {
      const res = await fetch((import.meta.env.VITE_API_URL || '') + '/api/employees/attendance/clock-out', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-store-id': selectedStoreId === 'all' ? (activeEmployee?.storeId || '') : selectedStoreId
        },
        body: JSON.stringify({
          date: getLocalDateString(),
          photo: photoData,
          location: locationStr
        })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Gagal memproses Clock Out")

      toast.success("Clock Out berhasil tercatat!")
      mutateAttendance()
      setPhotoData(null)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Admin Manual Attendance Log overrides
  const [isAdminLogModalOpen, setIsAdminLogModalOpen] = useState(false)
  const [adminLogForm, setAdminLogForm] = useState({
    id: "",
    employeeId: "",
    date: getLocalDateString(),
    status: "HADIR",
    notes: ""
  })

  const handleOpenEditAdminLog = (log: any) => {
    setAdminLogForm({
      id: log.id,
      employeeId: log.employeeId,
      date: log.date,
      status: log.status,
      notes: log.notes || ""
    })
    setIsAdminLogModalOpen(true)
  }

  const handleOpenAddAdminLog = () => {
    setAdminLogForm({
      id: "",
      employeeId: "",
      date: getLocalDateString(),
      status: "HADIR",
      notes: ""
    })
    setIsAdminLogModalOpen(true)
  }

  const handleSubmitAdminLog = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!adminLogForm.employeeId || !adminLogForm.date || !adminLogForm.status) {
      toast.error("Kolom Karyawan, Tanggal, dan Status wajib diisi.")
      return
    }

    const employee = employeesList.find(emp => emp.id === adminLogForm.employeeId)
    const targetHeaderStoreId = selectedStoreId === 'all' ? (employee?.storeId || '') : selectedStoreId

    setIsSubmitting(true)
    try {
      const res = await fetch((import.meta.env.VITE_API_URL || '') + '/api/employees/attendance/admin-log', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-store-id': targetHeaderStoreId
        },
        body: JSON.stringify(adminLogForm)
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Gagal memperbarui absensi.")

      toast.success(adminLogForm.id ? "Absensi berhasil diperbarui oleh admin." : "Absensi manual berhasil dicatat.")
      setIsAdminLogModalOpen(false)
      mutateAttendance()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteAdminLog = async (id: string, employeeName: string, date: string) => {
    const confirmed = await confirm({
      title: "Hapus Absensi?",
      description: `Apakah Anda yakin ingin menghapus catatan absensi "${employeeName}" pada tanggal ${date}?`,
      confirmLabel: "Hapus",
      variant: "destructive"
    })
    if (!confirmed) return

    const logRecord = attendanceData.find((l: any) => l.id === id)
    const targetHeaderStoreId = selectedStoreId === 'all' ? (logRecord?.storeId || '') : selectedStoreId

    try {
      const res = await fetch((import.meta.env.VITE_API_URL || '') + `/api/employees/attendance/admin-log?id=${id}`, {
        method: 'DELETE',
        headers: {
          'x-store-id': targetHeaderStoreId
        }
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Gagal menghapus absensi")

      toast.success("Catatan absensi berhasil dihapus")
      mutateAttendance()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  // Selected Log detail modal state for viewing photo & location link
  const [selectedLogDetail, setSelectedLogDetail] = useState<any>(null)

  // Handle Employee Form Actions
  const handleOpenAddEmployee = () => {
    setEditingEmployee(null)
    setEmployeeForm({
      name: "",
      phone: "",
      email: "",
      role: "Lainnya",
      userId: "",
      technicianId: "",
      basicSalary: "",
      allowance: "",
      isActive: true,
      storeId: ""
    })
    setIsEmployeeModalOpen(true)
  }

  const handleOpenEditEmployee = (emp: any) => {
    setEditingEmployee(emp)
    setEmployeeForm({
      name: emp.name,
      phone: emp.phone || "",
      email: emp.email || "",
      role: emp.role || "Lainnya",
      userId: emp.userId || "",
      technicianId: emp.technicianId || "",
      basicSalary: String(emp.basicSalary),
      allowance: String(emp.allowance),
      isActive: emp.isActive,
      storeId: emp.storeId || ""
    })
    setIsEmployeeModalOpen(true)
  }

  const handleSubmitEmployee = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!employeeForm.name || !employeeForm.role) {
      toast.error("Nama dan Jabatan wajib diisi")
      return
    }

    if (selectedStoreId === "all" && !employeeForm.storeId) {
      toast.error("Cabang penugasan wajib dipilih")
      return
    }

    setIsSubmitting(true)
    try {
      const url = (import.meta.env.VITE_API_URL || '') + (editingEmployee ? `/api/employees/${editingEmployee.id}` : '/api/employees')
      const method = editingEmployee ? 'PUT' : 'POST'
      const targetHeaderStoreId = selectedStoreId === 'all' ? (employeeForm.storeId || editingEmployee?.storeId || '') : selectedStoreId

      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'x-store-id': targetHeaderStoreId
        },
        body: JSON.stringify({
          ...employeeForm,
          basicSalary: Number(employeeForm.basicSalary) || 0,
          allowance: Number(employeeForm.allowance) || 0,
          userId: employeeForm.userId || null,
          technicianId: employeeForm.technicianId || null,
          storeId: selectedStoreId === 'all' ? employeeForm.storeId : undefined
        })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Gagal memproses data karyawan")

      toast.success(editingEmployee ? "Profil karyawan berhasil diperbarui" : "Karyawan baru berhasil ditambahkan")
      setIsEmployeeModalOpen(false)
      mutateEmployees()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteEmployee = async (id: string, name: string) => {
    const confirmed = await confirm({
      title: "Hapus Karyawan?",
      description: `Apakah Anda yakin ingin menghapus profil karyawan "${name}"? Tindakan ini tidak dapat dibatalkan.`,
      confirmLabel: "Hapus",
      variant: "destructive"
    })
    if (!confirmed) return

    const employeeRecord = employeesList.find(e => e.id === id)
    const targetHeaderStoreId = selectedStoreId === 'all' ? (employeeRecord?.storeId || '') : selectedStoreId

    try {
      const res = await fetch((import.meta.env.VITE_API_URL || '') + `/api/employees/${id}`, {
        method: 'DELETE',
        headers: {
          'x-store-id': targetHeaderStoreId
        }
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Gagal menghapus karyawan")

      toast.success("Karyawan berhasil dihapus")
      mutateEmployees()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  // Handle Loans Actions
  const handleOpenAddLoan = () => {
    setLoanForm({
      employeeId: "",
      amount: "",
      description: "",
      paymentMethod: "Cash",
      loanDate: new Date().toISOString().split('T')[0]
    })
    setIsLoanModalOpen(true)
  }

  const handleSubmitLoan = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!loanForm.employeeId || !loanForm.amount) {
      toast.error("Karyawan dan Jumlah Pinjaman wajib diisi")
      return
    }

    const employee = employeesList.find(e => e.id === loanForm.employeeId)
    const targetHeaderStoreId = selectedStoreId === 'all' ? (employee?.storeId || '') : selectedStoreId

    setIsSubmitting(true)
    try {
      const res = await fetch((import.meta.env.VITE_API_URL || '') + '/api/employees/loans', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-store-id': targetHeaderStoreId
        },
        body: JSON.stringify({
          employeeId: loanForm.employeeId,
          amount: Number(loanForm.amount.replace(/\D/g, '')) || 0,
          description: loanForm.description,
          paymentMethod: loanForm.paymentMethod,
          loanDate: loanForm.loanDate
        })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Gagal mencatat kasbon")

      toast.success("Pinjaman Kasbon berhasil dicatat dan memotong kas toko")
      setIsLoanModalOpen(false)
      mutateLoans()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteLoan = async (id: string) => {
    const confirmed = await confirm({
      title: "Batalkan Kasbon?",
      description: "Tindakan ini hanya akan menghapus catatan pinjaman di HR (tidak membatalkan transaksi pengeluaran kas otomatis di pembukuan). Hapus catatan?",
      confirmLabel: "Batalkan",
      variant: "destructive"
    })
    if (!confirmed) return

    const loan = loansList.find(l => l.id === id)
    const targetHeaderStoreId = selectedStoreId === 'all' ? (loan?.storeId || '') : selectedStoreId

    try {
      const res = await fetch((import.meta.env.VITE_API_URL || '') + `/api/employees/loans/${id}`, {
        method: 'DELETE',
        headers: {
          'x-store-id': targetHeaderStoreId
        }
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Gagal menghapus kasbon")

      toast.success("Catatan pinjaman kasbon berhasil dihapus")
      mutateLoans()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  // Handle Payroll Actions
  const handleOpenAddPayroll = () => {
    setPayrollForm({
      employeeId: "",
      period: periodFilter,
      basicSalary: 0,
      allowance: 0,
      commissions: 0,
      overtime: "",
      deductions: "",
      notes: ""
    })
    setSuggestedDeduction(0)
    setAttendanceSummary(null)
    setIsPayrollModalOpen(true)
  }

  const handleSelectEmployeeForPayroll = async (empId: string) => {
    if (!empId) return
    setIsCalculating(true)
    
    const employee = employeesList.find(e => e.id === empId)
    const targetHeaderStoreId = selectedStoreId === 'all' ? (employee?.storeId || '') : selectedStoreId

    try {
      const res = await fetch((import.meta.env.VITE_API_URL || '') + `/api/payrolls/calculate?employeeId=${empId}&period=${periodFilter}`, {
        headers: {
          'x-store-id': targetHeaderStoreId
        }
      })
      if (res.ok) {
        const data = await res.json()
        setPayrollForm(prev => ({
          ...prev,
          employeeId: empId,
          basicSalary: data.basicSalary,
          allowance: data.allowance,
          commissions: data.commissions,
          deductions: String(Math.min(data.unpaidLoans, data.basicSalary + data.allowance + data.commissions)) // Auto suggest deducting loans
        }))
        setSuggestedDeduction(data.unpaidLoans)
        setAttendanceSummary(data)
      }
    } catch (err) {
      console.error(err)
      toast.error("Gagal menghitung default slip gaji")
    } finally {
      setIsCalculating(false)
    }
  }

  const handleSubmitPayroll = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!payrollForm.employeeId || !payrollForm.period) {
      toast.error("Karyawan dan Periode wajib diisi")
      return
    }

    const employee = employeesList.find(e => e.id === payrollForm.employeeId)
    const targetHeaderStoreId = selectedStoreId === 'all' ? (employee?.storeId || '') : selectedStoreId

    setIsSubmitting(true)
    try {
      const res = await fetch((import.meta.env.VITE_API_URL || '') + '/api/payrolls', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-store-id': targetHeaderStoreId
        },
        body: JSON.stringify({
          ...payrollForm,
          overtime: Number(payrollForm.overtime) || 0,
          deductions: Number(payrollForm.deductions) || 0,
          netSalary: (Number(payrollForm.basicSalary) + Number(payrollForm.allowance) + Number(payrollForm.commissions) + (Number(payrollForm.overtime) || 0)) - (Number(payrollForm.deductions) || 0)
        })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Gagal membuat slip gaji")

      toast.success("Slip gaji bulanan berhasil digenerasi")
      setIsPayrollModalOpen(false)
      mutatePayrolls()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePayoutSalary = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!payoutSlip) return

    const targetHeaderStoreId = selectedStoreId === 'all' ? (payoutSlip?.storeId || '') : selectedStoreId

    setIsSubmitting(true)
    try {
      const res = await fetch((import.meta.env.VITE_API_URL || '') + `/api/payrolls/${payoutSlip.id}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'x-store-id': targetHeaderStoreId
        },
        body: JSON.stringify({
          action: "PAYOUT",
          paymentMethod: payoutMethod
        })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Gagal mencairkan gaji")

      toast.success("Gaji karyawan berhasil dicairkan dan tercatat di kas pengeluaran")
      setPayoutSlip(null)
      mutatePayrolls()
      mutateLoans() // Refresh loan balances
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeletePayroll = async (id: string) => {
    const confirmed = await confirm({
      title: "Hapus Slip Gaji?",
      description: "Hapus draft slip gaji ini? Tindakan ini hanya diperbolehkan jika gaji belum dibayarkan.",
      confirmLabel: "Hapus",
      variant: "destructive"
    })
    if (!confirmed) return

    const slip = payrollsList.find(p => p.id === id)
    const targetHeaderStoreId = selectedStoreId === 'all' ? (slip?.storeId || '') : selectedStoreId

    try {
      const res = await fetch((import.meta.env.VITE_API_URL || '') + `/api/payrolls/${id}`, {
        method: 'DELETE',
        headers: {
          'x-store-id': targetHeaderStoreId
        }
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Gagal menghapus slip gaji")

      toast.success("Slip gaji berhasil dihapus")
      mutatePayrolls()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const handlePrintPayrollSlip = (payroll: any) => {
    // Basic browser printing template for thermal receipt
    const printWindow = window.open("", "_blank")
    if (!printWindow) return

    const storeName = localStorage.getItem("storeName") || "HanLaptop"
    const storeAddress = localStorage.getItem("storeAddress") || ""

    const htmlContent = `
      <html>
      <head>
        <title>Slip Gaji ${payroll.employee?.name}</title>
        <style>
          body { font-family: monospace; font-size: 11px; width: 58mm; padding: 5px; margin: 0; }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .line { border-top: 1px dashed #000; margin: 6px 0; }
          .flex { display: flex; justify-content: space-between; }
          .title { font-size: 12px; margin-bottom: 2px; }
          .margin-top { margin-top: 15px; }
        </style>
      </head>
      <body>
        <div class="center bold title">${storeName.toUpperCase()}</div>
        <div class="center">${storeAddress}</div>
        <div class="line"></div>
        <div class="center bold">SLIP GAJI BULANAN</div>
        <div class="center bold">Periode: ${payroll.period}</div>
        <div class="line"></div>
        <div class="flex"><span>Nama:</span> <span>${payroll.employee?.name}</span></div>
        <div class="flex"><span>Jabatan:</span> <span>${payroll.employee?.role}</span></div>
        <div class="flex"><span>Status:</span> <span>${payroll.paymentStatus === 'PAID' ? 'LUNAS/DIBAYAR' : 'DRAFT/UNPAID'}</span></div>
        ${payroll.paidAt ? `<div class="flex"><span>Tgl Bayar:</span> <span>${new Date(payroll.paidAt).toLocaleDateString('id-ID')}</span></div>` : ''}
        <div class="line"></div>
        <div class="bold">PENERIMAAN:</div>
        <div class="flex"><span>Gaji Pokok:</span> <span>${formatCurrency(payroll.basicSalary)}</span></div>
        <div class="flex"><span>Tunjangan:</span> <span>${formatCurrency(payroll.allowance)}</span></div>
        <div class="flex"><span>Komisi Servis:</span> <span>${formatCurrency(payroll.commissions)}</span></div>
        <div class="flex"><span>Lembur/Bonus:</span> <span>${formatCurrency(payroll.overtime)}</span></div>
        <div class="line"></div>
        <div class="bold">POTONGAN:</div>
        <div class="flex"><span>Kasbon/Lainnya:</span> <span>${formatCurrency(payroll.deductions)}</span></div>
        <div class="line"></div>
        <div class="flex bold"><span>GAJI BERSIH:</span> <span>${formatCurrency(payroll.netSalary)}</span></div>
        <div class="line"></div>
        ${payroll.notes ? `<div>Ket: ${payroll.notes}</div><div class="line"></div>` : ''}
        <div class="center margin-top">Tanda Tangan</div>
        <br/><br/><br/>
        <div class="center">(${payroll.employee?.name})</div>
        <script>
          window.onload = function() { window.print(); window.close(); }
        </script>
      </body>
      </html>
    `
    printWindow.document.write(htmlContent)
    printWindow.document.close()
  }

  return (
    <>
      <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Sticky Page Header */}
        <div className="sticky top-0 z-40 shrink-0 flex flex-col gap-2 p-2 sm:p-3 md:px-5 md:py-3 bg-white/80 light-blue:bg-white dark:bg-card backdrop-blur-xl rounded-2xl md:rounded-[2rem] border border-border shadow-sm mt-0 mb-2 text-left">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-lg md:text-xl font-bold tracking-tight">Karyawan & Gaji (HR & Payroll)</h2>
              <p className="text-muted-foreground mt-0.5 text-[10px] md:text-xs font-medium">Kelola gaji pokok, tunjangan, pinjaman kasbon, dan pencairan komisi teknisi.</p>
            </div>
            
            <div className="flex items-center gap-1.5 self-end sm:self-auto">
              {activeTab === "karyawan" && (
                <Button size="sm" onClick={handleOpenAddEmployee} className="h-8 md:h-9 text-xs md:text-sm font-semibold rounded-xl bg-primary hover:bg-primary/95 text-primary-foreground shadow-md gap-1.5">
                  <PlusCircle className="h-4 w-4" /> Karyawan Baru
                </Button>
              )}
              {activeTab === "kasbon" && (
                <Button size="sm" onClick={handleOpenAddLoan} className="h-8 md:h-9 text-xs md:text-sm font-semibold rounded-xl bg-amber-500 hover:bg-amber-600 text-white shadow-md gap-1.5">
                  <PlusCircle className="h-4 w-4" /> Catat Kasbon
                </Button>
              )}
              {activeTab === "penggajian" && (
                <Button size="sm" onClick={handleOpenAddPayroll} className="h-8 md:h-9 text-xs md:text-sm font-semibold rounded-xl bg-primary hover:bg-primary/95 text-primary-foreground shadow-md gap-1.5">
                  <PlusCircle className="h-4 w-4" /> Generasi Gaji
                </Button>
              )}
              {activeTab === "absensi" && !isKasir && (
                <Button size="sm" onClick={handleOpenAddAdminLog} className="h-8 md:h-9 text-xs md:text-sm font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md gap-1.5">
                  <PlusCircle className="h-4 w-4" /> Absen Manual
                </Button>
              )}
              {activeTab === "teknisi" && isOwner && localStorage.getItem('selectedStoreId') !== 'all' && (
                <Button size="sm" onClick={openAddTechModal} className="h-8 md:h-9 text-xs md:text-sm font-semibold rounded-xl bg-indigo-650 hover:bg-indigo-700 text-white shadow-md gap-1.5">
                  <UserCheck className="h-4 w-4" /> Tambah Teknisi
                </Button>
              )}
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="mt-2 -mx-1 md:mx-0">
            <div className={cn(
              "flex md:grid gap-1.5 md:gap-2 p-1.5 bg-muted/30 dark:bg-muted rounded-2xl border border-border shadow-inner overflow-x-auto scrollbar-hide",
              isKasir ? "md:grid-cols-1" : "md:grid-cols-5"
            )}>
              {!isKasir && (
                <>
                  <button
                    onClick={() => setActiveTab("karyawan")}
                    className={cn(
                      "flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 whitespace-nowrap shrink-0 min-w-[100px] md:min-w-0",
                      activeTab === "karyawan"
                        ? "bg-primary dark:bg-accent shadow-sm text-primary-foreground dark:text-accent-foreground border border-transparent"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted dark:hover:bg-accent"
                    )}
                  >
                    <Users className="h-4 w-4 shrink-0" />
                    <span>Data Karyawan</span>
                  </button>
                  <button
                    onClick={() => setActiveTab("kasbon")}
                    className={cn(
                      "flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 whitespace-nowrap shrink-0 min-w-[100px] md:min-w-0",
                      activeTab === "kasbon"
                        ? "bg-primary dark:bg-accent shadow-sm text-primary-foreground dark:text-accent-foreground border border-transparent"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted dark:hover:bg-accent"
                    )}
                  >
                    <TrendingDown className="h-4 w-4 shrink-0" />
                    <span>Kasbon (Pinjaman)</span>
                  </button>
                  <button
                    onClick={() => setActiveTab("penggajian")}
                    className={cn(
                      "flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 whitespace-nowrap shrink-0 min-w-[100px] md:min-w-0",
                      activeTab === "penggajian"
                        ? "bg-primary dark:bg-accent shadow-sm text-primary-foreground dark:text-accent-foreground border border-transparent"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted dark:hover:bg-accent"
                    )}
                  >
                    <Wallet className="h-4 w-4 shrink-0" />
                    <span>Penggajian (Payroll)</span>
                  </button>
                  <button
                    onClick={() => setActiveTab("teknisi")}
                    className={cn(
                      "flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 whitespace-nowrap shrink-0 min-w-[100px] md:min-w-0",
                      activeTab === "teknisi"
                        ? "bg-primary dark:bg-accent shadow-sm text-primary-foreground dark:text-accent-foreground border border-transparent"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted dark:hover:bg-accent"
                    )}
                  >
                    <UserCog className="h-4 w-4 shrink-0" />
                    <span>Database Teknisi</span>
                  </button>
                </>
              )}
              <button
                onClick={() => setActiveTab("absensi")}
                className={cn(
                  "flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 whitespace-nowrap shrink-0 min-w-[100px] md:min-w-0",
                  activeTab === "absensi"
                    ? "bg-primary dark:bg-accent shadow-sm text-primary-foreground dark:text-accent-foreground border border-transparent"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted dark:hover:bg-accent",
                  isKasir && "w-full col-span-1"
                )}
              >
                <Calendar className="h-4 w-4 shrink-0" />
                <span>Absensi Kehadiran</span>
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable Body Content */}
        <div className="flex-1 overflow-x-hidden space-y-3 text-left">
          {/* TAB 1: KARYAWAN */}
          {activeTab === "karyawan" && (
            <Card>
              <CardHeader className="pb-3 pt-4 px-4 border-b border-border/50">
                <div className="flex items-center justify-between">
                  <span className="text-base font-bold">Daftar Karyawan Aktif</span>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input 
                      placeholder="Cari karyawan..." 
                      value={searchEmployee} 
                      onChange={e => setSearchEmployee(e.target.value)} 
                      className="pl-8 h-8 text-[11px] w-[180px] bg-muted/20"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {employeesLoading ? (
                  <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table className="min-w-[600px]">
                      <TableHeader className="bg-muted/40">
                        <TableRow>
                          <TableHead className="py-2 text-xs">Nama Karyawan</TableHead>
                          <TableHead className="py-2 text-xs">Jabatan/Role</TableHead>
                          {selectedStoreId === "all" && <TableHead className="py-2 text-xs">Cabang</TableHead>}
                          <TableHead className="py-2 text-xs">Kontak</TableHead>
                          <TableHead className="py-2 text-xs text-right">Gaji Pokok</TableHead>
                          <TableHead className="py-2 text-xs text-right">Tunjangan</TableHead>
                          <TableHead className="py-2 text-xs text-center">Status</TableHead>
                          <TableHead className="w-[85px] text-center py-2 text-xs">Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredEmployees.length === 0 ? (
                          <TableRow><TableCell colSpan={selectedStoreId === "all" ? 8 : 7} className="text-center py-8 text-muted-foreground text-xs">Tidak ada data karyawan ditemukan.</TableCell></TableRow>
                        ) : filteredEmployees.map((emp) => (
                          <TableRow key={emp.id} className="hover:bg-muted/30">
                            <TableCell className="py-2 text-xs font-semibold">{emp.name}</TableCell>
                            <TableCell className="py-2 text-xs">
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-muted text-muted-foreground capitalize">
                                {emp.role}
                              </span>
                            </TableCell>
                            {selectedStoreId === "all" && (
                              <TableCell className="py-2 text-xs font-medium">
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400">
                                  {emp.store?.name || "-"}
                                </span>
                              </TableCell>
                            )}
                            <TableCell className="py-2 text-[11px] text-muted-foreground">
                              <div>{emp.phone || "-"}</div>
                              <div>{emp.email || ""}</div>
                            </TableCell>
                            <TableCell className="py-2 text-xs text-right font-medium tabular-nums">{formatCurrency(emp.basicSalary)}</TableCell>
                            <TableCell className="py-2 text-xs text-right font-medium tabular-nums">{formatCurrency(emp.allowance)}</TableCell>
                            <TableCell className="py-2 text-xs text-center">
                              <span className={cn(
                                "inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase",
                                emp.isActive ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                              )}>
                                {emp.isActive ? "Aktif" : "Non-Aktif"}
                              </span>
                            </TableCell>
                            <TableCell className="py-2" onClick={e => e.stopPropagation()}>
                              <div className="flex items-center justify-center gap-1">
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-blue-600 hover:bg-blue-50 hover:text-blue-700 rounded" title="Edit Profil Gaji" onClick={() => handleOpenEditEmployee(emp)}>
                                  <Edit2 className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-rose-500 hover:bg-rose-50 hover:text-rose-600 rounded" title="Hapus Karyawan" onClick={() => handleDeleteEmployee(emp.id, emp.name)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* TAB 2: KASBON */}
          {activeTab === "kasbon" && (
            <Card>
              <CardHeader className="pb-3 pt-4 px-4 border-b border-border/50">
                <div className="flex items-center justify-between">
                  <span className="text-base font-bold">Riwayat Pinjaman Kasbon Karyawan</span>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input 
                      placeholder="Cari kasbon..." 
                      value={searchLoan} 
                      onChange={e => setSearchLoan(e.target.value)} 
                      className="pl-8 h-8 text-[11px] w-[180px] bg-muted/20"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {loansLoading ? (
                  <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table className="min-w-[600px]">
                      <TableHeader className="bg-muted/40">
                        <TableRow>
                          <TableHead className="py-2 text-xs">Tanggal</TableHead>
                          <TableHead className="py-2 text-xs">Karyawan</TableHead>
                          {selectedStoreId === "all" && <TableHead className="py-2 text-xs">Cabang</TableHead>}
                          <TableHead className="py-2 text-xs">Keterangan / Alasan</TableHead>
                          <TableHead className="py-2 text-xs text-right">Nominal Pinjaman</TableHead>
                          <TableHead className="py-2 text-xs text-right">Terbayar</TableHead>
                          <TableHead className="py-2 text-xs text-right">Sisa Pinjaman</TableHead>
                          <TableHead className="py-2 text-xs text-center">Status</TableHead>
                          <TableHead className="w-[60px] text-center py-2 text-xs">Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredLoans.length === 0 ? (
                          <TableRow><TableCell colSpan={selectedStoreId === "all" ? 9 : 8} className="text-center py-8 text-muted-foreground text-xs">Tidak ada catatan pinjaman kasbon ditemukan.</TableCell></TableRow>
                        ) : filteredLoans.map((loan) => {
                          const remaining = loan.amount - loan.paidAmount
                          const isFullyPaid = loan.status === 'PAID'
                          const isPartial = loan.status === 'PARTIAL'

                          return (
                            <TableRow key={loan.id} className="hover:bg-muted/30">
                              <TableCell className="py-2 text-[11px] text-muted-foreground whitespace-nowrap">
                                {new Date(loan.loanDate).toLocaleDateString('id-ID')}
                              </TableCell>
                              <TableCell className="py-2 text-xs font-semibold">{loan.employee?.name || "-"}</TableCell>
                              {selectedStoreId === "all" && (
                                <TableCell className="py-2 text-xs font-medium">
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400">
                                    {loan.store?.name || "-"}
                                  </span>
                                </TableCell>
                              )}
                              <TableCell className="py-2 text-xs max-w-[200px] truncate">{loan.description || "-"}</TableCell>
                              <TableCell className="py-2 text-xs text-right font-medium tabular-nums">{formatCurrency(loan.amount)}</TableCell>
                              <TableCell className="py-2 text-xs text-right font-medium tabular-nums text-emerald-600">{formatCurrency(loan.paidAmount)}</TableCell>
                              <TableCell className="py-2 text-xs text-right font-bold tabular-nums text-rose-500">{formatCurrency(remaining)}</TableCell>
                              <TableCell className="py-2 text-xs text-center">
                                <span className={cn(
                                  "inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase",
                                  isFullyPaid ? "bg-emerald-100 text-emerald-700" : isPartial ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"
                                )}>
                                  {isFullyPaid ? "Lunas" : isPartial ? "Sebagian" : "Belum Bayar"}
                                </span>
                              </TableCell>
                              <TableCell className="py-2 text-center" onClick={e => e.stopPropagation()}>
                                {!isFullyPaid && (
                                  <Button variant="ghost" size="icon" className="h-6 w-6 text-rose-500 hover:bg-rose-50 hover:text-rose-600 rounded" title="Batalkan Kasbon" onClick={() => handleDeleteLoan(loan.id)}>
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* TAB 3: PENGGAJIAN */}
          {activeTab === "penggajian" && (
            <Card>
              <CardHeader className="pb-3 pt-4 px-4 border-b border-border/50">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <span className="text-base font-bold">Rekap Penggajian Karyawan</span>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Calendar className="w-3.5 h-3.5" /> Periode:
                    </div>
                    <Input 
                      type="month"
                      value={periodFilter}
                      onChange={(e) => setPeriodFilter(e.target.value)}
                      className="h-8 text-xs font-semibold w-[140px] bg-muted/20"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {payrollsLoading ? (
                  <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table className="min-w-[700px]">
                      <TableHeader className="bg-muted/40">
                        <TableRow>
                          <TableHead className="py-2 text-xs">Karyawan</TableHead>
                          {selectedStoreId === "all" && <TableHead className="py-2 text-xs">Cabang</TableHead>}
                          <TableHead className="py-2 text-xs text-right">Gaji Pokok</TableHead>
                          <TableHead className="py-2 text-xs text-right">Tunjangan</TableHead>
                          <TableHead className="py-2 text-xs text-right">Komisi</TableHead>
                          <TableHead className="py-2 text-xs text-right">Lembur/Bonus</TableHead>
                          <TableHead className="py-2 text-xs text-right">Potongan</TableHead>
                          <TableHead className="py-2 text-xs text-right">Gaji Bersih (Net)</TableHead>
                          <TableHead className="py-2 text-xs text-center">Status</TableHead>
                          <TableHead className="w-[110px] text-center py-2 text-xs">Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {payrollsList.length === 0 ? (
                          <TableRow><TableCell colSpan={selectedStoreId === "all" ? 10 : 9} className="text-center py-8 text-muted-foreground text-xs">Belum ada slip gaji digenerasi untuk bulan ini.</TableCell></TableRow>
                        ) : payrollsList.map((pay) => {
                          const isPaid = pay.paymentStatus === 'PAID'

                          return (
                            <TableRow key={pay.id} className="hover:bg-muted/30">
                              <TableCell className="py-2 text-xs font-semibold">
                                <div>{pay.employee?.name || "-"}</div>
                                <div className="text-[9px] text-muted-foreground capitalize font-normal">{pay.employee?.role}</div>
                              </TableCell>
                              {selectedStoreId === "all" && (
                                <TableCell className="py-2 text-xs font-medium">
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400">
                                    {pay.store?.name || "-"}
                                  </span>
                                </TableCell>
                              )}
                              <TableCell className="py-2 text-xs text-right font-medium tabular-nums">{formatCurrency(pay.basicSalary)}</TableCell>
                              <TableCell className="py-2 text-xs text-right font-medium tabular-nums">{formatCurrency(pay.allowance)}</TableCell>
                              <TableCell className="py-2 text-xs text-right font-medium tabular-nums text-indigo-600">{formatCurrency(pay.commissions)}</TableCell>
                              <TableCell className="py-2 text-xs text-right font-medium tabular-nums text-emerald-600">{formatCurrency(pay.overtime)}</TableCell>
                              <TableCell className="py-2 text-xs text-right font-medium tabular-nums text-rose-500">{formatCurrency(pay.deductions)}</TableCell>
                              <TableCell className="py-2 text-xs text-right font-bold tabular-nums text-foreground">{formatCurrency(pay.netSalary)}</TableCell>
                              <TableCell className="py-2 text-xs text-center">
                                <span className={cn(
                                  "inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase",
                                  isPaid ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                                )}>
                                  {isPaid ? "Dibayar" : "Draft"}
                                </span>
                              </TableCell>
                              <TableCell className="py-2" onClick={e => e.stopPropagation()}>
                                <div className="flex items-center justify-center gap-1">
                                  {!isPaid && (
                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 rounded" title="Bayar Gaji Karyawan" onClick={() => setPayoutSlip(pay)}>
                                      <CheckCircle className="h-3.5 w-3.5" />
                                    </Button>
                                  )}
                                  <Button variant="ghost" size="icon" className="h-6 w-6 text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 rounded" title="Cetak Slip Thermal" onClick={() => handlePrintPayrollSlip(pay)}>
                                    <Printer className="h-3.5 w-3.5" />
                                  </Button>
                                  {!isPaid && (
                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-rose-500 hover:bg-rose-50 hover:text-rose-600 rounded" title="Hapus Slip Gaji" onClick={() => handleDeletePayroll(pay.id)}>
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* TAB 4: ABSENSI */}
          {activeTab === "absensi" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Column 1: Clock In/Out Webcam & Geotagging */}
              <div className="lg:col-span-1 space-y-4">
                <Card className="overflow-hidden border border-border shadow-md">
                  <CardHeader className="pb-3 pt-4 px-4 bg-muted/20 dark:bg-muted/10">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <Clock className="w-4 h-4 text-primary" />
                      Status Kehadiran Hari Ini
                    </CardTitle>
                    <CardDescription className="text-[10px]">
                      {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 space-y-4">
                    {!activeEmployee ? (
                      <div className="flex flex-col items-center justify-center text-center py-6 px-2 space-y-2 bg-amber-500/5 border border-amber-500/20 rounded-xl">
                        <AlertCircle className="h-8 w-8 text-amber-500" />
                        <h4 className="font-bold text-xs">Akun Belum Terhubung</h4>
                        <p className="text-[10px] text-muted-foreground leading-normal">
                          Akun user Anda belum terhubung dengan profil karyawan. Silakan hubungi Owner/Manager untuk menghubungkan akun Anda di tab <strong>Data Karyawan</strong>.
                        </p>
                      </div>
                    ) : (
                      <>
                        {/* Profile Info Summary */}
                        <div className="bg-muted/30 p-3 rounded-lg border flex items-center justify-between text-xs">
                          <div>
                            <p className="font-bold">{activeEmployee.name}</p>
                            <p className="text-[10px] text-muted-foreground capitalize">{activeEmployee.role}</p>
                          </div>
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-primary/10 text-primary uppercase">
                            Linked
                          </span>
                        </div>

                        {/* Webcam Capture Screen */}
                        {!todayAttendance?.clockOut && todayAttendance?.status !== "SAKIT" && todayAttendance?.status !== "IZIN" && todayAttendance?.status !== "ALFA" && (
                          <div className="space-y-3">
                            <div className="relative aspect-[4/3] w-full rounded-xl overflow-hidden border bg-black shadow-inner flex items-center justify-center">
                              {photoData ? (
                                <img src={photoData} alt="Captured" className="w-full h-full object-cover" />
                              ) : cameraActive ? (
                                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                              ) : (
                                <div className="flex flex-col items-center justify-center text-center p-4 space-y-2 text-muted-foreground">
                                  {cameraError ? (
                                    <>
                                      <AlertCircle className="w-8 h-8 text-rose-500" />
                                      <p className="text-[10px] text-rose-500 font-semibold">{cameraError}</p>
                                      <Button size="sm" type="button" variant="outline" onClick={startCamera} className="h-7 text-[10px] rounded-lg">
                                        Coba Lagi
                                      </Button>
                                    </>
                                  ) : (
                                    <>
                                      <Video className="w-8 h-8 opacity-40" />
                                      <p className="text-[10px]">Mengaktifkan kamera...</p>
                                      <Button size="sm" type="button" onClick={startCamera} className="h-7 text-[10px] rounded-lg bg-primary">
                                        Aktifkan Kamera
                                      </Button>
                                    </>
                                  )}
                                </div>
                              )}
                              <canvas ref={canvasRef} className="hidden" />
                            </div>

                            <div className="flex items-center justify-center gap-2">
                              {photoData ? (
                                <Button type="button" variant="outline" size="sm" onClick={handleRetake} className="w-full h-8 text-[11px] font-semibold gap-1.5 rounded-lg border-border">
                                  <RefreshCw className="h-3 w-3" /> Ambil Ulang
                                </Button>
                              ) : (
                                <Button type="button" disabled={!cameraActive} onClick={capturePhoto} className="w-full h-8 text-[11px] font-bold gap-1.5 rounded-lg bg-primary hover:bg-primary/95 text-primary-foreground shadow-sm">
                                  <Camera className="h-3.5 w-3.5" /> Tangkap Foto
                                </Button>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Location Coordinates */}
                        {!todayAttendance?.clockOut && todayAttendance?.status !== "SAKIT" && todayAttendance?.status !== "IZIN" && todayAttendance?.status !== "ALFA" && (
                          <div className="bg-muted/20 p-2.5 rounded-xl border flex items-center justify-between text-[10px]">
                            <div className="flex items-center gap-2 text-muted-foreground min-w-0 flex-1">
                              <MapPin className="h-4.5 w-4.5 shrink-0 text-primary/80" />
                              <div className="truncate">
                                <p className="font-bold text-foreground">Lokasi GPS Anda</p>
                                {gpsLoading ? (
                                  <span className="text-muted-foreground animate-pulse">Melacak koordinat...</span>
                                ) : gpsError ? (
                                  <span className="text-rose-500 font-medium">{gpsError}</span>
                                ) : gpsCoords ? (
                                  <span className="font-mono text-foreground">{gpsCoords.latitude.toFixed(6)}, {gpsCoords.longitude.toFixed(6)}</span>
                                ) : (
                                  <span className="text-muted-foreground">Belum dilacak</span>
                                )}
                              </div>
                            </div>
                            <Button type="button" size="icon" variant="ghost" className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground shrink-0 border" onClick={getGeolocation} disabled={gpsLoading} title="Update Lokasi">
                              <RefreshCw className={cn("h-3.5 w-3.5", gpsLoading && "animate-spin")} />
                            </Button>
                          </div>
                        )}

                        {/* Notes input */}
                        {!todayAttendance && (
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-muted-foreground">Catatan / Keterangan Masuk</label>
                            <Input
                              value={attendanceNotes}
                              onChange={(e) => setAttendanceNotes(e.target.value)}
                              placeholder="Keterangan opsional..."
                              className="text-xs h-8 bg-muted/20"
                            />
                          </div>
                        )}

                        {/* Submit Action Buttons / Display Status */}
                        <div className="pt-2">
                          {!todayAttendance ? (
                            <Button
                              type="button"
                              onClick={handleClockIn}
                              disabled={isSubmitting || !photoData}
                              className="w-full h-9 text-xs font-bold gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-md"
                            >
                              {isSubmitting ? "Memproses..." : "Absen Masuk (Clock In)"}
                            </Button>
                          ) : todayAttendance.status !== "HADIR" ? (
                            <div className="bg-amber-500/10 border border-amber-500/25 p-3 rounded-lg text-center text-xs">
                              <p className="font-bold text-amber-700 dark:text-amber-400">
                                Anda Hari Ini ditandai {todayAttendance.status}
                              </p>
                              {todayAttendance.notes && (
                                <p className="text-[10px] text-muted-foreground mt-1">Ket: {todayAttendance.notes}</p>
                              )}
                            </div>
                          ) : !todayAttendance.clockOut ? (
                            <div className="space-y-3">
                              <div className="bg-emerald-500/5 border border-emerald-500/20 p-2.5 rounded-lg text-[11px] leading-relaxed">
                                <p className="text-emerald-600 dark:text-emerald-400 font-bold font-mono">✓ Sudah Absen Masuk (Clock In)</p>
                                <p className="text-muted-foreground mt-0.5">Jam: {new Date(todayAttendance.clockIn).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</p>
                              </div>
                              <Button
                                type="button"
                                onClick={handleClockOut}
                                disabled={isSubmitting || !photoData}
                                className="w-full h-9 text-xs font-bold gap-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow-md"
                              >
                                {isSubmitting ? "Memproses..." : "Absen Keluar (Clock Out)"}
                              </Button>
                            </div>
                          ) : (
                            <div className="bg-muted p-3.5 rounded-xl border text-center text-xs space-y-2">
                              <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center mx-auto">
                                ✓
                              </div>
                              <p className="font-bold text-foreground">Absensi Hari Ini Lengkap</p>
                              <div className="grid grid-cols-2 gap-2 text-[10px] text-muted-foreground bg-card/50 p-2 rounded-lg border">
                                <div>
                                  <p className="font-bold text-foreground">Masuk</p>
                                  <p className="font-mono mt-0.5">
                                    {new Date(todayAttendance.clockIn).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                </div>
                                <div>
                                  <p className="font-bold text-foreground">Keluar</p>
                                  <p className="font-mono mt-0.5">
                                    {new Date(todayAttendance.clockOut).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Column 2: Log History */}
              <div className="lg:col-span-2 space-y-4">
                <Card>
                  <CardHeader className="pb-3 pt-4 px-4 border-b border-border/50">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <CardTitle className="text-sm font-bold">Riwayat Absensi</CardTitle>
                        <CardDescription className="text-[10px]">Catatan daftar kehadiran bulanan karyawan.</CardDescription>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                        {!isKasir && (
                          <div className="w-[150px]">
                            <ModernSelect
                              value={selectedEmployeeFilter}
                              onChange={(val) => setSelectedEmployeeFilter(val)}
                              options={[
                                { value: "all", label: "Semua Karyawan" },
                                ...employeesList.map(e => ({ value: e.id, label: e.name }))
                              ]}
                            />
                          </div>
                        )}
                        <div className="w-[120px]">
                          <Input 
                            type="month"
                            value={periodFilter}
                            onChange={(e) => setPeriodFilter(e.target.value)}
                            className="h-8 text-xs font-semibold bg-muted/20"
                          />
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    {attendanceLoading ? (
                      <div className="flex justify-center py-10">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table className="min-w-[650px]">
                          <TableHeader className="bg-muted/40">
                            <TableRow>
                              <TableHead className="py-2 text-xs">Tanggal</TableHead>
                              <TableHead className="py-2 text-xs">Nama Karyawan</TableHead>
                              <TableHead className="py-2 text-xs text-center">Clock In</TableHead>
                              <TableHead className="py-2 text-xs text-center">Clock Out</TableHead>
                              <TableHead className="py-2 text-xs text-center">Status</TableHead>
                              <TableHead className="py-2 text-xs">Keterangan</TableHead>
                              <TableHead className="w-[95px] text-center py-2 text-xs">Aksi</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {attendanceData.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground text-xs">
                                  Tidak ada catatan kehadiran pada periode ini.
                                </TableCell>
                              </TableRow>
                            ) : (
                              attendanceData.map((log: any) => {
                                const showAction = !isKasir
                                return (
                                  <TableRow key={log.id} className="hover:bg-muted/30">
                                    <TableCell className="py-2 text-[11px] font-semibold text-muted-foreground font-mono">
                                      {log.date}
                                    </TableCell>
                                    <TableCell className="py-2 text-xs font-semibold">
                                      <div>{log.employee?.name || "Karyawan Hapus"}</div>
                                      <div className="text-[9px] text-muted-foreground capitalize font-normal">{log.employee?.role}</div>
                                    </TableCell>
                                    <TableCell className="py-2 text-xs text-center">
                                      <div className="flex flex-col items-center justify-center gap-0.5">
                                        <span className="font-mono">
                                          {log.clockIn ? new Date(log.clockIn).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : "-"}
                                        </span>
                                        {log.photoIn && (
                                          <Button size="sm" variant="ghost" className="h-5 px-1 text-[9px] text-primary gap-0.5" onClick={() => setSelectedLogDetail({ ...log, viewPhotoType: 'in' })}>
                                            <Camera className="w-2.5 h-2.5" /> Foto
                                          </Button>
                                        )}
                                      </div>
                                    </TableCell>
                                    <TableCell className="py-2 text-xs text-center">
                                      <div className="flex flex-col items-center justify-center gap-0.5">
                                        <span className="font-mono">
                                          {log.clockOut ? new Date(log.clockOut).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : "-"}
                                        </span>
                                        {log.photoOut && (
                                          <Button size="sm" variant="ghost" className="h-5 px-1 text-[9px] text-primary gap-0.5" onClick={() => setSelectedLogDetail({ ...log, viewPhotoType: 'out' })}>
                                            <Camera className="w-2.5 h-2.5" /> Foto
                                          </Button>
                                        )}
                                      </div>
                                    </TableCell>
                                    <TableCell className="py-2 text-xs text-center">
                                      <span className={cn(
                                        "inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase",
                                        log.status === "HADIR" ? "bg-emerald-100 text-emerald-700" :
                                        log.status === "SAKIT" ? "bg-amber-100 text-amber-700" :
                                        log.status === "IZIN" ? "bg-blue-100 text-blue-700" : "bg-rose-100 text-rose-700"
                                      )}>
                                        {log.status}
                                      </span>
                                    </TableCell>
                                    <TableCell className="py-2 text-xs max-w-[150px] truncate text-muted-foreground" title={log.notes}>
                                      {log.notes || "-"}
                                    </TableCell>
                                    <TableCell className="py-2 text-center" onClick={e => e.stopPropagation()}>
                                      <div className="flex items-center justify-center gap-1">
                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-primary hover:bg-primary/10 rounded" title="Lihat Detail Foto & Lokasi" onClick={() => setSelectedLogDetail(log)}>
                                          <Eye className="h-3.5 w-3.5" />
                                        </Button>
                                        {showAction && (
                                          <>
                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-blue-600 hover:bg-blue-50 hover:text-blue-700 rounded" title="Edit Override Status" onClick={() => handleOpenEditAdminLog(log)}>
                                              <Edit2 className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-rose-500 hover:bg-rose-50 hover:text-rose-600 rounded" title="Hapus Catatan" onClick={() => handleDeleteAdminLog(log.id, log.employee?.name || "Karyawan", log.date)}>
                                              <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                          </>
                                        )}
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                )
                              })
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* TAB 5: TEKNISI */}
          {activeTab === "teknisi" && (
            <div className="space-y-4 text-left">
              {/* Filter */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    type="search" 
                    placeholder="Cari nama teknisi..." 
                    className="pl-8 bg-card text-xs md:text-sm h-9"
                    value={techSearchQuery}
                    onChange={(e) => setTechSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              {/* List Technicians */}
              <Card>
                <CardContent className="p-0">
                  <div className="rounded-md border bg-card">
                    {techListError ? (
                      <div className="text-center py-10">
                        <p className="text-destructive font-semibold mb-2">Gagal memuat data teknisi</p>
                        <p className="text-muted-foreground text-sm mb-4">{techListError.message}</p>
                        <Button onClick={() => mutateTechList()} variant="outline" size="sm">Coba Lagi</Button>
                      </div>
                    ) : techListLoading ? (
                      <div className="text-center py-10 text-muted-foreground">Memuat data teknisi...</div>
                    ) : !Array.isArray(techList) || techList.length === 0 ? (
                      <div className="text-center py-10 text-muted-foreground flex flex-col items-center gap-2">
                        <UserCog className="h-10 w-10 text-muted-foreground/30" />
                        <p className="text-sm">Belum ada data teknisi.</p>
                        {isOwner && localStorage.getItem('selectedStoreId') !== 'all' && (
                          <Button size="sm" variant="outline" className="mt-2 gap-1" onClick={openAddTechModal}>
                            <UserCheck className="h-4 w-4" /> Tambah Teknisi Pertama
                          </Button>
                        )}
                      </div>
                    ) : (
                      <>
                        {/* Mobile View */}
                        <div className="md:hidden flex flex-col divide-y">
                          {techList.map((t: any) => (
                            <div key={t.id} className="p-4 flex flex-col gap-3">
                              <div className="flex justify-between items-start">
                                <div className="flex items-start gap-3 flex-1 min-w-0 cursor-pointer" onClick={() => { if (isOwner && localStorage.getItem('selectedStoreId') !== 'all') openEditTechModal(t); }}>
                                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg shrink-0">
                                    {t.name.charAt(0).toUpperCase()}
                                  </div>
                                  <div className="min-w-0">
                                    <span className="font-bold text-sm flex items-center gap-1.5 leading-snug">
                                      {t.name}
                                      {t.isActive ? (
                                        <span className="h-2 w-2 rounded-full bg-emerald-500" title="Aktif" />
                                      ) : (
                                        <span className="h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-700" title="Tidak Aktif" />
                                      )}
                                    </span>
                                    <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                      <Phone className="h-3 w-3 shrink-0" /> {t.phone || <span className="italic text-amber-500">Belum diisi</span>}
                                      <span className="mx-1">•</span> Komisi: {t.commissionType === 'percentage' ? `${t.commissionValue || 0}%` : `Rp ${(t.commissionValue || 0).toLocaleString('id-ID')}`}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <Button variant="outline" size="icon" className="h-8 w-8 text-indigo-650 border-indigo-200 bg-indigo-50 hover:bg-indigo-100 rounded-full" title="Riwayat Komisi" onClick={() => { setSelectedTechForCommissions(t); setShowTechCommissionsModal(true); }}>
                                    <Wallet className="h-3.5 w-3.5" />
                                  </Button>
                                  {isOwner && localStorage.getItem('selectedStoreId') !== 'all' && (
                                    <Button variant="outline" size="icon" className="h-8 w-8 text-blue-605 border-blue-200 bg-blue-50 hover:bg-blue-100 rounded-full" onClick={() => openEditTechModal(t)}>
                                      <Edit2 className="h-3.5 w-3.5" />
                                    </Button>
                                  )}
                                  <Button variant="outline" size="icon" className="h-8 w-8 text-emerald-605 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 rounded-full" onClick={() => handleTechWA(t)} disabled={!t.phone}>
                                    <MessageCircle className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>

                              <div className="grid grid-cols-4 gap-2 mt-1 bg-muted/40 p-2.5 rounded-xl border border-border/50">
                                <div>
                                  <p className="text-[10px] uppercase text-muted-foreground font-bold font-mono">Total Servis</p>
                                  <p className="font-bold text-xs mt-0.5">{t.totalServices || 0}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] uppercase text-muted-foreground font-bold font-mono">Selesai</p>
                                  <p className="font-bold text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">{t.completedServices || 0}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] uppercase text-muted-foreground font-bold font-mono">Skor CSAT</p>
                                  <p className="font-bold text-xs mt-0.5 flex items-center gap-0.5">
                                    {t.averageRating ? (
                                      <>
                                        <Star className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0" />
                                        <span>{Number(t.averageRating).toFixed(1)}</span>
                                        <span className="text-[9px] text-muted-foreground font-normal">({t.totalRatings})</span>
                                      </>
                                    ) : (
                                      <span className="text-muted-foreground font-normal">-</span>
                                    )}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-[10px] uppercase text-muted-foreground font-bold font-mono text-indigo-600">Komisi Pending</p>
                                  <p className="font-bold text-xs mt-0.5 text-indigo-600">{t.unpaidCommissions > 0 ? formatCurrency(t.unpaidCommissions) : <span className="text-muted-foreground font-normal">-</span>}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Desktop View */}
                        <div className="hidden md:block overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="text-xs">Nama Teknisi</TableHead>
                                <TableHead className="text-xs">Kontak</TableHead>
                                <TableHead className="text-center text-xs">Status</TableHead>
                                <TableHead className="text-center text-xs">Skema Komisi</TableHead>
                                <TableHead className="text-center text-xs">Total Servis</TableHead>
                                <TableHead className="text-center text-xs">Selesai</TableHead>
                                <TableHead className="text-center text-xs">Skor CSAT</TableHead>
                                <TableHead className="text-center text-indigo-650 font-semibold text-xs">Komisi Pending</TableHead>
                                <TableHead className="text-center text-xs">Aksi</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {techList.map((t: any) => (
                                <TableRow key={t.id} className="cursor-pointer hover:bg-muted/50" onClick={() => {
                                  if (isOwner && localStorage.getItem('selectedStoreId') !== 'all') openEditTechModal(t);
                                }}>
                                  <TableCell className="py-2.5">
                                    <div className="flex items-center gap-3">
                                      <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                                        {t.name.charAt(0).toUpperCase()}
                                      </div>
                                      <div>
                                        <div className="font-bold text-sm">{t.name}</div>
                                        <div className="text-[10px] text-muted-foreground font-normal mt-0.5">
                                          Mulai: {t.createdAt ? new Date(t.createdAt).toLocaleDateString('id-ID') : '-'}
                                        </div>
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell className="py-2.5">
                                    <div className="flex items-center gap-1.5 text-xs font-normal">
                                      <Phone className="h-3 w-3 text-muted-foreground" /> {t.phone || <span className="italic text-amber-500">Belum diisi</span>}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-center py-2.5">
                                    {t.isActive ? (
                                      <span className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-2 py-0.5 rounded-full text-[10px] font-bold">AKTIF</span>
                                    ) : (
                                      <span className="bg-slate-100 text-slate-500 border border-slate-200 dark:bg-slate-900/50 dark:text-slate-500 dark:border-slate-800 px-2 py-0.5 rounded-full text-[10px] font-bold">NONAKTIF</span>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-center py-2.5 text-xs font-normal">
                                    {t.commissionType === 'percentage' ? `${t.commissionValue || 0}%` : `Rp ${(t.commissionValue || 0).toLocaleString('id-ID')}`}
                                  </TableCell>
                                  <TableCell className="text-center py-2.5 font-medium text-xs">
                                    {t.totalServices || 0}
                                  </TableCell>
                                  <TableCell className="text-center py-2.5 font-semibold text-emerald-600 dark:text-emerald-400 text-xs">
                                    {t.completedServices || 0}
                                  </TableCell>
                                  <TableCell className="text-center py-2.5 font-bold text-xs">
                                    {t.averageRating ? (
                                      <div className="flex items-center justify-center gap-1">
                                        <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                                        <span>{Number(t.averageRating).toFixed(1)}</span>
                                        <span className="text-[9px] text-muted-foreground font-normal">({t.totalRatings || 0})</span>
                                      </div>
                                    ) : (
                                      <span className="text-muted-foreground text-[10px] font-normal">-</span>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-center py-2.5 text-xs">
                                    {t.unpaidCommissions > 0 ? (
                                      <span className="font-bold text-indigo-600">{formatCurrency(t.unpaidCommissions)}</span>
                                    ) : (
                                      <span className="text-muted-foreground text-[10px]">-</span>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-center py-2.5" onClick={(e) => e.stopPropagation()}>
                                    <div className="flex items-center justify-center gap-1">
                                      <Button variant="outline" size="icon" className="h-7 w-7 text-indigo-600 border-indigo-200 bg-indigo-50 hover:bg-indigo-100 rounded-full" title="Riwayat Komisi" onClick={() => { setSelectedTechForCommissions(t); setShowTechCommissionsModal(true); }}>
                                        <Wallet className="h-3 w-3" />
                                      </Button>
                                      <Button variant="outline" size="sm" className="h-7 gap-1 text-emerald-600 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-700 rounded-full px-2.5" onClick={() => handleTechWA(t)} disabled={!t.phone}>
                                        <MessageCircle className="h-3 w-3" /> WA
                                      </Button>
                                      {isOwner && canWrite && localStorage.getItem('selectedStoreId') !== 'all' && (
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10 rounded-full" onClick={() => handleDeleteTech(t)}>
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      )}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
      {isEmployeeModalOpen && createPortal(
        <div className="fixed inset-0 z-50 bg-background/80 flex items-center justify-center p-3 md:p-4">
          <div className="bg-card w-full max-w-md rounded-xl shadow-lg border p-4 md:p-6 animate-in fade-in zoom-in-95 duration-200 text-left">
            <h3 className="text-base md:text-lg font-bold mb-4">{editingEmployee ? "Edit Gaji & Profil Karyawan" : "Tambah Karyawan Baru"}</h3>
            <form onSubmit={handleSubmitEmployee} className="space-y-4 text-xs md:text-sm">
              <div className="space-y-1.5">
                <label className="font-semibold text-muted-foreground">Nama Lengkap</label>
                <Input value={employeeForm.name} onChange={e => setEmployeeForm(prev => ({ ...prev, name: e.target.value }))} placeholder="Nama lengkap karyawan" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-semibold text-muted-foreground">Nomor HP</label>
                  <Input value={employeeForm.phone} onChange={e => setEmployeeForm(prev => ({ ...prev, phone: e.target.value }))} placeholder="Contoh: 0812..." />
                </div>
                <div className="space-y-1.5">
                  <label className="font-semibold text-muted-foreground">Email</label>
                  <Input type="email" value={employeeForm.email} onChange={e => setEmployeeForm(prev => ({ ...prev, email: e.target.value }))} placeholder="email@toko.com" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="font-semibold text-muted-foreground">Jabatan / Role Karyawan</label>
                <ModernSelect
                  value={employeeForm.role}
                  onChange={val => setEmployeeForm(prev => ({ ...prev, role: val }))}
                  options={[
                    { value: "Kasir", label: "Kasir" },
                    { value: "Teknisi", label: "Teknisi" },
                    { value: "Manager", label: "Manager" },
                    { value: "Lainnya", label: "Lainnya" }
                  ]}
                />
              </div>
              {selectedStoreId === "all" && (
                <div className="space-y-1.5">
                  <label className="font-semibold text-muted-foreground">Penugasan Cabang</label>
                  <ModernSelect
                    value={employeeForm.storeId}
                    onChange={val => setEmployeeForm(prev => ({ ...prev, storeId: val }))}
                    options={[
                      { value: "", label: "Pilih Cabang" },
                      ...(branches || []).map(b => ({ value: b.id, label: b.name }))
                    ]}
                  />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-semibold text-muted-foreground">Hubungkan Akun User</label>
                  <ModernSelect
                    value={employeeForm.userId}
                    onChange={val => setEmployeeForm(prev => ({ ...prev, userId: val }))}
                    options={[
                      { value: "", label: "Tidak Dihubungkan" },
                      ...(storeUsers || []).map(u => ({ value: u.id, label: `${u.name} (${u.email})` }))
                    ]}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-semibold text-muted-foreground">Hubungkan Teknisi</label>
                  <ModernSelect
                    value={employeeForm.technicianId}
                    onChange={val => setEmployeeForm(prev => ({ ...prev, technicianId: val }))}
                    options={[
                      { value: "", label: "Tidak Dihubungkan" },
                      ...(technicians || []).map(t => ({ value: t.id, label: t.name }))
                    ]}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-semibold text-muted-foreground">Gaji Pokok (IDR)</label>
                  <Input type="number" value={employeeForm.basicSalary} onChange={e => setEmployeeForm(prev => ({ ...prev, basicSalary: e.target.value }))} placeholder="Contoh: 3000000" />
                </div>
                <div className="space-y-1.5">
                  <label className="font-semibold text-muted-foreground">Tunjangan Makan/Trans (IDR)</label>
                  <Input type="number" value={employeeForm.allowance} onChange={e => setEmployeeForm(prev => ({ ...prev, allowance: e.target.value }))} placeholder="Contoh: 500000" />
                </div>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <input type="checkbox" id="empIsActive" checked={employeeForm.isActive} onChange={e => setEmployeeForm(prev => ({ ...prev, isActive: e.target.checked }))} className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4" />
                <label htmlFor="empIsActive" className="font-semibold text-muted-foreground">Status Karyawan Aktif</label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setIsEmployeeModalOpen(false)}>Batal</Button>
                <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Menyimpan..." : "Simpan Karyawan"}</Button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL 2: CATAT KASBON */}
      {isLoanModalOpen && createPortal(
        <div className="fixed inset-0 z-50 bg-background/80 flex items-center justify-center p-3 md:p-4">
          <div className="bg-card w-full max-w-sm rounded-xl shadow-lg border p-4 md:p-6 animate-in fade-in zoom-in-95 duration-200 text-left">
            <h3 className="text-base md:text-lg font-bold mb-4">Catat Pinjaman Kasbon Baru</h3>
            <form onSubmit={handleSubmitLoan} className="space-y-4 text-xs md:text-sm">
              <div className="space-y-1.5">
                <label className="font-semibold text-muted-foreground">Pilih Karyawan</label>
                <ModernSelect
                  value={loanForm.employeeId}
                  onChange={val => setLoanForm(prev => ({ ...prev, employeeId: val }))}
                  options={[
                    { value: "", label: "Pilih Karyawan" },
                    ...employeesList.filter(e => e.isActive).map(e => ({ value: e.id, label: `${e.name} (${e.role})` }))
                  ]}
                />
              </div>
              <div className="space-y-1.5">
                <label className="font-semibold text-muted-foreground">Nominal Kasbon (IDR)</label>
                <Input 
                  value={loanForm.amount} 
                  onChange={e => {
                    const digits = e.target.value.replace(/\D/g, "")
                    setLoanForm(prev => ({ ...prev, amount: digits ? parseInt(digits, 10).toLocaleString('id-ID') : "" }))
                  }} 
                  placeholder="Jumlah pinjaman, contoh: 500.000" 
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-semibold text-muted-foreground">Tanggal Pinjam</label>
                  <Input type="date" value={loanForm.loanDate} onChange={e => setLoanForm(prev => ({ ...prev, loanDate: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <label className="font-semibold text-muted-foreground">Metode Bayar (Kas Keluar)</label>
                  <ModernSelect
                    value={loanForm.paymentMethod}
                    onChange={val => setLoanForm(prev => ({ ...prev, paymentMethod: val }))}
                    options={[
                      { value: "Cash", label: "Cash (Kas Toko)" },
                      { value: "Transfer Bank", label: "Transfer Bank" }
                    ]}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="font-semibold text-muted-foreground">Alasan Pinjaman</label>
                <textarea 
                  value={loanForm.description} 
                  onChange={e => setLoanForm(prev => ({ ...prev, description: e.target.value }))} 
                  placeholder="Keterangan singkat..."
                  className="w-full min-h-[60px] rounded-md border border-input bg-transparent px-3 py-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setIsLoanModalOpen(false)}>Batal</Button>
                <Button type="submit" className="bg-amber-500 hover:bg-amber-600 text-white font-semibold" disabled={isSubmitting}>{isSubmitting ? "Memproses..." : "Konfirmasi & Potong Kas"}</Button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL 3: GENERASI GAJI BULANAN */}
      {isPayrollModalOpen && createPortal(
        <div className="fixed inset-0 z-50 bg-background/80 flex items-center justify-center p-3 md:p-4">
          <div className="bg-card w-full max-w-md rounded-xl shadow-lg border p-4 md:p-6 animate-in fade-in zoom-in-95 duration-200 text-left">
            <h3 className="text-base md:text-lg font-bold mb-4">Generasi Slip Gaji Karyawan</h3>
            <form onSubmit={handleSubmitPayroll} className="space-y-4 text-xs md:text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-semibold text-muted-foreground">Bulan/Periode</label>
                  <Input value={payrollForm.period} readOnly className="bg-muted/40 font-mono text-center font-bold" />
                </div>
                <div className="space-y-1.5">
                  <label className="font-semibold text-muted-foreground">Pilih Karyawan</label>
                  <ModernSelect
                    value={payrollForm.employeeId}
                    onChange={val => handleSelectEmployeeForPayroll(val)}
                    options={[
                      { value: "", label: "Pilih Karyawan" },
                      ...employeesList.filter(e => e.isActive).map(e => ({ value: e.id, label: `${e.name} (${e.role})` }))
                    ]}
                  />
                </div>
              </div>

              {isCalculating ? (
                <div className="flex flex-col items-center justify-center py-10 space-y-2">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  <span className="text-[10px] text-muted-foreground font-medium">Mengkalkulasi komisi & kasbon...</span>
                </div>
              ) : payrollForm.employeeId ? (
                <>
                  <div className="bg-muted/30 p-3 rounded-lg border text-xs space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Gaji Pokok:</span>
                      <span className="font-semibold">{formatCurrency(payrollForm.basicSalary)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tunjangan:</span>
                      <span className="font-semibold">{formatCurrency(payrollForm.allowance)}</span>
                    </div>
                    {attendanceSummary && (
                      <div className="flex justify-between text-muted-foreground text-[10px] bg-muted/20 p-1.5 rounded border border-border/40">
                        <span>Riwayat Kehadiran:</span>
                        <span className="font-bold">
                          Hadir: {attendanceSummary.hadirDays} | Sakit: {attendanceSummary.sakitDays} | Izin: {attendanceSummary.izinDays} | Alfa: {attendanceSummary.alfaDays} ({attendanceSummary.totalWorkDays} hari)
                        </span>
                      </div>
                    )}
                    {payrollForm.commissions > 0 && (
                      <div className="flex justify-between text-indigo-600">
                        <span>Komisi Servis (Unpaid):</span>
                        <span className="font-bold">+{formatCurrency(payrollForm.commissions)}</span>
                      </div>
                    )}
                    {payrollForm.commissions === 0 && attendanceSummary && (
                      <div className="text-[10px] text-muted-foreground italic bg-muted/30 p-1.5 rounded border border-border/40">
                        ℹ️ Komisi servis ditarik otomatis dari Service Order berstatus &ldquo;Diambil&rdquo; yang belum dibayarkan.
                      </div>
                    )}
                    {suggestedDeduction > 0 && (
                      <div className="flex justify-between text-rose-500 font-semibold">
                        <span>Sisa Kasbon Terutang:</span>
                        <span>{formatCurrency(suggestedDeduction)}</span>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="font-semibold text-muted-foreground">Uang Lembur / Bonus</label>
                      <Input type="number" value={payrollForm.overtime} onChange={e => setPayrollForm(prev => ({ ...prev, overtime: e.target.value }))} placeholder="Lemburan, contoh: 200000" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="font-semibold text-rose-600">Potongan Gaji / Kasbon</label>
                      <Input type="number" value={payrollForm.deductions} onChange={e => setPayrollForm(prev => ({ ...prev, deductions: e.target.value }))} placeholder="Potongan, contoh: 500000" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-muted-foreground">Catatan Slip</label>
                    <Input value={payrollForm.notes} onChange={e => setPayrollForm(prev => ({ ...prev, notes: e.target.value }))} placeholder="Catatan opsional..." />
                  </div>

                  <div className="bg-primary/5 p-3 rounded-lg border border-primary/20 flex justify-between items-center mt-3">
                    <span className="font-semibold text-primary">Total Estimasi Net Gaji:</span>
                    <span className="text-base font-extrabold text-primary">
                      {formatCurrency(
                        (payrollForm.basicSalary + payrollForm.allowance + payrollForm.commissions + (Number(payrollForm.overtime) || 0)) - (Number(payrollForm.deductions) || 0)
                      )}
                    </span>
                  </div>
                </>
              ) : null}

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setIsPayrollModalOpen(false)}>Batal</Button>
                <Button type="submit" disabled={isSubmitting || !payrollForm.employeeId}>{isSubmitting ? "Memproses..." : "Generasi Slip"}</Button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL 4: PAYOUT SALARY CONFIRMATION */}
      {payoutSlip && createPortal(
        <div className="fixed inset-0 z-50 bg-background/80 flex items-center justify-center p-3 md:p-4">
          <div className="bg-card w-full max-w-sm rounded-xl shadow-lg border p-4 md:p-6 animate-in fade-in zoom-in-95 duration-200 text-left">
            <h3 className="text-base md:text-lg font-bold mb-3">Cairkan Pembayaran Gaji</h3>
            <form onSubmit={handlePayoutSalary} className="space-y-4 text-xs md:text-sm">
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded-lg space-y-1">
                <p className="text-[10px] uppercase font-bold text-emerald-600/70">Karyawan & Periode</p>
                <p className="font-extrabold text-sm">{payoutSlip.employee?.name}</p>
                <p className="text-xs">Periode Gaji: <strong>{payoutSlip.period}</strong></p>
                <div className="pt-2 mt-2 border-t border-emerald-500/20 flex justify-between items-center">
                  <span className="font-semibold">Jumlah Cair:</span>
                  <span className="text-base font-black">{formatCurrency(payoutSlip.netSalary)}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-muted-foreground">Pilih Metode Pembayaran</label>
                <ModernSelect
                  value={payoutMethod}
                  onChange={val => setPayoutMethod(val)}
                  options={[
                    { value: "Cash", label: "Cash (Kas Toko)" },
                    { value: "Transfer Bank", label: "Transfer Bank" }
                  ]}
                />
              </div>

              <p className="text-[10px] text-muted-foreground">Pembayaran ini akan dicatat sebagai beban operasional (Beban Gaji & Komisi) di jurnal cabang aktif.</p>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setPayoutSlip(null)}>Batal</Button>
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold" disabled={isSubmitting}>{isSubmitting ? "Mencairkan..." : "Konfirmasi Pembayaran"}</Button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL 5: ADMIN MANUAL ABSENSI OVERRIDE */}
      {isAdminLogModalOpen && createPortal(
        <div className="fixed inset-0 z-50 bg-background/80 flex items-center justify-center p-3 md:p-4">
          <div className="bg-card w-full max-w-sm rounded-xl shadow-lg border p-4 md:p-6 animate-in fade-in zoom-in-95 duration-200 text-left">
            <h3 className="text-base md:text-lg font-bold mb-4">
              {adminLogForm.id ? "Pembaruan Absensi (Override)" : "Catat Kehadiran Manual Staff"}
            </h3>
            <form onSubmit={handleSubmitAdminLog} className="space-y-4 text-xs md:text-sm">
              <div className="space-y-1.5">
                <label className="font-semibold text-muted-foreground">Pilih Karyawan</label>
                <ModernSelect
                  value={adminLogForm.employeeId}
                  onChange={val => setAdminLogForm(prev => ({ ...prev, employeeId: val }))}
                  disabled={!!adminLogForm.id}
                  options={[
                    { value: "", label: "Pilih Karyawan" },
                    ...employeesList.filter(e => e.isActive).map(e => ({ value: e.id, label: `${e.name} (${e.role})` }))
                  ]}
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-muted-foreground">Tanggal Absensi</label>
                <Input
                  type="date"
                  value={adminLogForm.date}
                  onChange={e => setAdminLogForm(prev => ({ ...prev, date: e.target.value }))}
                  disabled={!!adminLogForm.id}
                  className="bg-muted/10 h-8"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-muted-foreground">Status Kehadiran</label>
                <ModernSelect
                  value={adminLogForm.status}
                  onChange={val => setAdminLogForm(prev => ({ ...prev, status: val }))}
                  options={[
                    { value: "HADIR", label: "HADIR" },
                    { value: "SAKIT", label: "SAKIT" },
                    { value: "IZIN", label: "IZIN" },
                    { value: "ALFA", label: "ALFA" }
                  ]}
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-muted-foreground">Catatan / Alasan</label>
                <textarea
                  value={adminLogForm.notes}
                  onChange={e => setAdminLogForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Keterangan override status atau sakit/izin..."
                  className="w-full min-h-[65px] rounded-md border border-input bg-transparent px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setIsAdminLogModalOpen(false)}>Batal</Button>
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold" disabled={isSubmitting}>
                  {isSubmitting ? "Menyimpan..." : "Simpan Override"}
                </Button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL 6: LOG ATTENDANCE DETAILS VIEW */}
      {selectedLogDetail && createPortal(
        <div className="fixed inset-0 z-50 bg-background/80 flex items-center justify-center p-3 md:p-4" onClick={() => setSelectedLogDetail(null)}>
          <div className="bg-card w-full max-w-md rounded-xl shadow-lg border p-4 md:p-6 animate-in fade-in zoom-in-95 duration-200 text-left relative" onClick={e => e.stopPropagation()}>
            <h3 className="text-base md:text-lg font-bold border-b pb-2 mb-3">Detail Kehadiran</h3>
            
            <div className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-muted/20 p-2.5 rounded-lg">
                <div>
                  <p className="text-[10px] text-muted-foreground font-bold">Karyawan</p>
                  <p className="font-semibold text-foreground">{selectedLogDetail.employee?.name || "Karyawan Hapus"}</p>
                  <p className="text-[9px] text-muted-foreground capitalize">{selectedLogDetail.employee?.role}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground font-bold">Tanggal</p>
                  <p className="font-semibold text-foreground font-mono">{selectedLogDetail.date}</p>
                  <span className={cn(
                    "inline-flex items-center px-1 py-0.5 rounded text-[8px] font-bold uppercase mt-1",
                    selectedLogDetail.status === "HADIR" ? "bg-emerald-100 text-emerald-700" :
                    selectedLogDetail.status === "SAKIT" ? "bg-amber-100 text-amber-700" :
                    selectedLogDetail.status === "IZIN" ? "bg-blue-100 text-blue-700" : "bg-rose-100 text-rose-700"
                  )}>
                    {selectedLogDetail.status}
                  </span>
                </div>
              </div>

              {selectedLogDetail.notes && (
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground mb-0.5">Catatan:</p>
                  <p className="p-2 bg-muted/30 border rounded-lg text-foreground italic">{selectedLogDetail.notes}</p>
                </div>
              )}

              {/* Grid Clock In and Clock Out */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Clock In info */}
                <div className="space-y-2">
                  <h4 className="font-bold text-foreground border-b pb-1 flex items-center gap-1.5 text-[10px] uppercase text-emerald-600 dark:text-emerald-500">
                    <Clock className="w-3 h-3" /> Clock In
                  </h4>
                  <p className="font-medium text-muted-foreground">
                    Jam: <span className="font-mono font-bold text-foreground">{selectedLogDetail.clockIn ? new Date(selectedLogDetail.clockIn).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : "-"}</span>
                  </p>
                  {selectedLogDetail.photoIn ? (
                    <div className="aspect-[4/3] w-full rounded-lg overflow-hidden border bg-muted shadow-sm">
                      <img src={selectedLogDetail.photoIn} alt="Clock In" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="aspect-[4/3] w-full rounded-lg border border-dashed flex items-center justify-center text-muted-foreground text-[10px]">
                      Tidak ada foto
                    </div>
                  )}
                  {selectedLogDetail.locationIn && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${selectedLogDetail.locationIn}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] text-blue-600 dark:text-blue-400 hover:underline font-medium mt-1.5"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      Lokasi: {selectedLogDetail.locationIn} (Map ↗)
                    </a>
                  )}
                </div>

                {/* Clock Out info */}
                <div className="space-y-2">
                  <h4 className="font-bold text-foreground border-b pb-1 flex items-center gap-1.5 text-[10px] uppercase text-rose-600 dark:text-rose-500">
                    <Clock className="w-3 h-3" /> Clock Out
                  </h4>
                  <p className="font-medium text-muted-foreground">
                    Jam: <span className="font-mono font-bold text-foreground">{selectedLogDetail.clockOut ? new Date(selectedLogDetail.clockOut).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : "-"}</span>
                  </p>
                  {selectedLogDetail.photoOut ? (
                    <div className="aspect-[4/3] w-full rounded-lg overflow-hidden border bg-muted shadow-sm">
                      <img src={selectedLogDetail.photoOut} alt="Clock Out" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="aspect-[4/3] w-full rounded-lg border border-dashed flex items-center justify-center text-muted-foreground text-[10px]">
                      Tidak ada foto
                    </div>
                  )}
                  {selectedLogDetail.locationOut && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${selectedLogDetail.locationOut}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] text-blue-600 dark:text-blue-400 hover:underline font-medium mt-1.5"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      Lokasi: {selectedLogDetail.locationOut} (Map ↗)
                    </a>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 mt-4 border-t">
              <Button type="button" onClick={() => setSelectedLogDetail(null)}>Tutup Detail</Button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL 7: ADD/EDIT TECHNICIAN */}
      {showTechModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200 text-left" onClick={() => setShowTechModal(false)}>
          <div className="bg-card w-full max-w-md rounded-t-2xl sm:rounded-2xl border shadow-2xl p-5 space-y-4 animate-in slide-in-from-bottom-4 duration-300" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold">{editingTechnician ? "Edit Teknisi" : "Tambah Teknisi Baru"}</h3>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setShowTechModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-3 text-xs md:text-sm">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground/80">Nama Teknisi <span className="text-destructive">*</span></label>
                <Input placeholder="e.g. Ahmad Suherman" value={techFormName} onChange={(e) => setTechFormName(e.target.value)} className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground/80">Nomor Telepon / WA</label>
                <Input placeholder="e.g. 08123456789" value={techFormPhone} onChange={(e) => setTechFormPhone(e.target.value)} className="h-9 text-sm" type="tel" />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground/80">Tipe Komisi</label>
                  <select 
                    value={techFormCommissionType} 
                    onChange={(e) => setTechFormCommissionType(e.target.value)} 
                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus:ring-primary focus:border-primary"
                  >
                    <option value="percentage">Persentase (%)</option>
                    <option value="fixed">Nominal Tetap (Rp)</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground/80">
                    {techFormCommissionType === 'percentage' ? 'Persentase (%)' : 'Nominal Komisi (Rp)'}
                  </label>
                  <Input 
                    type="number" 
                    min="0"
                    placeholder={techFormCommissionType === 'percentage' ? 'e.g. 30' : 'e.g. 50000'}
                    value={techFormCommissionValue} 
                    onChange={(e) => setTechFormCommissionValue(e.target.value)} 
                    className="h-9 text-sm" 
                  />
                </div>
              </div>
              
              <div className="flex items-center gap-2 pt-2">
                <input 
                  type="checkbox" 
                  id="tech-active-checkbox" 
                  checked={techFormIsActive} 
                  onChange={(e) => setTechFormIsActive(e.target.checked)} 
                  className="rounded border-input text-primary focus:ring-primary h-4.5 w-4.5"
                />
                <label htmlFor="tech-active-checkbox" className="text-xs font-semibold select-none cursor-pointer">Teknisi Aktif (Bisa ditugaskan pekerjaan servis)</label>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setShowTechModal(false)}>Batal</Button>
              <Button className="flex-1 rounded-xl font-bold bg-primary hover:bg-primary/90" onClick={handleSubmitTech} disabled={techSubmitting}>
                {techSubmitting ? "Menyimpan..." : (editingTechnician ? "Simpan" : "Tambah")}
              </Button>
            </div>

            {editingTechnician && isOwner && (
              <Button variant="ghost" className="w-full text-destructive hover:bg-destructive/10 text-xs h-8 rounded-xl" onClick={() => { setShowTechModal(false); handleDeleteTech(editingTechnician); }}>
                <Trash2 className="h-3.5 w-3.5 mr-1" /> Hapus Teknisi Ini
              </Button>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* MODAL 8: RIWAYAT KOMISI TEKNISI */}
      {showTechCommissionsModal && selectedTechForCommissions && createPortal(
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 text-left" onClick={() => setShowTechCommissionsModal(false)}>
          <div className="bg-card w-full max-w-2xl rounded-t-2xl sm:rounded-2xl border shadow-2xl flex flex-col max-h-[85vh] animate-in slide-in-from-bottom-4 duration-300" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start p-5 border-b shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-bold text-sm shrink-0">
                    {selectedTechForCommissions.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-base font-bold leading-tight">{selectedTechForCommissions.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      Skema: <span className="font-semibold text-indigo-650">{selectedTechForCommissions.commissionType === 'percentage' ? `${selectedTechForCommissions.commissionValue || 0}% dari servis bersih` : `Rp ${(selectedTechForCommissions.commissionValue || 0).toLocaleString('id-ID')} / pekerjaan`}</span>
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {selectedTechForCommissions.unpaidCommissions > 0 && (
                  <div className="text-right">
                    <p className="text-[10px] font-bold uppercase text-muted-foreground">Komisi Pending</p>
                    <p className="text-sm font-extrabold text-indigo-605">{formatCurrency(selectedTechForCommissions.unpaidCommissions)}</p>
                  </div>
                )}
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setShowTechCommissionsModal(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="overflow-y-auto flex-1 p-1">
              {isLoadingCommissions ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
                </div>
              ) : !Array.isArray(techCommissions) || techCommissions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Wallet className="h-10 w-10 text-muted-foreground/30 mb-2" />
                  <p className="text-sm">Belum ada riwayat komisi.</p>
                  <p className="text-xs mt-1">Komisi akan muncul setelah servis berstatus "Diambil".</p>
                </div>
              ) : (
                <div className="divide-y">
                  {(techCommissions as any[]).map((c) => (
                    <div key={c.id} className="p-4 hover:bg-muted/30 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold",
                              c.status === 'PAID' ? "bg-emerald-100 text-emerald-700" : "bg-indigo-100 text-indigo-700"
                            )}>
                              {c.status === 'PAID' ? <CheckCircle className="h-3 w-3" /> : <Wallet className="h-3 w-3" />}
                              {c.status === 'PAID' ? 'Dibayar' : 'Pending'}
                            </span>
                            <span className="text-xs text-muted-foreground font-mono">
                              {c.createdAt ? new Date(c.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                            </span>
                          </div>
                          <p className="font-bold text-sm mt-1.5 truncate">
                            {c.serviceDevice || 'Perangkat tidak diketahui'}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            Pelanggan: {c.customerName || '-'} {c.serviceIssue ? `• ${c.serviceIssue}` : ''}
                          </p>
                          <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
                            <span>Total Servis: <span className="font-semibold text-foreground">{formatCurrency(c.serviceAmount)}</span></span>
                            {c.partsAmount > 0 && (
                              <span>Sparepart: <span className="font-semibold text-rose-500">-{formatCurrency(c.partsAmount)}</span></span>
                            )}
                          </div>
                          {c.paidAt && (
                            <p className="text-[10px] text-emerald-600 mt-1">
                              Dibayarkan: {new Date(c.paidAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
                            </p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[10px] uppercase text-muted-foreground font-bold">Komisi</p>
                          <p className={cn(
                            "text-base font-extrabold mt-0.5",
                            c.status === 'PAID' ? "text-emerald-600" : "text-indigo-600"
                          )}>
                            +{formatCurrency(c.commissionAmount)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t shrink-0 flex justify-end">
              <Button variant="outline" className="rounded-xl" onClick={() => setShowTechCommissionsModal(false)}>Tutup</Button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {dialog}
    </>
  )
}
export default Payroll
