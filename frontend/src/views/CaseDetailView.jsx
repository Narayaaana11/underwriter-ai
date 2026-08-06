import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, Cpu, FileText, History, CheckCircle, AlertTriangle,
  XCircle, ShieldAlert, UserCheck, CreditCard, Send, Lock,
  MapPin, QrCode, Download, Building2, MessageSquare, RotateCcw,
  Clock, Shield, Zap, ChevronDown, ChevronUp, Siren,
} from 'lucide-react';
import { StampBadge } from '../components/StampBadge';
import { RiskDot, RiskBar } from '../components/RiskDot';
import {
  Card, CardHeader, CardSection, SectionHeading,
  Button, Select, FormField, Alert, DataRow, Spinner, Divider, Badge,
} from '../components/ui';
import { apiFetch } from '../api.js';

// ─── small panel sub-component ─────────────────────────────────
function Panel({ icon, title, badge, children, className = '' }) {
  return (
    <Card className={className}>
      <CardHeader icon={icon} title={title} action={badge} />
      <CardSection>{children}</CardSection>
    </Card>
  );
}

// ─── Amount highlight row ───────────────────────────────────────
function AmountRow({ label, value, sub, accent }) {
  return (
    <div className="text-center p-3 rounded-lg border border-[var(--c-border)] bg-[var(--c-paper)]">
      <div className="text-[0.65rem] font-bold uppercase tracking-wide text-[var(--c-muted)]">{label}</div>
      <div
        className="font-heading text-xl font-bold mt-0.5"
        style={{ color: accent || 'var(--c-ink)' }}
      >
        {value}
      </div>
      {sub && <div className="text-[0.65rem] text-[var(--c-muted)] mt-0.5">{sub}</div>}
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────
export function CaseDetailView({ claimId, onBack, currentRole, activeUser, token }) {
  const isUnderwriter = currentRole === 'underwriter' || currentRole === 'senior_underwriter' || currentRole === 'admin';
  const [claim, setClaim]               = useState(null);
  const [history, setHistory]           = useState([]);
  const [loading, setLoading]           = useState(true);
  const [selectedDoc, setSelectedDoc]   = useState(null);

  // Action state
  const [newStatus, setNewStatus]       = useState('');
  const [reason, setReason]             = useState('');
  const [busy, setBusy]                 = useState(false);
  const [success, setSuccess]           = useState(null);
  const [error, setError]               = useState(null);

  // Surveyor state
  const [surveyorName, setSurveyorName] = useState('Rajesh Gupta (AutoInspect Ltd.)');
  const [surveyorReport, setSurveyorReport] = useState('Physical on-site inspection completed. Structural impact confirmed.');

  // Payout state
  const [payoutMethod, setPayoutMethod] = useState('NEFT');
  const [bankRef, setBankRef]           = useState('HDFC-ACC-881920');

  // New feature state
  const [approvedAmt, setApprovedAmt]   = useState('');
  const [noteText, setNoteText]         = useState('');
  const [reopenReason, setReopenReason] = useState('');
  const [queryText, setQueryText]       = useState('');
  const [queryDocs, setQueryDocs]       = useState(['Discharge Summary', 'Hospital Bill']);
  const [queryDeadline, setQueryDeadline] = useState(14);
  const [showNotesPanel, setShowNotesPanel] = useState(false);
  const [showQueryPanel, setShowQueryPanel] = useState(false);
  const [showReopenPanel, setShowReopenPanel] = useState(false);
  const [showSubLimitPanel, setShowSubLimitPanel] = useState(false);

  // FIR state
  const [firInvestigator, setFirInvestigator] = useState('Rahul Verma');
  const [firAgency, setFirAgency] = useState('Apex Risk Solutions Ltd.');
  const [firBedCheck, setFirBedCheck] = useState(true);
  const [firDoctorCheck, setFirDoctorCheck] = useState(true);
  const [firPharmacyCheck, setFirPharmacyCheck] = useState(true);
  const [firNotes, setFirNotes] = useState('Patient verified in Ward 4, Bed 12. Doctor register entry verified.');
  const [firRec, setFirRec] = useState('GENUINE');
  const [showFIRForm, setShowFIRForm] = useState(false);

  // ── SLA computation helper ─────────────────────────────────────
  const getSLAStatus = (c) => {
    if (!c) return null;
    const deadline = c.slaDeadline
      ? new Date(c.slaDeadline)
      : new Date(new Date(c.submittedAt || c.createdAt || Date.now()).getTime() + 30 * 24 * 60 * 60 * 1000);
    const daysLeft = Math.ceil((deadline - Date.now()) / (1000 * 60 * 60 * 24));
    const isBreached = daysLeft < 0;
    const status = isBreached ? 'BREACHED' : daysLeft <= 3 ? 'CRITICAL' : daysLeft <= 7 ? 'WARNING' : 'ON_TRACK';
    return { daysLeft, isBreached, status, deadline };
  };

  // ── fetch ──────────────────────────────────────────────────────
  const load = async () => {
    setLoading(true);
    try {
      const res  = await apiFetch(`/api/claims/${claimId}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      const json = await res.json();
      if (json.success) {
        setClaim(json.data);
        setNewStatus(json.data.status);
        setHistory(json.policyholderHistory || []);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (claimId) load(); }, [claimId]);

  // ── helpers ────────────────────────────────────────────────────
  const apiPost = async (path, body) => {
    setBusy(true);
    setSuccess(null);
    setError(null);
    try {
      const res  = await apiFetch(`/api/claims/${claimId}${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.success) { setClaim(json.data); return json; }
      setError(json.error || 'Request failed.');
    } catch { setError('Network error.'); }
    finally { setBusy(false); }
  };

  const apiPatch = async (body) => {
    setBusy(true);
    setSuccess(null);
    setError(null);
    try {
      const res  = await apiFetch(`/api/claims/${claimId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.success) { setClaim(json.data); return json; }
      setError(json.error || 'Update failed.');
    } catch { setError('Network error.'); }
    finally { setBusy(false); }
  };

  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    const res = await apiPatch({ status: newStatus, actor: `${activeUser.name} (${currentRole})`, reason });
    if (res) { setSuccess(`Status updated to "${newStatus.toUpperCase()}" and logged to CloudTrail.`); setReason(''); }
  };

  const handleEscalate = async () => {
    const res = await apiPost('/escalate', { actor: activeUser.name, reason: 'Escalated for senior review.' });
    if (res) { setNewStatus('escalated'); setSuccess('Claim escalated to Senior Underwriter.'); }
  };

  const handleInvestigator = async (e) => {
    e.preventDefault();
    const res = await apiPost('/investigate', { surveyorName, report: surveyorReport });
    if (res) setSuccess('Surveyor findings recorded.');
  };

  const handlePayout = async (e) => {
    e.preventDefault();
    const disbAmt = approvedAmt ? Number(approvedAmt) : claim.claimAmount;
    const res = await apiPost('/disburse', { approvedAmount: disbAmt, payoutMethod, bankDetailsRef: bankRef });
    if (res) setSuccess('Payout disbursement recorded in ledger.');
  };

  const handlePartialApproval = async (e) => {
    e.preventDefault();
    if (!approvedAmt || isNaN(Number(approvedAmt))) return setError('Enter a valid approved amount.');
    const res = await apiPatch({
      approvedAmount: Number(approvedAmt),
      status: 'approved',
      actor: `${activeUser.name} (${currentRole})`,
      reason: `Partial approval: ₹${Number(approvedAmt).toLocaleString('en-IN')} approved of ₹${claim.claimAmount.toLocaleString('en-IN')} claimed. Sub-limit deductions applied.`
    });
    if (res) { setSuccess(`Claim partially approved for ₹${Number(approvedAmt).toLocaleString('en-IN')}.`); }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!noteText.trim()) return;
    const res = await apiPost('/notes', { text: noteText });
    if (res) { setNoteText(''); setSuccess('Internal note added.'); }
  };

  const handleQueryLetter = async (e) => {
    e.preventDefault();
    if (!queryText.trim()) return setError('Query text is required.');
    const res = await apiPost('/query-letter', {
      queryText,
      documentsRequired: queryDocs,
      deadlineDays: Number(queryDeadline)
    });
    if (res) { setQueryText(''); setSuccess(`Query letter sent. Claimant has ${queryDeadline} days to respond.`); setShowQueryPanel(false); }
  };

  const handleReopen = async (e) => {
    e.preventDefault();
    if (!reopenReason.trim() || reopenReason.length < 10) return setError('Please provide a reason of at least 10 characters.');
    const res = await apiPost('/reopen', { reason: reopenReason });
    if (res) { setReopenReason(''); setShowReopenPanel(false); setSuccess('Claim re-opened for reconsideration.'); }
  };

  const handleIRDAIReport = () => {
    const url = `/api/claims/${claimId}/irdai-report`;
    const a = document.createElement('a');
    a.href = url;
    a.setAttribute('download', `IRDAI_Report_${claimId}.html`);
    apiFetch(url, { headers: token ? { 'Authorization': `Bearer ${token}` } : {} })
      .then(r => r.blob())
      .then(blob => {
        const objUrl = URL.createObjectURL(blob);
        a.href = objUrl;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(objUrl);
      })
      .catch(() => setError('Failed to generate IRDAI report.'));
  };

  const handleSettlementVoucher = () => {
    const url = `/api/claims/${claimId}/settlement-letter`;
    const a = document.createElement('a');
    a.href = url;
    a.setAttribute('download', `Settlement_Voucher_${claimId}.html`);
    apiFetch(url, { headers: token ? { 'Authorization': `Bearer ${token}` } : {} })
      .then(r => r.blob())
      .then(blob => {
        const objUrl = URL.createObjectURL(blob);
        a.href = objUrl;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(objUrl);
      })
      .catch(() => setError('Failed to download settlement voucher.'));
  };

  const handleAssignFIR = async (e) => {
    e.preventDefault();
    const res = await apiPost('/assign-fir', { investigatorName: firInvestigator, agencyName: firAgency });
    if (res) setSuccess(`Field investigator ${firInvestigator} assigned for hospital audit.`);
  };

  const handleSubmitFIR = async (e) => {
    e.preventDefault();
    const res = await apiPost('/submit-fir', {
      patientInBedVerified: firBedCheck,
      doctorRegisterVerified: firDoctorCheck,
      pharmacyBillAudited: firPharmacyCheck,
      investigatorNotes: firNotes,
      recommendation: firRec
    });
    if (res) { setSuccess(`FIR Audit submitted: ${firRec}`); setShowFIRForm(false); }
  };

  // ── loading / error state ──────────────────────────────────────
  if (loading) {
    return (
      <div className="h-64 flex flex-col items-center justify-center gap-3 text-[var(--c-muted)]">
        <Spinner size={24} />
        <span className="text-sm">Loading case and running risk engine…</span>
      </div>
    );
  }

  if (!claim) {
    return (
      <Alert type="error" icon={XCircle}>
        Could not load case {claimId}. Please go back and try again.
      </Alert>
    );
  }

  const claimPct = Math.round((claim.claimAmount / claim.sumInsured) * 100);
  const AI       = claim.aiBedrockSummary || {};
  const AISummary = AI.aiSummary || claim.aiSummary || 'AI summary will generate upon pipeline processing.';
  const AIRec     = AI.aiRecommendation || claim.aiRecommendation || 'Pending';
  const AIReason  = AI.aiReasoning || claim.aiReasoning || '';
  const AIClause  = AI.citedClause || 'Policy T&C Section 4.2';
  const AIConf    = AI.aiConfidenceScore || '96.4%';

  const recColor = AIRec === 'Approve' ? 'var(--c-green)' : AIRec === 'Reject' ? 'var(--c-red)' : 'var(--c-amber)';
  const RecIcon  = AIRec === 'Approve' ? CheckCircle : AIRec === 'Reject' ? XCircle : AlertTriangle;

  return (
    <div className="max-w-7xl mx-auto space-y-5 pb-16 animate-fade-in">

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between gap-4 border-b border-[var(--c-border)] pb-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={onBack} className="py-2 px-2.5">
            <ArrowLeft size={15} />
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="page-heading text-xl">Case {claim.id}</h2>
              <StampBadge status={claim.status} />
            </div>
            <p className="text-xs text-[var(--c-muted)] mt-0.5 font-mono">
              {claim.claimantName} · <span className="font-bold">{claim.policyNumber}</span> · {claim.policyType}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-[0.65rem] text-[var(--c-muted)]">Assigned to</div>
            <div className="text-sm font-semibold text-[var(--c-ink)]">{claim.assignedUnderwriterName || 'Unassigned'}</div>
          </div>
          <RiskDot score={claim.riskScore || 0} />
          {isUnderwriter && (
            <>
              <Button variant="outline" onClick={handleIRDAIReport} className="flex items-center gap-1.5 text-xs py-1.5 px-3">
                <Download size={12} />
                IRDAI Audit
              </Button>
              <Button variant="outline" onClick={handleSettlementVoucher} className="flex items-center gap-1.5 text-xs py-1.5 px-3 text-green-400 border-green-800/40">
                <FileText size={12} />
                Settlement Voucher
              </Button>
              {['rejected', 'approved'].includes(claim.status) && (
                <Button variant="ghost" onClick={() => setShowReopenPanel(v => !v)} className="flex items-center gap-1.5 text-xs py-1.5 px-3 border border-amber-800/40 text-amber-400">
                  <RotateCcw size={12} />
                  Re-Open
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Flash messages ── */}
      {success && <Alert type="success" icon={CheckCircle}>{success}</Alert>}
      {error   && <Alert type="error"   icon={XCircle}>{error}</Alert>}

      {/* ── Re-Open Panel ── */}
      {showReopenPanel && isUnderwriter && (
        <div className="p-4 rounded-lg border border-amber-500/40 bg-amber-900/10 space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-amber-300">
            <RotateCcw size={14} /> Re-Open Claim for Appeal / Reconsideration
          </div>
          <textarea
            className="w-full text-sm p-3 rounded-lg bg-[var(--c-surface)] border border-[var(--c-border)] text-[var(--c-ink)] resize-none"
            rows={3}
            placeholder="State the reason for re-opening this claim (min 10 characters)…"
            value={reopenReason}
            onChange={e => setReopenReason(e.target.value)}
          />
          <div className="flex gap-2">
            <Button variant="primary" onClick={handleReopen} disabled={busy} className="text-xs">Confirm Re-Open</Button>
            <Button variant="ghost" onClick={() => setShowReopenPanel(false)} className="text-xs">Cancel</Button>
          </div>
        </div>
      )}

      {/* ── PED Violation Alerts ── */}
      {claim.pedAnalysis?.hasViolation && claim.pedAnalysis.violations.map((v, i) => (
        <div key={i} className="flex items-start gap-3 p-4 rounded-lg border border-red-500/40 bg-red-900/15">
          <Siren size={16} className="text-red-400 mt-0.5 shrink-0" />
          <div>
            <div className="text-sm font-bold text-red-300">{v.title}</div>
            <div className="text-[0.72rem] text-red-400 mt-0.5">{v.detail}</div>
            <div className="text-[0.68rem] font-mono text-red-500 mt-1">{v.clause} · {v.recommendedAction}</div>
          </div>
        </div>
      ))}

      {/* ── Reinsurance Alert ── */}
      {claim.reinsuranceFlag?.required && (
        <div className="flex items-start gap-3 p-4 rounded-lg border border-purple-500/40 bg-purple-900/15">
          <Shield size={16} className="text-purple-400 mt-0.5 shrink-0" />
          <div>
            <div className="text-sm font-bold text-purple-300">
              {claim.reinsuranceFlag.type === 'TREATY' ? '🏛 Treaty Reinsurance Required' : '📋 Facultative Reinsurance Notification Required'}
            </div>
            <div className="text-[0.72rem] text-purple-400 mt-0.5">{claim.reinsuranceFlag.message}</div>
          </div>
        </div>
      )}

      {/* ── SLA Alert ── */}
      {(() => { const sla = getSLAStatus(claim); if (!sla || sla.status === 'ON_TRACK') return null;
        const colors = { BREACHED: ['red-900/20','red-500/40','red-300','red-400'], CRITICAL: ['red-900/10','red-500/30','red-300','red-400'], WARNING: ['amber-900/10','amber-500/30','amber-300','amber-400'] };
        const [bg, border, title, sub] = colors[sla.status] || colors.WARNING;
        return (
          <div className={`flex items-start gap-3 p-4 rounded-lg border border-${border} bg-${bg}`}>
            <Clock size={16} className={`text-${sub} mt-0.5 shrink-0`} />
            <div>
              <div className={`text-sm font-bold text-${title}`}>
                {sla.isBreached ? '⛔ IRDAI SLA BREACHED' : sla.status === 'CRITICAL' ? '🚨 SLA Critical — Decision Required Within 3 Days' : '⚡ SLA Warning — 7 Days Remaining'}
              </div>
              <div className={`text-[0.72rem] text-${sub} mt-0.5`}>
                {sla.isBreached ? `SLA breached ${Math.abs(sla.daysLeft)} day(s) ago. IRDAI 30-day mandate exceeded. Escalate immediately.` : `${sla.daysLeft} day(s) remaining before IRDAI 30-day mandate deadline (${new Date(sla.deadline).toLocaleDateString('en-IN')}).`}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Main grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ──── LEFT 2-col ──── */}
        <div className="lg:col-span-2 space-y-5">

          {/* PANEL 1 — Core claim data */}
          <Panel icon={FileText} title="Claim Specifications"
            badge={<span className="text-[0.65rem] font-mono text-[var(--c-muted)]">
              Submitted {new Date(claim.submittedAt).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}
            </span>}>

            {/* Amount grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              <AmountRow label="Claim Amount"  value={`₹${claim.claimAmount?.toLocaleString()}`} accent="var(--c-amber)" />
              <AmountRow label="Sum Insured"   value={`₹${claim.sumInsured?.toLocaleString()}`} />
              <AmountRow label="% of SI"       value={`${claimPct}%`} accent={claimPct > 90 ? 'var(--c-red)' : 'var(--c-ink)'} />
              <AmountRow label="Policy Start"  value={claim.policyStartDate} sub={`${claim.policyType}`} />
            </div>

            {/* Accumulator & Auto-Restoration Widget */}
            {claim.accumulatorAnalysis && (
              <div className="p-3 rounded-lg border border-[var(--c-border)] bg-[var(--c-surface)] space-y-2 mb-4">
                <div className="flex items-center justify-between text-xs font-bold text-[var(--c-ink)]">
                  <span>Policy Accumulator & Restoration Tracker</span>
                  <Badge color={claim.accumulatorAnalysis.restorationTriggered ? 'purple' : 'green'}>
                    {claim.accumulatorAnalysis.restorationTriggered ? '100% Auto-Restored' : `NCB +${claim.accumulatorAnalysis.ncbPercentage}%`}
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-[0.7rem]">
                  <div className="p-1.5 rounded bg-[var(--c-paper)]">
                    <div className="text-[0.58rem] text-[var(--c-muted)] uppercase">Prior Claims</div>
                    <div className="font-bold">₹{claim.accumulatorAnalysis.totalPriorClaimed?.toLocaleString('en-IN')}</div>
                  </div>
                  <div className="p-1.5 rounded bg-[var(--c-paper)]">
                    <div className="text-[0.58rem] text-[var(--c-muted)] uppercase">Available SI Balance</div>
                    <div className="font-bold text-green-400">₹{claim.accumulatorAnalysis.remainingSIBeforeCurrentClaim?.toLocaleString('en-IN')}</div>
                  </div>
                  <div className="p-1.5 rounded bg-[var(--c-paper)]">
                    <div className="text-[0.58rem] text-[var(--c-muted)] uppercase">Effective Coverage</div>
                    <div className="font-bold text-purple-300">₹{claim.accumulatorAnalysis.effectiveAvailableCoverage?.toLocaleString('en-IN')}</div>
                  </div>
                </div>
              </div>
            )}

            <Divider className="mb-4" />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-0">
              <div>
                <DataRow label="Claimant">{claim.claimantName}</DataRow>
                <DataRow label="Policy Number"><span className="font-number">{claim.policyNumber}</span></DataRow>
                <DataRow label="Policy Company">{claim.policyCompany || '—'}</DataRow>
                <DataRow label="Policy Type">{claim.policyType}</DataRow>
              </div>
              <div>
                <DataRow label="Incident Date">{claim.incidentDate}</DataRow>
                <DataRow label="Contact">{claim.contactNumber || '—'}</DataRow>
                <DataRow label="Decided At">{claim.decidedAt ? new Date(claim.decidedAt).toLocaleDateString('en-IN') : 'Pending'}</DataRow>
                <DataRow label="Decided By">{claim.decidedBy || 'Pending'}</DataRow>
              </div>
            </div>

            {claim.description && (
              <div className="mt-4 p-3.5 rounded-lg bg-[var(--c-paper)] border border-[var(--c-border)] text-sm text-[var(--c-muted)] leading-relaxed italic">
                "{claim.description}"
              </div>
            )}
          </Panel>

          {/* PANEL 2 — Documents / Textract OCR */}
          <Panel icon={Cpu} title="AWS Textract · OCR Extractions"
            badge={<Badge color="green">SSE-KMS</Badge>}>

            {claim.documents.length === 0 ? (
              <Alert type="warning" icon={AlertTriangle}>
                No supporting documents were attached with this claim.
              </Alert>
            ) : (
              <>
                {/* Doc chips */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {claim.documents.map(doc => (
                    <button
                      key={doc.id}
                      onClick={() => setSelectedDoc(selectedDoc?.id === doc.id ? null : doc)}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition
                        ${selectedDoc?.id === doc.id
                          ? 'bg-[var(--c-ink)] text-[var(--c-paper)] border-transparent'
                          : 'bg-[var(--c-paper)] text-[var(--c-ink)] border-[var(--c-border)] hover:border-[var(--c-ink)]'
                        }`}
                    >
                      <FileText size={12} style={{ color: 'var(--c-amber)' }} />
                      {doc.name}
                      <span className="opacity-60 text-[0.62rem]">({doc.type})</span>
                    </button>
                  ))}
                </div>

                {/* Extracted key-value grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {claim.documents.map(doc => (
                    <div key={doc.id} className="p-3 rounded-lg border border-[var(--c-border)] bg-[var(--c-paper)] space-y-1.5">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[0.72rem] font-bold text-[var(--c-ink)] truncate">{doc.name}</span>
                        <Badge color="gray">{doc.type}</Badge>
                      </div>
                      {doc.extractedFields && Object.entries(doc.extractedFields).map(([k, v]) => (
                        <div key={k} className="flex justify-between text-[0.7rem]">
                          <span className="text-[var(--c-muted)]">{k}</span>
                          <span className="font-number font-semibold text-[var(--c-ink)] text-right max-w-[55%] truncate">{v}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </>
            )}
          </Panel>

          {/* PANEL 2B — GSTIN / Invoice Verification */}
          {claim.invoiceVerification && (
            <Panel icon={QrCode} title="Invoice Authenticity & GSTIN Check"
              badge={
                <Badge color={claim.invoiceVerification.gstinVerified ? 'green' : 'red'}>
                  {claim.invoiceVerification.gstinVerified ? 'GSTIN VALID' : 'GSTIN INVALID'}
                </Badge>
              }>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg border border-[var(--c-border)] bg-[var(--c-paper)] text-center">
                    <div className="text-[0.62rem] font-bold uppercase tracking-wide text-[var(--c-muted)] mb-1">Authenticity Score</div>
                    <div className="text-2xl font-bold font-heading"
                      style={{ color: claim.invoiceVerification.invoiceAuthenticityScore >= 80 ? 'var(--c-green)' : claim.invoiceVerification.invoiceAuthenticityScore >= 50 ? 'var(--c-amber)' : 'var(--c-red)' }}>
                      {claim.invoiceVerification.invoiceAuthenticityScore}<span className="text-sm">/100</span>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg border border-[var(--c-border)] bg-[var(--c-paper)] text-center">
                    <div className="text-[0.62rem] font-bold uppercase tracking-wide text-[var(--c-muted)] mb-1">Docs Verified</div>
                    <div className="text-2xl font-bold font-heading text-[var(--c-ink)]">{claim.invoiceVerification.documentsVerified}</div>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-[0.7rem] font-bold text-[var(--c-ink)] uppercase tracking-wide">GSTIN Number</div>
                  <div className="font-mono text-[0.75rem] p-2 bg-[var(--c-paper)] rounded border border-[var(--c-border)] text-[var(--c-ink)]">
                    {claim.invoiceVerification.gstinNumber}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-[0.7rem] font-bold text-[var(--c-ink)] uppercase tracking-wide">QR Hash Fingerprint</div>
                  <div className="font-mono text-[0.65rem] p-2 bg-[var(--c-paper)] rounded border border-[var(--c-border)] text-[var(--c-muted)] break-all">
                    {claim.invoiceVerification.qrHashFingerprint}
                  </div>
                </div>
                {claim.invoiceVerification.authenticityFlags?.length > 0 && (
                  <div className="space-y-1">
                    {claim.invoiceVerification.authenticityFlags.map((f, i) => (
                      <div key={i} className="flex items-start gap-1.5 text-[0.7rem] text-[var(--c-red)]">
                        <AlertTriangle size={11} className="mt-0.5 shrink-0" />
                        {f}
                      </div>
                    ))}
                  </div>
                )}
                {(!claim.invoiceVerification.authenticityFlags || claim.invoiceVerification.authenticityFlags.length === 0) && (
                  <div className="flex items-center gap-1.5 text-[0.72rem] text-[var(--c-green)]">
                    <CheckCircle size={12} />
                    No authenticity flags — invoice appears legitimate
                  </div>
                )}
              </div>
            </Panel>
          )}

          {/* PANEL 3 — Policyholder History */}
          <Panel icon={History} title="360° Policyholder History"
            badge={<Badge color="gray">{history.length} prior claim(s)</Badge>}>
            {history.length === 0 ? (
              <p className="text-sm text-[var(--c-muted)] italic">No prior claims on this policy number.</p>
            ) : (
              <div className="space-y-2">
                {history.map(h => (
                  <div key={h.id} className="flex items-center justify-between p-3 rounded-lg bg-[var(--c-paper)] border border-[var(--c-border)]">
                    <div>
                      <div className="font-number font-bold text-[var(--c-ink)] text-xs">{h.id}</div>
                      <div className="text-[0.7rem] text-[var(--c-muted)] truncate-2 max-w-xs">{h.description}</div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-number font-bold text-sm text-[var(--c-ink)]">₹{h.claimAmount?.toLocaleString()}</span>
                      <StampBadge status={h.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>

        {/* ──── RIGHT 1-col ──── */}
        <div className="space-y-5">

          {/* PANEL 4 — AI Bedrock Recommendation */}
          <Card>
            <CardHeader icon={Cpu} title="AWS Bedrock · AI Recommendation" />
            <CardSection className="space-y-4">

              {/* Recommendation bubble */}
              <div className="rounded-lg p-4 text-center" style={{ background: 'var(--c-ink)' }}>
                <div className="text-[0.62rem] font-mono tracking-widest uppercase text-[var(--c-ink-dim)] mb-1">
                  AI Suggested Action
                </div>
                <div className="flex items-center justify-center gap-2" style={{ color: recColor }}>
                  <RecIcon size={18} />
                  <span className="font-heading text-xl font-bold text-[var(--c-paper)]">{AIRec}</span>
                </div>
                <div className="mt-2 text-[0.65rem] font-mono text-[var(--c-ink-dim)]">
                  Confidence: {AIConf}
                </div>
              </div>

              {/* AI Summary */}
              <div>
                <SectionHeading>Executive Summary</SectionHeading>
                <p className="text-[0.78rem] text-[var(--c-muted)] italic leading-relaxed bg-[var(--c-paper)] p-3 rounded-lg border border-[var(--c-border)]">
                  "{AISummary}"
                </p>
              </div>

              {/* Reasoning */}
              {AIReason && (
                <div>
                  <SectionHeading>Reasoning & Clause Ref.</SectionHeading>
                  <p className="text-[0.7rem] font-mono text-[var(--c-muted)] leading-relaxed">{AIReason}</p>
                  <p className="text-[0.65rem] font-mono font-bold mt-1.5" style={{ color: 'var(--c-amber)' }}>
                    📋 {AIClause}
                  </p>
                </div>
              )}

              {/* AI Guardrails */}
              <div className="p-3 rounded-lg border border-[var(--c-border)] bg-[var(--c-paper)] space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[0.68rem] font-bold text-[var(--c-ink)]">
                    <ShieldAlert size={12} style={{ color: 'var(--c-amber)' }} />
                    AI Guardrails & Limitations
                  </div>
                  <Badge color="green">{AIConf}</Badge>
                </div>
                <div className="text-[0.68rem] text-[var(--c-muted)] leading-relaxed space-y-0.5">
                  <div>⚠ AI output is advisory. Underwriter sign-off required.</div>
                  <div>⚠ Claims &gt; ₹5,00,000 require Senior Committee approval.</div>
                  <div>⚠ OCR hashes verified against original S3 KMS objects.</div>
                </div>
              </div>
            </CardSection>
          </Card>

          {/* PANEL 4B — Hospital Network Classification (Health Claims Only) */}
          {claim.policyType === 'Health' && claim.hospitalNetworkInfo && (
            <Panel icon={Building2} title="Hospital Network Status"
              badge={
                <Badge color={claim.hospitalNetworkInfo.networkStatus === 'CASHLESS' ? 'green' : claim.hospitalNetworkInfo.networkStatus === 'REIMBURSEMENT' ? 'amber' : 'red'}>
                  {claim.hospitalNetworkInfo.networkStatus === 'OUT_OF_NETWORK' ? 'OUT OF NETWORK' : claim.hospitalNetworkInfo.networkStatus}
                </Badge>
              }>
              <div className="space-y-2.5">
                <DataRow label="Hospital / Provider">{claim.hospitalNetworkInfo.hospitalName}</DataRow>
                <DataRow label="Empanelment">{claim.hospitalNetworkInfo.tierLabel}</DataRow>
                <DataRow label="Cashless Eligible">
                  <span style={{ color: claim.hospitalNetworkInfo.cashlessEligible ? 'var(--c-green)' : 'var(--c-amber)' }} className="font-bold text-xs">
                    {claim.hospitalNetworkInfo.cashlessEligible ? '✓ YES — Cashless Available' : '✗ NO — Reimbursement Only'}
                  </span>
                </DataRow>
                <DataRow label="Location Verified">
                  <span style={{ color: claim.hospitalNetworkInfo.locationVerified ? 'var(--c-green)' : 'var(--c-red)' }} className="font-bold text-xs">
                    {claim.hospitalNetworkInfo.locationVerified ? '✓ In Empaneled Database' : '✗ Not in Empaneled Database'}
                  </span>
                </DataRow>
                <DataRow label="City / Coverage">{claim.hospitalNetworkInfo.city}</DataRow>
              </div>
            </Panel>
          )}

          {/* UNDERWRITER CONTROLS (Only visible to Underwriter / Senior / Admin) */}
          {isUnderwriter && (
            <>
              {/* PANEL 5 — Risk Scoring */}
              <Panel icon={ShieldAlert} title="Risk & Fraud Assessment">
                <div className="space-y-4">
                  <RiskBar score={claim.riskScore || 0} />

                  {claim.riskFlags && claim.riskFlags.length > 0 && (
                    <div className="space-y-2">
                      <SectionHeading>Risk Flags</SectionHeading>
                      {claim.riskFlags.map((item, i) => {
                        const label = typeof item === 'string' ? item : (item.flag || item.explanation || 'Risk flag detected');
                        const explanation = typeof item === 'object' && item.explanation && item.flag !== item.explanation ? item.explanation : null;
                        const isAlert = typeof item === 'object' && item.severity === 'alert';

                        return (
                          <div key={i} className="flex items-start gap-2 text-[0.72rem] text-[var(--c-muted)]">
                            <AlertTriangle size={12} className="mt-0.5 shrink-0" style={{ color: isAlert ? 'var(--c-red)' : 'var(--c-amber)' }} />
                            <div>
                              <span className="font-semibold text-[var(--c-ink)] capitalize">{label}</span>
                              {explanation && <p className="text-[0.68rem] text-[var(--c-muted)] mt-0.5">{explanation}</p>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {claim.fraudDetectorScore != null && (
                    <DataRow label="Fraud Detector">
                      <span className="font-number">{(claim.fraudDetectorScore * 100).toFixed(1)}%</span>
                    </DataRow>
                  )}
                </div>
              </Panel>

              {/* PANEL 5B — Sub-Limit Analysis (Health Claims Only) */}
              {claim.policyType === 'Health' && claim.subLimitAnalysis && (
                <Panel icon={Zap} title="Sub-Limit Deduction Engine"
                  badge={<Badge color={claim.subLimitAnalysis.subLimitTriggered ? 'amber' : 'green'}>
                    {claim.subLimitAnalysis.subLimitTriggered ? `${claim.subLimitAnalysis.deductions.length} Deduction(s)` : 'No Deductions'}
                  </Badge>}>
                  {claim.subLimitAnalysis.exclusionApplied ? (
                    <div className="p-3 rounded-lg bg-red-900/20 border border-red-500/30 text-[0.75rem] text-red-300 font-semibold">
                      ⛔ Full Exclusion Applied — ₹0 approved. {claim.subLimitAnalysis.deductions[0]?.clause}
                    </div>
                  ) : claim.subLimitAnalysis.subLimitTriggered ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="p-2 rounded bg-[var(--c-paper)] border border-[var(--c-border)]">
                          <div className="text-[0.6rem] text-[var(--c-muted)] font-bold uppercase">Claimed</div>
                          <div className="text-sm font-bold font-heading text-[var(--c-ink)]">₹{claim.claimAmount?.toLocaleString()}</div>
                        </div>
                        <div className="p-2 rounded bg-red-900/20 border border-red-500/20">
                          <div className="text-[0.6rem] text-red-400 font-bold uppercase">Deducted</div>
                          <div className="text-sm font-bold font-heading text-red-300">₹{claim.subLimitAnalysis.totalDeducted?.toLocaleString('en-IN')}</div>
                        </div>
                        <div className="p-2 rounded bg-green-900/20 border border-green-500/20">
                          <div className="text-[0.6rem] text-green-400 font-bold uppercase">Suggested</div>
                          <div className="text-sm font-bold font-heading text-green-300">₹{claim.subLimitAnalysis.approvedAfterDeductions?.toLocaleString('en-IN')}</div>
                        </div>
                      </div>
                      {claim.subLimitAnalysis.deductions.map((d, i) => (
                        <div key={i} className="text-[0.7rem] p-2 rounded border border-[var(--c-border)] bg-[var(--c-paper)] space-y-0.5">
                          <div className="font-bold text-[var(--c-ink)]">{d.type}</div>
                          <div className="text-[var(--c-muted)]">{d.reason}</div>
                          <div className="font-mono text-[0.65rem] text-amber-400">{d.clause}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-[0.72rem] text-[var(--c-green)]">
                      <CheckCircle size={12} /> No sub-limit deductions — full claim amount is eligible
                    </div>
                  )}
                </Panel>
              )}

              {/* PANEL 5B2 — GIPSA / PPN Tariff Benchmarking (Health Claims Only) */}
              {claim.policyType === 'Health' && claim.tariffAnalysis && (
                <Panel icon={Building2} title="GIPSA / PPN Package Tariff Benchmarking"
                  badge={<Badge color={claim.tariffAnalysis.tariffExcess > 0 ? 'red' : claim.tariffAnalysis.tariffApplied ? 'green' : 'gray'}>
                    {claim.tariffAnalysis.tariffExcess > 0 ? `Excess ₹${claim.tariffAnalysis.tariffExcess?.toLocaleString('en-IN')}` : claim.tariffAnalysis.tariffApplied ? 'PPN Compliant' : 'No Package'}
                  </Badge>}>
                  <div className="space-y-2 text-[0.72rem]">
                    <DataRow label="Procedure">{claim.tariffAnalysis.procedureName}</DataRow>
                    <DataRow label="Zone Tier">{claim.tariffAnalysis.isMetroZone ? 'Metro (Tier 1)' : 'Non-Metro (Tier 2/3)'}</DataRow>
                    <DataRow label="GIPSA Benchmark Tariff">
                      <span className="font-bold text-green-400">
                        {claim.tariffAnalysis.benchmarkTariff ? `₹${claim.tariffAnalysis.benchmarkTariff?.toLocaleString('en-IN')}` : 'N/A'}
                      </span>
                    </DataRow>
                    <DataRow label="Billed Amount">₹{claim.tariffAnalysis.billedAmount?.toLocaleString('en-IN')}</DataRow>
                    <p className="text-[0.68rem] text-[var(--c-muted)] mt-1 font-mono">{claim.tariffAnalysis.reason}</p>
                  </div>
                </Panel>
              )}

              {/* PANEL 5B3 — Co-Payment & Zone Deductible (Health Claims Only) */}
              {claim.policyType === 'Health' && claim.coPayAnalysis && (
                <Panel icon={Shield} title="Co-Payment & Zone Deductible"
                  badge={<Badge color={claim.coPayAnalysis.coPayTriggered ? 'amber' : 'green'}>
                    {claim.coPayAnalysis.coPayTriggered ? `Co-Pay ${claim.coPayAnalysis.effectiveCoPayPct}%` : '0% Co-Pay'}
                  </Badge>}>
                  <div className="space-y-2 text-[0.72rem]">
                    <DataRow label="Claimant Age">{claim.coPayAnalysis.claimantAge} yrs {claim.coPayAnalysis.isSeniorCitizen && <span className="text-red-400 font-bold">(Senior Citizen ≥60)</span>}</DataRow>
                    <DataRow label="Policy Zone">{claim.coPayAnalysis.policyZone}</DataRow>
                    {claim.coPayAnalysis.coPayDeductions.map((d, i) => (
                      <div key={i} className="p-2 rounded bg-[var(--c-paper)] border border-[var(--c-border)] space-y-0.5">
                        <div className="font-bold text-amber-400">{d.type}</div>
                        <div className="text-[var(--c-muted)]">{d.reason}</div>
                        <div className="text-right font-bold text-red-400">- ₹{d.deductedAmount?.toLocaleString('en-IN')}</div>
                      </div>
                    ))}
                  </div>
                </Panel>
              )}

              {/* PANEL 5B4 — Universal Multi-Line Policy Engine (Motor / Life / Property / Travel) */}
              {claim.universalAnalysis && claim.universalAnalysis.policyType !== 'Health' && (
                <Panel icon={Shield} title={`${claim.universalAnalysis.policyType} Policy Clause Evaluation`}
                  badge={<Badge color={claim.universalAnalysis.exclusionApplied ? 'red' : (claim.universalAnalysis.deductions || []).length > 0 ? 'amber' : 'green'}>
                    {claim.universalAnalysis.exclusionApplied ? 'Exclusion Triggered' : `${(claim.universalAnalysis.deductions || []).length} Deduction(s)`}
                  </Badge>}>
                  <div className="space-y-3 text-[0.72rem]">
                    {claim.universalAnalysis.policyType === 'Motor' && (
                      <div className="space-y-1">
                        <DataRow label="Insured Declared Value (IDV)">₹{claim.universalAnalysis.idv?.toLocaleString('en-IN')}</DataRow>
                        <DataRow label="Constructive Total Loss (CTL)">
                          <span className={claim.universalAnalysis.isTotalLoss ? 'text-red-400 font-bold' : 'text-green-400 font-bold'}>
                            {claim.universalAnalysis.isTotalLoss ? 'YES — Claim ≥ 75% IDV' : 'NO — Partial Repair'}
                          </span>
                        </DataRow>
                        <DataRow label="Zero Depreciation Add-on">
                          <span className={claim.universalAnalysis.hasZeroDepAddon ? 'text-green-400 font-bold' : 'font-semibold'}>
                            {claim.universalAnalysis.hasZeroDepAddon ? '✓ Active (0% Depreciation)' : '✗ Not Active (Standard Tariff Applied)'}
                          </span>
                        </DataRow>
                      </div>
                    )}

                    {claim.universalAnalysis.policyType === 'Life' && (
                      <div className="space-y-1">
                        <DataRow label="Sum Assured">₹{claim.universalAnalysis.sumAssured?.toLocaleString('en-IN')}</DataRow>
                        <DataRow label="Policy Inforce Duration">{claim.universalAnalysis.policyAgeMonths} months</DataRow>
                        <DataRow label="Section 45 Contestability">
                          <span className={claim.universalAnalysis.isEarlyClaim ? 'text-amber-400 font-bold' : 'text-green-400 font-bold'}>
                            {claim.universalAnalysis.isEarlyClaim ? 'Early Claim (< 3 Years Contestability Window)' : 'Incontestable (> 3 Years Inforce)'}
                          </span>
                        </DataRow>
                      </div>
                    )}

                    {claim.universalAnalysis.policyType === 'Property' && (
                      <div className="space-y-1">
                        <DataRow label="Property Sum Insured">₹{claim.universalAnalysis.sumInsured?.toLocaleString('en-IN')}</DataRow>
                        <DataRow label="Under-Insurance Ratio">{Math.round((claim.universalAnalysis.underInsuranceRatio || 1) * 100)}% Coverage</DataRow>
                      </div>
                    )}

                    {claim.universalAnalysis.deductions?.map((d, i) => (
                      <div key={i} className="p-2 rounded bg-[var(--c-paper)] border border-[var(--c-border)] space-y-0.5">
                        <div className="font-bold text-amber-400">{d.type}</div>
                        <div className="text-[var(--c-muted)]">{d.reason}</div>
                        <div className="text-mono text-[0.65rem] text-[var(--c-muted)]">{d.clause}</div>
                        <div className="text-right font-bold text-red-400">- ₹{d.deductedAmount?.toLocaleString('en-IN')}</div>
                      </div>
                    ))}
                  </div>
                </Panel>
              )}
            </>
          )}

          {/* END RIGHT COLUMN CARDS */}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════ */}
      {/* LOWER UNDERWRITER WORKBENCH — Side-by-Side 2-Column Grid               */}
      {/* ════════════════════════════════════════════════════════════════════════ */}
      {isUnderwriter && (
        <div className="pt-4 border-t border-[var(--c-border)]">
          <SectionHeading className="mb-4 text-sm">Underwriter Action Workbench & Operations</SectionHeading>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            {/* ──── LEFT WORKBENCH COLUMN ──── */}
            <div className="space-y-5">

              {/* PANEL — Underwriter Decision */}
              <Card>
                <CardHeader icon={CheckCircle} title="Underwriter Decision" />
                <CardSection>
                  <form onSubmit={handleUpdateStatus} className="space-y-3">
                    <FormField label="Update Status">
                      <Select value={newStatus} onChange={e => setNewStatus(e.target.value)}>
                        {['submitted','review','approved','rejected','escalated','doc_pending'].map(s => (
                          <option key={s} value={s}>{s === 'doc_pending' ? 'Doc Pending' : s.replace(/_/g,' ').replace(/\b\w/g,l=>l.toUpperCase())}</option>
                        ))}
                      </Select>
                    </FormField>

                    <FormField label="Decision Rationale">
                      <textarea
                        value={reason}
                        onChange={e => setReason(e.target.value)}
                        rows={3}
                        placeholder="Document your reasoning for compliance…"
                        className="input-base resize-none text-[0.78rem]"
                      />
                    </FormField>

                    <div className="flex gap-2">
                      <Button type="submit" disabled={busy} className="flex-1">
                        {busy ? <Spinner size={13} /> : <Send size={13} />}
                        Save Decision
                      </Button>
                      <Button type="button" variant="ghost" onClick={handleEscalate} disabled={busy}>
                        <AlertTriangle size={13} />
                        Escalate
                      </Button>
                    </div>
                  </form>
                </CardSection>
              </Card>

              {/* PANEL — Internal Notes Thread */}
              <Panel icon={MessageSquare} title="Internal Notes (Underwriter Only)"
                badge={<Badge color="gray">{(claim.internalNotes || []).length} note(s)</Badge>}>
                <div className="space-y-3">
                  {(claim.internalNotes || []).length === 0 ? (
                    <p className="text-[0.72rem] text-[var(--c-muted)] italic">No internal notes yet. Notes are only visible to underwriting staff.</p>
                  ) : (
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {(claim.internalNotes || []).map(note => (
                        <div key={note.id} className="p-2.5 rounded-lg border border-[var(--c-border)] bg-[var(--c-paper)]">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[0.68rem] font-bold text-[var(--c-ink)]">{note.authorName} <span className="text-[var(--c-muted)] font-normal">({note.authorRole})</span></span>
                            <span className="text-[0.62rem] text-[var(--c-muted)] font-mono">{new Date(note.createdAt).toLocaleString('en-IN', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}</span>
                          </div>
                          <p className="text-[0.73rem] text-[var(--c-muted)] leading-relaxed">{note.text}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  <form onSubmit={handleAddNote} className="flex gap-2 pt-1">
                    <input
                      type="text"
                      value={noteText}
                      onChange={e => setNoteText(e.target.value)}
                      placeholder="Add internal note… (visible to underwriters only)"
                      className="input-base flex-1 text-sm"
                    />
                    <Button type="submit" variant="ghost" disabled={busy || !noteText.trim()} className="text-xs shrink-0">
                      <Send size={12} /> Add
                    </Button>
                  </form>
                </div>
              </Panel>

              {/* PANEL — Settlement Disbursement */}
              {claim.status === 'approved' && (
                <Card>
                  <CardHeader icon={CreditCard} title="Settlement Disbursement" />
                  <CardSection>
                    <form onSubmit={handlePayout} className="space-y-3">
                      <FormField label="Payout Method">
                        <Select value={payoutMethod} onChange={e => setPayoutMethod(e.target.value)}>
                          {['NEFT','RTGS','IMPS','UPI','Cheque'].map(m => <option key={m} value={m}>{m}</option>)}
                        </Select>
                      </FormField>
                      <FormField label="Bank Reference">
                        <input className="input-base text-[0.78rem] font-number" value={bankRef} onChange={e => setBankRef(e.target.value)} />
                      </FormField>
                      <div className="rounded-lg p-3 bg-[var(--c-paper)] border border-[var(--c-border)] text-center">
                        <div className="text-[0.65rem] text-[var(--c-muted)]">Approved Amount</div>
                        <div className="font-heading text-2xl font-bold mt-0.5" style={{ color: 'var(--c-green)' }}>
                          ₹{claim.claimAmount?.toLocaleString('en-IN')}
                        </div>
                      </div>
                      <Button type="submit" disabled={busy} className="w-full">
                        <CreditCard size={13} />
                        Disburse Payout
                      </Button>
                    </form>
                  </CardSection>
                </Card>
              )}

            </div>

            {/* ──── RIGHT WORKBENCH COLUMN ──── */}
            <div className="space-y-5">

              {/* PANEL — Field Investigation Report (FIR) */}
              <Panel icon={Siren} title="Field Investigation Report (FIR)"
                badge={<Badge color={claim.firReport ? (claim.firReport.recommendation === 'GENUINE' ? 'green' : 'red') : claim.firAssignment ? 'amber' : 'gray'}>
                  {claim.firReport ? `FIR: ${claim.firReport.recommendation}` : claim.firAssignment ? 'FIR Assigned' : 'No FIR'}
                </Badge>}>
                <div className="space-y-3 text-[0.72rem]">
                  {claim.firReport ? (
                    <div className="p-3 rounded bg-[var(--c-paper)] border border-[var(--c-border)] space-y-2">
                      <div className="flex justify-between font-bold">
                        <span>Investigator: {claim.firReport.submittedBy}</span>
                        <span style={{ color: claim.firReport.recommendation === 'GENUINE' ? 'var(--c-green)' : 'var(--c-red)' }}>{claim.firReport.recommendation}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-1 text-center font-bold text-[0.65rem]">
                        <div className={`p-1 rounded ${claim.firReport.patientInBedVerified ? 'bg-green-900/30 text-green-300' : 'bg-red-900/30 text-red-300'}`}>
                          Bed Check: {claim.firReport.patientInBedVerified ? 'PASS' : 'FAIL'}
                        </div>
                        <div className={`p-1 rounded ${claim.firReport.doctorRegisterVerified ? 'bg-green-900/30 text-green-300' : 'bg-red-900/30 text-red-300'}`}>
                          Doctor Register: {claim.firReport.doctorRegisterVerified ? 'PASS' : 'FAIL'}
                        </div>
                        <div className={`p-1 rounded ${claim.firReport.pharmacyBillAudited ? 'bg-green-900/30 text-green-300' : 'bg-red-900/30 text-red-300'}`}>
                          Pharmacy Audit: {claim.firReport.pharmacyBillAudited ? 'PASS' : 'FAIL'}
                        </div>
                      </div>
                      <p className="text-[0.68rem] text-[var(--c-muted)] font-mono">"{claim.firReport.investigatorNotes}"</p>
                    </div>
                  ) : claim.firAssignment ? (
                    <div className="p-3 rounded bg-amber-900/10 border border-amber-500/30 space-y-2">
                      <div className="font-bold text-amber-300">Investigator Assigned: {claim.firAssignment.investigatorName} ({claim.firAssignment.agencyName})</div>
                      <p className="text-[0.68rem] text-[var(--c-muted)]">On-site audit in progress. Complete findings using form below:</p>
                      <form onSubmit={handleSubmitFIR} className="space-y-2">
                        <div className="flex gap-3 text-xs">
                          <label className="flex items-center gap-1"><input type="checkbox" checked={firBedCheck} onChange={e => setFirBedCheck(e.target.checked)} /> Patient in Bed</label>
                          <label className="flex items-center gap-1"><input type="checkbox" checked={firDoctorCheck} onChange={e => setFirDoctorCheck(e.target.checked)} /> Doctor Sign</label>
                          <label className="flex items-center gap-1"><input type="checkbox" checked={firPharmacyCheck} onChange={e => setFirPharmacyCheck(e.target.checked)} /> Pharmacy Bill</label>
                        </div>
                        <select value={firRec} onChange={e => setFirRec(e.target.value)} className="input-base text-xs py-1">
                          <option value="GENUINE">GENUINE — Patient Verified</option>
                          <option value="SUSPICIOUS">SUSPICIOUS — Inflated Billing</option>
                          <option value="CONFIRMED_FRAUD">CONFIRMED FRAUD — Paper Admission / Absent Patient</option>
                        </select>
                        <textarea value={firNotes} onChange={e => setFirNotes(e.target.value)} rows={2} className="input-base text-xs w-full resize-none" placeholder="Auditor notes…" />
                        <Button type="submit" variant="primary" disabled={busy} className="text-xs">Submit FIR Findings</Button>
                      </form>
                    </div>
                  ) : (
                    <form onSubmit={handleAssignFIR} className="space-y-2">
                      <p className="text-[0.68rem] text-[var(--c-muted)] italic">Assign a field investigator for hospital bed check and medical record verification.</p>
                      <div className="flex gap-2">
                        <input type="text" value={firInvestigator} onChange={e => setFirInvestigator(e.target.value)} placeholder="Investigator Name" className="input-base text-xs flex-1" />
                        <input type="text" value={firAgency} onChange={e => setFirAgency(e.target.value)} placeholder="Agency Name" className="input-base text-xs flex-1" />
                        <Button type="submit" variant="primary" disabled={busy} className="text-xs shrink-0">Assign Auditor</Button>
                      </div>
                    </form>
                  )}
                </div>
              </Panel>

              {/* PANEL — Query Letter */}
              <Panel icon={FileText} title="Claimant Query Letter"
                badge={<Badge color={(claim.queryLetters || []).length > 0 ? 'amber' : 'gray'}>{(claim.queryLetters || []).length} sent</Badge>}>
                <div className="space-y-3">
                  {(claim.queryLetters || []).map(q => (
                    <div key={q.id} className="p-2.5 rounded-lg border border-amber-800/30 bg-amber-900/10">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[0.68rem] font-bold text-amber-300">{q.id} — Sent by {q.sentBy}</span>
                        <span className="text-[0.62rem] font-mono text-[var(--c-muted)]">Deadline: {new Date(q.deadline).toLocaleDateString('en-IN')}</span>
                      </div>
                      <p className="text-[0.72rem] text-[var(--c-muted)]">{q.queryText}</p>
                      <div className="text-[0.65rem] text-amber-400 mt-1">Required: {q.documentsRequired.join(', ')}</div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setShowQueryPanel(v => !v)}
                    className="text-[0.72rem] text-[var(--c-muted)] hover:text-[var(--c-ink)] flex items-center gap-1 transition-colors"
                  >
                    {showQueryPanel ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    {showQueryPanel ? 'Hide Form' : 'Send New Query Letter'}
                  </button>
                  {showQueryPanel && (
                    <form onSubmit={handleQueryLetter} className="space-y-2 pt-1 border-t border-[var(--c-border)]">
                      <textarea
                        value={queryText}
                        onChange={e => setQueryText(e.target.value)}
                        rows={3}
                        placeholder="Describe the information required from the claimant…"
                        className="input-base resize-none text-sm w-full"
                      />
                      <div className="flex gap-2 items-center">
                        <select value={queryDeadline} onChange={e => setQueryDeadline(e.target.value)}
                          className="input-base text-xs py-1.5">
                          <option value={7}>7 days</option>
                          <option value={14}>14 days</option>
                          <option value={30}>30 days</option>
                        </select>
                        <Button type="submit" variant="primary" disabled={busy} className="text-xs">
                          <Send size={12} /> Send Query
                        </Button>
                      </div>
                    </form>
                  )}
                </div>
              </Panel>

              {/* PANEL — Assign Surveyor / Investigator */}
              <Card>
                <CardHeader icon={UserCheck} title="Assign Investigator" />
                <CardSection>
                  <form onSubmit={handleInvestigator} className="space-y-3">
                    <FormField label="Surveyor Name">
                      <input className="input-base text-[0.78rem]" value={surveyorName} onChange={e => setSurveyorName(e.target.value)} />
                    </FormField>
                    <FormField label="Inspection Report">
                      <textarea rows={3} className="input-base resize-none text-[0.78rem]" value={surveyorReport} onChange={e => setSurveyorReport(e.target.value)} />
                    </FormField>
                    <Button type="submit" disabled={busy} variant="ghost" className="w-full">
                      <UserCheck size={13} />
                      Record Findings
                    </Button>
                  </form>
                </CardSection>
              </Card>

            </div>
          </div>
        </div>
      )}

      {/* CLAIMANT STATUS TRACKER (For Claimants) */}
      {!isUnderwriter && (
        <Card className="mt-5">
          <CardHeader icon={CheckCircle} title="Claim Processing Status" />
          <CardSection className="space-y-4">
            <div className="space-y-3 text-[0.78rem]">
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-[var(--c-green)] text-white flex items-center justify-center text-xs font-bold">✓</span>
                <div>
                  <div className="font-bold text-[var(--c-ink)]">Claim Submitted & Encrypted</div>
                  <div className="text-[0.68rem] text-[var(--c-muted)]">Stored securely in AWS S3 (us-east-1)</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-[var(--c-green)] text-white flex items-center justify-center text-xs font-bold">✓</span>
                <div>
                  <div className="font-bold text-[var(--c-ink)]">AI Document OCR Verification</div>
                  <div className="text-[0.68rem] text-[var(--c-muted)]">AWS Textract extractions completed</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${claim.status === 'approved' ? 'bg-[var(--c-green)] text-white' : (claim.status === 'rejected' ? 'bg-[var(--c-red)] text-white' : 'bg-[var(--c-amber)] text-white animate-pulse')}`}>
                  {claim.status === 'approved' ? '✓' : (claim.status === 'rejected' ? '✕' : '⏳')}
                </span>
                <div>
                  <div className="font-bold text-[var(--c-ink)]">Underwriter Review</div>
                  <div className="text-[0.68rem] text-[var(--c-muted)]">Current Status: <span className="font-bold uppercase" style={{ color: 'var(--c-amber)' }}>{claim.status}</span></div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${claim.disbursementDetails?.status === 'Completed' ? 'bg-[var(--c-green)] text-white' : 'bg-gray-200 text-gray-500'}`}>
                  {claim.disbursementDetails?.status === 'Completed' ? '✓' : '💳'}
                </span>
                <div>
                  <div className="font-bold text-[var(--c-ink)]">Payout Disbursement</div>
                  <div className="text-[0.68rem] text-[var(--c-muted)]">
                    {claim.disbursementDetails?.status === 'Completed' ? `Disbursed ₹${claim.disbursementDetails.approvedAmount?.toLocaleString('en-IN')} via ${claim.disbursementDetails.payoutMethod}` : 'Pending final approval'}
                  </div>
                </div>
              </div>
            </div>
          </CardSection>
        </Card>
      )}

    </div>
  );
}
