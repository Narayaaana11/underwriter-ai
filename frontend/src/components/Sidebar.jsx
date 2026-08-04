import React from 'react';
import { FilePlus, BookOpen, BarChart3, Shield, Activity } from 'lucide-react';
import { Badge } from './ui';

const NAV_ITEMS = [
  {
    id: 'file-claim',
    label: 'File a Claim',
    icon: FilePlus,
    roles: ['claimant', 'underwriter', 'senior_underwriter', 'admin'],
    badge: 'Form',
    badgeColor: 'gray',
  },
  {
    id: 'ledger',
    label: 'Underwriter Ledger',
    icon: BookOpen,
    roles: ['underwriter', 'senior_underwriter', 'admin'],
    badge: 'Queue',
    badgeColor: 'navy',
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: BarChart3,
    roles: ['underwriter', 'senior_underwriter', 'admin'],
    badge: 'QuickSight',
    badgeColor: 'amber',
  },
  {
    id: 'admin',
    label: 'Admin Panel',
    icon: Shield,
    roles: ['admin'],
    badge: 'Audit',
    badgeColor: 'red',
  },
];

export function Sidebar({ activeTab, setActiveTab, currentRole }) {
  const visible = NAV_ITEMS.filter(item => item.roles.includes(currentRole));

  return (
    <aside className="w-56 shrink-0 h-full overflow-y-auto bg-[var(--c-surface)] border-r border-[var(--c-border)] flex flex-col">
      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5 pt-4">
        <p className="px-3 mb-2 text-[0.65rem] font-bold tracking-widest uppercase text-[var(--c-muted)]">
          Menu
        </p>

        {visible.map(item => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[0.8rem] font-medium
                transition-all duration-150
                ${active
                  ? 'bg-[var(--c-ink)] text-[var(--c-paper)] shadow-sm'
                  : 'text-[var(--c-muted)] hover:text-[var(--c-ink)] hover:bg-[var(--c-paper)]'
                }
              `}
            >
              <Icon
                size={15}
                strokeWidth={active ? 2.5 : 2}
                style={{ color: active ? 'var(--c-amber)' : 'inherit', flexShrink: 0 }}
              />
              <span className="flex-1 text-left truncate">{item.label}</span>
              {active && (
                <span className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: 'var(--c-amber)' }} />
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer stack status */}
      <div className="p-4 border-t border-[var(--c-border)] space-y-2">
        <div className="flex items-center gap-1.5 text-[0.65rem] font-bold text-[var(--c-muted)] uppercase tracking-wide">
          <Activity size={11} />
          System Status
        </div>
        {[
          { label: 'AWS Bedrock',      status: 'Live' },
          { label: 'AWS Textract',     status: 'Live' },
          { label: 'Fraud Detector',   status: 'Live' },
          { label: 'Step Functions',   status: 'Live' },
        ].map(s => (
          <div key={s.label} className="flex items-center justify-between">
            <span className="text-[0.65rem] text-[var(--c-muted)]">{s.label}</span>
            <span className="flex items-center gap-1 text-[0.65rem] font-bold text-[var(--c-green)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--c-green)] animate-pulse inline-block" />
              {s.status}
            </span>
          </div>
        ))}

        <div className="pt-2 font-mono text-[0.6rem] text-[var(--c-muted)]">
          UnderWriter AI Engine v2.4
        </div>
      </div>
    </aside>
  );
}
