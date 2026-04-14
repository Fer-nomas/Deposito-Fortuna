'use client'

import { DashboardShell } from '@/components/layout/dashboard-shell'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn, formatDateTime } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'
import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ClipboardList,
  Plus,
  Search,
  X,
  Eye,
  Check,
  XCircle,
  PackageCheck,
  ArrowRight,
  Trash2,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Ban,
  Truck,
  Filter,
} from 'lucide-react'
import { ProductSearchSelect } from '@/components/ui/product-search-select'

// Types
interface PuntoStock {
  id: string
  nombre: string
  codigo: string
  color: string | null
  puedeAprobar: boolean
  tipo?: string
}

interface Producto {
  id: string
  codigo: string
  descripcion: string
}

interface SolicitudDetalle {
  id: string
  productoId: string
  cantidadSolicitada: number
  cantidadAprobada: number | null
  observacion: string | null
  producto: Producto
}

interface Solicitud {
  id: string
  numero: string
  tipo: string
  estado: string
  prioridad: string
  observacionSolicitud: string | null
  observacionRespuesta: string | null
  fechaSolicitud: string
  fechaRespuesta: string | null
  fechaEntrega: string | null
  solicitante: { id: string; nombre: string; email?: string }
  puntoOrigen: PuntoStock
  puntoDestino: PuntoStock
  aprobadoPor: { id: string; nombre: string } | null
  detalles: SolicitudDetalle[]
  movimientos?: any[]
  ticketNumero?: string
}

interface DetalleForm {
  productoId: string
  cantidadSolicitada: number
}

type TabEstado = '' | 'pendiente' | 'aprobada' | 'rechazada' | 'entregada'

const ESTADOS: { label: string; value: TabEstado; icon: React.ReactNode }[] = [
  { label: 'Todas', value: '', icon: <ClipboardList className="w-4 h-4" /> },
  { label: 'Pendientes', value: 'pendiente', icon: <Clock className="w-4 h-4" /> },
  { label: 'Aprobadas', value: 'aprobada', icon: <CheckCircle2 className="w-4 h-4" /> },
  { label: 'Rechazadas', value: 'rechazada', icon: <Ban className="w-4 h-4" /> },
  { label: 'Entregadas', value: 'entregada', icon: <Truck className="w-4 h-4" /> },
]

const TIPOS_SOLICITUD = [
  { value: 'pedido', label: 'Pedido de materiales' },
  { value: 'envio', label: 'Envio de productos' },
  { value: 'devolucion', label: 'Devolucion' },
  { value: 'transferencia', label: 'Transferencia' },
]

const PRIORIDADES = [
  { value: 'baja', label: 'Baja', color: 'bg-gray-500/10 text-gray-400 border-gray-500/20' },
  { value: 'normal', label: 'Normal', color: 'bg-blue-50 text-blue-600 border-blue-500/20' },
  { value: 'alta', label: 'Alta', color: 'bg-orange-500/10 text-orange-600 border-orange-500/20' },
  { value: 'urgente', label: 'Urgente', color: 'bg-red-50 text-red-500 border-red-500/20' },
]

function getEstadoBadge(estado: string) {
  switch (estado) {
    case 'pendiente':
      return <Badge variant="warning">Pendiente</Badge>
    case 'aprobada':
      return <Badge variant="success">Aprobada</Badge>
    case 'rechazada':
      return <Badge variant="danger">Rechazada</Badge>
    case 'entregada':
      return <Badge variant="info">Entregada</Badge>
    case 'cancelada':
      return <Badge variant="default">Cancelada</Badge>
    default:
      return <Badge variant="default">{estado}</Badge>
  }
}

function getPrioridadBadge(prioridad: string) {
  const p = PRIORIDADES.find((x) => x.value === prioridad)
  if (!p) return <Badge variant="default">{prioridad}</Badge>
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        p.color
      )}
    >
      {prioridad === 'urgente' && <AlertTriangle className="w-3 h-3" />}
      {p.label}
    </span>
  )
}

function getTipoLabel(tipo: string) {
  return TIPOS_SOLICITUD.find((t) => t.value === tipo)?.label || tipo
}

// Modal overlay
function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  wide?: boolean
}) {
  if (!open) return null
  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          className={cn(
            'relative z-10 w-full rounded-xl border border-gray-200 bg-white shadow-2xl max-h-[90vh] overflow-y-auto',
            wide ? 'max-w-3xl' : 'max-w-lg'
          )}
        >
          <div className="flex items-center justify-between border-b border-gray-200 p-5">
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-50 hover:text-gray-900 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-5">{children}</div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

export default function SolicitudesPage() {
  const { user } = useAuthStore()

  // State
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([])
  const [loading, setLoading] = useState(true)
  const [tabEstado, setTabEstado] = useState<TabEstado>('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  // Modals
  const [showNueva, setShowNueva] = useState(false)
  const [showDetalle, setShowDetalle] = useState(false)
  const [showAprobar, setShowAprobar] = useState(false)
  const [showRechazar, setShowRechazar] = useState(false)
  const [selectedSolicitud, setSelectedSolicitud] = useState<Solicitud | null>(null)

  // Lookup data
  const [puntos, setPuntos] = useState<PuntoStock[]>([])
  const [productos, setProductos] = useState<Producto[]>([])

  // Form state for nueva solicitud
  const [formTipo, setFormTipo] = useState('pedido')
  const [formOrigenId, setFormOrigenId] = useState('')
  const [formDestinoId, setFormDestinoId] = useState('')
  const [formPrioridad, setFormPrioridad] = useState('normal')
  const [formObservacion, setFormObservacion] = useState('')
  const [formDetalles, setFormDetalles] = useState<DetalleForm[]>([
    { productoId: '', cantidadSolicitada: 1 },
  ])
  const [submitting, setSubmitting] = useState(false)

  // Aprobar state
  const [aprobarDetalles, setAprobarDetalles] = useState<
    { detalleId: string; cantidadAprobada: number }[]
  >([])
  const [aprobarObs, setAprobarObs] = useState('')
  const [procesando, setProcesando] = useState(false)

  // Rechazar state
  const [rechazarMotivo, setRechazarMotivo] = useState('')

  // Can current user approve?
  const canApprove =
    user?.esAdmin ||
    user?.puntosStock?.some((p) => p.puedeAprobar) ||
    false

  // Fetch solicitudes
  const fetchSolicitudes = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', page.toString())
      params.set('limit', '15')
      if (tabEstado) params.set('estado', tabEstado)
      if (search) params.set('search', search)

      const res = await fetch(`/api/solicitudes?${params}`)
      const data = await res.json()
      setSolicitudes(data.solicitudes || [])
      setTotalPages(data.pagination?.totalPages || 1)
      setTotal(data.pagination?.total || 0)
    } catch (error) {
      console.error('Error fetching solicitudes:', error)
    } finally {
      setLoading(false)
    }
  }, [page, tabEstado, search])

  useEffect(() => {
    fetchSolicitudes()
  }, [fetchSolicitudes])

  // Fetch puntos y productos
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [puntosRes, productosRes] = await Promise.all([
          fetch('/api/productos/catalogos?tipo=puntos'),
          fetch('/api/productos?limit=500'),
        ])
        const puntosData = await puntosRes.json()
        const productosData = await productosRes.json()
        setPuntos(Array.isArray(puntosData) ? puntosData : [])
        setProductos(
          (productosData.productos || []).map((p: any) => ({
            id: p.id,
            codigo: p.codigo,
            descripcion: p.descripcion,
          }))
        )
      } catch (error) {
        console.error('Error fetching lookup data:', error)
      }
    }
    fetchData()
  }, [])

  // Handlers
  const handleTabChange = (val: TabEstado) => {
    setTabEstado(val)
    setPage(1)
  }

  const handleSearchChange = (val: string) => {
    setSearch(val)
    setPage(1)
  }

  const openDetalle = async (sol: Solicitud) => {
    try {
      const res = await fetch(`/api/solicitudes/${sol.id}`)
      const data = await res.json()
      setSelectedSolicitud(data)
    } catch {
      setSelectedSolicitud(sol)
    }
    setShowDetalle(true)
  }

  const openAprobar = (sol: Solicitud) => {
    setSelectedSolicitud(sol)
    setAprobarDetalles(
      sol.detalles.map((d) => ({
        detalleId: d.id,
        cantidadAprobada: d.cantidadSolicitada,
      }))
    )
    setAprobarObs('')
    setShowAprobar(true)
  }

  const openRechazar = (sol: Solicitud) => {
    setSelectedSolicitud(sol)
    setRechazarMotivo('')
    setShowRechazar(true)
  }

  // Create solicitud
  const handleCrear = async () => {
    if (!formOrigenId || !formDestinoId || !user) return
    const validDetalles = formDetalles.filter(
      (d) => d.productoId && d.cantidadSolicitada > 0
    )
    if (!validDetalles.length) return

    setSubmitting(true)
    try {
      const res = await fetch('/api/solicitudes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: formTipo,
          solicitanteId: user.id,
          puntoOrigenId: formOrigenId,
          puntoDestinoId: formDestinoId,
          prioridad: formPrioridad,
          observacionSolicitud: formObservacion || null,
          detalles: validDetalles,
        }),
      })

      if (res.ok) {
        setShowNueva(false)
        resetForm()
        fetchSolicitudes()
      } else {
        const err = await res.json()
        alert(err.error || 'Error al crear solicitud')
      }
    } catch (error) {
      alert('Error de conexion')
    } finally {
      setSubmitting(false)
    }
  }

  const resetForm = () => {
    setFormTipo('pedido')
    setFormOrigenId('')
    setFormDestinoId('')
    setFormPrioridad('normal')
    setFormObservacion('')
    setFormDetalles([{ productoId: '', cantidadSolicitada: 1 }])
  }

  // Approve
  const handleAprobar = async () => {
    if (!selectedSolicitud || !user) return
    setProcesando(true)
    try {
      const res = await fetch(`/api/solicitudes/${selectedSolicitud.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accion: 'aprobar',
          aprobadoPorId: user.id,
          observacionRespuesta: aprobarObs || null,
          detallesAprobados: aprobarDetalles,
        }),
      })

      if (res.ok) {
        setShowAprobar(false)
        fetchSolicitudes()
      } else {
        const err = await res.json()
        alert(err.error || 'Error al aprobar')
      }
    } catch {
      alert('Error de conexion')
    } finally {
      setProcesando(false)
    }
  }

  // Reject
  const handleRechazar = async () => {
    if (!selectedSolicitud || !user || !rechazarMotivo) return
    setProcesando(true)
    try {
      const res = await fetch(`/api/solicitudes/${selectedSolicitud.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accion: 'rechazar',
          aprobadoPorId: user.id,
          observacionRespuesta: rechazarMotivo,
        }),
      })

      if (res.ok) {
        setShowRechazar(false)
        fetchSolicitudes()
      } else {
        const err = await res.json()
        alert(err.error || 'Error al rechazar')
      }
    } catch {
      alert('Error de conexion')
    } finally {
      setProcesando(false)
    }
  }

  // Mark as delivered
  const handleEntregar = async (sol: Solicitud) => {
    if (!confirm('Confirmar entrega de esta solicitud?')) return
    try {
      const res = await fetch(`/api/solicitudes/${sol.id}/entregar`, {
        method: 'POST',
      })
      if (res.ok) {
        fetchSolicitudes()
      } else {
        const err = await res.json()
        alert(err.error || 'Error al entregar')
      }
    } catch {
      alert('Error de conexion')
    }
  }

  // Add/remove product lines
  const addDetalleLine = () => {
    setFormDetalles([...formDetalles, { productoId: '', cantidadSolicitada: 1 }])
  }

  const removeDetalleLine = (idx: number) => {
    if (formDetalles.length <= 1) return
    setFormDetalles(formDetalles.filter((_, i) => i !== idx))
  }

  const updateDetalle = (idx: number, field: keyof DetalleForm, value: any) => {
    const updated = [...formDetalles]
    updated[idx] = { ...updated[idx], [field]: value }
    setFormDetalles(updated)
  }

  return (
    <DashboardShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Solicitudes</h1>
            <p className="text-sm text-gray-400 mt-1">
              Gestiona pedidos, envios y transferencias de materiales
            </p>
          </div>
          <Button onClick={() => setShowNueva(true)}>
            <Plus className="w-4 h-4" />
            Nueva Solicitud
          </Button>
        </div>

        {/* Tabs + Search */}
        <Card animate={false} className="p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            {/* Tabs */}
            <div className="flex gap-1 bg-gray-50 rounded-lg p-1">
              {ESTADOS.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => handleTabChange(tab.value)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all cursor-pointer',
                    tabEstado === tab.value
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-gray-500 hover:text-gray-800 hover:bg-white'
                  )}
                >
                  {tab.icon}
                  <span className="hidden md:inline">{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="w-full sm:w-72">
              <Input
                placeholder="Buscar por numero o solicitante..."
                icon={<Search className="w-4 h-4" />}
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
              />
            </div>
          </div>
        </Card>

        {/* Table */}
        <Card animate={false} className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left px-5 py-3.5 text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Numero
                  </th>
                  <th className="text-left px-5 py-3.5 text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="text-left px-5 py-3.5 text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Solicitante
                  </th>
                  <th className="text-left px-5 py-3.5 text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Origen / Destino
                  </th>
                  <th className="text-center px-5 py-3.5 text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Items
                  </th>
                  <th className="text-center px-5 py-3.5 text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Prioridad
                  </th>
                  <th className="text-center px-5 py-3.5 text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="text-left px-5 py-3.5 text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="text-right px-5 py-3.5 text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="px-5 py-12 text-center text-gray-500">
                      <div className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Cargando...
                      </div>
                    </td>
                  </tr>
                ) : solicitudes.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-5 py-12 text-center text-gray-500">
                      <ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-30" />
                      <p>No se encontraron solicitudes</p>
                    </td>
                  </tr>
                ) : (
                  solicitudes.map((sol) => (
                    <tr
                      key={sol.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-5 py-3.5">
                        <span className="text-sm font-mono font-medium text-indigo-600">
                          {sol.numero}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-sm text-gray-700 capitalize">
                          {getTipoLabel(sol.tipo)}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-sm text-gray-700">
                          {sol.solicitante.nombre}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5 text-sm">
                          <span
                            className="font-medium"
                            style={{ color: sol.puntoOrigen.color || '#9ca3af' }}
                          >
                            {sol.puntoOrigen.codigo}
                          </span>
                          <ArrowRight className="w-3 h-3 text-gray-400" />
                          <span
                            className="font-medium"
                            style={{ color: sol.puntoDestino.color || '#9ca3af' }}
                          >
                            {sol.puntoDestino.codigo}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span className="text-sm text-gray-400">
                          {sol.detalles.length}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        {getPrioridadBadge(sol.prioridad)}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        {getEstadoBadge(sol.estado)}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-sm text-gray-400">
                          {formatDateTime(sol.fechaSolicitud)}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openDetalle(sol)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-900 hover:bg-gray-50 transition-colors cursor-pointer"
                            title="Ver detalle"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {canApprove && sol.estado === 'pendiente' && (
                            <>
                              <button
                                onClick={() => openAprobar(sol)}
                                className="p-1.5 rounded-lg text-emerald-600 hover:text-emerald-300 hover:bg-emerald-50 transition-colors cursor-pointer"
                                title="Aprobar"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => openRechazar(sol)}
                                className="p-1.5 rounded-lg text-red-500 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                                title="Rechazar"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          {sol.estado === 'aprobada' && (
                            <button
                              onClick={() => handleEntregar(sol)}
                              className="p-1.5 rounded-lg text-blue-600 hover:text-blue-300 hover:bg-blue-50 transition-colors cursor-pointer"
                              title="Confirmar entrega"
                            >
                              <PackageCheck className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-200 px-5 py-3">
              <span className="text-sm text-gray-400">
                {total} solicitudes en total
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm text-gray-400">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* ===== NUEVA SOLICITUD MODAL ===== */}
      <Modal
        open={showNueva}
        onClose={() => setShowNueva(false)}
        title="Nueva Solicitud"
        wide
      >
        <div className="space-y-5">
          {/* Tipo + Prioridad */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-400">Tipo</label>
              <select
                value={formTipo}
                onChange={(e) => setFormTipo(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-300 cursor-pointer"
              >
                {TIPOS_SOLICITUD.map((t) => (
                  <option key={t.value} value={t.value} className="bg-white">
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-400">Prioridad</label>
              <select
                value={formPrioridad}
                onChange={(e) => setFormPrioridad(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-300 cursor-pointer"
              >
                {PRIORIDADES.map((p) => (
                  <option key={p.value} value={p.value} className="bg-white">
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Origen + Destino */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-400">
                Punto Origen
              </label>
              <select
                value={formOrigenId}
                onChange={(e) => setFormOrigenId(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-300 cursor-pointer"
              >
                <option value="" className="bg-white">
                  Seleccionar...
                </option>
                {puntos.map((p) => (
                  <option key={p.id} value={p.id} className="bg-white">
                    {p.codigo} - {p.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-400">
                Punto Destino
              </label>
              <select
                value={formDestinoId}
                onChange={(e) => setFormDestinoId(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-300 cursor-pointer"
              >
                <option value="" className="bg-white">
                  Seleccionar...
                </option>
                {puntos.map((p) => (
                  <option key={p.id} value={p.id} className="bg-white">
                    {p.codigo} - {p.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Observacion */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-400">
              Observacion
            </label>
            <textarea
              value={formObservacion}
              onChange={(e) => setFormObservacion(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-300 resize-none"
              placeholder="Observaciones opcionales..."
            />
          </div>

          {/* Product lines */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-400">
                Productos
              </label>
              <Button variant="ghost" size="sm" onClick={addDetalleLine}>
                <Plus className="w-4 h-4" />
                Agregar producto
              </Button>
            </div>

            <div className="space-y-2">
              {formDetalles.map((det, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <ProductSearchSelect
                    value={det.productoId}
                    onChange={(val) => updateDetalle(idx, 'productoId', val)}
                    products={productos}
                    className="flex-1"
                  />
                  <input
                    type="number"
                    min={0.001}
                    step="any"
                    value={det.cantidadSolicitada}
                    onChange={(e) =>
                      updateDetalle(
                        idx,
                        'cantidadSolicitada',
                        parseFloat(e.target.value) || 0
                      )
                    }
                    className="w-28 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 text-right focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-300"
                    placeholder="Cantidad"
                  />
                  <button
                    onClick={() => removeDetalleLine(idx)}
                    disabled={formDetalles.length <= 1}
                    className="p-2 rounded-lg text-gray-500 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-3 border-t border-gray-200">
            <Button variant="secondary" onClick={() => setShowNueva(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleCrear}
              loading={submitting}
              disabled={
                !formOrigenId ||
                !formDestinoId ||
                formDetalles.every((d) => !d.productoId)
              }
            >
              Crear Solicitud
            </Button>
          </div>
        </div>
      </Modal>

      {/* ===== DETALLE MODAL ===== */}
      <Modal
        open={showDetalle}
        onClose={() => setShowDetalle(false)}
        title={selectedSolicitud ? `Solicitud ${selectedSolicitud.numero}` : 'Detalle'}
        wide
      >
        {selectedSolicitud && (
          <div className="space-y-5">
            {/* Info grid */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-gray-500">Tipo</span>
                <p className="text-sm text-gray-800 capitalize">
                  {getTipoLabel(selectedSolicitud.tipo)}
                </p>
              </div>
              <div>
                <span className="text-xs text-gray-500">Estado</span>
                <div className="mt-0.5">{getEstadoBadge(selectedSolicitud.estado)}</div>
              </div>
              <div>
                <span className="text-xs text-gray-500">Solicitante</span>
                <p className="text-sm text-gray-800">
                  {selectedSolicitud.solicitante.nombre}
                </p>
              </div>
              <div>
                <span className="text-xs text-gray-500">Prioridad</span>
                <div className="mt-0.5">
                  {getPrioridadBadge(selectedSolicitud.prioridad)}
                </div>
              </div>
              <div>
                <span className="text-xs text-gray-500">Origen</span>
                <p className="text-sm text-gray-800">
                  {selectedSolicitud.puntoOrigen.nombre} ({selectedSolicitud.puntoOrigen.codigo})
                </p>
              </div>
              <div>
                <span className="text-xs text-gray-500">Destino</span>
                <p className="text-sm text-gray-800">
                  {selectedSolicitud.puntoDestino.nombre} ({selectedSolicitud.puntoDestino.codigo})
                </p>
              </div>
              <div>
                <span className="text-xs text-gray-500">Fecha solicitud</span>
                <p className="text-sm text-gray-800">
                  {formatDateTime(selectedSolicitud.fechaSolicitud)}
                </p>
              </div>
              {selectedSolicitud.fechaRespuesta && (
                <div>
                  <span className="text-xs text-gray-500">Fecha respuesta</span>
                  <p className="text-sm text-gray-800">
                    {formatDateTime(selectedSolicitud.fechaRespuesta)}
                  </p>
                </div>
              )}
              {selectedSolicitud.aprobadoPor && (
                <div>
                  <span className="text-xs text-gray-500">
                    {selectedSolicitud.estado === 'rechazada' ? 'Rechazada por' : 'Aprobada por'}
                  </span>
                  <p className="text-sm text-gray-800">
                    {selectedSolicitud.aprobadoPor.nombre}
                  </p>
                </div>
              )}
              {selectedSolicitud.fechaEntrega && (
                <div>
                  <span className="text-xs text-gray-500">Fecha entrega</span>
                  <p className="text-sm text-gray-800">
                    {formatDateTime(selectedSolicitud.fechaEntrega)}
                  </p>
                </div>
              )}
            </div>

            {/* Observaciones */}
            {selectedSolicitud.observacionSolicitud && (
              <div className="rounded-lg bg-gray-50 p-3">
                <span className="text-xs text-gray-500 block mb-1">Observacion del solicitante</span>
                <p className="text-sm text-gray-700">
                  {selectedSolicitud.observacionSolicitud}
                </p>
              </div>
            )}
            {selectedSolicitud.observacionRespuesta && (
              <div
                className={cn(
                  'rounded-lg p-3',
                  selectedSolicitud.estado === 'rechazada'
                    ? 'bg-red-500/5 border border-red-500/10'
                    : 'bg-emerald-500/5 border border-emerald-500/10'
                )}
              >
                <span className="text-xs text-gray-500 block mb-1">
                  Observacion de respuesta
                </span>
                <p className="text-sm text-gray-700">
                  {selectedSolicitud.observacionRespuesta}
                </p>
              </div>
            )}

            {/* Detalles table */}
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-2">Productos</h3>
              <div className="rounded-lg border border-gray-200 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-400">
                        Codigo
                      </th>
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-400">
                        Producto
                      </th>
                      <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-400">
                        Solicitada
                      </th>
                      <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-400">
                        Aprobada
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {selectedSolicitud.detalles.map((d) => (
                      <tr key={d.id}>
                        <td className="px-4 py-2.5 text-sm font-mono text-indigo-600">
                          {d.producto.codigo}
                        </td>
                        <td className="px-4 py-2.5 text-sm text-gray-700">
                          {d.producto.descripcion}
                        </td>
                        <td className="px-4 py-2.5 text-sm text-gray-700 text-right">
                          {d.cantidadSolicitada}
                        </td>
                        <td className="px-4 py-2.5 text-sm text-right">
                          {d.cantidadAprobada !== null ? (
                            <span
                              className={cn(
                                d.cantidadAprobada < d.cantidadSolicitada
                                  ? 'text-amber-500'
                                  : 'text-emerald-600'
                              )}
                            >
                              {d.cantidadAprobada}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Ticket info */}
            {selectedSolicitud.movimientos && selectedSolicitud.movimientos.length > 0 && (
              <div className="rounded-lg bg-indigo-500/5 border border-indigo-500/10 p-3">
                <span className="text-xs text-gray-500 block mb-1">Ticket generado</span>
                <p className="text-sm font-mono text-indigo-600">
                  {selectedSolicitud.movimientos[0].ticketNumero || 'N/A'}
                </p>
              </div>
            )}

            {/* Footer actions */}
            <div className="flex justify-end gap-3 pt-3 border-t border-gray-200">
              {canApprove && selectedSolicitud.estado === 'pendiente' && (
                <>
                  <Button
                    variant="danger"
                    onClick={() => {
                      setShowDetalle(false)
                      openRechazar(selectedSolicitud)
                    }}
                  >
                    <XCircle className="w-4 h-4" />
                    Rechazar
                  </Button>
                  <Button
                    onClick={() => {
                      setShowDetalle(false)
                      openAprobar(selectedSolicitud)
                    }}
                  >
                    <Check className="w-4 h-4" />
                    Aprobar
                  </Button>
                </>
              )}
              {selectedSolicitud.estado === 'aprobada' && (
                <Button
                  onClick={() => {
                    setShowDetalle(false)
                    handleEntregar(selectedSolicitud)
                  }}
                >
                  <PackageCheck className="w-4 h-4" />
                  Confirmar Entrega
                </Button>
              )}
              <Button
                variant="secondary"
                onClick={() => setShowDetalle(false)}
              >
                Cerrar
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ===== APROBAR MODAL ===== */}
      <Modal
        open={showAprobar}
        onClose={() => setShowAprobar(false)}
        title="Aprobar Solicitud"
        wide
      >
        {selectedSolicitud && (
          <div className="space-y-5">
            <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/10 p-3">
              <p className="text-sm text-emerald-600">
                Esta aprobando la solicitud{' '}
                <span className="font-mono font-medium">
                  {selectedSolicitud.numero}
                </span>
                . Puede ajustar las cantidades aprobadas por producto.
              </p>
            </div>

            {/* Adjust quantities */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-400">
                Cantidades a aprobar
              </h3>
              <div className="rounded-lg border border-gray-200 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-400">
                        Producto
                      </th>
                      <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-400">
                        Solicitada
                      </th>
                      <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-400">
                        Aprobar
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {selectedSolicitud.detalles.map((d, idx) => (
                      <tr key={d.id}>
                        <td className="px-4 py-2.5">
                          <span className="text-sm text-gray-700">
                            <span className="font-mono text-indigo-600 mr-2">
                              {d.producto.codigo}
                            </span>
                            {d.producto.descripcion}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-sm text-gray-400 text-right">
                          {d.cantidadSolicitada}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <input
                            type="number"
                            min={0}
                            max={d.cantidadSolicitada}
                            step="any"
                            value={
                              aprobarDetalles.find((a) => a.detalleId === d.id)
                                ?.cantidadAprobada ?? 0
                            }
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0
                              setAprobarDetalles((prev) =>
                                prev.map((a) =>
                                  a.detalleId === d.id
                                    ? { ...a, cantidadAprobada: val }
                                    : a
                                )
                              )
                            }}
                            className="w-24 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-800 text-right focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-300"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Observacion */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-400">
                Observacion (opcional)
              </label>
              <textarea
                value={aprobarObs}
                onChange={(e) => setAprobarObs(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-300 resize-none"
                placeholder="Observaciones..."
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-gray-200">
              <Button
                variant="secondary"
                onClick={() => setShowAprobar(false)}
              >
                Cancelar
              </Button>
              <Button onClick={handleAprobar} loading={procesando}>
                <Check className="w-4 h-4" />
                Aprobar Solicitud
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ===== RECHAZAR MODAL ===== */}
      <Modal
        open={showRechazar}
        onClose={() => setShowRechazar(false)}
        title="Rechazar Solicitud"
      >
        {selectedSolicitud && (
          <div className="space-y-5">
            <div className="rounded-lg bg-red-500/5 border border-red-500/10 p-3">
              <p className="text-sm text-red-500">
                Esta rechazando la solicitud{' '}
                <span className="font-mono font-medium">
                  {selectedSolicitud.numero}
                </span>
                . Debe indicar el motivo.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-400">
                Motivo de rechazo *
              </label>
              <textarea
                value={rechazarMotivo}
                onChange={(e) => setRechazarMotivo(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-500 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500/50 resize-none"
                placeholder="Indique el motivo del rechazo..."
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-gray-200">
              <Button
                variant="secondary"
                onClick={() => setShowRechazar(false)}
              >
                Cancelar
              </Button>
              <Button
                variant="danger"
                onClick={handleRechazar}
                loading={procesando}
                disabled={!rechazarMotivo.trim()}
              >
                <XCircle className="w-4 h-4" />
                Rechazar Solicitud
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </DashboardShell>
  )
}
