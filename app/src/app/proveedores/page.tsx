'use client'

import { DashboardShell } from '@/components/layout/dashboard-shell'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  X,
  Truck,
  Phone,
  Mail,
  User,
} from 'lucide-react'
import { useEffect, useState, useCallback } from 'react'

interface Proveedor {
  id: string
  nombre: string
  ruc: string | null
  telefono: string | null
  email: string | null
  direccion: string | null
  contactoNombre: string | null
  notas: string | null
}

const emptyForm = {
  nombre: '',
  ruc: '',
  telefono: '',
  email: '',
  direccion: '',
  contactoNombre: '',
  notas: '',
}

export default function ProveedoresPage() {
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [selectedProveedor, setSelectedProveedor] = useState<Proveedor | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const fetchProveedores = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      const res = await fetch(`/api/proveedores?${params}`)
      const data = await res.json()
      setProveedores(data.proveedores || [])
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => {
    const timeout = setTimeout(fetchProveedores, 300)
    return () => clearTimeout(timeout)
  }, [fetchProveedores])

  const openCreate = () => {
    setSelectedProveedor(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  const openEdit = (p: Proveedor) => {
    setSelectedProveedor(p)
    setForm({
      nombre: p.nombre,
      ruc: p.ruc || '',
      telefono: p.telefono || '',
      email: p.email || '',
      direccion: p.direccion || '',
      contactoNombre: p.contactoNombre || '',
      notas: p.notas || '',
    })
    setModalOpen(true)
  }

  const openDelete = (p: Proveedor) => {
    setSelectedProveedor(p)
    setDeleteModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.nombre.trim()) return
    setSaving(true)
    try {
      const url = selectedProveedor
        ? `/api/proveedores/${selectedProveedor.id}`
        : '/api/proveedores'
      const method = selectedProveedor ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        setModalOpen(false)
        fetchProveedores()
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedProveedor) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/proveedores/${selectedProveedor.id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setDeleteModalOpen(false)
        setSelectedProveedor(null)
        fetchProveedores()
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setDeleting(false)
    }
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
            <h1 className="text-2xl font-bold text-gray-900">Proveedores</h1>
            <p className="text-sm text-gray-400 mt-1">
              Gestiona los proveedores del sistema
            </p>
          </div>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Nuevo Proveedor
          </Button>
        </motion.div>

        {/* Search */}
        <Card>
          <Input
            placeholder="Buscar por nombre, RUC, email o contacto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search className="h-4 w-4" />}
          />
        </Card>

        {/* Table */}
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                    Nombre
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                    RUC
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                    Telefono
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                    Contacto
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-400">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                      <div className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Cargando...
                      </div>
                    </td>
                  </tr>
                ) : proveedores.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                      <Truck className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      No se encontraron proveedores
                    </td>
                  </tr>
                ) : (
                  proveedores.map((p, i) => (
                    <motion.tr
                      key={p.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                            <Truck className="h-4 w-4" />
                          </div>
                          <span className="text-sm font-medium text-gray-800">
                            {p.nombre}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-400">
                        {p.ruc || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-400">
                        {p.telefono ? (
                          <span className="flex items-center gap-1.5">
                            <Phone className="h-3 w-3" />
                            {p.telefono}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-400">
                        {p.email ? (
                          <span className="flex items-center gap-1.5">
                            <Mail className="h-3 w-3" />
                            {p.email}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-400">
                        {p.contactoNombre ? (
                          <span className="flex items-center gap-1.5">
                            <User className="h-3 w-3" />
                            {p.contactoNombre}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEdit(p)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDelete(p)}
                            className="text-red-500 hover:text-red-500"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {!loading && proveedores.length > 0 && (
            <div className="border-t border-gray-200 px-4 py-3">
              <p className="text-xs text-gray-500">
                {proveedores.length} proveedor{proveedores.length !== 1 ? 'es' : ''}
              </p>
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
            onClick={() => setModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-lg rounded-xl border border-gray-200 bg-white p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">
                  {selectedProveedor ? 'Editar Proveedor' : 'Nuevo Proveedor'}
                </h2>
                <button
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-50 hover:text-gray-800 transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <Input
                  label="Nombre *"
                  placeholder="Nombre del proveedor"
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                />
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="RUC"
                    placeholder="RUC / CI"
                    value={form.ruc}
                    onChange={(e) => setForm({ ...form, ruc: e.target.value })}
                  />
                  <Input
                    label="Telefono"
                    placeholder="Telefono"
                    value={form.telefono}
                    onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Email"
                    placeholder="email@ejemplo.com"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                  <Input
                    label="Contacto"
                    placeholder="Nombre de contacto"
                    value={form.contactoNombre}
                    onChange={(e) =>
                      setForm({ ...form, contactoNombre: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-400">
                    Direccion
                  </label>
                  <textarea
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-500 transition-all duration-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-300 hover:border-gray-300 resize-none"
                    rows={2}
                    placeholder="Direccion del proveedor"
                    value={form.direccion}
                    onChange={(e) => setForm({ ...form, direccion: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-400">
                    Notas
                  </label>
                  <textarea
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-500 transition-all duration-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-300 hover:border-gray-300 resize-none"
                    rows={2}
                    placeholder="Notas adicionales"
                    value={form.notas}
                    onChange={(e) => setForm({ ...form, notas: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <Button variant="secondary" onClick={() => setModalOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSave} loading={saving} disabled={!form.nombre.trim()}>
                  {selectedProveedor ? 'Guardar Cambios' : 'Crear Proveedor'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Modal */}
      <AnimatePresence>
        {deleteModalOpen && selectedProveedor && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setDeleteModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
                  <Trash2 className="h-6 w-6 text-red-500" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    Eliminar Proveedor
                  </h2>
                  <p className="text-sm text-gray-400">
                    Esta accion no se puede deshacer
                  </p>
                </div>
              </div>
              <p className="text-sm text-gray-700 mb-6">
                Estas seguro que deseas eliminar al proveedor{' '}
                <span className="font-semibold text-gray-900">
                  {selectedProveedor.nombre}
                </span>
                ?
              </p>
              <div className="flex justify-end gap-3">
                <Button
                  variant="secondary"
                  onClick={() => setDeleteModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button variant="danger" onClick={handleDelete} loading={deleting}>
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
