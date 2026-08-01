import React from 'react';
import { LogOut, Lock, Building2 } from 'lucide-react';
import { Avatar, Badge } from './ui';

export function Header({ activeUser, onLogout }) {
  const company = activeUser.company || 'Insurance Company';
  const role    = (activeUser.role || 'underwriter').replace(/_/g, ' ');

  return (
    <header
      className="h-14 flex items-center justify-between px-5 border-b border-[var(--c-ink-2)] sticky top-0 z-30"
      style={{ background: 'var(--c-ink)' }}
    >
      {/* ─ Brand ─ */}
      <div className="flex items-center gap-3">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center font-heading font-bold text-base shrink-0"
          style={{ background: 'var(--c-amber)', color: 'var(--c-ink)' }}
        >
          L
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-heading font-bold text-[var(--c-paper)] tracking-tight text-base">LEDGER</span>
            <span className="hidden sm:inline-flex items-center gap-1 text-[0.62rem] font-bold font-mono tracking-wider
              bg-[var(--c-ink-2)] text-[var(--c-ink-dim)] px-2 py-0.5 rounded border border-[var(--c-ink-3)]">
              <Building2 size={9} />
              {company}
            </span>
          </div>
          <div className="text-[0.62rem] text-[var(--c-ink-dim)] font-mono">AI Underwriting Platform</div>
        </div>
      </div>

      {/* ─ Right cluster ─ */}
      <div className="flex items-center gap-3">
        {/* JWT verified chip */}
        <div className="hidden md:flex items-center gap-1.5 text-[0.65rem] font-bold font-mono
          text-[var(--c-green)] bg-[var(--c-green)]/10 border border-[var(--c-green)]/30
          px-2.5 py-1 rounded-full">
          <Lock size={10} />
          JWT Secured
        </div>

        {/* Separator */}
        <div className="w-px h-6 bg-[var(--c-ink-3)]" />

        {/* User info */}
        <div className="flex items-center gap-2.5">
          <div className="text-right hidden sm:block">
            <div className="text-[0.75rem] font-semibold text-[var(--c-paper)]">{activeUser.name}</div>
            <div className="text-[0.62rem] font-mono text-[var(--c-ink-dim)] capitalize">{role}</div>
          </div>
          <Avatar name={activeUser.name} />
        </div>

        {/* Logout */}
        <button
          onClick={onLogout}
          title="Sign out"
          className="w-8 h-8 rounded-lg flex items-center justify-center
            text-[var(--c-ink-dim)] hover:text-[var(--c-red)] hover:bg-[var(--c-ink-2)]
            border border-[var(--c-ink-3)] transition"
        >
          <LogOut size={14} />
        </button>
      </div>
    </header>
  );
}
