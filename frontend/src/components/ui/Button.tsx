import React from 'react'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary'
  children: React.ReactNode
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
  className?: string
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  children,
  onClick,
  disabled = false,
  type = 'button',
  className = '',
  ...props
}) => {
  const styles = {
    primary:
      'bg-route text-card rounded-[10px] font-sans font-medium px-4 py-2 min-h-[44px] hover:bg-route-dark focus-visible:ring-2 focus-visible:ring-route disabled:opacity-50 disabled:cursor-not-allowed',
    secondary:
      'bg-paper text-ink border border-slate-light rounded-[10px] font-sans font-medium px-4 py-2 min-h-[44px] hover:bg-slate-light/30 focus-visible:ring-2 focus-visible:ring-route disabled:opacity-50 disabled:cursor-not-allowed',
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${styles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
