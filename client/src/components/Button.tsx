import type { ReactNode } from 'react'
import styles from './Button.module.css'

interface ButtonProps {
  children: ReactNode
  icon?: ReactNode
  onClick?: () => void
  className?: string
}

export default function Button({ children, icon, onClick, className }: ButtonProps) {
  return (
    <button className={`${styles.button} ${className ?? ''}`} onClick={onClick}>
      {icon && <span className={styles.icon}>{icon}</span>}
      {children}
    </button>
  )
}
