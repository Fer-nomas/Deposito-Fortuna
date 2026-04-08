'use client'

import { DashboardShell } from '@/components/layout/dashboard-shell'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn, formatCurrency, formatDateTime, formatNumber } from '@/lib/utils'
import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BarChart3,
  ChevronDown,
  ChevronUp,
  Package,
  ArrowLeftRight,
  FileText,
  Factory,
  Truck,
  AlertTriangle,
  Calendar,
  Search,
  Filter,
  Loader2,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'

// ============================================
// Types
// ============================================

interface StockPorPuntoData {
  id: string
  nombre: string
  codigo: string
  tipo: string
  color: string | null
  totalProductos: number
  valorizado: number
}

interface DashboardData {
  stats: {
    totalProductos: number
    stockValorizado: number
    movimientosHoy: number
    movimientosMes: number
    solicitudesPendientes: number
    productosStockBajo: number
    fletesMes: number
    productosToxicos: number
  }
  stockPorPunto: StockPorPuntoData[]
  productosStockBajo: {
    producto: string
    codigo: string
    punto: string
    cantidad: number
    minimo: number
  }[]
}

interface Movimiento {
  id: string
  fecha: string
  ticketNumero: string | null
  observacion: string | null
  flete: number
  tipoMovimiento: { nombre: string; codigo: string }
  puntoOrigen: { id: string; nombre: string; codigo: string; color: string | null } | null
  puntoDestino: { id: string; nombre: string; codigo: string; color: string | null } | null
  proveedor: { id: string; nombre: string; ruc: string | null } | null
  usuario: { id: string; nombre: string }
  detalles: {
    id: string
    cantidad: number
    costoUnitario: number
    tipoLinea: string
    producto: { id: string; codigo: string; descripcion: string }
  }[]
}

interface Producto {
  id: string
  codigo: string
  descripcion: string
}

// ============================================
// Report Section Component
// ============================================

function ReportSection({
  title,
  description,
  icon: Icon,
  color,
  delay,
  children,
  defaultOpen = false,
}: {
  title: string
  description: string
  icon: React.ElementType
  color: string
  delay: number
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <Card animate={true} delay={delay} className="overflow-hidden p-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-6 py-5 text-left transition-colors hover:bg-gray-50 cursor-pointer"
      >
        <div className="flex items-center gap-4">
          <div className="rounded-lg p-2.5" style={{ backgroundColor: `${color}15` }}>
            <Icon className="h-5 w-5" style={{ color }} />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-500">{description}</p>
          </div>
        </div>
        {open ? (
          <ChevronUp className="h-5 w-5 text-gray-500" />
        ) : (
          <ChevronDown className="h-5 w-5 text-gray-500" />
        )}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="border-t border-gray-200 px-6 py-5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  )
}

// ============================================
// Chart Colors
// ============================================

const CHART_COLORS = ['#6366f1', '#22d3ee', '#f59e0b', '#10b981', '#ef4444', '#a855f7', '#f97316', '#14b8a6']

// ============================================
// Custom Tooltip
// ============================================

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-xl">
      <p className="text-sm font-medium text-gray-900">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} className="text-sm" style={{ color: entry.color }}>
          {entry.name}: {formatNumber(entry.value)}
        </p>
      ))}
    </div>
  )
}

// ============================================
// Main Page
// ============================================

export default function ReportesPage() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  // Movimientos del periodo
  const [movimientos, setMovimientos] = useState<Movimiento[]>([])
  const [movLoading, setMovLoading] = useState(false)
  const [fechaDesde, setFechaDesde] = useState(() => {
    const d = new Date()
    d.setDate(1)
    return d.toISOString().split('T')[0]
  })
  const [fechaHasta, setFechaHasta] = useState(() => new Date().toISOString().split('T')[0])

  // Kardex
  const [productos, setProductos] = useState<Producto[]>([])
  const [selectedProducto, setSelectedProducto] = useState('')
  const [kardexData, setKardexData] = useState<Movimiento[]>([])
  const [kardexLoading, setKardexLoading] = useState(false)
  const [productoSearch, setProductoSearch] = useState('')

  // Consumo por area
  const [consumoData, setConsumoData] = useState<{ area: string; total: number }[]>([])
  const [consumoLoading, setConsumoLoading] = useState(false)

  // ============================================
  // Fetch Dashboard
  // ============================================

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await fetch('/api/dashboard')
        if (res.ok) {
          const data = await res.json()
          setDashboardData(data)
        }
      } catch {
        // ignore
      } finally {
        setLoading(false)
      }
    }
    fetchDashboard()
  }, [])

  // ============================================
  // Fetch Productos for Kardex
  // ============================================

  useEffect(() => {
    const fetchProductos = async () => {
      try {
        const res = await fetch('/api/productos?limit=1000')
        if (res.ok) {
          const data = await res.json()
          setProductos(
            (data.productos || []).map((p: any) => ({
              id: p.id,
              codigo: p.codigo,
              descripcion: p.descripcion,
            }))
          )
        }
      } catch {
        // ignore
      }
    }
    fetchProductos()
  }, [])

  // ============================================
  // Fetch Movimientos del Periodo
  // ============================================

  const fetchMovimientos = useCallback(async () => {
    setMovLoading(true)
    try {
      const params = new URLSearchParams({ limit: '500' })
      if (fechaDesde) params.set('fechaDesde', fechaDesde)
      if (fechaHasta) params.set('fechaHasta', fechaHasta)
      const res = await fetch(`/api/movimientos?${params}`)
      if (res.ok) {
        const data = await res.json()
        setMovimientos(data.movimientos || [])
      }
    } catch {
      // ignore
    } finally {
      setMovLoading(false)
    }
  }, [fechaDesde, fechaHasta])

  // ============================================
  // Fetch Kardex
  // ============================================

  const fetchKardex = useCallback(async (productoId: string) => {
    if (!productoId) return
    setKardexLoading(true)
    try {
      const res = await fetch(`/api/productos/${productoId}`)
      if (res.ok) {
        const data = await res.json()
        setKardexData(data.movimientoDetalles || [])
      }
    } catch {
      // ignore
    } finally {
      setKardexLoading(false)
    }
  }, [])

  // ============================================
  // Fetch Consumo por Area
  // ============================================

  const fetchConsumo = useCallback(async () => {
    setConsumoLoading(true)
    try {
      const params = new URLSearchParams({ limit: '1000' })
      if (fechaDesde) params.set('fechaDesde', fechaDesde)
      if (fechaHasta) params.set('fechaHasta', fechaHasta)
      const res = await fetch(`/api/movimientos?${params}`)
      if (res.ok) {
        const data = await res.json()
        const movs: Movimiento[] = data.movimientos || []

        // Aggregate consumption by destination (area productiva)
        const consumoMap: Record<string, number> = {}
        for (const m of movs) {
          for (const d of m.detalles) {
            if (d.tipoLinea === 'consumo') {
              const area = m.puntoDestino?.nombre || m.puntoOrigen?.nombre || 'Sin asignar'
              consumoMap[area] = (consumoMap[area] || 0) + d.cantidad
            }
          }
        }

        setConsumoData(
          Object.entries(consumoMap)
            .map(([area, total]) => ({ area, total }))
            .sort((a, b) => b.total - a.total)
        )
      }
    } catch {
      // ignore
    } finally {
      setConsumoLoading(false)
    }
  }, [fechaDesde, fechaHasta])

  // ============================================
  // Computed: Movimientos summary by type
  // ============================================

  const movimientosSummary = movimientos.reduce(
    (acc, m) => {
      const tipo = m.tipoMovimiento.nombre
      if (!acc[tipo]) acc[tipo] = { count: 0, items: 0 }
      acc[tipo].count++
      acc[tipo].items += m.detalles.length
      return acc
    },
    {} as Record<string, { count: number; items: number }>
  )

  const movimientosChartData = Object.entries(movimientosSummary).map(([tipo, data]) => ({
    name: tipo,
    movimientos: data.count,
    items: data.items,
  }))

  // ============================================
  // Computed: Toxic products from stock data
  // ============================================

  const toxicCount = dashboardData?.stats?.productosToxicos || 0
  const fletesMes = dashboardData?.stats?.fletesMes || 0

  // Filtered productos for Kardex search
  const filteredProductos = productoSearch
    ? productos.filter(
        (p) =>
          p.codigo.toLowerCase().includes(productoSearch.toLowerCase()) ||
          p.descripcion.toLowerCase().includes(productoSearch.toLowerCase())
      )
    : productos.slice(0, 50)

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
            <h1 className="text-2xl font-bold text-gray-900">Reportes</h1>
            <p className="text-sm text-gray-500">
              Analisis y reportes del sistema de deposito
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-300"
              />
              <span className="text-gray-500">a</span>
              <input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-300"
              />
            </div>
          </div>
        </motion.div>

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          </div>
        ) : (
          <>
            {/* 1. Stock actual por punto */}
            <ReportSection
              title="Stock Actual por Punto"
              description="Productos y valores por cada punto de stock"
              icon={Package}
              color="#6366f1"
              delay={0.1}
              defaultOpen={true}
            >
              <div className="space-y-4">
                {/* Chart */}
                {dashboardData?.stockPorPunto && dashboardData.stockPorPunto.length > 0 && (
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dashboardData.stockPorPunto}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                        <XAxis dataKey="codigo" tick={{ fill: '#6b7280', fontSize: 12 }} />
                        <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="totalProductos" name="Productos" fill="#6366f1" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="valorizado" name="Valor (Gs)" fill="#22d3ee" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 text-left">
                        <th className="px-4 py-3 font-medium text-gray-500">Punto</th>
                        <th className="px-4 py-3 font-medium text-gray-500">Codigo</th>
                        <th className="px-4 py-3 font-medium text-gray-500">Tipo</th>
                        <th className="px-4 py-3 font-medium text-gray-500 text-right">Productos</th>
                        <th className="px-4 py-3 font-medium text-gray-500 text-right">Valor Total (Gs)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboardData?.stockPorPunto?.map((punto) => (
                        <tr key={punto.id} className="border-b border-gray-200 transition-colors hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div
                                className="h-2.5 w-2.5 rounded-full"
                                style={{ backgroundColor: punto.color || '#6366f1' }}
                              />
                              <span className="text-gray-900">{punto.nombre}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 font-mono text-indigo-600">{punto.codigo}</td>
                          <td className="px-4 py-3">
                            <Badge variant={punto.tipo === 'deposito' ? 'info' : 'warning'}>
                              {punto.tipo === 'deposito' ? 'Deposito' : 'Area Productiva'}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-right text-gray-900 font-medium">
                            {formatNumber(punto.totalProductos, 0)}
                          </td>
                          <td className="px-4 py-3 text-right text-emerald-600 font-medium">
                            {formatCurrency(punto.valorizado)}
                          </td>
                        </tr>
                      ))}
                      {(!dashboardData?.stockPorPunto || dashboardData.stockPorPunto.length === 0) && (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                            No hay datos de stock
                          </td>
                        </tr>
                      )}
                    </tbody>
                    {dashboardData?.stockPorPunto && dashboardData.stockPorPunto.length > 0 && (
                      <tfoot>
                        <tr className="border-t border-gray-200">
                          <td colSpan={3} className="px-4 py-3 font-semibold text-gray-900">Total</td>
                          <td className="px-4 py-3 text-right font-semibold text-gray-900">
                            {formatNumber(
                              dashboardData.stockPorPunto.reduce((a, p) => a + p.totalProductos, 0),
                              0
                            )}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-emerald-600">
                            {formatCurrency(
                              dashboardData.stockPorPunto.reduce((a, p) => a + p.valorizado, 0)
                            )}
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            </ReportSection>

            {/* 3. Kardex por Producto */}
            <ReportSection
              title="Kardex por Producto"
              description="Historial completo de movimientos de un producto"
              icon={FileText}
              color="#f59e0b"
              delay={0.3}
            >
              <div className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <div className="flex-1">
                    <Input
                      label="Buscar producto"
                      placeholder="Codigo o descripcion..."
                      value={productoSearch}
                      onChange={(e) => setProductoSearch(e.target.value)}
                      icon={<Search className="h-4 w-4" />}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-400 mb-1.5">Seleccionar producto</label>
                    <select
                      value={selectedProducto}
                      onChange={(e) => {
                        setSelectedProducto(e.target.value)
                        if (e.target.value) fetchKardex(e.target.value)
                      }}
                      className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-800 transition-all duration-200 hover:border-gray-300 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-300"
                    >
                      <option value="" className="bg-white">Seleccionar...</option>
                      {filteredProductos.map((p) => (
                        <option key={p.id} value={p.id} className="bg-white">
                          {p.codigo} - {p.descripcion}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {kardexLoading && (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
                  </div>
                )}

                {!kardexLoading && kardexData.length > 0 && (
                  <div className="overflow-x-auto max-h-96 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-white">
                        <tr className="border-b border-gray-200 text-left">
                          <th className="px-4 py-3 font-medium text-gray-500">Fecha</th>
                          <th className="px-4 py-3 font-medium text-gray-500">Tipo</th>
                          <th className="px-4 py-3 font-medium text-gray-500">Ticket</th>
                          <th className="px-4 py-3 font-medium text-gray-500">Origen</th>
                          <th className="px-4 py-3 font-medium text-gray-500">Destino</th>
                          <th className="px-4 py-3 font-medium text-gray-500 text-right">Cantidad</th>
                          <th className="px-4 py-3 font-medium text-gray-500 text-right">Costo Unit.</th>
                          <th className="px-4 py-3 font-medium text-gray-500">Linea</th>
                          <th className="px-4 py-3 font-medium text-gray-500">Usuario</th>
                        </tr>
                      </thead>
                      <tbody>
                        {kardexData.map((md: any) => (
                          <tr key={md.id} className="border-b border-gray-200 transition-colors hover:bg-gray-50">
                            <td className="px-4 py-2.5 text-gray-700 whitespace-nowrap">
                              {new Date(md.movimiento.fecha).toLocaleDateString('es-PY')}
                            </td>
                            <td className="px-4 py-2.5">
                              <Badge variant="info">{md.movimiento.tipoMovimiento.nombre}</Badge>
                            </td>
                            <td className="px-4 py-2.5 font-mono text-xs text-indigo-600">
                              {md.movimiento.ticketNumero || '-'}
                            </td>
                            <td className="px-4 py-2.5 text-gray-700">
                              {md.movimiento.puntoOrigen?.nombre || '-'}
                            </td>
                            <td className="px-4 py-2.5 text-gray-700">
                              {md.movimiento.puntoDestino?.nombre || '-'}
                            </td>
                            <td className="px-4 py-2.5 text-right text-gray-900 font-medium">
                              {formatNumber(md.cantidad)}
                            </td>
                            <td className="px-4 py-2.5 text-right text-gray-700">
                              {formatCurrency(md.costoUnitario)}
                            </td>
                            <td className="px-4 py-2.5">
                              <Badge
                                variant={
                                  md.tipoLinea === 'consumo'
                                    ? 'warning'
                                    : md.tipoLinea === 'produccion'
                                    ? 'success'
                                    : 'default'
                                }
                              >
                                {md.tipoLinea}
                              </Badge>
                            </td>
                            <td className="px-4 py-2.5 text-gray-400">{md.movimiento.usuario.nombre}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {!kardexLoading && selectedProducto && kardexData.length === 0 && (
                  <div className="flex flex-col items-center py-8 text-gray-500">
                    <FileText className="h-10 w-10 mb-2 opacity-50" />
                    <p>No hay movimientos para este producto</p>
                  </div>
                )}
              </div>
            </ReportSection>

            {/* 4. Consumo por Area */}
            <ReportSection
              title="Consumo por Area"
              description="Consumo de materiales por area productiva"
              icon={Factory}
              color="#10b981"
              delay={0.4}
            >
              <div className="space-y-4">
                <Button onClick={fetchConsumo} loading={consumoLoading} size="sm">
                  <Filter className="h-4 w-4" />
                  Consultar Periodo
                </Button>

                {consumoData.length > 0 && (
                  <>
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                      <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={consumoData} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                            <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 12 }} />
                            <YAxis dataKey="area" type="category" tick={{ fill: '#6b7280', fontSize: 12 }} width={120} />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="total" name="Consumo" fill="#10b981" radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={consumoData}
                              dataKey="total"
                              nameKey="area"
                              cx="50%"
                              cy="50%"
                              outerRadius={100}
                              label={({ name, percent }) => `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`}
                              labelLine={{ stroke: '#9ca3af' }}
                            >
                              {consumoData.map((_, index) => (
                                <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-200 text-left">
                            <th className="px-4 py-3 font-medium text-gray-500">Area</th>
                            <th className="px-4 py-3 font-medium text-gray-500 text-right">Consumo Total</th>
                            <th className="px-4 py-3 font-medium text-gray-500 text-right">% del Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {consumoData.map((item, i) => {
                            const totalConsumo = consumoData.reduce((a, c) => a + c.total, 0)
                            return (
                              <tr key={i} className="border-b border-gray-200 transition-colors hover:bg-gray-50">
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    <div
                                      className="h-3 w-3 rounded-full"
                                      style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                                    />
                                    <span className="text-gray-900">{item.area}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-right text-gray-900 font-medium">
                                  {formatNumber(item.total)}
                                </td>
                                <td className="px-4 py-3 text-right text-gray-400">
                                  {totalConsumo > 0 ? ((item.total / totalConsumo) * 100).toFixed(1) : 0}%
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}

                {!consumoLoading && consumoData.length === 0 && (
                  <p className="text-sm text-gray-500">
                    Presione "Consultar Periodo" para ver el consumo por area
                  </p>
                )}
              </div>
            </ReportSection>

            {/* 5. Costos de Flete */}
            <ReportSection
              title="Costos de Flete"
              description="Costos de flete acumulados del periodo"
              icon={Truck}
              color="#a855f7"
              delay={0.5}
            >
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <p className="text-xs text-gray-500">Flete del Mes Actual</p>
                    <p className="mt-1 text-2xl font-bold text-gray-900">
                      {formatCurrency(fletesMes)} <span className="text-sm font-normal text-gray-500">Gs</span>
                    </p>
                  </div>
                </div>

                {movimientos.length > 0 && (
                  <>
                    <p className="text-sm text-gray-400">
                      Desglose de fletes en el periodo consultado ({fechaDesde} al {fechaHasta}):
                    </p>
                    <div className="overflow-x-auto max-h-64 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-white">
                          <tr className="border-b border-gray-200 text-left">
                            <th className="px-4 py-3 font-medium text-gray-500">Fecha</th>
                            <th className="px-4 py-3 font-medium text-gray-500">Ticket</th>
                            <th className="px-4 py-3 font-medium text-gray-500">Tipo</th>
                            <th className="px-4 py-3 font-medium text-gray-500">Proveedor</th>
                            <th className="px-4 py-3 font-medium text-gray-500 text-right">Flete (Gs)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {movimientos
                            .filter((m) => m.flete > 0)
                            .map((m) => (
                              <tr key={m.id} className="border-b border-gray-200 transition-colors hover:bg-gray-50">
                                <td className="px-4 py-2.5 text-gray-700 whitespace-nowrap">
                                  {formatDateTime(m.fecha)}
                                </td>
                                <td className="px-4 py-2.5 font-mono text-xs text-indigo-600">
                                  {m.ticketNumero || '-'}
                                </td>
                                <td className="px-4 py-2.5">
                                  <Badge variant="info">{m.tipoMovimiento.nombre}</Badge>
                                </td>
                                <td className="px-4 py-2.5 text-gray-700">
                                  {m.proveedor?.nombre || '-'}
                                </td>
                                <td className="px-4 py-2.5 text-right text-gray-900 font-medium">
                                  {formatCurrency(m.flete)}
                                </td>
                              </tr>
                            ))}
                          {movimientos.filter((m) => m.flete > 0).length === 0 && (
                            <tr>
                              <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                                No hay movimientos con flete en este periodo
                              </td>
                            </tr>
                          )}
                        </tbody>
                        {movimientos.filter((m) => m.flete > 0).length > 0 && (
                          <tfoot>
                            <tr className="border-t border-gray-200">
                              <td colSpan={4} className="px-4 py-3 font-semibold text-gray-900">Total Fletes Periodo</td>
                              <td className="px-4 py-3 text-right font-semibold text-emerald-600">
                                {formatCurrency(
                                  movimientos.reduce((a, m) => a + m.flete, 0)
                                )}
                              </td>
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    </div>
                  </>
                )}

                {movimientos.length === 0 && (
                  <p className="text-sm text-gray-500">
                    Consulte los movimientos del periodo para ver el desglose de fletes
                  </p>
                )}
              </div>
            </ReportSection>

            {/* 6. Productos Toxicos */}
            <ReportSection
              title="Productos Toxicos"
              description="Productos que requieren manejo especial actualmente en stock"
              icon={AlertTriangle}
              color="#ef4444"
              delay={0.6}
            >
              <div className="space-y-4">
                <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                    <div>
                      <p className="text-sm font-medium text-red-500">
                        {toxicCount} producto{toxicCount !== 1 ? 's' : ''} toxico{toxicCount !== 1 ? 's' : ''} en stock
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Productos con clasificacion que requiere manejo especial
                      </p>
                    </div>
                  </div>
                </div>

                {dashboardData?.productosStockBajo && dashboardData.productosStockBajo.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-400 mb-2">Productos con Stock Bajo (referencia)</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-200 text-left">
                            <th className="px-4 py-3 font-medium text-gray-500">Codigo</th>
                            <th className="px-4 py-3 font-medium text-gray-500">Producto</th>
                            <th className="px-4 py-3 font-medium text-gray-500">Punto</th>
                            <th className="px-4 py-3 font-medium text-gray-500 text-right">Actual</th>
                            <th className="px-4 py-3 font-medium text-gray-500 text-right">Minimo</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dashboardData.productosStockBajo.map((p, i) => (
                            <tr key={i} className="border-b border-gray-200 transition-colors hover:bg-gray-50">
                              <td className="px-4 py-2.5 font-mono text-indigo-600">{p.codigo}</td>
                              <td className="px-4 py-2.5 text-gray-900">{p.producto}</td>
                              <td className="px-4 py-2.5 text-gray-700">{p.punto}</td>
                              <td className="px-4 py-2.5 text-right text-red-500 font-medium">
                                {formatNumber(p.cantidad)}
                              </td>
                              <td className="px-4 py-2.5 text-right text-gray-400">
                                {formatNumber(p.minimo)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </ReportSection>
          </>
        )}
      </div>
    </DashboardShell>
  )
}
