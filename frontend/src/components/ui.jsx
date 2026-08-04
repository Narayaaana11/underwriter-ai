/**
 * ui.jsx — Shared UI Primitive Components
 *
 * Design philosophy:
 *  - All visual decisions live in index.css design tokens / component classes.
 *  - React components are logic wrappers only — no ad-hoc Tailwind overrides.
 *  - Every component accepts className for one-off extensions.
 */
import React from 'react';

// ─── Card ────────────────────────────────────────────────────────
export function Card({ children, className = '', ...props }) {
  return (
    <div className={`card animate-fade-in ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ icon: Icon, title, action, className = '' }) {
  return (
    <div className={`card-header ${className}`}>
      <span className="card-header-title">
        {Icon && <Icon size={13} />}
        {title}
      </span>
      {action && <div>{action}</div>}
    </div>
  );
}

export function CardSection({ children, className = '' }) {
  return <div className={`card-section ${className}`}>{children}</div>;
}

// ─── Section Heading ────────────────────────────────────────────
export function SectionHeading({ icon: Icon, children, className = '' }) {
  return (
    <div className={`section-heading ${className}`}>
      {Icon && <Icon size={13} />}
      {children}
    </div>
  );
}

// ─── Stat Card ──────────────────────────────────────────────────
export function StatCard({ label, value, sub, icon: Icon, accentColor = 'var(--c-amber)', className = '' }) {
  return (
    <div className={`stat-card ${className}`}>
      {Icon && (
        <div className="mb-2" style={{ color: accentColor }}>
          <Icon size={16} />
        </div>
      )}
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

// ─── Buttons ────────────────────────────────────────────────────
export function Button({ variant = 'primary', children, className = '', ...props }) {
  const cls = variant === 'ghost' ? 'btn-ghost' : variant === 'danger' ? 'btn-danger' : 'btn-primary';
  return <button className={`${cls} ${className}`} {...props}>{children}</button>;
}

// ─── Input / Select ─────────────────────────────────────────────
export function Input({ icon: Icon, className = '', ...props }) {
  if (Icon) {
    return (
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--c-muted)] pointer-events-none">
          <Icon size={14} />
        </span>
        <input className={`input-base input-with-icon ${className}`} {...props} />
      </div>
    );
  }
  return <input className={`input-base ${className}`} {...props} />;
}

export function Select({ icon: Icon, children, className = '', ...props }) {
  if (Icon) {
    return (
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--c-muted)] pointer-events-none">
          <Icon size={14} />
        </span>
        <select className={`select-base input-with-icon ${className}`} {...props}>{children}</select>
      </div>
    );
  }
  return <select className={`select-base ${className}`} {...props}>{children}</select>;
}

export function Label({ children, className = '' }) {
  return (
    <label className={`block text-[0.7rem] font-semibold text-[var(--c-muted)] mb-1 tracking-wide uppercase ${className}`}>
      {children}
    </label>
  );
}

export function FormField({ label, children }) {
  return (
    <div>
      {label && <Label>{label}</Label>}
      {children}
    </div>
  );
}

// ─── Alerts ─────────────────────────────────────────────────────
export function Alert({ type = 'info', icon: Icon, children, className = '' }) {
  const cls = { warning: 'alert-warning', error: 'alert-error', success: 'alert-success', info: 'alert-info' }[type] || 'alert-info';
  return (
    <div className={`${cls} flex items-start gap-2 ${className}`}>
      {Icon && <Icon size={14} className="mt-0.5 flex-shrink-0" />}
      <span>{children}</span>
    </div>
  );
}

// ─── Data rows ──────────────────────────────────────────────────
export function DataRow({ label, children }) {
  return (
    <div className="data-row">
      <span className="data-label">{label}</span>
      <span className="data-value">{children}</span>
    </div>
  );
}

// ─── Spinner ────────────────────────────────────────────────────
export function Spinner({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}
      className="animate-spin-slow">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  );
}

// ─── Empty State ────────────────────────────────────────────────
export function EmptyState({ icon: Icon, title, description }) {
  return (
    <div className="py-16 text-center space-y-3">
      {Icon && <Icon size={32} className="mx-auto text-[var(--c-border-mid)]" strokeWidth={1.5} />}
      <div className="font-heading text-[var(--c-ink)] font-semibold text-base">{title}</div>
      {description && <p className="text-sm text-[var(--c-muted)] max-w-xs mx-auto">{description}</p>}
    </div>
  );
}

// ─── Avatar ─────────────────────────────────────────────────────
export function Avatar({ name = '', size = 'sm' }) {
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const sz = size === 'lg' ? 'w-10 h-10 text-sm' : 'w-7 h-7 text-[0.65rem]';
  return (
    <div className={`${sz} rounded-full bg-[#E8E5DC] text-[var(--c-ink)] font-bold font-mono flex items-center justify-center border border-[var(--c-border)] shrink-0`}>
      {initials}
    </div>
  );
}

// ─── Badge (pill) ────────────────────────────────────────────────
export function Badge({ children, color = 'gray' }) {
  const colors = {
    gray:   'bg-[var(--c-paper)] text-[var(--c-muted)] border-[var(--c-border)]',
    amber:  'bg-[var(--c-amber-bg)] text-[#78500A] border-[var(--c-amber)]',
    green:  'bg-[var(--c-green-bg)] text-[var(--c-green)] border-[var(--c-green)]',
    red:    'bg-[var(--c-red-bg)] text-[var(--c-red)] border-[var(--c-red)]',
    navy:   'bg-[var(--c-ink)] text-[var(--c-paper)] border-transparent',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[0.65rem] font-bold font-mono tracking-wide ${colors[color]}`}>
      {children}
    </span>
  );
}

// ─── Divider ────────────────────────────────────────────────────
export function Divider({ className = '' }) {
  return <hr className={`divider ${className}`} />;
}

// ─── Tooltip (HTML title fallback) ──────────────────────────────
export function Tooltip({ label, children }) {
  return <span title={label}>{children}</span>;
}
