'use client'

import { cn } from '@/lib/utils'
import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import { useEffect } from 'react'
import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  title: string
  value: number
  prefix?: string
  suffix?: string
  icon: LucideIcon
  color: string
  delay?: number
  trend?: { value: number; label: string }
}

function AnimatedNumber({ value, prefix = '', suffix = '' }: { value: number; prefix?: string; suffix?: string }) {
  const motionValue = useMotionValue(0)
  const rounded = useTransform(motionValue, (v) => {
    const rounded = Math.round(v)
    return prefix + rounded.toLocaleString('es-PY') + suffix
  })

  useEffect(() => {
    const controls = animate(motionValue, value, { duration: 1.5, ease: 'easeOut' })
    return controls.stop
  }, [value, motionValue])

  return <motion.span>{rounded}</motion.span>
}

export function StatCard({ title, value, prefix, suffix, icon: Icon, color, delay = 0, trend }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 space-y-2">
          <p className="text-sm text-gray-500 truncate">{title}</p>
          <p className="text-xl font-bold text-gray-900 leading-tight whitespace-nowrap">
            <AnimatedNumber value={value} prefix={prefix} suffix={suffix} />
          </p>
          {trend && (
            <p className={cn('text-xs', trend.value >= 0 ? 'text-emerald-600' : 'text-red-500')}>
              {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
            </p>
          )}
        </div>
        <div className="rounded-lg p-3 shrink-0" style={{ backgroundColor: `${color}18` }}>
          <Icon className="h-6 w-6" style={{ color }} />
        </div>
      </div>
    </motion.div>
  )
}
