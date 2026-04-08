'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Warehouse, Mail, Lock, Loader2, AlertCircle } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { cn } from '@/lib/utils'

export default function LoginPage() {
  const router = useRouter()
  const setUser = useAuthStore((s) => s.setUser)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Error al iniciar sesión')
        return
      }

      setUser(data.user, data.token)
      router.push('/')
    } catch {
      setError('Error de conexión. Intente nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="w-full max-w-md px-4"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-500/10 mb-4">
            <Warehouse className="w-8 h-8 text-indigo-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Depósito Fortuna
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Sistema de Gestión de Depósito
          </p>
        </motion.div>

        {/* Error */}
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg px-4 py-3 mb-6"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </motion.div>
        )}

        {/* Form */}
        <motion.form
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          onSubmit={handleSubmit}
          className="space-y-5"
        >
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Correo electrónico
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@empresa.com"
                required
                className={cn(
                  'w-full pl-10 pr-4 py-2.5 rounded-lg text-sm text-gray-900 placeholder-gray-500',
                  'bg-gray-50 border border-gray-200',
                  'focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50',
                  'transition-colors'
                )}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Contraseña
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ingrese su contraseña"
                required
                className={cn(
                  'w-full pl-10 pr-4 py-2.5 rounded-lg text-sm text-gray-900 placeholder-gray-500',
                  'bg-gray-50 border border-gray-200',
                  'focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50',
                  'transition-colors'
                )}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={cn(
              'w-full py-2.5 rounded-lg text-sm font-medium text-gray-900',
              'bg-indigo-600 hover:bg-indigo-500',
              'focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:ring-offset-2 focus:ring-offset-[#1a1d27]',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'transition-colors flex items-center justify-center gap-2'
            )}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Ingresando...
              </>
            ) : (
              'Iniciar Sesión'
            )}
          </button>
        </motion.form>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.4 }}
          className="text-center text-xs text-gray-600 mt-6"
        >
          Depósito Fortuna &copy; {new Date().getFullYear()}
        </motion.p>
      </div>
    </motion.div>
  )
}
