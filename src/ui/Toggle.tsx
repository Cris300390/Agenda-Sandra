import React from 'react'

type ToggleProps = {
  checked: boolean
  onChange: (v: boolean) => void
  labelOn?: string
  labelOff?: string
  className?: string
}

export default function Toggle({
  checked,
  onChange,
  labelOn = 'Activo',
  labelOff = 'Inactivo',
  className = '',
}: ToggleProps) {
  const label = checked ? labelOn : labelOff
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
      className={className}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 10,
        padding: 8, borderRadius: 9999, border: '1px solid #e5e7eb',
        background: checked ? '#ecfeff' : '#f8fafc', cursor: 'pointer'
      }}
    >
      <span
        style={{
          width: 42, height: 24, borderRadius: 9999, position: 'relative',
          background: checked ? '#22c55e' : '#94a3b8', transition: '.2s'
        }}
      >
        <span
          style={{
            position: 'absolute', top: 3, left: checked ? 22 : 3,
            width: 18, height: 18, borderRadius: '50%', background: 'white',
            transition: '.2s', boxShadow: '0 2px 6px rgba(0,0,0,.15)'
          }}
        />
      </span>
      <strong style={{ color: checked ? '#166534' : '#334155' }}>{label}</strong>
    </button>
  )
}
