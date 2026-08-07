import type { ReactNode } from 'react'
import { motion, type HTMLMotionProps } from 'framer-motion'

type Props = HTMLMotionProps<'button'> & {
  children: ReactNode
  variant?: 'primary' | 'ghost' | 'accent'
  glow?: string
}

export function Button({
  children,
  variant = 'primary',
  glow,
  className = '',
  style,
  ...rest
}: Props) {
  return (
    <motion.button
      whileHover={{ y: -2, scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      className={`lb-btn lb-btn-${variant} ${className}`}
      style={{
        ...(style as object),
        ...(glow ? { ['--btn-glow']: glow } : {}),
      }}
      {...rest}
    >
      <span>{children}</span>
    </motion.button>
  )
}
