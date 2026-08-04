import React from 'react';
import { LogOut, Lock, Building2, ShieldCheck, Sparkles, Cpu } from 'lucide-react';
import { Avatar } from './ui';
import { RealtimeBadge } from './RealtimeBadge';

export function Header({ activeUser, onLogout, isLive = true }) {
  const company = activeUser.company || 'Star Health & Allied Insurance';
  const role    = (activeUser.role || 'underwriter').replace(/_/g, ' ');

  return (
    <header className="h-16 shrink-0 flex items-center justify-between px-6 border-b border-[var(--c-ink-3)]/60 bg-[var(--c-ink)]/95 backdrop-blur-md sticky top-0 z-40 shadow-md">
      
      {/* ─ BRAND & COMPANY CLUSTER ─ */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3 group cursor-pointer">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#C8862A] to-[#92600E] p-0.5 shadow-lg shadow-amber-900/30 transition-transform group-hover:scale-105">
            <div className="w-full h-full bg-[var(--c-ink)] rounded-[10px] flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-[#C8862A]" strokeWidth={2.2} />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-heading font-extrabold text-white tracking-tight text-lg flex items-center gap-1.5">
                UnderWriter <span className="text-[#C8862A]">AI</span>
              </span>
              <span className="text-[0.55rem] font-bold font-mono tracking-wider uppercase bg-[#C8862A]/20 text-[#C8862A] px-2 py-0.5 rounded-md border border-[#C8862A]/40">
                PRO v2.4
              </span>
            </div>
            <div className="text-[0.63rem] text-[var(--c-ink-dim)] font-mono tracking-wide flex items-center gap-1">
              <span>Autonomous Risk & Decision Engine</span>
            </div>
          </div>
        </div>

        {/* Separator */}
        <div className="hidden md:block w-px h-7 bg-[var(--c-ink-3)]/80 mx-1" />

        {/* Insurance Company Badge */}
        <div className="hidden lg:flex items-center gap-2 text-xs font-medium text-[var(--c-paper)] bg-[var(--c-ink-2)]/90 px-3 py-1.5 rounded-lg border border-[var(--c-ink-3)]">
          <Building2 size={13} className="text-[#C8862A]" />
          <span>{company}</span>
        </div>
      </div>

      {/* ─ RIGHT STATUS & USER CONTROLS ─ */}
      <div className="flex items-center gap-3">

        {/* AWS Bedrock Engine Active Badge */}
        <div className="hidden sm:flex items-center gap-1.5 text-[0.65rem] font-bold font-mono text-amber-300 bg-amber-950/50 border border-amber-500/30 px-3 py-1 rounded-lg">
          <Cpu size={11} className="text-amber-400 animate-pulse" />
          <span>AWS Bedrock AI</span>
        </div>

        {/* JWT Security Status */}
        <div className="hidden md:flex items-center gap-1.5 text-[0.65rem] font-bold font-mono text-[var(--c-green)] bg-[var(--c-green)]/15 border border-[var(--c-green)]/40 px-3 py-1 rounded-lg">
          <Lock size={11} />
          <span>JWT 256-Bit Encrypted</span>
        </div>

        {/* Real-time Connection Status */}
        <RealtimeBadge isConnected={isLive} />

        {/* Separator */}
        <div className="w-px h-6 bg-[var(--c-ink-3)] mx-0.5" />

        {/* Active User Card */}
        <div className="flex items-center gap-3 pl-1">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-bold text-white tracking-wide">{activeUser.name}</div>
            <div className="text-[0.62rem] font-mono text-[#C8862A] capitalize font-semibold">{role}</div>
          </div>
          <div className="relative">
            <Avatar name={activeUser.name} />
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-[var(--c-ink)] rounded-full" />
          </div>
        </div>

        {/* Logout Action */}
        <button
          onClick={onLogout}
          title="Sign out of UnderWriter AI"
          className="ml-1 p-2 rounded-lg text-[var(--c-ink-dim)] hover:text-red-400 hover:bg-red-950/40 border border-[var(--c-ink-3)] hover:border-red-500/40 transition-all cursor-pointer flex items-center gap-1.5 text-xs"
        >
          <LogOut size={14} />
          <span className="hidden xl:inline text-[0.7rem] font-semibold">Exit</span>
        </button>

      </div>
    </header>
  );
}
