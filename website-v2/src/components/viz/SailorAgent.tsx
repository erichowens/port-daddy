import * as React from 'react'
import { motion } from 'framer-motion'

interface SailorProps {
  size?: number
  expression?: 'happy' | 'thinking' | 'working' | 'dead'
  color?: string
  className?: string
}

export function SailorAgent({ 
  size = 60, 
  expression = 'happy', 
  color = 'var(--brand-primary)',
  className 
}: SailorProps) {
  return (
    <motion.div
      className={`relative flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
      whileHover={{ scale: 1.1, rotate: [0, -5, 5, 0] }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        {/* Body - A round bouncy blob */}
        <motion.circle
          cx="50" cy="60" r="35"
          fill="var(--bg-surface)"
          stroke={color}
          strokeWidth="4"
          animate={{
            scaleY: [1, 1.05, 1],
            y: [0, -2, 0]
          }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Sailor Hat */}
        <motion.g
          animate={{
            y: [0, -3, 0],
            rotate: [0, 2, -2, 0]
          }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        >
          {/* Hat base */}
          <path d="M25 35 Q50 25 75 35 L75 45 Q50 35 25 45 Z" fill="white" stroke={color} strokeWidth="3" />
          {/* Hat top */}
          <path d="M35 35 Q50 15 65 35" fill="white" stroke={color} strokeWidth="3" />
          {/* Tiny anchor on hat */}
          <circle cx="50" cy="30" r="2" fill={color} />
        </motion.g>

        {/* Eyes */}
        <motion.g>
          {expression === 'happy' && (
            <>
              <circle cx="40" cy="60" r="3" fill={color} />
              <circle cx="60" cy="60" r="3" fill={color} />
            </>
          )}
          {expression === 'thinking' && (
            <>
              <rect x="37" y="58" width="6" height="2" rx="1" fill={color} />
              <rect x="57" y="58" width="6" height="2" rx="1" fill={color} />
            </>
          )}
          {expression === 'working' && (
            <>
              <path d="M35 62 L45 58" stroke={color} strokeWidth="3" strokeLinecap="round" />
              <path d="M55 58 L65 62" stroke={color} strokeWidth="3" strokeLinecap="round" />
            </>
          )}
          {expression === 'dead' && (
            <>
              <path d="M35 55 L45 65 M45 55 L35 65" stroke="var(--status-error)" strokeWidth="3" />
              <path d="M55 55 L65 65 M65 55 L55 65" stroke="var(--status-error)" strokeWidth="3" />
            </>
          )}
        </motion.g>

        {/* Mouth */}
        {expression === 'happy' && (
          <path d="M42 72 Q50 78 58 72" stroke={color} strokeWidth="3" strokeLinecap="round" />
        )}
        {expression === 'thinking' && (
          <path d="M45 72 L55 72" stroke={color} strokeWidth="2" strokeLinecap="round" />
        )}
        {expression === 'working' && (
          <circle cx="50" cy="72" r="2" fill={color} />
        )}
      </svg>

      {/* Tiny signal flag appearing sometimes */}
      {expression === 'happy' && (
        <motion.div
          className="absolute -top-2 -right-2 w-6 h-6"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: [0, 1.2, 1], opacity: 1 }}
          transition={{ delay: 1, duration: 0.5 }}
        >
          <svg viewBox="0 0 100 100">
            <rect width="100" height="100" fill="#3AADB1" rx="4" />
            <rect x="25" y="25" width="50" height="50" fill="white" />
          </svg>
        </motion.div>
      )}
    </motion.div>
  )
}
