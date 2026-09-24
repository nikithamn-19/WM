import React from 'react'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  value?: string | number
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder?: string
  type?: string
  required?: boolean
  error?: string
  className?: string
}

export const Input: React.FC<InputProps> = ({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  required = false,
  error,
  className = '',
  ...props
}) => {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label className="text-xs font-medium text-slate font-sans">
          {label} {required && <span className="text-clay">*</span>}
        </label>
      )}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className={`bg-paper border border-slate-light rounded-[8px] px-3 py-2 text-sm text-ink font-sans w-full focus:border-route focus:outline-none placeholder:text-slate min-h-[44px] ${
          error ? 'border-clay focus:border-clay' : ''
        } ${className}`}
        {...props}
      />
      {error && <span className="text-xs text-clay font-medium font-sans">{error}</span>}
    </div>
  )
}
