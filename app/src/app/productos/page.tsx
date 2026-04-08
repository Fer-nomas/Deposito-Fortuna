'use client'

import { DashboardShell } from '@/components/layout/dashboard-shell'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn, formatCurrency, formatNumber } from '@/lib/utils'
import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  X,
  Package,
  ChevronLeft,
  ChevronRight,
  Warehouse,
  AlertTriangle,
  Eye,
  ArrowLeftRight,
  Clock,
} from 'lucide-react'

// ============================================
// Types
// ============================================

interface Clasificacion {
  id: string
  nombre: string
  color: string | null
  icono: string | null
  requiereManejoEspecial: boolean
}

interface UnidadMedida {
  id: string
  nombre: string
  abreviatura: string
}

interface PuntoStock {
  id: string
  nombre: string
  codigo: string
  color: string | null
  tipo?: string
}

interface StockPorPuntoItem {
  id: string
  puntoStockId: string
  cantidad: number
  puntoStock: PuntoStock
}

interface Producto {
  id: string
  codigo: string
  descripcion: string
  clasificacionId: string | null
  unidadId: string
  costoCompra: number
  costoVenta: number
  stockMinimo: number
  imagenUrl: string | null
  notas: string | null
  activo: boolean
  clasificacion: Clasificacion | null
  unidad: UnidadMedida
  creadoPorPunto: { id: string; nombre: string; codigo: string } | null
  stockPorPunto: StockPorPuntoItem[]
  stockTotal: number
}

interface MovimientoDetalle {
  id: string
  cantidad: number
  costoUnitario: number
  tipoLinea: string
  movimiento: {
    id: string
    fecha: string
    ticketNumero: string | null
    tipoMovimiento: { nombre: string; codigo: string }
    puntoOrigen: { nombre: string; codigo: string } | null
    puntoDestino: { nombre: string; codigo: string } | null
    usuario: { nombre: string }
  }
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

// ============================================
// Zod Schema
// ============================================

const productoSchema = z.object({
  descripcion: z.string().min(2, 'La descripcion debe tener al menos 2 caracteres').max(500),
  clasificacionId: z.string().optional(),
  unidadId: z.string().min(1, 'Seleccione una unidad de medida'),
  costoCompra: z.string().or(z.number()).transform(Number).pipe(z.number().min(0, 'El costo debe ser mayor o igual a 0')),
  costoVenta: z.string().or(z.number()).transform(Number).pipe(z.number().min(0, 'El costo debe ser mayor o igual a 0')),
  stockMinimo: z.string().or(z.number()).transform(Number).pipe(z.number().min(0, 'El stock minimo debe ser mayor o igual a 0')),
  creadoPorPuntoId: z.string().optional(),
  notas: z.string().optional(),
})

type ProductoFormData = {
  descripcion: string
  clasificacionId?: string
  unidadId: string
  costoCompra: number
  costoVenta: number
  stockMinimo: number
  creadoPorPuntoId?: string
  notas?: string
}

// ============================================
// Main Component
// ============================================

export default function ProductosPage() {
  const [productos, setProductos] = useState<Producto[]>([])
  const [pagination, setPagination] = useState<Pagination>({
    page: 1, limit: 20, total: 0, totalPages: 0,
  })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterClasificacion, setFilterClasificacion] = useState('')
  const [filterPunto, setFilterPunto] = useState('')

  const [clasificaciones, setClasificaciones] = useState<Clasificacion[]>([])
  const [unidades, setUnidades] = useState<UnidadMedida[]>([])
  const [puntosStock, setPuntosStock] = useState<PuntoStock[]>([])

  const [modalOpen, setModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Producto | null>(null)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deletingProduct, setDeletingProduct] = useState<Producto | null>(null)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [detailProduct, setDetailProduct] = useState<(Producto & { movimientoDetalles?: MovimientoDetalle[] }) | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // ============================================
  // Fetch catalogs
  // ============================================

  useEffect(() => {
    Promise.all([
      fetch('/api/productos?limit=1').then((r) => r.json()),
      fetchCatalogs(),
    ])
  }, [])

  const fetchCatalogs = async () => {
    try {
      const [clasRes, uniRes, punRes] = await Promise.all([
        fetch('/api/productos/catalogos?tipo=clasificaciones'),
        fetch('/api/productos/catalogos?tipo=unidades'),
        fetch('/api/productos/catalogos?tipo=puntos'),
      ])

      // If the catalogos endpoint doesn't exist yet, use direct prisma calls
      // For now, try parsing, fallback to empty
      if (clasRes.ok) {
        const c = await clasRes.json()
        setClasificaciones(c)
      }
      if (uniRes.ok) {
        const u = await uniRes.json()
        setUnidades(u)
      }
      if (punRes.ok) {
        const p = await punRes.json()
        setPuntosStock(p)
      }
    } catch {
      // Will load from inline fetch below
    }
  }

  // ============================================
  // Fetch products
  // ============================================

  const fetchProductos = useCallback(async (page = 1) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      })
      if (search) params.set('search', search)
      if (filterClasificacion) params.set('clasificacionId', filterClasificacion)
      if (filterPunto) params.set('puntoStockId', filterPunto)

      const res = await fetch(`/api/productos?${params}`)
      const data = await res.json()
      setProductos(data.productos || [])
      setPagination(data.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 })
    } catch {
      setProductos([])
    } finally {
      setLoading(false)
    }
  }, [search, filterClasificacion, filterPunto])

  useEffect(() => {
    const timer = setTimeout(() => fetchProductos(1), 300)
    return () => clearTimeout(timer)
  }, [fetchProductos])

  // ============================================
  // Form
  // ============================================

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    setValue,
  } = useForm<ProductoFormData>({
    resolver: zodResolver(productoSchema) as any,
    defaultValues: {
      descripcion: '',
      clasificacionId: '',
      unidadId: '',
      costoCompra: 0,
      costoVenta: 0,
      stockMinimo: 0,
      creadoPorPuntoId: '',
      notas: '',
    },
  })

  const openCreateModal = () => {
    setEditingProduct(null)
    reset({
      descripcion: '',
      clasificacionId: '',
      unidadId: '',
      costoCompra: 0,
      costoVenta: 0,
      stockMinimo: 0,
      creadoPorPuntoId: '',
      notas: '',
    })
    setModalOpen(true)
  }

  const openEditModal = (product: Producto) => {
    setEditingProduct(product)
    reset({
      descripcion: product.descripcion,
      clasificacionId: product.clasificacionId || '',
      unidadId: product.unidadId,
      costoCompra: product.costoCompra,
      costoVenta: product.costoVenta,
      stockMinimo: product.stockMinimo,
      creadoPorPuntoId: '',
      notas: product.notas || '',
    })
    setModalOpen(true)
  }

  const openDetailModal = async (product: Producto) => {
    setDetailLoading(true)
    setDetailModalOpen(true)
    try {
      const res = await fetch(`/api/productos/${product.id}`)
      const data = await res.json()
      setDetailProduct(data)
    } catch {
      setDetailProduct(product)
    } finally {
      setDetailLoading(false)
    }
  }

  const onSubmit = async (data: ProductoFormData) => {
    setSaving(true)
    try {
      const payload = {
        ...data,
        clasificacionId: data.clasificacionId || null,
        creadoPorPuntoId: data.creadoPorPuntoId || null,
      }

      const url = editingProduct
        ? `/api/productos/${editingProduct.id}`
        : '/api/productos'
      const method = editingProduct ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al guardar')
      }

      setModalOpen(false)
      fetchProductos(pagination.page)
    } catch (error: any) {
      alert(error.message || 'Error al guardar producto')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingProduct) return
    setSaving(true)
    try {
      const res = await fetch(`/api/productos/${deletingProduct.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Error al eliminar')
      setDeleteModalOpen(false)
      setDeletingProduct(null)
      fetchProductos(pagination.page)
    } catch {
      alert('Error al eliminar producto')
    } finally {
      setSaving(false)
    }
  }

  // ============================================
  // Render
  // ============================================

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
            <h1 className="text-2xl font-bold text-gray-900">Productos</h1>
            <p className="text-sm text-gray-500">
              {pagination.total} producto{pagination.total !== 1 ? 's' : ''} registrado{pagination.total !== 1 ? 's' : ''}
            </p>
          </div>
          <Button onClick={openCreateModal}>
            <Plus className="h-4 w-4" />
            Nuevo Producto
          </Button>
        </motion.div>

        {/* Filters */}
        <Card animate={true} delay={0.1}>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex-1">
              <Input
                placeholder="Buscar por codigo o descripcion..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                icon={<Search className="h-4 w-4" />}
              />
            </div>
            <select
              value={filterClasificacion}
              onChange={(e) => setFilterClasificacion(e.target.value)}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-800 transition-all duration-200 hover:border-gray-300 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-300"
            >
              <option value="" className="bg-white">Todas las clasificaciones</option>
              {clasificaciones.map((c) => (
                <option key={c.id} value={c.id} className="bg-white">{c.nombre}</option>
              ))}
            </select>
            <select
              value={filterPunto}
              onChange={(e) => setFilterPunto(e.target.value)}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-800 transition-all duration-200 hover:border-gray-300 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-300"
            >
              <option value="" className="bg-white">Todos los puntos</option>
              {puntosStock.map((p) => (
                <option key={p.id} value={p.id} className="bg-white">{p.nombre}</option>
              ))}
            </select>
          </div>
        </Card>

        {/* Table */}
        <Card animate={true} delay={0.2} className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left">
                  <th className="px-6 py-4 font-medium text-gray-500">Codigo</th>
                  <th className="px-6 py-4 font-medium text-gray-500">Descripcion</th>
                  <th className="px-6 py-4 font-medium text-gray-500">Clasificacion</th>
                  <th className="px-6 py-4 font-medium text-gray-500">Unidad</th>
                  <th className="px-6 py-4 font-medium text-gray-500 text-right">Stock Total</th>
                  <th className="px-6 py-4 font-medium text-gray-500 text-right">Costo Compra</th>
                  <th className="px-6 py-4 font-medium text-gray-500 text-right">Costo Venta</th>
                  <th className="px-6 py-4 font-medium text-gray-500 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(8)].map((_, i) => (
                    <tr key={i} className="border-b border-gray-200">
                      {[...Array(8)].map((_, j) => (
                        <td key={j} className="px-6 py-4">
                          <div className="h-4 animate-pulse rounded bg-gray-50" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : productos.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-16 text-center">
                      <Package className="mx-auto h-12 w-12 text-gray-400" />
                      <p className="mt-3 text-gray-500">No se encontraron productos</p>
                      <Button variant="ghost" size="sm" className="mt-2" onClick={openCreateModal}>
                        <Plus className="h-4 w-4" /> Crear producto
                      </Button>
                    </td>
                  </tr>
                ) : (
                  <AnimatePresence mode="popLayout">
                    {productos.map((producto, index) => (
                      <motion.tr
                        key={producto.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2, delay: index * 0.03 }}
                        className="border-b border-gray-200 transition-colors hover:bg-gray-50"
                      >
                        <td className="px-6 py-4">
                          <span className="font-mono text-indigo-600">{producto.codigo}</span>
                        </td>
                        <td className="px-6 py-4 text-gray-900 max-w-[300px] truncate">
                          {producto.descripcion}
                        </td>
                        <td className="px-6 py-4">
                          {producto.clasificacion ? (
                            <span
                              className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium"
                              style={{
                                backgroundColor: `${producto.clasificacion.color || '#6366f1'}15`,
                                color: producto.clasificacion.color || '#6366f1',
                                borderColor: `${producto.clasificacion.color || '#6366f1'}30`,
                              }}
                            >
                              {producto.clasificacion.nombre}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-gray-400">
                          {producto.unidad.abreviatura}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span
                            className={cn(
                              'font-medium',
                              producto.stockTotal <= Number(producto.stockMinimo)
                                ? 'text-red-500'
                                : 'text-gray-900'
                            )}
                          >
                            {formatNumber(producto.stockTotal)}
                          </span>
                          {producto.stockTotal <= Number(producto.stockMinimo) && producto.stockMinimo > 0 && (
                            <AlertTriangle className="ml-1 inline h-3.5 w-3.5 text-red-500" />
                          )}
                        </td>
                        <td className="px-6 py-4 text-right text-gray-700">
                          {formatCurrency(producto.costoCompra)}
                        </td>
                        <td className="px-6 py-4 text-right text-gray-700">
                          {formatCurrency(producto.costoVenta)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => openDetailModal(producto)}
                              className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-50 hover:text-blue-600 cursor-pointer"
                              title="Ver detalle"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => openEditModal(producto)}
                              className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-50 hover:text-indigo-600 cursor-pointer"
                              title="Editar"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => {
                                setDeletingProduct(producto)
                                setDeleteModalOpen(true)
                              }}
                              className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-50 hover:text-red-500 cursor-pointer"
                              title="Eliminar"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-200 px-6 py-4">
              <p className="text-sm text-gray-500">
                Mostrando {(pagination.page - 1) * pagination.limit + 1} -{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} de{' '}
                {pagination.total}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => fetchProductos(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {Array.from({ length: Math.min(pagination.totalPages, 5) }, (_, i) => {
                  let pageNum: number
                  if (pagination.totalPages <= 5) {
                    pageNum = i + 1
                  } else if (pagination.page <= 3) {
                    pageNum = i + 1
                  } else if (pagination.page >= pagination.totalPages - 2) {
                    pageNum = pagination.totalPages - 4 + i
                  } else {
                    pageNum = pagination.page - 2 + i
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => fetchProductos(pageNum)}
                      className={cn(
                        'h-8 w-8 rounded-lg text-sm font-medium transition-colors cursor-pointer',
                        pageNum === pagination.page
                          ? 'bg-indigo-600 text-gray-900'
                          : 'text-gray-400 hover:bg-gray-50'
                      )}
                    >
                      {pageNum}
                    </button>
                  )
                })}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => fetchProductos(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) setModalOpen(false)
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-lg rounded-xl border border-gray-200 bg-white shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
                </h2>
                <button
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 px-6 py-5">
                {editingProduct && (
                  <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5">
                    <span className="text-xs text-gray-500">Codigo: </span>
                    <span className="font-mono text-sm text-indigo-600">{editingProduct.codigo}</span>
                  </div>
                )}

                <Input
                  label="Descripcion *"
                  placeholder="Nombre del producto"
                  error={errors.descripcion?.message}
                  {...register('descripcion')}
                />

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-gray-400">
                      Clasificacion
                    </label>
                    <select
                      {...register('clasificacionId')}
                      className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-800 transition-all duration-200 hover:border-gray-300 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-300"
                    >
                      <option value="" className="bg-white">Sin clasificacion</option>
                      {clasificaciones.map((c) => (
                        <option key={c.id} value={c.id} className="bg-white">{c.nombre}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-gray-400">
                      Unidad de Medida *
                    </label>
                    <select
                      {...register('unidadId')}
                      className={cn(
                        'w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-800 transition-all duration-200 hover:border-gray-300 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-300',
                        errors.unidadId && 'border-red-500 focus:border-red-500 focus:ring-red-500/50'
                      )}
                    >
                      <option value="" className="bg-white">Seleccionar...</option>
                      {unidades.map((u) => (
                        <option key={u.id} value={u.id} className="bg-white">
                          {u.nombre} ({u.abreviatura})
                        </option>
                      ))}
                    </select>
                    {errors.unidadId && (
                      <p className="text-xs text-red-500">{errors.unidadId.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <Input
                    label="Costo Compra"
                    type="number"
                    step="1"
                    min="0"
                    error={errors.costoCompra?.message}
                    {...register('costoCompra')}
                  />
                  <Input
                    label="Costo Venta"
                    type="number"
                    step="1"
                    min="0"
                    error={errors.costoVenta?.message}
                    {...register('costoVenta')}
                  />
                  <Input
                    label="Stock Minimo"
                    type="number"
                    step="0.001"
                    min="0"
                    error={errors.stockMinimo?.message}
                    {...register('stockMinimo')}
                  />
                </div>

                {!editingProduct && (
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-gray-400">
                      Punto de Stock (origen)
                    </label>
                    <select
                      {...register('creadoPorPuntoId')}
                      className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-800 transition-all duration-200 hover:border-gray-300 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-300"
                    >
                      <option value="" className="bg-white">Sin punto especifico</option>
                      {puntosStock.map((p) => (
                        <option key={p.id} value={p.id} className="bg-white">{p.nombre}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-400">Notas</label>
                  <textarea
                    {...register('notas')}
                    rows={3}
                    placeholder="Notas adicionales..."
                    className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 transition-all duration-200 hover:border-gray-300 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-300 resize-none"
                  />
                </div>

                {/* Stock breakdown in edit mode */}
                {editingProduct && editingProduct.stockPorPunto.length > 0 && (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-400">
                      Stock por Punto
                    </label>
                    <div className="space-y-1.5">
                      {editingProduct.stockPorPunto.map((sp) => (
                        <div
                          key={sp.id}
                          className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-2"
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: sp.puntoStock.color || '#6366f1' }}
                            />
                            <span className="text-sm text-gray-700">{sp.puntoStock.nombre}</span>
                          </div>
                          <span className="text-sm font-medium text-gray-900">
                            {formatNumber(sp.cantidad)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setModalOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" loading={saving}>
                    {editingProduct ? 'Guardar Cambios' : 'Crear Producto'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteModalOpen && deletingProduct && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setDeleteModalOpen(false)
                setDeletingProduct(null)
              }
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-2xl"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="rounded-full bg-red-50 p-3">
                  <AlertTriangle className="h-6 w-6 text-red-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Eliminar Producto</h3>
                  <p className="text-sm text-gray-500">Esta accion no se puede deshacer</p>
                </div>
              </div>

              <p className="text-sm text-gray-700 mb-6">
                Se eliminara el producto{' '}
                <span className="font-mono text-indigo-600">{deletingProduct.codigo}</span>
                {' - '}
                <span className="font-medium text-gray-900">{deletingProduct.descripcion}</span>.
                El producto quedara inactivo y no aparecera en las listas.
              </p>

              <div className="flex items-center justify-end gap-3">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setDeleteModalOpen(false)
                    setDeletingProduct(null)
                  }}
                >
                  Cancelar
                </Button>
                <Button variant="danger" loading={saving} onClick={handleDelete}>
                  Eliminar
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Detail Modal */}
      <AnimatePresence>
        {detailModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setDetailModalOpen(false)
                setDetailProduct(null)
              }
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-2xl"
            >
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
                <h2 className="text-lg font-semibold text-gray-900">Detalle del Producto</h2>
                <button
                  onClick={() => {
                    setDetailModalOpen(false)
                    setDetailProduct(null)
                  }}
                  className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {detailLoading ? (
                <div className="space-y-4 px-6 py-5">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-6 animate-pulse rounded bg-gray-50" />
                  ))}
                </div>
              ) : detailProduct ? (
                <div className="space-y-6 px-6 py-5">
                  {/* Product info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500">Codigo</p>
                      <p className="font-mono text-lg text-indigo-600">{detailProduct.codigo}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Descripcion</p>
                      <p className="text-gray-900">{detailProduct.descripcion}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Clasificacion</p>
                      {detailProduct.clasificacion ? (
                        <span
                          className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium mt-1"
                          style={{
                            backgroundColor: `${detailProduct.clasificacion.color || '#6366f1'}15`,
                            color: detailProduct.clasificacion.color || '#6366f1',
                            borderColor: `${detailProduct.clasificacion.color || '#6366f1'}30`,
                          }}
                        >
                          {detailProduct.clasificacion.nombre}
                        </span>
                      ) : (
                        <p className="text-gray-400">-</p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Unidad</p>
                      <p className="text-gray-700">
                        {detailProduct.unidad.nombre} ({detailProduct.unidad.abreviatura})
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Costo Compra</p>
                      <p className="text-gray-900 font-medium">{formatCurrency(detailProduct.costoCompra)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Costo Venta</p>
                      <p className="text-gray-900 font-medium">{formatCurrency(detailProduct.costoVenta)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Stock Total</p>
                      <p className={cn(
                        'font-medium text-lg',
                        detailProduct.stockTotal <= Number(detailProduct.stockMinimo) && detailProduct.stockMinimo > 0
                          ? 'text-red-500'
                          : 'text-emerald-600'
                      )}>
                        {formatNumber(detailProduct.stockTotal)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Stock Minimo</p>
                      <p className="text-gray-700">{formatNumber(detailProduct.stockMinimo)}</p>
                    </div>
                  </div>

                  {detailProduct.notas && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Notas</p>
                      <p className="text-sm text-gray-400 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                        {detailProduct.notas}
                      </p>
                    </div>
                  )}

                  {/* Stock por punto */}
                  {detailProduct.stockPorPunto.length > 0 && (
                    <div>
                      <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-3">
                        <Warehouse className="h-4 w-4 text-indigo-600" />
                        Stock por Punto
                      </h3>
                      <div className="space-y-2">
                        {detailProduct.stockPorPunto.map((sp) => (
                          <div
                            key={sp.id}
                            className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3"
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className="h-3 w-3 rounded-full"
                                style={{ backgroundColor: sp.puntoStock.color || '#6366f1' }}
                              />
                              <div>
                                <p className="text-sm font-medium text-gray-900">{sp.puntoStock.nombre}</p>
                                <p className="text-xs text-gray-500">{sp.puntoStock.codigo}</p>
                              </div>
                            </div>
                            <span className="text-lg font-semibold text-gray-900">
                              {formatNumber(sp.cantidad)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Movement history */}
                  {detailProduct.movimientoDetalles && detailProduct.movimientoDetalles.length > 0 && (
                    <div>
                      <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-3">
                        <ArrowLeftRight className="h-4 w-4 text-indigo-600" />
                        Historial de Movimientos
                      </h3>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {detailProduct.movimientoDetalles.map((md) => (
                          <div
                            key={md.id}
                            className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <Badge variant="info">{md.movimiento.tipoMovimiento.nombre}</Badge>
                                {md.movimiento.ticketNumero && (
                                  <span className="text-xs text-gray-500">{md.movimiento.ticketNumero}</span>
                                )}
                              </div>
                              <span className="text-sm font-medium text-gray-900">
                                {formatNumber(md.cantidad)} {detailProduct.unidad.abreviatura}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-xs text-gray-500">
                              <span>
                                {md.movimiento.puntoOrigen?.nombre}
                                {md.movimiento.puntoOrigen && md.movimiento.puntoDestino && ' -> '}
                                {md.movimiento.puntoDestino?.nombre}
                                {' - '}{md.movimiento.usuario.nombre}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {new Date(md.movimiento.fecha).toLocaleDateString('es-PY')}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardShell>
  )
}
