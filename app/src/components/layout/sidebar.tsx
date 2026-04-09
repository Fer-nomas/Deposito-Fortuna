'use client'

import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard,
  Package,
  ArrowLeftRight,
  ClipboardList,
  BarChart3,
  Truck,
  Settings,
  Users,
  Warehouse,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Bell,
  Menu,
  Layers,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth-store'

const menuItems = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/' },
  { label: 'Stock Actual', icon: Layers, href: '/stock' },
  { label: 'Productos', icon: Package, href: '/productos' },
  { label: 'Movimientos', icon: ArrowLeftRight, href: '/movimientos' },
  { label: 'Solicitudes', icon: ClipboardList, href: '/solicitudes' },
  { label: 'Proveedores', icon: Truck, href: '/proveedores' },
  { label: 'Reportes', icon: BarChart3, href: '/reportes' },
]

const adminItems = [
  { label: 'Usuarios', icon: Users, href: '/configuracion/usuarios' },
  { label: 'Depósitos', icon: Warehouse, href: '/configuracion/depositos' },
  { label: 'Configuración', icon: Settings, href: '/configuracion' },
]

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuthStore()

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    logout()
    router.push('/login')
  }

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 72 : 260 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-gray-200 bg-white"
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-gray-100">
        <AnimatePresence mode="wait">
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-3"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600">
                <Warehouse className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-gray-900">Depósito Fortuna</h1>
                <p className="text-[10px] text-gray-400">Sistema de Gestión</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {collapsed && (
          <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600">
            <Warehouse className="h-5 w-5 text-white" />
          </div>
        )}
      </div>

      {/* Toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-7 flex h-6 w-6 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-400 hover:text-gray-700 shadow-sm transition-colors cursor-pointer"
      >
        {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
      </button>

      {/* Nav */}
      <nav className="mt-4 flex-1 space-y-0.5 px-3 overflow-y-auto">
        <p className={cn('mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-gray-400', collapsed && 'sr-only')}>
          General
        </p>
        {menuItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-indigo-50 text-indigo-600'
                  : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'
              )}
            >
              <item.icon className={cn('h-5 w-5 shrink-0', isActive ? 'text-indigo-600' : 'text-gray-400 group-hover:text-gray-600')} />
              <AnimatePresence mode="wait">
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    className="whitespace-nowrap overflow-hidden"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute left-0 h-8 w-1 rounded-r-full bg-indigo-500"
                  transition={{ duration: 0.3 }}
                />
              )}
            </Link>
          )
        })}

        {user?.esAdmin && (
          <>
            <p className={cn('mb-2 mt-6 px-3 text-[10px] font-semibold uppercase tracking-wider text-gray-400', collapsed && 'sr-only')}>
              Administración
            </p>
            {adminItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-indigo-50 text-indigo-600'
                      : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'
                  )}
                >
                  <item.icon className={cn('h-5 w-5 shrink-0', isActive ? 'text-indigo-600' : 'text-gray-400 group-hover:text-gray-600')} />
                  <AnimatePresence mode="wait">
                    {!collapsed && (
                      <motion.span
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: 'auto' }}
                        exit={{ opacity: 0, width: 0 }}
                        className="whitespace-nowrap overflow-hidden"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Link>
              )
            })}
          </>
        )}
      </nav>

      {/* User */}
      <div className="border-t border-gray-100 p-3">
        <div className={cn('flex items-center gap-3 rounded-lg px-3 py-2', collapsed && 'justify-center')}>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 text-sm font-bold">
            {user?.nombre?.charAt(0) || 'U'}
          </div>
          <AnimatePresence mode="wait">
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 min-w-0"
              >
                <p className="truncate text-sm font-medium text-gray-700">{user?.nombre}</p>
                <p className="truncate text-[10px] text-gray-400">{user?.roles?.[0]}</p>
              </motion.div>
            )}
          </AnimatePresence>
          {!collapsed && (
            <button
              onClick={handleLogout}
              className="text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
              title="Cerrar sesión"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </motion.aside>
  )
}
