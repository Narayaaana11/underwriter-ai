import React, { useState, useEffect } from 'react';
import { Search, RefreshCw, Eye, User, Filter, ArrowUpDown } from 'lucide-react';
import { StampBadge } from '../components/StampBadge';
import { RiskDot } from '../components/RiskDot';
import { Card, Input, Select, Button, EmptyState, Spinner, StatCard } from '../components/ui';
import { FileText, CheckCircle, Clock, AlertTriangle } from 'lucide-react';

const POLICY_TYPES = ['Health', 'Motor', 'Life', 'Travel', 'Property'];
const STATUSES     = ['submitted', 'review', 'approved', 'rejected', 'escalated'];

export function UnderwriterLedgerView({ onSelectCase, currentRole, activeUser }) {
  const [claims, setClaims]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [status, setStatus]   = useState('all');
  const [type, setType]       = useState('all');
  const [uwFilter, setUwFilter] = useState('all');

  const fetchClaims = async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (status !== 'all') p.append('status', status);
      if (type !== 'all')   p.append('policyType', type);
      if (uwFilter !== 'all') p.append('assignedUnderwriterId', uwFilter);
      if (search)           p.append('search', search);
      const res  = await fetch(`/api/claims?${p}`);
      const json = await res.json();
      if (json.success) setClaims(json.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchClaims(); }, [status, type, uwFilter, search]);

  // Summary stats
  const total     = claims.length;
  const pending   = claims.filter(c => ['submitted', 'review'].includes(c.status)).length;
  const approved  = claims.filter(c => c.status === 'approved').length;
  const highRisk  = claims.filter(c => (c.riskScore || 0) >= 50).length;

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">

      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="page-heading">Underwriter Ledger</h2>
          <p className="text-sm text-[var(--c-muted)] mt-1">
            Real-time queue · AI-evaluated · AWS Bedrock + Fraud Detector
          </p>
        </div>
        <Button variant="ghost" onClick={fetchClaims} className="self-start sm:self-auto">
          <RefreshCw size={13} className={loading ? 'animate-spin-slow' : ''} />
          Refresh Queue
        </Button>
      </div>

      {/* ── KPI row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Claims" value={total}    sub="in active ledger"     icon={FileText}    />
        <StatCard label="Pending"      value={pending}  sub="awaiting decision"     icon={Clock}       accentColor="var(--c-amber)" />
        <StatCard label="Approved"     value={approved} sub="decisions issued"      icon={CheckCircle} accentColor="var(--c-green)" />
        <StatCard label="High Risk"    value={highRisk} sub="score ≥ 50"            icon={AlertTriangle} accentColor="var(--c-red)" />
      </div>

      {/* ── Filter bar ── */}
      <Card>
        <div className="p-3 flex flex-col sm:flex-row gap-3 items-center">
          {/* Search */}
          <div className="flex-1 w-full sm:w-auto">
            <Input
              icon={Search}
              type="text"
              placeholder="Search case ID, claimant, policy #…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <Select value={status} onChange={e => setStatus(e.target.value)} className="text-xs py-2">
              <option value="all">All Statuses</option>
              {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>)}
            </Select>

            <Select value={type} onChange={e => setType(e.target.value)} className="text-xs py-2">
              <option value="all">All Types</option>
              {POLICY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </Select>

            <Select value={uwFilter} onChange={e => setUwFilter(e.target.value)} className="text-xs py-2">
              <option value="all">All Underwriters</option>
              <option value="UW-101">Vikram Malhotra</option>
              <option value="UW-102">Ananya Sharma</option>
              <option value="UW-103">Siddharth Verma</option>
            </Select>
          </div>
        </div>
      </Card>

      {/* ── Table ── */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Case ID</th>
                <th>Claimant</th>
                <th>Type</th>
                <th className="text-right">Claim Amount</th>
                <th className="text-center">Status</th>
                <th>Risk</th>
                <th>Assigned To</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-[var(--c-muted)]">
                    <div className="flex items-center justify-center gap-2">
                      <Spinner size={16} />
                      <span className="text-sm">Loading claims queue…</span>
                    </div>
                  </td>
                </tr>
              ) : claims.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <EmptyState
                      icon={FileText}
                      title="No Claims Found"
                      description="Try adjusting your filters or refreshing the queue."
                    />
                  </td>
                </tr>
              ) : (
                claims.map(claim => (
                  <tr
                    key={claim.id}
                    onClick={() => onSelectCase(claim.id)}
                    className="cursor-pointer"
                  >
                    <td>
                      <span className="font-number font-bold text-[var(--c-ink)] text-xs">{claim.id}</span>
                    </td>

                    <td>
                      <div className="font-semibold text-[var(--c-ink)] text-sm">{claim.claimantName}</div>
                      <div className="font-number text-[0.68rem] text-[var(--c-muted)]">{claim.policyNumber}</div>
                      <div className="text-[0.65rem] font-semibold mt-0.5" style={{ color: 'var(--c-amber)' }}>
                        {claim.policyCompany || 'HDFC ERGO Health & General'}
                      </div>
                    </td>

                    <td>
                      <span className="tag">{claim.policyType}</span>
                    </td>

                    <td className="text-right">
                      <div className="font-number font-bold text-[var(--c-ink)]">
                        ₹{claim.claimAmount?.toLocaleString()}
                      </div>
                      <div className="font-number text-[0.65rem] text-[var(--c-muted)]">
                        of ₹{claim.sumInsured?.toLocaleString()}
                      </div>
                    </td>

                    <td className="text-center">
                      <StampBadge status={claim.status} />
                    </td>

                    <td>
                      <RiskDot score={claim.riskScore || 0} />
                    </td>

                    <td>
                      <div className="flex items-center gap-1.5 text-[0.75rem] text-[var(--c-ink)]">
                        <User size={12} className="text-[var(--c-muted)]" />
                        {claim.assignedUnderwriterName || <span className="text-[var(--c-muted)] italic">Unassigned</span>}
                      </div>
                    </td>

                    <td>
                      <Button
                        variant="primary"
                        className="py-1 px-2.5 text-[0.7rem]"
                        onClick={e => { e.stopPropagation(); onSelectCase(claim.id); }}
                      >
                        <Eye size={12} style={{ color: 'var(--c-amber)' }} />
                        Review
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
