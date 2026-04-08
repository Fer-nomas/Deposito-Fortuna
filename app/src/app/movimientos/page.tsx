'use client'

import { DashboardShell } from '@/components/layout/dashboard-shell'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn, formatCurrency, formatDateTime, formatNumber } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  Plus,
  X,
  ArrowRightLeft,
  Package,
  Filter,
  Ticket,
  Trash2,
  ChevronDown,
} from 'lucide-react'
import { useEffect, useState, useCallback } from 'react'

interface TipoMovimiento {
  id: string
  nombre: string
  codigo: string
  efectoOrigen: string | null
  efectoDestino: string | null
  generaTicket: boolean
}

interface PuntoStock {
  id: string
  nombre: string
  codigo: string
  tipo: string
  color: string | null
}

interface Proveedor {
  id: string
  nombre: string
  ruc: string | null
}

interface Producto {
  id: string
  codigo: string
  descripcion: string
}

interface MovimientoDetalle {
  id: string
  productoId: string
  producto: Producto
  cantidad: number
  costoUnitario: number
  tipoLinea: string
}

interface Movimiento {
  id: string
  tipoMovimiento: TipoMovimiento
  fecha: string
  puntoOrigen: PuntoStock | null
  puntoDestino: PuntoStock | null
  proveedor: Proveedor | null
  usuario: { id: string; nombre: string }
  flete: number
  ticketNumero: string | null
  observacion: string | null
  detalles: MovimientoDetalle[]
}

interface DetalleForm {
  productoId: string
  cantidad: string
  costoUnitario: string
  tipoLinea: string
}

export default function MovimientosPage() {
  // List state
  const { user } = useAuthStore()
  const [movimientos, setMovimientos] = useState<Movimiento[]>([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 0 })

  // Filter state
  const [filterTipo, setFilterTipo] = useState('')
  const [filterFechaDesde, setFilterFechaDesde] = useState('')
  const [filterFechaHasta, setFilterFechaHasta] = useState('')
  const [filterPuntoStock, setFilterPuntoStock] = useState('')

  // Reference data
  const [tiposMovimiento, setTiposMovimiento] = useState<TipoMovimiento[]>([])
  const [puntosStock, setPuntosStock] = useState<PuntoStock[]>([])
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [productos, setProductos] = useState<Producto[]>([])
  // stockEnOrigen: productoId → cantidad disponible en el punto origen seleccionado
  const [stockEnOrigen, setStockEnOrigen] = useState<Record<string, number>>({})

  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  // Form state
  const [formTipoId, setFormTipoId] = useState('')
  const [formOrigenId, setFormOrigenId] = useState('')
  const [formDestinoId, setFormDestinoId] = useState('')
  const [formProveedorId, setFormProveedorId] = useState('')
  const [formFlete, setFormFlete] = useState('')
  const [formObservacion, setFormObservacion] = useState('')
  const [formDetalles, setFormDetalles] = useState<DetalleForm[]>([])

  // Detail view
  const [detailMovimiento, setDetailMovimiento] = useState<Movimiento | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const selectedTipo = tiposMovimiento.find((t) => t.id === formTipoId)
  const isConsumoProduccion =
    selectedTipo?.codigo === 'CONSUMO' || selectedTipo?.codigo === 'PRODUCCION'
  const isCompra = selectedTipo?.codigo === 'COMPRA'

  // Fetch movimientos
  const fetchMovimientos = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      params.set('page', pagination.page.toString())
      if (filterTipo) params.set('tipo', filterTipo)
      if (filterFechaDesde) params.set('fechaDesde', filterFechaDesde)
      if (filterFechaHasta) params.set('fechaHasta', filterFechaHasta)
      if (filterPuntoStock) params.set('puntoStockId', filterPuntoStock)

      const res = await fetch(`/api/movimientos?${params}`)
      const data = await res.json()
      setMovimientos(data.movimientos || [])
      setPagination((prev) => ({
        ...prev,
        total: data.pagination?.total || 0,
        totalPages: data.pagination?.totalPages || 0,
      }))
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }, [pagination.page, filterTipo, filterFechaDesde, filterFechaHasta, filterPuntoStock])

  // Fetch reference data
  const fetchReferenceData = useCallback(async () => {
    try {
      const [tiposRes, puntosRes, provRes, prodRes] = await Promise.all([
        fetch('/api/productos/catalogos?tipo=tipos_movimiento'),
        fetch('/api/productos/catalogos?tipo=puntos'),
        fetch('/api/proveedores'),
        fetch('/api/productos?limit=1000'),
      ])

      if (tiposRes.ok) {
        const tiposData = await tiposRes.json()
        setTiposMovimiento(Array.isArray(tiposData) ? tiposData : [])
      }

      if (puntosRes.ok) {
        const puntosData = await puntosRes.json()
        setPuntosStock(Array.isArray(puntosData) ? puntosData : [])
      }

      if (provRes.ok) {
        const provData = await provRes.json()
        setProveedores(provData.proveedores || [])
      }

      if (prodRes.ok) {
        const prodData = await prodRes.json()
        setProductos(
          (prodData.productos || []).map((p: any) => ({
            id: p.id,
            codigo: p.codigo,
            descripcion: p.descripcion,
          }))
        )
      }
    } catch (error) {
      console.error('Error fetching reference data:', error)
    }
  }, [])

  useEffect(() => {
    fetchReferenceData()
  }, [fetchReferenceData])

  useEffect(() => {
    fetchMovimientos()
  }, [fetchMovimientos])

  const openCreateModal = () => {
    setFormTipoId('')
    setFormOrigenId('')
    setFormDestinoId('')
    setFormProveedorId('')
    setFormFlete('')
    setFormObservacion('')
    setFormDetalles([
      { productoId: '', cantidad: '', costoUnitario: '', tipoLinea: 'movimiento' },
    ])
    setModalOpen(true)
  }

  const addDetalle = (tipoLinea = 'movimiento') => {
    setFormDetalles([
      ...formDetalles,
      { productoId: '', cantidad: '', costoUnitario: '', tipoLinea },
    ])
  }

  const removeDetalle = (index: number) => {
    setFormDetalles(formDetalles.filter((_, i) => i !== index))
  }

  const updateDetalle = (index: number, field: keyof DetalleForm, value: string) => {
    const updated = [...formDetalles]
    updated[index] = { ...updated[index], [field]: value }
    setFormDetalles(updated)
  }

  const openDetail = async (m: Movimiento) => {
    try {
      const res = await fetch(`/api/movimientos/${m.id}`)
      if (res.ok) {
        const data = await res.json()
        setDetailMovimiento(data)
      } else {
        setDetailMovimiento(m)
      }
    } catch {
      setDetailMovimiento(m)
    }
    setDetailOpen(true)
  }

  const handleSave = async () => {
    if (!formTipoId || formDetalles.length === 0) return

    const validDetalles = formDetalles.filter(
      (d) => d.productoId && parseFloat(d.cantidad) > 0
    )
    if (validDetalles.length === 0) return

    // Bloquear si algún detalle supera el stock disponible en origen
    if (requiereStockEnOrigen) {
      const excede = validDetalles.some(
        (d) => d.tipoLinea !== 'produccion' &&
          stockEnOrigen[d.productoId] != null &&
          parseFloat(d.cantidad) > stockEnOrigen[d.productoId]
      )
      if (excede) return
    }

    setSaving(true)
    try {
      // TODO: get actual user id from auth context
      const res = await fetch('/api/movimientos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipoMovimientoId: formTipoId,
          puntoOrigenId: formOrigenId || null,
          puntoDestinoId: formDestinoId || null,
          proveedorId: formProveedorId || null,
          flete: parseFloat(formFlete) || 0,
          observacion: formObservacion,
          usuarioId: user?.id || '',
          detalles: validDetalles.map((d) => ({
            productoId: d.productoId,
            cantidad: parseFloat(d.cantidad),
            costoUnitario: parseFloat(d.costoUnitario) || 0,
            tipoLinea: d.tipoLinea,
          })),
        }),
      })

      if (res.ok) {
        setModalOpen(false)
        fetchMovimientos()
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setSaving(false)
    }
  }

  const consumoDetalles = formDetalles.filter((d) => d.tipoLinea === 'consumo')
  const produccionDetalles = formDetalles.filter((d) => d.tipoLinea === 'produccion')
  const movimientoDetalles = formDetalles.filter((d) => d.tipoLinea === 'movimiento')

  // Filtrar productos según stock disponible en origen cuando el tipo resta del origen
  const tipoSeleccionado = tiposMovimiento.find((t) => t.id === formTipoId)
  const requiereStockEnOrigen = tipoSeleccionado?.efectoOrigen === 'RESTA' && formOrigenId !== ''
  const productosDisponibles = requiereStockEnOrigen
    ? productos.filter((p) => (stockEnOrigen[p.id] ?? 0) > 0)
    : productos

  const clearFilters = () => {
    setFilterTipo('')
    setFilterFechaDesde('')
    setFilterFechaHasta('')
    setFilterPuntoStock('')
    setPagination((prev) => ({ ...prev, page: 1 }))
  }

  return (
    <DashboardShell>
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Movimientos</h1>
            <p className="text-sm text-gray-400 mt-1">
              Registro de movimientos de stock
            </p>
          </div>
          <Button onClick={openCreateModal}>
            <Plus className="h-4 w-4" />
            Nuevo Movimiento
          </Button>
        </motion.div>

        {/* Filters */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-4 w-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">Filtros</span>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-400">
                Tipo Movimiento
              </label>
              <select
                className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-800 transition-all duration-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-300 hover:border-gray-300"
                value={filterTipo}
                onChange={(e) => {
                  setFilterTipo(e.target.value)
                  setPagination((prev) => ({ ...prev, page: 1 }))
                }}
              >
                <option value="">Todos</option>
                {tiposMovimiento.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nombre}
                  </option>
                ))}
              </select>
            </div>
            <Input
              label="Fecha Desde"
              type="date"
              value={filterFechaDesde}
              onChange={(e) => {
                setFilterFechaDesde(e.target.value)
                setPagination((prev) => ({ ...prev, page: 1 }))
              }}
            />
            <Input
              label="Fecha Hasta"
              type="date"
              value={filterFechaHasta}
              onChange={(e) => {
                setFilterFechaHasta(e.target.value)
                setPagination((prev) => ({ ...prev, page: 1 }))
              }}
            />
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-400">
                Punto de Stock
              </label>
              <select
                className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-800 transition-all duration-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-300 hover:border-gray-300"
                value={filterPuntoStock}
                onChange={(e) => {
                  setFilterPuntoStock(e.target.value)
                  setPagination((prev) => ({ ...prev, page: 1 }))
                }}
              >
                <option value="">Todos</option>
                {puntosStock.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {(filterTipo || filterFechaDesde || filterFechaHasta || filterPuntoStock) && (
            <div className="mt-3 flex justify-end">
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-3.5 w-3.5" />
                Limpiar filtros
              </Button>
            </div>
          )}
        </Card>

        {/* Table */}
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  {['Fecha', 'Tipo', 'Origen', 'Destino', 'Items', 'Flete', 'Ticket #', 'Usuario'].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400"
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                      <div className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Cargando...
                      </div>
                    </td>
                  </tr>
                ) : movimientos.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                      <ArrowRightLeft className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      No se encontraron movimientos
                    </td>
                  </tr>
                ) : (
                  movimientos.map((m, i) => (
                    <motion.tr
                      key={m.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => openDetail(m)}
                    >
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {formatDateTime(m.fecha)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="info">{m.tipoMovimiento.nombre}</Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-400">
                        {m.puntoOrigen ? (
                          <span className="flex items-center gap-1.5">
                            {m.puntoOrigen.color && (
                              <span
                                className="inline-block h-2 w-2 rounded-full"
                                style={{ backgroundColor: m.puntoOrigen.color }}
                              />
                            )}
                            {m.puntoOrigen.nombre}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-400">
                        {m.puntoDestino ? (
                          <span className="flex items-center gap-1.5">
                            {m.puntoDestino.color && (
                              <span
                                className="inline-block h-2 w-2 rounded-full"
                                style={{ backgroundColor: m.puntoDestino.color }}
                              />
                            )}
                            {m.puntoDestino.nombre}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge>{m.detalles.length}</Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {m.flete > 0 ? formatCurrency(m.flete) : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {m.ticketNumero ? (
                          <span className="flex items-center gap-1.5 text-indigo-600 font-mono text-xs">
                            <Ticket className="h-3.5 w-3.5" />
                            {m.ticketNumero}
                          </span>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-400">
                        {m.usuario.nombre}
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!loading && pagination.totalPages > 1 && (
            <div className="border-t border-gray-200 px-4 py-3 flex items-center justify-between">
              <p className="text-xs text-gray-500">
                {pagination.total} movimiento{pagination.total !== 1 ? 's' : ''}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                >
                  Anterior
                </Button>
                <span className="text-xs text-gray-400">
                  {pagination.page} / {pagination.totalPages}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Create Modal */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
            onClick={() => setModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-2xl rounded-xl border border-gray-200 bg-white p-6 shadow-2xl my-8"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">
                  Nuevo Movimiento
                </h2>
                <button
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-50 hover:text-gray-800 transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-5">
                {/* Tipo Movimiento */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-400">
                    Tipo de Movimiento *
                  </label>
                  <select
                    className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-800 transition-all duration-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-300 hover:border-gray-300"
                    value={formTipoId}
                    onChange={(e) => {
                      setFormTipoId(e.target.value)
                      // Reset detalles when tipo changes
                      const tipo = tiposMovimiento.find((t) => t.id === e.target.value)
                      if (
                        tipo?.codigo === 'CONSUMO' ||
                        tipo?.codigo === 'PRODUCCION' ||
                        tipo?.codigo === 'CONSUMO_PROD'
                      ) {
                        setFormDetalles([
                          { productoId: '', cantidad: '', costoUnitario: '', tipoLinea: 'consumo' },
                          { productoId: '', cantidad: '', costoUnitario: '', tipoLinea: 'produccion' },
                        ])
                      } else {
                        setFormDetalles([
                          { productoId: '', cantidad: '', costoUnitario: '', tipoLinea: 'movimiento' },
                        ])
                      }
                    }}
                  >
                    <option value="">Seleccionar tipo...</option>
                    {tiposMovimiento.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.nombre} ({t.codigo})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Origen / Destino */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-gray-400">
                      Punto Origen
                    </label>
                    <select
                      className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-800 transition-all duration-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-300 hover:border-gray-300"
                      value={formOrigenId}
                      onChange={async (e) => {
                        const puntoId = e.target.value
                        setFormOrigenId(puntoId)
                        setFormDetalles([{ productoId: '', cantidad: '', costoUnitario: '', tipoLinea: formDetalles[0]?.tipoLinea || 'movimiento' }])
                        if (puntoId) {
                          const res = await fetch('/api/stock')
                          if (res.ok) {
                            const data = await res.json()
                            const punto = data.puntos?.find((p: any) => p.id === puntoId)
                            const map: Record<string, number> = {}
                            for (const item of punto?.items || []) map[item.productoId] = item.cantidad
                            setStockEnOrigen(map)
                          }
                        } else {
                          setStockEnOrigen({})
                        }
                      }}
                    >
                      <option value="">Sin origen</option>
                      {puntosStock.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-gray-400">
                      Punto Destino
                    </label>
                    <select
                      className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-800 transition-all duration-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-300 hover:border-gray-300"
                      value={formDestinoId}
                      onChange={(e) => setFormDestinoId(e.target.value)}
                    >
                      <option value="">Sin destino</option>
                      {puntosStock.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Proveedor (solo para Compra) */}
                {isCompra && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-1.5"
                  >
                    <label className="block text-sm font-medium text-gray-400">
                      Proveedor
                    </label>
                    <select
                      className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-800 transition-all duration-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-300 hover:border-gray-300"
                      value={formProveedorId}
                      onChange={(e) => setFormProveedorId(e.target.value)}
                    >
                      <option value="">Seleccionar proveedor...</option>
                      {proveedores.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nombre} {p.ruc ? `(${p.ruc})` : ''}
                        </option>
                      ))}
                    </select>
                  </motion.div>
                )}

                {/* Flete & Observacion */}
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Flete"
                    type="number"
                    placeholder="0"
                    value={formFlete}
                    onChange={(e) => setFormFlete(e.target.value)}
                  />
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-gray-400">
                      Observacion
                    </label>
                    <textarea
                      className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-500 transition-all duration-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-300 hover:border-gray-300 resize-none"
                      rows={1}
                      placeholder="Observaciones..."
                      value={formObservacion}
                      onChange={(e) => setFormObservacion(e.target.value)}
                    />
                  </div>
                </div>

                {/* Products - Consumo/Produccion mode */}
                {isConsumoProduccion ? (
                  <div className="space-y-4">
                    {/* Consumed items */}
                    <div className="rounded-lg border border-red-500/20 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-medium text-red-500">
                          Productos Consumidos
                        </h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => addDetalle('consumo')}
                          className="text-red-500"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Agregar
                        </Button>
                      </div>
                      {consumoDetalles.length === 0 ? (
                        <p className="text-xs text-gray-500 text-center py-2">
                          Sin productos de consumo
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {formDetalles.map((d, idx) =>
                            d.tipoLinea !== 'consumo' ? null : (
                              <DetalleRow
                                key={idx}
                                detalle={d}
                                index={idx}
                                productos={productosDisponibles}
                                stockEnOrigen={requiereStockEnOrigen ? stockEnOrigen : {}}
                                onUpdate={updateDetalle}
                                onRemove={removeDetalle}
                              />
                            )
                          )}
                        </div>
                      )}
                    </div>

                    {/* Produced items */}
                    <div className="rounded-lg border border-emerald-500/20 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-medium text-emerald-600">
                          Productos Producidos
                        </h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => addDetalle('produccion')}
                          className="text-emerald-600"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Agregar
                        </Button>
                      </div>
                      {produccionDetalles.length === 0 ? (
                        <p className="text-xs text-gray-500 text-center py-2">
                          Sin productos de produccion
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {formDetalles.map((d, idx) =>
                            d.tipoLinea !== 'produccion' ? null : (
                              <DetalleRow
                                key={idx}
                                detalle={d}
                                index={idx}
                                productos={productos}
                                stockEnOrigen={{}}
                                onUpdate={updateDetalle}
                                onRemove={removeDetalle}
                              />
                            )
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Regular movimiento products */
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-medium text-gray-700">
                        Productos *
                      </h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => addDetalle('movimiento')}
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Agregar Producto
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {movimientoDetalles.length === 0 ? (
                        <p className="text-xs text-gray-500 text-center py-4">
                          Agrega al menos un producto
                        </p>
                      ) : (
                        formDetalles.map((d, idx) =>
                          d.tipoLinea !== 'movimiento' ? null : (
                            <DetalleRow
                              key={idx}
                              detalle={d}
                              index={idx}
                              productos={productosDisponibles}
                              stockEnOrigen={requiereStockEnOrigen ? stockEnOrigen : {}}
                              onUpdate={updateDetalle}
                              onRemove={removeDetalle}
                            />
                          )
                        )
                      )}
                    </div>
                  </div>
                )}

                {selectedTipo?.generaTicket && (
                  <div className="flex items-center gap-2 rounded-lg bg-indigo-50 border border-indigo-500/20 px-4 py-2.5">
                    <Ticket className="h-4 w-4 text-indigo-600" />
                    <span className="text-sm text-indigo-300">
                      Se generara automaticamente un numero de ticket
                    </span>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <Button variant="secondary" onClick={() => setModalOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleSave}
                  loading={saving}
                  disabled={
                    !formTipoId ||
                    formDetalles.filter(
                      (d) => d.productoId && parseFloat(d.cantidad) > 0
                    ).length === 0
                  }
                >
                  Crear Movimiento
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Detail Modal */}
      <AnimatePresence>
        {detailOpen && detailMovimiento && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
            onClick={() => setDetailOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-2xl rounded-xl border border-gray-200 bg-white p-6 shadow-2xl my-8"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    Detalle de Movimiento
                  </h2>
                  {detailMovimiento.ticketNumero && (
                    <p className="text-sm text-indigo-600 font-mono mt-0.5">
                      {detailMovimiento.ticketNumero}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setDetailOpen(false)}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-50 hover:text-gray-800 transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Tipo:</span>
                    <span className="ml-2 text-gray-800">
                      {detailMovimiento.tipoMovimiento.nombre}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Fecha:</span>
                    <span className="ml-2 text-gray-800">
                      {formatDateTime(detailMovimiento.fecha)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Origen:</span>
                    <span className="ml-2 text-gray-800">
                      {detailMovimiento.puntoOrigen?.nombre || '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Destino:</span>
                    <span className="ml-2 text-gray-800">
                      {detailMovimiento.puntoDestino?.nombre || '-'}
                    </span>
                  </div>
                  {detailMovimiento.proveedor && (
                    <div>
                      <span className="text-gray-500">Proveedor:</span>
                      <span className="ml-2 text-gray-800">
                        {detailMovimiento.proveedor.nombre}
                      </span>
                    </div>
                  )}
                  <div>
                    <span className="text-gray-500">Usuario:</span>
                    <span className="ml-2 text-gray-800">
                      {detailMovimiento.usuario.nombre}
                    </span>
                  </div>
                  {detailMovimiento.flete > 0 && (
                    <div>
                      <span className="text-gray-500">Flete:</span>
                      <span className="ml-2 text-gray-800">
                        {formatCurrency(detailMovimiento.flete)}
                      </span>
                    </div>
                  )}
                </div>

                {detailMovimiento.observacion && (
                  <div className="rounded-lg bg-gray-50 p-3">
                    <span className="text-xs text-gray-500">Observacion:</span>
                    <p className="text-sm text-gray-700 mt-1">
                      {detailMovimiento.observacion}
                    </p>
                  </div>
                )}

                {/* Detalles table */}
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">
                    Productos ({detailMovimiento.detalles.length})
                  </h3>
                  <div className="rounded-lg border border-gray-200 overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-400">
                            Codigo
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-400">
                            Producto
                          </th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-400">
                            Cantidad
                          </th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-400">
                            Costo Unit.
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-400">
                            Tipo
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {detailMovimiento.detalles.map((d) => (
                          <tr key={d.id}>
                            <td className="px-3 py-2 text-xs text-gray-400 font-mono">
                              {d.producto.codigo}
                            </td>
                            <td className="px-3 py-2 text-sm text-gray-800">
                              {d.producto.descripcion}
                            </td>
                            <td className="px-3 py-2 text-sm text-gray-800 text-right">
                              {formatNumber(d.cantidad)}
                            </td>
                            <td className="px-3 py-2 text-sm text-gray-800 text-right">
                              {d.costoUnitario > 0
                                ? formatCurrency(d.costoUnitario)
                                : '-'}
                            </td>
                            <td className="px-3 py-2">
                              <Badge
                                variant={
                                  d.tipoLinea === 'consumo'
                                    ? 'danger'
                                    : d.tipoLinea === 'produccion'
                                      ? 'success'
                                      : 'default'
                                }
                              >
                                {d.tipoLinea}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="flex justify-end mt-6">
                <Button variant="secondary" onClick={() => setDetailOpen(false)}>
                  Cerrar
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardShell>
  )
}

// Extracted row component for product detail lines
function DetalleRow({
  detalle,
  index,
  productos,
  stockEnOrigen,
  onUpdate,
  onRemove,
}: {
  detalle: DetalleForm
  index: number
  productos: Producto[]
  stockEnOrigen: Record<string, number>
  onUpdate: (index: number, field: keyof DetalleForm, value: string) => void
  onRemove: (index: number) => void
}) {
  const disponible = detalle.productoId ? (stockEnOrigen[detalle.productoId] ?? null) : null
  const excedeCantidad = disponible !== null && parseFloat(detalle.cantidad) > disponible

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-1"
    >
      <div className="flex items-center gap-2">
      <select
        className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 transition-all duration-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-300 hover:border-gray-300"
        value={detalle.productoId}
        onChange={(e) => onUpdate(index, 'productoId', e.target.value)}
      >
        <option value="">Seleccionar producto...</option>
        {productos.map((p) => (
          <option key={p.id} value={p.id}>
            {p.codigo} - {p.descripcion}
            {stockEnOrigen[p.id] != null ? ` (stock: ${stockEnOrigen[p.id]})` : ''}
          </option>
        ))}
      </select>
      <input
        type="number"
        placeholder="Cant."
        className="w-24 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 transition-all duration-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-300 hover:border-gray-300"
        value={detalle.cantidad}
        onChange={(e) => onUpdate(index, 'cantidad', e.target.value)}
      />
      <input
        type="number"
        placeholder="Costo"
        className="w-28 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 transition-all duration-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-300 hover:border-gray-300"
        value={detalle.costoUnitario}
        onChange={(e) => onUpdate(index, 'costoUnitario', e.target.value)}
      />
      <button
        onClick={() => onRemove(index)}
        className="rounded-lg p-2 text-gray-500 hover:bg-red-50 hover:text-red-500 transition-colors cursor-pointer"
      >
        <Trash2 className="h-4 w-4" />
      </button>
      </div>
      {excedeCantidad && (
        <p className="text-xs text-red-500 pl-1">
          Stock disponible: {disponible} — cantidad ingresada supera el stock
        </p>
      )}
    </motion.div>
  )
}
