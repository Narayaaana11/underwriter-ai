/**
 * RealtimeBadge.jsx — Live connection indicator
 */
import React from 'react';
import { Wifi, WifiOff } from 'lucide-react';

export function RealtimeBadge({ isConnected }) {
  return (
    <div
      className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[0.62rem] font-mono font-bold transition-all duration-300 ${
        isConnected
          ? 'bg-[var(--c-green-bg)] text-[var(--c-green)] border border-[var(--c-green)]'
          : 'bg-[var(--c-red-bg)] text-[var(--c-red)] border border-[var(--c-red)]'
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-[var(--c-green)] animate-pulse' : 'bg-[var(--c-red)]'}`}
      />
      {isConnected ? 'LIVE' : 'OFFLINE'}
    </div>
  );
}
