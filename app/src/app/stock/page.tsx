'use client'

import { DashboardShell } from '@/components/layout/dashboard-shell'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useEffect, useState, useMemo } from 'react'
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
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

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

export default function StockPage() {
  const [puntos, setPuntos] = useState<PuntoStockData[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [expandidos, setExpandidos] = useState<Record<string, boolean>>({})
  const [busqueda, setBusqueda] = useState('')
  const [soloStockBajo, setSoloStockBajo] = useState(false)

  const fetchStock = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/stock')
      if (res.ok) {
        const data = await res.json()
        setPuntos(data.puntos || [])
        setLastUpdated(new Date())
        // Expandir todos por defecto
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

  const puntosFiltrados = useMemo(() => {
    return puntos.map((p) => {
      let items = p.items
      if (busqueda) {
        const q = busqueda.toLowerCase()
        items = items.filter(
          (i) =>
            i.descripcion.toLowerCase().includes(q) ||
            i.codigo.toLowerCase().includes(q) ||
            (i.clasificacion?.toLowerCase().includes(q) ?? false)
        )
      }
      if (soloStockBajo) {
        items = items.filter((i) => i.stockBajo)
      }
      return { ...p, items, totalProductos: items.length }
    }).filter((p) => p.items.length > 0 || (!busqueda && !soloStockBajo))
  }, [puntos, busqueda, soloStockBajo])

  const totales = useMemo(() => ({
    productos: puntos.reduce((a, p) => a + p.totalProductos, 0),
    valorizado: puntos.reduce((a, p) => a + p.valorizado, 0),
    alertas: puntos.reduce((a, p) => a + p.stockBajo, 0),
  }), [puntos])

  return (
    <DashboardShell>
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start justify-between"
        >
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Stock Actual</h1>
            <p className="text-sm text-gray-500">
              {lastUpdated
                ? `Actualizado: ${lastUpdated.toLocaleTimeString('es-PY')}`
                : 'Cargando...'}
            </p>
          </div>
          <button
            onClick={fetchStock}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
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

        {/* Filtros */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="flex flex-wrap items-center gap-3"
        >
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Buscar producto o código..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-4 text-sm text-gray-800 placeholder-gray-400 focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <button
            onClick={() => setSoloStockBajo((v) => !v)}
            className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm transition-colors ${
              soloStockBajo
                ? 'border-red-500/50 bg-red-50 text-red-500'
                : 'border-gray-200 bg-gray-50 text-gray-400 hover:bg-gray-100'
            }`}
          >
            <AlertTriangle className="h-4 w-4" />
            Solo stock bajo
          </button>
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

              return (
                <motion.div
                  key={punto.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + idx * 0.05 }}
                  className="rounded-xl border border-gray-200 bg-white overflow-hidden"
                >
                  {/* Header del punto */}
                  <button
                    onClick={() => togglePunto(punto.id)}
                    className="flex w-full items-center justify-between p-5 text-left hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className="rounded-lg p-2.5"
                        style={{ backgroundColor: `${punto.color || '#6366f1'}15` }}
                      >
                        <Icon
                          className="h-5 w-5"
                          style={{ color: punto.color || '#6366f1' }}
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900">{punto.nombre}</h3>
                          <span className="text-xs text-gray-400">{punto.codigo}</span>
                          {punto.stockBajo > 0 && (
                            <Badge variant="danger">
                              <AlertTriangle className="mr-1 h-3 w-3" />
                              {punto.stockBajo} alerta{punto.stockBajo > 1 ? 's' : ''}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>{punto.totalProductos} productos</span>
                          <span>₲ {formatCurrency(punto.valorizado)}</span>
                          {punto.encargado && <span>Encargado: {punto.encargado}</span>}
                        </div>
                      </div>
                    </div>
                    {expandido ? (
                      <ChevronUp className="h-4 w-4 text-gray-500 shrink-0" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-gray-500 shrink-0" />
                    )}
                  </button>

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
                            Sin stock en este punto
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
