import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, RefreshCw, Eye, User, Filter, AlertTriangle,
  FileText, CheckCircle, Clock, ChevronUp, ChevronDown,
  ShieldAlert, Cpu, MessageSquare, XCircle, SquareCheck,
} from 'lucide-react';
import { StampBadge } from '../components/StampBadge';
import { RiskDot } from '../components/RiskDot';
import { Card, Input, Select, Button, EmptyState, Spinner, StatCard, Badge } from '../components/ui';
import { apiFetch } from '../api.js';

const POLICY_TYPES   = ['Health', 'Motor', 'Life', 'Travel', 'Property'];
const STATUSES       = ['submitted', 'review', 'approved', 'rejected', 'escalated', 'doc_pending'];
const AI_RECS        = ['Approve', 'Reject', 'Investigate', 'Escalate'];
const SORT_OPTIONS   = [
  { value: 'newest',    label: 'Newest First' },
  { value: 'oldest',   label: 'Oldest First' },
  { value: 'risk_hi',  label: 'Risk: High → Low' },
  { value: 'risk_lo',  label: 'Risk: Low → High' },
  { value: 'amount_hi',label: 'Amount: High → Low' },
];

// ── SLA badge helper ────────────────────────────────────────────────────────
function SLABadge({ submittedAt, slaDeadline }) {
  const deadline = slaDeadline
    ? new Date(slaDeadline)
    : new Date(new Date(submittedAt || Date.now()).getTime() + 30 * 24 * 60 * 60 * 1000);
  const daysLeft = Math.ceil((deadline - Date.now()) / (1000 * 60 * 60 * 24));
  if (daysLeft < 0)  return <span className="inline-flex items-center gap-1 text-[0.62rem] font-bold px-2 py-0.5 rounded-full bg-red-900/40 text-red-300">⛔ BREACHED</span>;
  if (daysLeft <= 3) return <span className="inline-flex items-center gap-1 text-[0.62rem] font-bold px-2 py-0.5 rounded-full bg-red-900/30 text-red-400">⚠ {daysLeft}d</span>;
  if (daysLeft <= 7) return <span className="inline-flex items-center gap-1 text-[0.62rem] font-bold px-2 py-0.5 rounded-full bg-amber-900/30 text-amber-400">⚡ {daysLeft}d</span>;
  return <span className="inline-flex items-center gap-1 text-[0.62rem] font-mono px-2 py-0.5 rounded-full bg-[var(--c-paper)] text-[var(--c-muted)] border border-[var(--c-border)]">{daysLeft}d</span>;
}

export function UnderwriterLedgerView({ onSelectCase, currentRole, activeUser, token, refreshTrigger }) {
  const [claims, setClaims]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [status, setStatus]       = useState('all');
  const [type, setType]           = useState('all');
  const [aiRec, setAiRec]         = useState('all');
  const [sortBy, setSortBy]       = useState('newest');
  const [uwFilter, setUwFilter]   = useState('all');
  const [selected, setSelected]   = useState(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [duplicateAlert, setDuplicateAlert] = useState(null);

  const isUnderwriter = ['underwriter', 'senior_underwriter', 'admin'].includes(currentRole);

  const authHeaders = token ? { 'Authorization': `Bearer ${token}` } : {};

  const fetchClaims = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (status !== 'all') p.append('status', status);
      if (type   !== 'all') p.append('policyType', type);
      if (uwFilter !== 'all') p.append('assignedUnderwriterId', uwFilter);
      if (search) p.append('search', search);
      const res  = await apiFetch(`/api/claims?${p}`, { headers: authHeaders });
      const json = await res.json();
      if (json.success) setClaims(json.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [status, type, uwFilter, search, token]);

  const fetchDuplicates = useCallback(async () => {
    if (!isUnderwriter) return;
    try {
      const res = await apiFetch('/api/claims/duplicates', { headers: authHeaders });
      const json = await res.json();
      if (json.success && json.totalDuplicates > 0) setDuplicateAlert(json);
    } catch { /* silent */ }
  }, [token, isUnderwriter]);

  useEffect(() => {
    fetchClaims();
    fetchDuplicates();
  }, [fetchClaims, fetchDuplicates, refreshTrigger]);

  // ── Filter + sort ──────────────────────────────────────────────────────────
  const displayed = claims
    .filter(c => aiRec === 'all' || (c.aiRecommendation || '').toLowerCase().includes(aiRec.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'newest')    return new Date(b.submittedAt || b.createdAt || 0) - new Date(a.submittedAt || a.createdAt || 0);
      if (sortBy === 'oldest')    return new Date(a.submittedAt || a.createdAt || 0) - new Date(b.submittedAt || b.createdAt || 0);
      if (sortBy === 'risk_hi')   return (b.riskScore || 0) - (a.riskScore || 0);
      if (sortBy === 'risk_lo')   return (a.riskScore || 0) - (b.riskScore || 0);
      if (sortBy === 'amount_hi') return (b.claimAmount || 0) - (a.claimAmount || 0);
      return 0;
    });

  // ── Bulk actions ──────────────────────────────────────────────────────────
  const toggleSelect = (id) => setSelected(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
  const toggleSelectAll = () => {
    if (selected.size === displayed.length) { setSelected(new Set()); }
    else { setSelected(new Set(displayed.map(c => c.id))); }
  };
  const clearSelected = () => setSelected(new Set());

  const bulkAction = async (action) => {
    setBulkLoading(true);
    const ids = [...selected];
    try {
      await Promise.all(ids.map(id =>
        apiFetch(`/api/claims/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', ...authHeaders },
          body: JSON.stringify(
            action === 'approve'
              ? { status: 'approved', reason: 'Bulk approval — AI Recommend + Low Risk' }
              : { status: 'escalated', reason: 'Bulk escalation by underwriter' }
          )
        })
      ));
      clearSelected();
      fetchClaims();
    } catch (err) {
      console.error('Bulk action failed:', err);
    } finally {
      setBulkLoading(false);
    }
  };

  // ── KPI stats ─────────────────────────────────────────────────────────────
  const total    = claims.length;
  const pending  = claims.filter(c => ['submitted', 'review', 'doc_pending'].includes(c.status)).length;
  const approved = claims.filter(c => c.status === 'approved').length;
  const highRisk = claims.filter(c => (c.riskScore || 0) >= 50).length;

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">

      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="page-heading">Underwriter Ledger</h2>
          <p className="text-sm text-[var(--c-muted)] mt-1">
            Real-time queue · AI-evaluated · PED · Sub-Limits · SLA Tracking
          </p>
        </div>
        <Button variant="ghost" onClick={fetchClaims} className="self-start sm:self-auto">
          <RefreshCw size={13} className={loading ? 'animate-spin-slow' : ''} />
          Refresh Queue
        </Button>
      </div>

      {/* ── Duplicate Invoice Alert ── */}
      {duplicateAlert && duplicateAlert.totalDuplicates > 0 && (
        <div className="flex items-start gap-3 p-4 rounded-lg border border-red-500/40 bg-red-900/20">
          <AlertTriangle size={16} className="text-red-400 mt-0.5 shrink-0" />
          <div className="flex-1">
            <div className="text-sm font-bold text-red-300">
              ⚠ {duplicateAlert.totalDuplicates} Duplicate Invoice Group{duplicateAlert.totalDuplicates > 1 ? 's' : ''} Detected
            </div>
            <div className="text-[0.72rem] text-red-400 mt-0.5">
              {duplicateAlert.data.slice(0, 3).map(d => (
                <span key={d.invoiceNumber} className="mr-3">
                  Invoice {d.invoiceNumber} found in {d.count} claims ({d.claims.map(c => c.claimId).join(', ')})
                </span>
              ))}
            </div>
          </div>
          <button onClick={() => setDuplicateAlert(null)} className="text-red-400 hover:text-red-200 text-lg leading-none">×</button>
        </div>
      )}

      {/* ── KPI row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Claims"  value={total}    sub="in active ledger"    icon={FileText}     />
        <StatCard label="Pending"       value={pending}  sub="awaiting decision"   icon={Clock}        accentColor="var(--c-amber)" />
        <StatCard label="Approved"      value={approved} sub="decisions issued"    icon={CheckCircle}  accentColor="var(--c-green)" />
        <StatCard label="High Risk"     value={highRisk} sub="score ≥ 50"          icon={ShieldAlert}  accentColor="var(--c-red)" />
      </div>

      {/* ── Filter bar ── */}
      <Card>
        <div className="p-3 flex flex-col xl:flex-row gap-3 items-center justify-between">
          {/* Left: Search input */}
          <div className="w-full xl:w-80 shrink-0">
            <Input icon={Search} type="text" placeholder="Search case ID, claimant, policy #…" value={search} onChange={e => setSearch(e.target.value)} className="w-full" />
          </div>

          {/* Right: Select Filters in a clean horizontal row */}
          <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto justify-start xl:justify-end">
            <Select value={sortBy} onChange={e => setSortBy(e.target.value)} className="text-xs py-2 w-auto min-w-[130px]">
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
            <Select value={status} onChange={e => setStatus(e.target.value)} className="text-xs py-2 w-auto min-w-[120px]">
              <option value="all">All Statuses</option>
              {STATUSES.map(s => <option key={s} value={s}>{s === 'doc_pending' ? 'Doc Pending' : s.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>)}
            </Select>
            <Select value={type} onChange={e => setType(e.target.value)} className="text-xs py-2 w-auto min-w-[110px]">
              <option value="all">All Types</option>
              {POLICY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </Select>
            <Select value={aiRec} onChange={e => setAiRec(e.target.value)} className="text-xs py-2 w-auto min-w-[120px]">
              <option value="all">All AI Recs</option>
              {AI_RECS.map(r => <option key={r} value={r}>AI: {r}</option>)}
            </Select>
            <Select value={uwFilter} onChange={e => setUwFilter(e.target.value)} className="text-xs py-2 w-auto min-w-[140px]">
              <option value="all">All Underwriters</option>
              <option value="UW-101">Vikram Malhotra</option>
              <option value="UW-102">Ananya Sharma</option>
              <option value="UW-103">Siddharth Verma</option>
            </Select>
          </div>
        </div>
      </Card>

      {/* ── Bulk Action Bar ── */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-[var(--c-border)] bg-[var(--c-paper)] shadow-lg">
          <SquareCheck size={15} style={{ color: 'var(--c-amber)' }} />
          <span className="text-sm font-semibold text-[var(--c-ink)]">{selected.size} claim{selected.size > 1 ? 's' : ''} selected</span>
          <div className="flex-1" />
          <Button variant="ghost" onClick={() => bulkAction('approve')} disabled={bulkLoading} className="text-xs py-1.5 px-3 text-green-400 border border-green-800/40">
            <CheckCircle size={12} /> Bulk Approve
          </Button>
          <Button variant="ghost" onClick={() => bulkAction('escalate')} disabled={bulkLoading} className="text-xs py-1.5 px-3 text-amber-400 border border-amber-800/40">
            <AlertTriangle size={12} /> Bulk Escalate
          </Button>
          <Button variant="ghost" onClick={clearSelected} className="text-xs py-1.5 px-3">
            <XCircle size={12} /> Clear
          </Button>
        </div>
      )}

      {/* ── Table ── */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                {isUnderwriter && (
                  <th className="w-8">
                    <input
                      type="checkbox"
                      checked={selected.size === displayed.length && displayed.length > 0}
                      onChange={toggleSelectAll}
                      className="w-3.5 h-3.5 cursor-pointer accent-amber-500"
                    />
                  </th>
                )}
                <th>Case ID</th>
                <th>Claimant</th>
                <th>Type</th>
                <th className="text-right">Claim Amount</th>
                <th className="text-center">Status</th>
                <th>Risk</th>
                <th className="text-center">AI Rec</th>
                <th className="text-center">SLA</th>
                <th>Assigned To</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={isUnderwriter ? 11 : 10} className="py-16 text-center text-[var(--c-muted)]">
                    <div className="flex items-center justify-center gap-2">
                      <Spinner size={16} />
                      <span className="text-sm">Loading claims queue…</span>
                    </div>
                  </td>
                </tr>
              ) : displayed.length === 0 ? (
                <tr>
                  <td colSpan={isUnderwriter ? 11 : 10}>
                    <EmptyState icon={FileText} title="No Claims Found" description="Try adjusting your filters or refreshing the queue." />
                  </td>
                </tr>
              ) : (
                displayed.map(claim => {
                  const isSelected = selected.has(claim.id);
                  const aiRec = (claim.aiRecommendation || '').toLowerCase();
                  const aiColor = aiRec.includes('approve') ? 'var(--c-green)'
                    : aiRec.includes('reject') ? 'var(--c-red)'
                    : aiRec.includes('escalat') ? 'var(--c-amber)'
                    : 'var(--c-muted)';
                  const hasPED = claim.pedAnalysis?.hasViolation;
                  const hasRI  = claim.reinsuranceFlag?.required;

                  return (
                    <tr
                      key={claim.id}
                      onClick={() => onSelectCase(claim.id)}
                      className={`cursor-pointer ${isSelected ? 'bg-amber-900/10' : ''}`}
                    >
                      {isUnderwriter && (
                        <td onClick={e => { e.stopPropagation(); toggleSelect(claim.id); }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(claim.id)}
                            className="w-3.5 h-3.5 cursor-pointer accent-amber-500"
                          />
                        </td>
                      )}

                      <td>
                        <span className="font-number font-bold text-[var(--c-ink)] text-xs">{claim.id}</span>
                        {hasPED && <span className="ml-1 text-[0.6rem] font-mono font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700 border border-red-200">PED</span>}
                        {hasRI  && <span className="ml-1 text-[0.6rem] font-mono font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 border border-purple-200">RI</span>}
                      </td>

                      <td>
                        <div className="font-semibold text-[var(--c-ink)] text-sm">{claim.claimantName}</div>
                        <div className="font-number text-[0.68rem] text-[var(--c-muted)]">{claim.policyNumber}</div>
                        <div className="text-[0.65rem] font-semibold mt-0.5" style={{ color: 'var(--c-amber)' }}>
                          {claim.policyCompany || 'Star Health & Allied Insurance'}
                        </div>
                      </td>

                      <td><span className="tag">{claim.policyType}</span></td>

                      <td className="text-right">
                        <div className="font-number font-bold text-[var(--c-ink)]">₹{claim.claimAmount?.toLocaleString()}</div>
                        {claim.approvedAmount != null && claim.approvedAmount !== claim.claimAmount && (
                          <div className="font-number text-[0.65rem] text-green-400 font-semibold">✓ ₹{claim.approvedAmount?.toLocaleString()}</div>
                        )}
                        <div className="font-number text-[0.65rem] text-[var(--c-muted)]">of ₹{claim.sumInsured?.toLocaleString()}</div>
                      </td>

                      <td className="text-center"><StampBadge status={claim.status} /></td>

                      <td><RiskDot score={claim.riskScore || 0} /></td>

                      <td className="text-center">
                        <span className="text-[0.65rem] font-bold" style={{ color: aiColor }}>
                          {claim.aiRecommendation || '—'}
                        </span>
                      </td>

                      <td className="text-center">
                        <SLABadge submittedAt={claim.submittedAt} slaDeadline={claim.slaDeadline} />
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
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
