import React from 'react';

const RISK_MAP = [
  { max: 20, level: 'low',    label: 'LOW',    cls: 'risk-low',    dot: '#3E6E5B' },
  { max: 50, level: 'medium', label: 'MEDIUM', cls: 'risk-medium', dot: '#C8862A' },
  { max: 101,level: 'high',   label: 'HIGH',   cls: 'risk-high',   dot: '#A6394A' },
];

function getRisk(score) {
  return RISK_MAP.find(r => score < r.max) || RISK_MAP[RISK_MAP.length - 1];
}

export function RiskDot({ score = 0 }) {
  const { cls, label, dot } = getRisk(score);
  return (
    <span className={`risk-pill ${cls}`}>
      <span style={{ display:'inline-block', width:6, height:6, borderRadius:'50%', background: dot, flexShrink:0 }} />
      {score} · {label}
    </span>
  );
}

export function RiskBar({ score = 0 }) {
  const { cls, label, dot } = getRisk(score);
  const pct = Math.min(100, score);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[0.7rem]">
        <span className={`risk-pill ${cls}`}>
          <span style={{ display:'inline-block', width:6, height:6, borderRadius:'50%', background: dot }} />
          {label} RISK
        </span>
        <span className="font-number font-bold text-[var(--c-ink)]">{score}<span className="text-[var(--c-muted)] font-normal">/100</span></span>
      </div>
      <div className="h-1.5 rounded-full bg-[var(--c-paper)] border border-[var(--c-border)] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: dot }}
        />
      </div>
    </div>
  );
}
