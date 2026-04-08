'use client'

import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { forwardRef } from 'react'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  animate?: boolean
  delay?: number
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, animate = true, delay = 0, children, ...props }, ref) => {
    const Comp = animate ? motion.div : 'div'
    return (
      <Comp
        ref={ref}
        className={cn(
          'rounded-xl border border-gray-200 bg-white p-6 shadow-sm',
          className
        )}
        {...(animate
          ? {
              initial: { opacity: 0, y: 20 },
              animate: { opacity: 1, y: 0 },
              transition: { duration: 0.4, delay },
            }
          : {})}
        {...props}
      >
        {children}
      </Comp>
    )
  }
)
Card.displayName = 'Card'
