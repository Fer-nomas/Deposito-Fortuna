'use client'

import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Search, ChevronDown, X } from 'lucide-react'

interface ProductOption {
  id: string
  codigo: string
  descripcion: string
  stock?: number | null
}

interface ProductSearchSelectProps {
  value: string
  onChange: (value: string) => void
  products: ProductOption[]
  placeholder?: string
  className?: string
}

export function ProductSearchSelect({
  value,
  onChange,
  products,
  placeholder = 'Seleccionar producto...',
  className = '',
}: ProductSearchSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 0 })
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selected = products.find((p) => p.id === value)

  const filtered = useMemo(() => {
    if (!search) return products
    const q = search.toLowerCase()
    return products.filter(
      (p) =>
        p.codigo.toLowerCase().includes(q) ||
        p.descripcion.toLowerCase().includes(q)
    )
  }, [products, search])

  const updatePosition = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setDropdownPos({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      })
    }
  }, [])

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as Node
      if (
        triggerRef.current && !triggerRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        setOpen(false)
        setSearch('')
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClick)
      return () => document.removeEventListener('mousedown', handleClick)
    }
  }, [open])

  // Position & focus when opening
  useEffect(() => {
    if (open) {
      updatePosition()
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [open, updatePosition])

  // Reposition on scroll/resize
  useEffect(() => {
    if (!open) return
    const handle = () => updatePosition()
    window.addEventListener('scroll', handle, true)
    window.addEventListener('resize', handle)
    return () => {
      window.removeEventListener('scroll', handle, true)
      window.removeEventListener('resize', handle)
    }
  }, [open, updatePosition])

  const handleSelect = (id: string) => {
    onChange(id)
    setOpen(false)
    setSearch('')
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange('')
    setSearch('')
  }

  return (
    <div className={`relative ${className}`}>
      {/* Trigger button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-left transition-all duration-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-300 hover:border-gray-300"
      >
        <span className={`flex-1 truncate ${selected ? 'text-gray-800' : 'text-gray-400'}`}>
          {selected
            ? `${selected.codigo} - ${selected.descripcion}${selected.stock != null ? ` (stock: ${selected.stock})` : ''}`
            : placeholder}
        </span>
        {value ? (
          <X
            className="h-3.5 w-3.5 shrink-0 text-gray-400 hover:text-gray-600"
            onClick={handleClear}
          />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-gray-400" />
        )}
      </button>

      {/* Dropdown via portal */}
      {open && createPortal(
        <div
          ref={dropdownRef}
          className="fixed z-[9999] rounded-lg border border-gray-200 bg-white shadow-lg"
          style={{
            top: dropdownPos.top,
            left: dropdownPos.left,
            width: dropdownPos.width,
          }}
        >
          {/* Search input */}
          <div className="relative border-b border-gray-100 p-2">
            <Search className="absolute left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por código o nombre..."
              className="w-full rounded-md border border-gray-200 bg-gray-50 py-2 pl-8 pr-3 text-sm text-gray-800 placeholder-gray-400 focus:border-indigo-400 focus:bg-white focus:outline-none"
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setOpen(false)
                  setSearch('')
                } else if (e.key === 'Enter' && filtered.length === 1) {
                  handleSelect(filtered[0].id)
                }
              }}
            />
          </div>

          {/* Options list */}
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-4 py-3 text-center text-sm text-gray-400">
                Sin resultados
              </div>
            ) : (
              filtered.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelect(p.id)}
                  className={`flex w-full items-center gap-2 px-4 py-2.5 text-sm text-left transition-colors hover:bg-indigo-50 ${
                    p.id === value ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700'
                  }`}
                >
                  <span className="shrink-0 font-mono text-xs text-gray-400">{p.codigo}</span>
                  <span className="flex-1 truncate">{p.descripcion}</span>
                  {p.stock != null && (
                    <span className="shrink-0 text-xs text-gray-400">stock: {p.stock}</span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
