'use client'

import { DashboardShell } from '@/components/layout/dashboard-shell'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Package,
  ArrowLeftRight,
  ClipboardList,
  DollarSign,
  AlertTriangle,
  Skull,
  Truck,
  Warehouse,
  Cog,
  Factory,
  Wrench,
  Clock,
} from 'lucide-react'
import { StatCard } from '@/components/ui/stat-card'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

const puntoIconMap: Record<string, React.ComponentType<any>> = {
  warehouse: Warehouse,
  package: Package,
  truck: Truck,
  wrench: Wrench,
  cog: Cog,
  factory: Factory,
}

const estadoBadge: Record<string, 'warning' | 'success' | 'danger' | 'info' | 'default'> = {
  pendiente: 'warning',
  aprobada: 'success',
  rechazada: 'danger',
  entregada: 'info',
  cancelada: 'default',
}

export default function DashboardPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard')
      .then((res) => res.json())
      .then((d) => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <DashboardShell>
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 animate-pulse rounded-xl bg-[#1a1d27]" />
            ))}
          </div>
        </div>
      </DashboardShell>
    )
  }

  if (!data) return null

  const { stats, stockPorPunto, productosStockBajo, ultimosMovimientos, solicitudesRecientes } = data

  const pieData = stockPorPunto.map((p: any) => ({
    name: p.nombre,
    value: p.totalProductos,
    color: p.color,
  }))

  return (
    <DashboardShell>
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500">Resumen general del sistema</p>
        </motion.div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Productos Registrados" value={stats.totalProductos} icon={Package} color="#6366F1" delay={0} />
          <StatCard title="Stock Valorizado" value={stats.stockValorizado} prefix="₲ " icon={DollarSign} color="#22C55E" delay={0.1} />
          <StatCard title="Movimientos del Mes" value={stats.movimientosMes} icon={ArrowLeftRight} color="#3B82F6" delay={0.2} />
          <StatCard title="Solicitudes Pendientes" value={stats.solicitudesPendientes} icon={ClipboardList} color="#F59E0B" delay={0.3} />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <StatCard title="Fletes del Mes" value={stats.fletesMes} prefix="₲ " icon={Truck} color="#8B5CF6" delay={0.4} />
          <StatCard title="Stock Bajo (Alertas)" value={stats.productosStockBajo} icon={AlertTriangle} color="#EF4444" delay={0.5} />
          <StatCard title="Productos Tóxicos" value={stats.productosToxicos} icon={Skull} color="#F97316" delay={0.6} />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2" delay={0.7}>
            <h3 className="mb-4 text-lg font-semibold text-gray-800">Stock por Punto</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {stockPorPunto.map((punto: any, i: number) => {
                const Icon = puntoIconMap[punto.icono] || Warehouse
                return (
                  <motion.div
                    key={punto.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.8 + i * 0.1 }}
                    className="rounded-lg border border-gray-100 bg-gray-50 p-4 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="rounded-lg p-2" style={{ backgroundColor: `${punto.color}18` }}>
                        <Icon className="h-4 w-4" style={{ color: punto.color }} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">{punto.nombre}</p>
                        <p className="text-[10px] text-gray-400">{punto.codigo} · {punto.encargado}</p>
                      </div>
                    </div>
                    <div className="flex justify-between gap-2 text-sm">
                      <span className="text-gray-400 shrink-0">{punto.totalProductos} productos</span>
                      <span className="font-medium text-gray-700 truncate text-right">₲ {formatCurrency(punto.valorizado)}</span>
                    </div>
                    <div className="mt-1">
                      <Badge variant={punto.puedeAprobar ? 'info' : 'default'}>
                        {punto.tipo === 'deposito' ? 'Depósito' : 'Área productiva'}
                      </Badge>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </Card>

          <Card delay={0.8}>
            <h3 className="mb-4 text-lg font-semibold text-gray-800">Distribución</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                  {pieData.map((entry: any, i: number) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', color: '#111827' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-2 space-y-1">
              {pieData.map((entry: any) => (
                <div key={entry.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
                    <span className="text-gray-500">{entry.name}</span>
                  </div>
                  <span className="text-gray-700 font-medium">{entry.value}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card delay={0.9}>
            <h3 className="mb-4 text-lg font-semibold text-gray-800">Actividad Reciente</h3>
            <div className="space-y-3">
              {ultimosMovimientos.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">Sin movimientos registrados</p>
              ) : (
                ultimosMovimientos.map((mov: any) => (
                  <div key={mov.id} className="flex items-start gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3">
                    <div className="rounded-lg bg-indigo-50 p-2">
                      <ArrowLeftRight className="h-4 w-4 text-indigo-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-800">{mov.tipo}</p>
                        {mov.ticketNumero && <Badge variant="info">{mov.ticketNumero}</Badge>}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {mov.origen && `${mov.origen}`}{mov.origen && mov.destino && ' → '}{mov.destino && `${mov.destino}`}
                        {' · '}{mov.totalItems} items · {mov.usuario}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1">
                        <Clock className="h-3 w-3" />{formatDateTime(mov.fecha)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card delay={1.0}>
            <h3 className="mb-4 text-lg font-semibold text-gray-800">Solicitudes Pendientes</h3>
            <div className="space-y-3">
              {solicitudesRecientes.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">No hay solicitudes pendientes</p>
              ) : (
                solicitudesRecientes.map((sol: any) => (
                  <div key={sol.id} className="flex items-start gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3">
                    <div className="rounded-lg bg-amber-50 p-2">
                      <ClipboardList className="h-4 w-4 text-amber-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-800">{sol.numero}</p>
                        <Badge variant={estadoBadge[sol.estado]}>{sol.estado}</Badge>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{sol.solicitante} · {sol.origen} → {sol.destino}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {productosStockBajo.length > 0 && (
          <Card delay={1.1}>
            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-800">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Alertas de Stock Bajo
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-gray-500">
                    <th className="pb-3 font-medium">Código</th>
                    <th className="pb-3 font-medium">Producto</th>
                    <th className="pb-3 font-medium">Punto</th>
                    <th className="pb-3 font-medium text-right">Actual</th>
                    <th className="pb-3 font-medium text-right">Mínimo</th>
                  </tr>
                </thead>
                <tbody>
                  {productosStockBajo.map((p: any, i: number) => (
                    <tr key={i} className="border-b border-gray-100">
                      <td className="py-2.5 text-gray-400">{p.codigo}</td>
                      <td className="py-2.5 text-gray-800">{p.producto}</td>
                      <td className="py-2.5 text-gray-500">{p.punto}</td>
                      <td className="py-2.5 text-right font-medium text-red-500">{p.cantidad}</td>
                      <td className="py-2.5 text-right text-gray-400">{p.minimo}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </DashboardShell>
  )
}
