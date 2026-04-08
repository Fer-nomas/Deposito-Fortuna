'use client'

import { Bell, Search } from 'lucide-react'
import { useState } from 'react'

export function Header() {
  const [searchOpen, setSearchOpen] = useState(false)

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 bg-white/80 px-6 backdrop-blur-xl">
      {/* Search */}
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar productos, movimientos, solicitudes..."
          className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-10 pr-4 text-sm text-gray-700 placeholder-gray-400 transition-all focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-300"
        />
        <kbd className="absolute right-3 top-1/2 -translate-y-1/2 rounded border border-gray-200 bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-400">
          ⌘K
        </kbd>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4">
        <button className="relative rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors cursor-pointer">
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-indigo-500" />
        </button>
      </div>
    </header>
  )
}
