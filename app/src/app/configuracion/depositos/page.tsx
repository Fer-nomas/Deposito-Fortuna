'use client'

import { DashboardShell } from '@/components/layout/dashboard-shell'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  X,
  Warehouse,
  AlertTriangle,
  ChevronLeft,
  Factory,
  CheckCircle,
  XCircle,
} from 'lucide-react'
import Link from 'next/link'

// ============================================
// Types
// ============================================

interface PuntoStock {
  id: string
  nombre: string
  codigo: string
  tipo: string
  descripcion: string | null
  ubicacion: string | null
  puedeAprobar: boolean
  color: string | null
  icono: string | null
  orden: number
  activo: boolean
  createdAt: string
  encargado: { id: string; nombre: string; email: string } | null
  totalProductos: number
}

// ============================================
// Icon Options
// ============================================

const ICON_OPTIONS = [
  { value: 'warehouse', label: 'Deposito' },
  { value: 'factory', label: 'Fabrica' },
  { value: 'package', label: 'Paquete' },
  { value: 'truck', label: 'Camion' },
  { value: 'archive', label: 'Archivo' },
  { value: 'box', label: 'Caja' },
  { value: 'store', label: 'Tienda' },
  { value: 'building', label: 'Edificio' },
]

const COLOR_PRESETS = [
  '#6366f1', '#22d3ee', '#10b981', '#f59e0b', '#ef4444',
  '#a855f7', '#f97316', '#14b8a6', '#ec4899', '#8b5cf6',
]

// ============================================
// Main Component
// ============================================

export default function DepositosPage() {
  const [puntos, setPuntos] = useState<PuntoStock[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [editingPunto, setEditingPunto] = useState<PuntoStock | null>(null)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deletingPunto, setDeletingPunto] = useState<PuntoStock | null>(null)
  const [saving, setSaving] = useState(false)

  // Form state
  const [formNombre, setFormNombre] = useState('')
  const [formCodigo, setFormCodigo] = useState('')
  const [formTipo, setFormTipo] = useState('deposito')
  const [formDescripcion, setFormDescripcion] = useState('')
  const [formPuedeAprobar, setFormPuedeAprobar] = useState(false)
  const [formColor, setFormColor] = useState('#6366f1')
  const [formIcono, setFormIcono] = useState('')
  const [formError, setFormError] = useState('')

  // ============================================
  // Fetch Data
  // ============================================

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/puntos-stock')
      if (res.ok) {
        const data = await res.json()
        setPuntos(data.puntos || [])
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

  const filteredPuntos = search
    ? puntos.filter(
        (p) =>
          p.nombre.toLowerCase().includes(search.toLowerCase()) ||
          p.codigo.toLowerCase().includes(search.toLowerCase())
      )
    : puntos

  // ============================================
  // Modal Helpers
  // ============================================

  const resetForm = () => {
    setFormNombre('')
    setFormCodigo('')
    setFormTipo('deposito')
    setFormDescripcion('')
    setFormPuedeAprobar(false)
    setFormColor('#6366f1')
    setFormIcono('')
    setFormError('')
  }

  const openCreateModal = () => {
    setEditingPunto(null)
    resetForm()
    setModalOpen(true)
  }

  const openEditModal = (punto: PuntoStock) => {
    setEditingPunto(punto)
    setFormNombre(punto.nombre)
    setFormCodigo(punto.codigo)
    setFormTipo(punto.tipo)
    setFormDescripcion(punto.descripcion || '')
    setFormPuedeAprobar(punto.puedeAprobar)
    setFormColor(punto.color || '#6366f1')
    setFormIcono(punto.icono || '')
    setFormError('')
    setModalOpen(true)
  }

  // ============================================
  // Submit
  // ============================================

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')

    if (!formNombre.trim() || !formCodigo.trim() || !formTipo) {
      setFormError('Nombre, codigo y tipo son obligatorios')
      return
    }

    setSaving(true)
    try {
      const payload = {
        nombre: formNombre.trim(),
        codigo: formCodigo.trim(),
        tipo: formTipo,
        descripcion: formDescripcion.trim() || null,
        puedeAprobar: formPuedeAprobar,
        color: formColor,
        icono: formIcono || null,
      }

      const url = editingPunto ? `/api/puntos-stock/${editingPunto.id}` : '/api/puntos-stock'
      const method = editingPunto ? 'PUT' : 'POST'

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
      setFormError(error.message || 'Error al guardar punto de stock')
    } finally {
      setSaving(false)
    }
  }

  // ============================================
  // Delete
  // ============================================

  const handleDelete = async () => {
    if (!deletingPunto) return
    setSaving(true)
    try {
      const res = await fetch(`/api/puntos-stock/${deletingPunto.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Error al eliminar')
      setDeleteModalOpen(false)
      setDeletingPunto(null)
      fetchData()
    } catch {
      alert('Error al eliminar punto de stock')
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
              <h1 className="text-2xl font-bold text-gray-900">Depositos y Areas</h1>
              <p className="text-sm text-gray-500">
                {puntos.length} punto{puntos.length !== 1 ? 's' : ''} de stock registrado{puntos.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <Button onClick={openCreateModal}>
            <Plus className="h-4 w-4" />
            Nuevo Punto
          </Button>
        </motion.div>

        {/* Search */}
        <Card animate={true} delay={0.1}>
          <Input
            placeholder="Buscar por nombre o codigo..."
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
                  <th className="px-6 py-4 font-medium text-gray-500">Codigo</th>
                  <th className="px-6 py-4 font-medium text-gray-500">Tipo</th>
                  <th className="px-6 py-4 font-medium text-gray-500">Puede Aprobar</th>
                  <th className="px-6 py-4 font-medium text-gray-500">Encargado</th>
                  <th className="px-6 py-4 font-medium text-gray-500 text-right">Total Productos</th>
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
                ) : filteredPuntos.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center">
                      <Warehouse className="mx-auto h-12 w-12 text-gray-400" />
                      <p className="mt-3 text-gray-500">No se encontraron puntos de stock</p>
                      <Button variant="ghost" size="sm" className="mt-2" onClick={openCreateModal}>
                        <Plus className="h-4 w-4" /> Crear punto
                      </Button>
                    </td>
                  </tr>
                ) : (
                  <AnimatePresence mode="popLayout">
                    {filteredPuntos.map((punto, index) => (
                      <motion.tr
                        key={punto.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2, delay: index * 0.03 }}
                        className="border-b border-gray-200 transition-colors hover:bg-gray-50"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div
                              className="flex h-8 w-8 items-center justify-center rounded-lg"
                              style={{ backgroundColor: `${punto.color || '#6366f1'}20` }}
                            >
                              {punto.tipo === 'area_productiva' ? (
                                <Factory className="h-4 w-4" style={{ color: punto.color || '#6366f1' }} />
                              ) : (
                                <Warehouse className="h-4 w-4" style={{ color: punto.color || '#6366f1' }} />
                              )}
                            </div>
                            <div>
                              <span className="text-gray-900 font-medium">{punto.nombre}</span>
                              {!punto.activo && (
                                <Badge variant="danger" className="ml-2">Inactivo</Badge>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-mono text-indigo-600">{punto.codigo}</td>
                        <td className="px-6 py-4">
                          <Badge variant={punto.tipo === 'deposito' ? 'info' : 'warning'}>
                            {punto.tipo === 'deposito' ? 'Deposito' : 'Area Productiva'}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          {punto.puedeAprobar ? (
                            <CheckCircle className="h-4 w-4 text-emerald-600" />
                          ) : (
                            <XCircle className="h-4 w-4 text-gray-400" />
                          )}
                        </td>
                        <td className="px-6 py-4 text-gray-700">
                          {punto.encargado?.nombre || (
                            <span className="text-gray-400">Sin asignar</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right text-gray-900 font-medium">
                          {punto.totalProductos}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => openEditModal(punto)}
                              className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-50 hover:text-indigo-600 cursor-pointer"
                              title="Editar"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => {
                                setDeletingPunto(punto)
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
              className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-2xl"
            >
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  {editingPunto ? 'Editar Punto de Stock' : 'Nuevo Punto de Stock'}
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
                  placeholder="Deposito Principal"
                  value={formNombre}
                  onChange={(e) => setFormNombre(e.target.value)}
                />

                <Input
                  label="Codigo *"
                  placeholder="DEP-01"
                  value={formCodigo}
                  onChange={(e) => setFormCodigo(e.target.value.toUpperCase())}
                />

                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-400">Tipo *</label>
                  <select
                    value={formTipo}
                    onChange={(e) => setFormTipo(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-800 transition-all duration-200 hover:border-gray-300 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-300"
                  >
                    <option value="deposito" className="bg-white">Deposito</option>
                    <option value="area_productiva" className="bg-white">Area Productiva</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-400">Descripcion</label>
                  <textarea
                    value={formDescripcion}
                    onChange={(e) => setFormDescripcion(e.target.value)}
                    rows={3}
                    placeholder="Descripcion del punto de stock..."
                    className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 transition-all duration-200 hover:border-gray-300 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-300 resize-none"
                  />
                </div>

                {/* Puede Aprobar Toggle */}
                <label className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formPuedeAprobar}
                    onChange={(e) => setFormPuedeAprobar(e.target.checked)}
                    className="h-4 w-4 rounded border-white/20 bg-gray-50 text-indigo-600 focus:ring-indigo-300"
                  />
                  <div>
                    <p className="text-sm text-gray-900">Puede aprobar solicitudes</p>
                    <p className="text-xs text-gray-500">
                      Este punto puede aprobar solicitudes de materiales
                    </p>
                  </div>
                </label>

                {/* Color Picker */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-400">Color</label>
                  <div className="flex items-center gap-3">
                    <div className="flex flex-wrap gap-2">
                      {COLOR_PRESETS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setFormColor(color)}
                          className={cn(
                            'h-7 w-7 rounded-full border-2 transition-all cursor-pointer',
                            formColor === color
                              ? 'border-white scale-110'
                              : 'border-transparent hover:scale-105'
                          )}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    <input
                      type="color"
                      value={formColor}
                      onChange={(e) => setFormColor(e.target.value)}
                      className="h-8 w-8 cursor-pointer rounded border-0 bg-transparent"
                    />
                  </div>
                </div>

                {/* Icono */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-400">Icono</label>
                  <select
                    value={formIcono}
                    onChange={(e) => setFormIcono(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-800 transition-all duration-200 hover:border-gray-300 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-300"
                  >
                    <option value="" className="bg-white">Sin icono especifico</option>
                    {ICON_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value} className="bg-white">
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Preview */}
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <p className="text-xs text-gray-500 mb-2">Vista previa</p>
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-lg"
                      style={{ backgroundColor: `${formColor}20` }}
                    >
                      {formTipo === 'area_productiva' ? (
                        <Factory className="h-5 w-5" style={{ color: formColor }} />
                      ) : (
                        <Warehouse className="h-5 w-5" style={{ color: formColor }} />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {formNombre || 'Nombre del punto'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formCodigo || 'CODIGO'} - {formTipo === 'deposito' ? 'Deposito' : 'Area Productiva'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" loading={saving}>
                    {editingPunto ? 'Guardar Cambios' : 'Crear Punto'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation */}
      <AnimatePresence>
        {deleteModalOpen && deletingPunto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setDeleteModalOpen(false)
                setDeletingPunto(null)
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
                  <h3 className="text-lg font-semibold text-gray-900">Eliminar Punto de Stock</h3>
                  <p className="text-sm text-gray-500">Esta accion desactivara el punto</p>
                </div>
              </div>

              <p className="text-sm text-gray-700 mb-6">
                Se desactivara el punto{' '}
                <span className="font-mono text-indigo-600">{deletingPunto.codigo}</span>
                {' - '}
                <span className="font-medium text-gray-900">{deletingPunto.nombre}</span>.
                {deletingPunto.totalProductos > 0 && (
                  <span className="text-amber-500">
                    {' '}Tiene {deletingPunto.totalProductos} producto{deletingPunto.totalProductos !== 1 ? 's' : ''} asociados.
                  </span>
                )}
              </p>

              <div className="flex items-center justify-end gap-3">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setDeleteModalOpen(false)
                    setDeletingPunto(null)
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
