'use client'

import { DashboardShell } from '@/components/layout/dashboard-shell'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn, formatDateTime } from '@/lib/utils'
import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  X,
  Users,
  Shield,
  AlertTriangle,
  ChevronLeft,
  Eye,
  EyeOff,
} from 'lucide-react'
import Link from 'next/link'

// ============================================
// Types
// ============================================

interface Rol {
  id: string
  nombre: string
  esAdmin: boolean
  puedeAprobar: boolean
  puedeCrearProductos: boolean
  puedeVerReportes: boolean
  puedeGestionarUsuarios: boolean
}

interface PuntoStock {
  id: string
  nombre: string
  codigo: string
  color: string | null
}

interface Usuario {
  id: string
  nombre: string
  email: string
  activo: boolean
  ultimoLogin: string | null
  createdAt: string
  roles: { id: string; nombre: string; esAdmin: boolean }[]
  puntosStock: (PuntoStock & { esEncargado: boolean })[]
}

// ============================================
// Main Component
// ============================================

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [roles, setRoles] = useState<Rol[]>([])
  const [puntosStock, setPuntosStock] = useState<PuntoStock[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<Usuario | null>(null)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deletingUser, setDeletingUser] = useState<Usuario | null>(null)
  const [saving, setSaving] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // Form state
  const [formNombre, setFormNombre] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formPassword, setFormPassword] = useState('')
  const [formRolId, setFormRolId] = useState('')
  const [formPuntoStockId, setFormPuntoStockId] = useState('')
  const [formEsEncargado, setFormEsEncargado] = useState(false)
  const [formError, setFormError] = useState('')

  // ============================================
  // Fetch Data
  // ============================================

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/usuarios')
      if (res.ok) {
        const data = await res.json()
        setUsuarios(data.usuarios || [])
        setRoles(data.roles || [])
        setPuntosStock(data.puntosStock || [])
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // ============================================
  // Filtered list
  // ============================================

  const filteredUsuarios = search
    ? usuarios.filter(
        (u) =>
          u.nombre.toLowerCase().includes(search.toLowerCase()) ||
          u.email.toLowerCase().includes(search.toLowerCase())
      )
    : usuarios

  // ============================================
  // Modal Helpers
  // ============================================

  const resetForm = () => {
    setFormNombre('')
    setFormEmail('')
    setFormPassword('')
    setFormRolId('')
    setFormPuntoStockId('')
    setFormEsEncargado(false)
    setFormError('')
    setShowPassword(false)
  }

  const openCreateModal = () => {
    setEditingUser(null)
    resetForm()
    setModalOpen(true)
  }

  const openEditModal = (user: Usuario) => {
    setEditingUser(user)
    setFormNombre(user.nombre)
    setFormEmail(user.email)
    setFormPassword('')
    setFormRolId(user.roles[0]?.id || '')
    setFormPuntoStockId(user.puntosStock[0]?.id || '')
    setFormEsEncargado(user.puntosStock[0]?.esEncargado || false)
    setFormError('')
    setShowPassword(false)
    setModalOpen(true)
  }

  // ============================================
  // Submit
  // ============================================

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')

    if (!formNombre.trim() || !formEmail.trim() || !formRolId) {
      setFormError('Nombre, email y rol son obligatorios')
      return
    }

    if (!editingUser && !formPassword) {
      setFormError('La contrasena es obligatoria al crear un usuario')
      return
    }

    setSaving(true)
    try {
      const payload: any = {
        nombre: formNombre.trim(),
        email: formEmail.trim(),
        rolId: formRolId,
        puntoStockId: formPuntoStockId || null,
        esEncargado: formEsEncargado,
      }

      if (formPassword) {
        payload.password = formPassword
      }

      const url = editingUser ? `/api/usuarios/${editingUser.id}` : '/api/usuarios'
      const method = editingUser ? 'PUT' : 'POST'

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
      resetForm()
      fetchData()
    } catch (error: any) {
      setFormError(error.message || 'Error al guardar usuario')
    } finally {
      setSaving(false)
    }
  }

  // ============================================
  // Delete
  // ============================================

  const handleDelete = async () => {
    if (!deletingUser) return
    setSaving(true)
    try {
      const res = await fetch(`/api/usuarios/${deletingUser.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Error al eliminar')
      setDeleteModalOpen(false)
      setDeletingUser(null)
      fetchData()
    } catch {
      alert('Error al eliminar usuario')
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
          <div className="flex items-center gap-3">
            <Link
              href="/configuracion"
              className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700"
            >
              <ChevronLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Usuarios</h1>
              <p className="text-sm text-gray-500">
                {usuarios.length} usuario{usuarios.length !== 1 ? 's' : ''} registrado{usuarios.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <Button onClick={openCreateModal}>
            <Plus className="h-4 w-4" />
            Nuevo Usuario
          </Button>
        </motion.div>

        {/* Search */}
        <Card animate={true} delay={0.1}>
          <Input
            placeholder="Buscar por nombre o email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search className="h-4 w-4" />}
          />
        </Card>

        {/* Table */}
        <Card animate={true} delay={0.2} className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left">
                  <th className="px-6 py-4 font-medium text-gray-500">Nombre</th>
                  <th className="px-6 py-4 font-medium text-gray-500">Email</th>
                  <th className="px-6 py-4 font-medium text-gray-500">Rol</th>
                  <th className="px-6 py-4 font-medium text-gray-500">Punto de Stock</th>
                  <th className="px-6 py-4 font-medium text-gray-500">Ultimo Login</th>
                  <th className="px-6 py-4 font-medium text-gray-500">Estado</th>
                  <th className="px-6 py-4 font-medium text-gray-500 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i} className="border-b border-gray-200">
                      {[...Array(7)].map((_, j) => (
                        <td key={j} className="px-6 py-4">
                          <div className="h-4 animate-pulse rounded bg-gray-50" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : filteredUsuarios.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center">
                      <Users className="mx-auto h-12 w-12 text-gray-400" />
                      <p className="mt-3 text-gray-500">No se encontraron usuarios</p>
                    </td>
                  </tr>
                ) : (
                  <AnimatePresence mode="popLayout">
                    {filteredUsuarios.map((usuario, index) => (
                      <motion.tr
                        key={usuario.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2, delay: index * 0.03 }}
                        className="border-b border-gray-200 transition-colors hover:bg-gray-50"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50 text-sm font-medium text-indigo-600">
                              {usuario.nombre.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-gray-900 font-medium">{usuario.nombre}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-400">{usuario.email}</td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {usuario.roles.map((r) => (
                              <Badge
                                key={r.id}
                                variant={r.esAdmin ? 'danger' : 'info'}
                              >
                                {r.esAdmin && <Shield className="h-3 w-3" />}
                                {r.nombre}
                              </Badge>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {usuario.puntosStock.map((p) => (
                              <Badge
                                key={p.id}
                                variant={p.esEncargado ? 'success' : 'default'}
                              >
                                {p.nombre}
                              </Badge>
                            ))}
                            {usuario.puntosStock.length === 0 && (
                              <span className="text-gray-400">-</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-400 whitespace-nowrap">
                          {usuario.ultimoLogin
                            ? formatDateTime(usuario.ultimoLogin)
                            : 'Nunca'}
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant={usuario.activo ? 'success' : 'danger'}>
                            {usuario.activo ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => openEditModal(usuario)}
                              className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-50 hover:text-indigo-600 cursor-pointer"
                              title="Editar"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => {
                                setDeletingUser(usuario)
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
                  {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
                </h2>
                <button
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
                {formError && (
                  <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-500">
                    {formError}
                  </div>
                )}

                <Input
                  label="Nombre *"
                  placeholder="Nombre completo"
                  value={formNombre}
                  onChange={(e) => setFormNombre(e.target.value)}
                />

                <Input
                  label="Email *"
                  type="email"
                  placeholder="email@ejemplo.com"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                />

                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-400">
                    Contrasena {editingUser ? '(dejar vacio para no cambiar)' : '*'}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder={editingUser ? 'Nueva contrasena...' : 'Contrasena'}
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 pr-10 text-sm text-gray-800 placeholder-gray-400 transition-all duration-200 hover:border-gray-300 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-300"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-400">Rol *</label>
                  <select
                    value={formRolId}
                    onChange={(e) => setFormRolId(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-800 transition-all duration-200 hover:border-gray-300 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-300"
                  >
                    <option value="" className="bg-white">Seleccionar rol...</option>
                    {roles.map((r) => (
                      <option key={r.id} value={r.id} className="bg-white">
                        {r.nombre} {r.esAdmin ? '(Admin)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-400">Punto de Stock</label>
                  <select
                    value={formPuntoStockId}
                    onChange={(e) => setFormPuntoStockId(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-800 transition-all duration-200 hover:border-gray-300 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-300"
                  >
                    <option value="" className="bg-white">Sin punto asignado</option>
                    {puntosStock.map((p) => (
                      <option key={p.id} value={p.id} className="bg-white">
                        {p.nombre} ({p.codigo})
                      </option>
                    ))}
                  </select>
                </div>

                {formPuntoStockId && (
                  <label className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formEsEncargado}
                      onChange={(e) => setFormEsEncargado(e.target.checked)}
                      className="h-4 w-4 rounded border-white/20 bg-gray-50 text-indigo-600 focus:ring-indigo-300"
                    />
                    <div>
                      <p className="text-sm text-gray-900">Es encargado del punto</p>
                      <p className="text-xs text-gray-500">
                        El encargado puede gestionar el inventario del punto
                      </p>
                    </div>
                  </label>
                )}

                <div className="flex items-center justify-end gap-3 pt-2">
                  <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" loading={saving}>
                    {editingUser ? 'Guardar Cambios' : 'Crear Usuario'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation */}
      <AnimatePresence>
        {deleteModalOpen && deletingUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setDeleteModalOpen(false)
                setDeletingUser(null)
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
                  <h3 className="text-lg font-semibold text-gray-900">Eliminar Usuario</h3>
                  <p className="text-sm text-gray-500">Esta accion desactivara al usuario</p>
                </div>
              </div>

              <p className="text-sm text-gray-700 mb-6">
                Se desactivara el usuario{' '}
                <span className="font-medium text-gray-900">{deletingUser.nombre}</span>
                {' '}({deletingUser.email}). No podra iniciar sesion.
              </p>

              <div className="flex items-center justify-end gap-3">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setDeleteModalOpen(false)
                    setDeletingUser(null)
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
    </DashboardShell>
  )
}
