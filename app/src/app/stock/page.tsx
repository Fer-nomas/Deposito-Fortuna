'use client'

import { DashboardShell } from '@/components/layout/dashboard-shell'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useEffect, useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Warehouse,
  Package,
  Factory,
  Truck,
  Wrench,
  Cog,
  Search,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  DollarSign,
  FileSpreadsheet,
  ArrowUpDown,
  SlidersHorizontal,
  X,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { exportarDepositoExcel, exportarTodoExcel, type PuntoExport } from '@/lib/export-excel'

const iconMap: Record<string, React.ComponentType<any>> = {
  warehouse: Warehouse,
  package: Package,
  truck: Truck,
  wrench: Wrench,
  cog: Cog,
  factory: Factory,
}

interface StockItem {
  productoId: string
  codigo: string
  descripcion: string
  cantidad: number
  costoCompra: number
  valorTotal: number
  unidad: string
  clasificacion: string | null
  clasificacionColor: string | null
  requiereManejoEspecial: boolean
  stockMinimo: number
  stockBajo: boolean
}

interface PuntoStockData {
  id: string
  nombre: string
  codigo: string
  tipo: string
  color: string | null
  icono: string | null
  encargado: string | null
  totalProductos: number
  valorizado: number
  stockBajo: number
  items: StockItem[]
}

type OrdenItems = 'az' | 'za' | 'codigo' | 'cantidad_asc' | 'cantidad_desc'

interface FiltroDeposito {
  texto: string
  clasificacion: string
  orden: OrdenItems
  soloStockBajo: boolean
  mostrarFiltros: boolean
}

const defaultFiltro: FiltroDeposito = {
  texto: '',
  clasificacion: '',
  orden: 'az',
  soloStockBajo: false,
  mostrarFiltros: false,
}

function aplicarFiltros(items: StockItem[], filtro: FiltroDeposito): StockItem[] {
  let resultado = [...items]

  if (filtro.texto) {
    const q = filtro.texto.toLowerCase()
    resultado = resultado.filter(
      (i) =>
        i.descripcion.toLowerCase().startsWith(q) ||
        i.codigo.toLowerCase().startsWith(q) ||
        i.descripcion.toLowerCase().includes(q) ||
        (i.clasificacion?.toLowerCase().includes(q) ?? false)
    )
  }

  if (filtro.clasificacion) {
    resultado = resultado.filter((i) => i.clasificacion === filtro.clasificacion)
  }

  if (filtro.soloStockBajo) {
    resultado = resultado.filter((i) => i.stockBajo)
  }

  switch (filtro.orden) {
    case 'az':
      resultado.sort((a, b) => a.descripcion.localeCompare(b.descripcion, 'es'))
      break
    case 'za':
      resultado.sort((a, b) => b.descripcion.localeCompare(a.descripcion, 'es'))
      break
    case 'codigo':
      resultado.sort((a, b) => a.codigo.localeCompare(b.codigo))
      break
    case 'cantidad_asc':
      resultado.sort((a, b) => a.cantidad - b.cantidad)
      break
    case 'cantidad_desc':
      resultado.sort((a, b) => b.cantidad - a.cantidad)
      break
  }

  return resultado
}

export default function StockPage() {
  const [puntos, setPuntos] = useState<PuntoStockData[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [expandidos, setExpandidos] = useState<Record<string, boolean>>({})
  const [filtros, setFiltros] = useState<Record<string, FiltroDeposito>>({})

  const fetchStock = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/stock')
      if (res.ok) {
        const data = await res.json()
        setPuntos(data.puntos || [])
        setLastUpdated(new Date())
        const expanded: Record<string, boolean> = {}
        for (const p of data.puntos || []) expanded[p.id] = true
        setExpandidos(expanded)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStock()
  }, [])

  const togglePunto = (id: string) => {
    setExpandidos((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const getFiltro = useCallback(
    (id: string): FiltroDeposito => filtros[id] ?? defaultFiltro,
    [filtros]
  )

  const setFiltro = useCallback(
    (id: string, changes: Partial<FiltroDeposito>) => {
      setFiltros((prev) => ({
        ...prev,
        [id]: { ...(prev[id] ?? defaultFiltro), ...changes },
      }))
    },
    []
  )

  const puntosFiltrados = useMemo(() => {
    return puntos.map((p) => {
      const filtro = getFiltro(p.id)
      const items = aplicarFiltros(p.items, filtro)
      return { ...p, items, totalProductos: items.length }
    })
  }, [puntos, filtros, getFiltro])

  const totales = useMemo(() => ({
    productos: puntos.reduce((a, p) => a + p.totalProductos, 0),
    valorizado: puntos.reduce((a, p) => a + p.valorizado, 0),
    alertas: puntos.reduce((a, p) => a + p.stockBajo, 0),
  }), [puntos])

  const handleExportarTodo = () => {
    const data: PuntoExport[] = puntos.map((p) => ({
      nombre: p.nombre,
      codigo: p.codigo,
      valorizado: p.valorizado,
      items: p.items,
    }))
    exportarTodoExcel(data)
  }

  const handleExportarDeposito = (punto: PuntoStockData, itemsFiltrados: StockItem[]) => {
    exportarDepositoExcel({
      nombre: punto.nombre,
      codigo: punto.codigo,
      valorizado: itemsFiltrados.reduce((a, i) => a + i.valorTotal, 0),
      items: itemsFiltrados,
    })
  }

  return (
    <DashboardShell>
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start justify-between gap-3 flex-wrap"
        >
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Stock Actual</h1>
            <p className="text-sm text-gray-500">
              {lastUpdated
                ? `Actualizado: ${lastUpdated.toLocaleTimeString('es-PY')}`
                : 'Cargando...'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportarTodo}
              disabled={loading || puntos.length === 0}
              className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-40"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Exportar todo
            </button>
            <button
              onClick={fetchStock}
              disabled={loading}
              className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </button>
          </div>
        </motion.div>

        {/* Resumen */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 gap-4 sm:grid-cols-3"
        >
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-indigo-50 p-2.5">
                <Package className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Productos con stock</p>
                <p className="text-xl font-bold text-gray-900">{totales.productos}</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-emerald-50 p-2.5">
                <DollarSign className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Valorizado total</p>
                <p className="text-xl font-bold text-gray-900 break-all">₲ {formatCurrency(totales.valorizado)}</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-red-50 p-2.5">
                <AlertTriangle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Alertas stock bajo</p>
                <p className="text-xl font-bold text-gray-900">{totales.alertas}</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Lista por depósito */}
        {loading && puntos.length === 0 ? (
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-40 animate-pulse rounded-xl bg-white" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {puntosFiltrados.map((punto, idx) => {
              const Icon = iconMap[punto.icono || ''] || Warehouse
              const expandido = expandidos[punto.id] ?? true
              const filtro = getFiltro(punto.id)
              const clasificacionesUnicas = [
                ...new Set(
                  puntos
                    .find((p) => p.id === punto.id)
                    ?.items.map((i) => i.clasificacion)
                    .filter(Boolean) as string[]
                ),
              ].sort()
              const hayFiltrosActivos =
                filtro.texto || filtro.clasificacion || filtro.soloStockBajo || filtro.orden !== 'az'

              return (
                <motion.div
                  key={punto.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + idx * 0.05 }}
                  className="rounded-xl border border-gray-200 bg-white overflow-hidden"
                >
                  {/* Header del punto */}
                  <div className="flex w-full items-center justify-between p-5">
                    <button
                      onClick={() => togglePunto(punto.id)}
                      className="flex flex-1 items-center gap-4 text-left"
                    >
                      <div
                        className="rounded-lg p-2.5 shrink-0"
                        style={{ backgroundColor: `${punto.color || '#6366f1'}15` }}
                      >
                        <Icon className="h-5 w-5" style={{ color: punto.color || '#6366f1' }} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-gray-900">{punto.nombre}</h3>
                          <span className="text-xs text-gray-400">{punto.codigo}</span>
                          {punto.stockBajo > 0 && (
                            <Badge variant="danger">
                              <AlertTriangle className="mr-1 h-3 w-3" />
                              {punto.stockBajo} alerta{punto.stockBajo > 1 ? 's' : ''}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
                          <span>{punto.totalProductos} productos{hayFiltrosActivos ? ' (filtrado)' : ''}</span>
                          <span>₲ {formatCurrency(punto.valorizado)}</span>
                          {punto.encargado && <span>Encargado: {punto.encargado}</span>}
                        </div>
                      </div>
                    </button>

                    {/* Acciones del depósito */}
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <button
                        onClick={() => setFiltro(punto.id, { mostrarFiltros: !filtro.mostrarFiltros })}
                        className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition-colors ${
                          filtro.mostrarFiltros || hayFiltrosActivos
                            ? 'border-indigo-300 bg-indigo-50 text-indigo-600'
                            : 'border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100'
                        }`}
                        title="Filtros"
                      >
                        <SlidersHorizontal className="h-3.5 w-3.5" />
                        Filtros
                        {hayFiltrosActivos && (
                          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-indigo-500 text-[10px] font-bold text-white">
                            {[filtro.texto, filtro.clasificacion, filtro.soloStockBajo, filtro.orden !== 'az'].filter(Boolean).length}
                          </span>
                        )}
                      </button>
                      <button
                        onClick={() => handleExportarDeposito(punto, punto.items)}
                        disabled={punto.items.length === 0}
                        className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-40"
                        title="Exportar Excel"
                      >
                        <FileSpreadsheet className="h-3.5 w-3.5" />
                        Excel
                      </button>
                      <button onClick={() => togglePunto(punto.id)} className="p-1 text-gray-400">
                        {expandido ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Panel de filtros */}
                  <AnimatePresence>
                    {filtro.mostrarFiltros && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="border-t border-gray-100 bg-gray-50 px-5 py-3 flex flex-wrap items-center gap-3">
                          {/* Búsqueda por texto */}
                          <div className="relative min-w-[180px]">
                            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                            <input
                              type="text"
                              placeholder="Buscar o empieza con..."
                              value={filtro.texto}
                              onChange={(e) => setFiltro(punto.id, { texto: e.target.value })}
                              className="w-full rounded-md border border-gray-200 bg-white py-1.5 pl-8 pr-3 text-xs text-gray-800 placeholder-gray-400 focus:border-indigo-400 focus:outline-none"
                            />
                          </div>

                          {/* Clasificación */}
                          <select
                            value={filtro.clasificacion}
                            onChange={(e) => setFiltro(punto.id, { clasificacion: e.target.value })}
                            className="rounded-md border border-gray-200 bg-white py-1.5 pl-2.5 pr-7 text-xs text-gray-700 focus:border-indigo-400 focus:outline-none"
                          >
                            <option value="">Todas las clasificaciones</option>
                            {clasificacionesUnicas.map((c) => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>

                          {/* Orden */}
                          <div className="flex items-center gap-1">
                            <ArrowUpDown className="h-3.5 w-3.5 text-gray-400" />
                            <select
                              value={filtro.orden}
                              onChange={(e) => setFiltro(punto.id, { orden: e.target.value as OrdenItems })}
                              className="rounded-md border border-gray-200 bg-white py-1.5 pl-2.5 pr-7 text-xs text-gray-700 focus:border-indigo-400 focus:outline-none"
                            >
                              <option value="az">A → Z</option>
                              <option value="za">Z → A</option>
                              <option value="codigo">Por código</option>
                              <option value="cantidad_desc">Mayor cantidad</option>
                              <option value="cantidad_asc">Menor cantidad</option>
                            </select>
                          </div>

                          {/* Stock bajo */}
                          <button
                            onClick={() => setFiltro(punto.id, { soloStockBajo: !filtro.soloStockBajo })}
                            className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs transition-colors ${
                              filtro.soloStockBajo
                                ? 'border-red-400/50 bg-red-50 text-red-500'
                                : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-100'
                            }`}
                          >
                            <AlertTriangle className="h-3.5 w-3.5" />
                            Solo stock bajo
                          </button>

                          {/* Limpiar filtros */}
                          {hayFiltrosActivos && (
                            <button
                              onClick={() =>
                                setFiltro(punto.id, {
                                  texto: '',
                                  clasificacion: '',
                                  orden: 'az',
                                  soloStockBajo: false,
                                })
                              }
                              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600"
                            >
                              <X className="h-3 w-3" />
                              Limpiar
                            </button>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Tabla de stock */}
                  <AnimatePresence>
                    {expandido && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        {punto.items.length === 0 ? (
                          <div className="border-t border-gray-200 px-5 py-8 text-center text-sm text-gray-400">
                            {hayFiltrosActivos ? 'Sin resultados para los filtros aplicados' : 'Sin stock en este punto'}
                          </div>
                        ) : (
                          <div className="overflow-x-auto border-t border-gray-200">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b border-gray-200 text-left">
                                  <th className="px-5 py-3 font-medium text-gray-500">Código</th>
                                  <th className="px-5 py-3 font-medium text-gray-500">Producto</th>
                                  <th className="px-5 py-3 font-medium text-gray-500">Clasificación</th>
                                  <th className="px-5 py-3 font-medium text-gray-500 text-right">Cantidad</th>
                                  <th className="px-5 py-3 font-medium text-gray-500 text-right">Costo Unit.</th>
                                  <th className="px-5 py-3 font-medium text-gray-500 text-right">Valor Total</th>
                                  <th className="px-5 py-3 font-medium text-gray-500 text-right">Mín.</th>
                                </tr>
                              </thead>
                              <tbody>
                                {punto.items.map((item) => (
                                  <tr
                                    key={item.productoId}
                                    className={`border-b border-gray-200 transition-colors hover:bg-gray-50 ${
                                      item.stockBajo ? 'bg-red-500/[0.03]' : ''
                                    }`}
                                  >
                                    <td className="px-5 py-3 font-mono text-xs text-gray-400">
                                      {item.codigo}
                                    </td>
                                    <td className="px-5 py-3">
                                      <div className="flex items-center gap-2">
                                        <span className={item.stockBajo ? 'text-red-500' : 'text-gray-900'}>
                                          {item.descripcion}
                                        </span>
                                        {item.requiereManejoEspecial && (
                                          <Badge variant="warning" className="text-[10px]">Especial</Badge>
                                        )}
                                        {item.stockBajo && (
                                          <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-5 py-3">
                                      {item.clasificacion ? (
                                        <span
                                          className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                                          style={{
                                            backgroundColor: `${item.clasificacionColor || '#6366f1'}20`,
                                            color: item.clasificacionColor || '#6366f1',
                                          }}
                                        >
                                          {item.clasificacion}
                                        </span>
                                      ) : (
                                        <span className="text-gray-400">—</span>
                                      )}
                                    </td>
                                    <td className="px-5 py-3 text-right">
                                      <span className={`font-medium ${item.stockBajo ? 'text-red-500' : 'text-gray-900'}`}>
                                        {item.cantidad.toLocaleString('es-PY')}
                                      </span>
                                      {item.unidad && (
                                        <span className="ml-1 text-xs text-gray-400">{item.unidad}</span>
                                      )}
                                    </td>
                                    <td className="px-5 py-3 text-right text-gray-400">
                                      ₲ {formatCurrency(item.costoCompra)}
                                    </td>
                                    <td className="px-5 py-3 text-right font-medium text-emerald-600">
                                      ₲ {formatCurrency(item.valorTotal)}
                                    </td>
                                    <td className="px-5 py-3 text-right text-gray-400 text-xs">
                                      {item.stockMinimo > 0 ? item.stockMinimo.toLocaleString('es-PY') : '—'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </DashboardShell>
  )
}
