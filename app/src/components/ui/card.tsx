'use client'

import { motion, HTMLMotionProps } from 'framer-motion'
import { cn } from '@/lib/utils'
import { forwardRef, HTMLAttributes } from 'react'

type CardProps = HTMLAttributes<HTMLDivElement> & {
  animate?: boolean
  delay?: number
  motionProps?: HTMLMotionProps<'div'>
  className?: string
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ animate, delay = 0, motionProps, className, children, ...props }, ref) => {
    if (animate) {
      return (
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay, duration: 0.3 }}
          className={cn(
            'rounded-xl border border-gray-200 bg-white p-6 shadow-sm',
            className
          )}
          {...motionProps}
        >
          {children}
        </motion.div>
      )
    }

    return (
      <div
        ref={ref}
        className={cn(
          'rounded-xl border border-gray-200 bg-white p-6 shadow-sm',
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)

Card.displayName = 'Card'

export { Card }
