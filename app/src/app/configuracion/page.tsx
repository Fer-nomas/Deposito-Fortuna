'use client'

import { DashboardShell } from '@/components/layout/dashboard-shell'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'
import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  Settings,
  Users,
  Warehouse,
  Shield,
  Database,
  Globe,
  ChevronRight,
  Server,
  Clock,
} from 'lucide-react'

// ============================================
// Menu Items
// ============================================

const menuItems = [
  {
    title: 'Usuarios',
    description: 'Gestionar usuarios, roles y permisos del sistema',
    href: '/configuracion/usuarios',
    icon: Users,
    color: '#6366f1',
    badge: null,
  },
  {
    title: 'Depositos y Areas',
    description: 'Administrar puntos de stock, depositos y areas productivas',
    href: '/configuracion/depositos',
    icon: Warehouse,
    color: '#22d3ee',
    badge: null,
  },
]

// ============================================
// Main Component
// ============================================

export default function ConfiguracionPage() {
  const { user } = useAuthStore()

  const systemInfo = [
    { label: 'Version', value: '1.0.0', icon: Server },
    { label: 'Empresa', value: 'Deposito Fortuna', icon: Globe },
    { label: 'Moneda', value: 'Guaranies (PYG)', icon: Database },
    { label: 'Zona Horaria', value: 'America/Asuncion', icon: Clock },
  ]

  return (
    <DashboardShell>
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-2xl font-bold text-gray-900">Configuracion</h1>
          <p className="text-sm text-gray-500">
            Administracion del sistema y configuracion general
          </p>
        </motion.div>

        {/* Navigation Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {menuItems.map((item, index) => (
            <Link key={item.href} href={item.href}>
              <Card
                animate={true}
                delay={0.1 + index * 0.1}
                className="group cursor-pointer transition-all duration-200 hover:border-gray-200 hover:shadow-xl"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      className="rounded-lg p-3 transition-colors"
                      style={{ backgroundColor: `${item.color}15` }}
                    >
                      <item.icon className="h-6 w-6" style={{ color: item.color }} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
                          {item.title}
                        </h3>
                        {item.badge && (
                          <Badge variant="info">{item.badge}</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">{item.description}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400 transition-all duration-200 group-hover:text-indigo-600 group-hover:translate-x-1" />
                </div>
              </Card>
            </Link>
          ))}
        </div>

        {/* System Info */}
        <Card animate={true} delay={0.4}>
          <div className="flex items-center gap-3 mb-4">
            <div className="rounded-lg bg-gray-50 p-2.5">
              <Settings className="h-5 w-5 text-gray-400" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900">Informacion del Sistema</h3>
              <p className="text-sm text-gray-500">Datos generales de configuracion</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {systemInfo.map((info, i) => (
              <motion.div
                key={info.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + i * 0.05 }}
                className="rounded-lg border border-gray-200 bg-gray-50 p-4"
              >
                <div className="flex items-center gap-2 mb-2">
                  <info.icon className="h-4 w-4 text-gray-500" />
                  <p className="text-xs text-gray-500">{info.label}</p>
                </div>
                <p className="text-sm font-medium text-gray-900">{info.value}</p>
              </motion.div>
            ))}
          </div>
        </Card>

        {/* Current User Info */}
        {user && (
          <Card animate={true} delay={0.6}>
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-lg bg-indigo-50 p-2.5">
                <Shield className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">Sesion Actual</h3>
                <p className="text-sm text-gray-500">Informacion del usuario conectado</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <p className="text-xs text-gray-500 mb-1">Usuario</p>
                <p className="text-sm font-medium text-gray-900">{user.nombre}</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <p className="text-xs text-gray-500 mb-1">Email</p>
                <p className="text-sm font-medium text-gray-900">{user.email}</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <p className="text-xs text-gray-500 mb-1">Roles</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {user.roles.map((rol, i) => (
                    <Badge key={i} variant="info">{rol}</Badge>
                  ))}
                </div>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <p className="text-xs text-gray-500 mb-1">Puntos de Stock</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {user.puntosStock.map((p) => (
                    <Badge key={p.id} variant={p.esEncargado ? 'success' : 'default'}>
                      {p.nombre}
                    </Badge>
                  ))}
                  {user.puntosStock.length === 0 && (
                    <span className="text-sm text-gray-500">Sin asignar</span>
                  )}
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>
    </DashboardShell>
  )
}
