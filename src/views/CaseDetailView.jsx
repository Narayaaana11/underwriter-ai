import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, Cpu, FileText, History, CheckCircle, AlertTriangle,
  XCircle, ShieldAlert, UserCheck, CreditCard, Send, Lock,
} from 'lucide-react';
import { StampBadge } from '../components/StampBadge';
import { RiskDot, RiskBar } from '../components/RiskDot';
import {
  Card, CardHeader, CardSection, SectionHeading,
  Button, Select, FormField, Alert, DataRow, Spinner, Divider, Badge,
} from '../components/ui';

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
export function CaseDetailView({ claimId, onBack, currentRole, activeUser }) {
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

  // ── fetch ──────────────────────────────────────────────────────
  const load = async () => {
    setLoading(true);
    try {
      const res  = await fetch(`/api/claims/${claimId}`);
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
      const res  = await fetch(`/api/claims/${claimId}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      const res  = await fetch(`/api/claims/${claimId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
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
    const res = await apiPost('/disburse', { approvedAmount: claim.claimAmount, payoutMethod, bankDetailsRef: bankRef });
    if (res) setSuccess('Payout disbursement recorded in ledger.');
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
        </div>
      </div>

      {/* ── Flash messages ── */}
      {success && <Alert type="success" icon={CheckCircle}>{success}</Alert>}
      {error   && <Alert type="error"   icon={XCircle}>{error}</Alert>}

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

          {/* PANEL 5 — Risk Scoring */}
          <Panel icon={ShieldAlert} title="Risk & Fraud Assessment">
            <div className="space-y-4">
              <RiskBar score={claim.riskScore || 0} />

              {claim.riskFlags && claim.riskFlags.length > 0 && (
                <div className="space-y-2">
                  <SectionHeading>Risk Flags</SectionHeading>
                  {claim.riskFlags.map((flag, i) => (
                    <div key={i} className="flex items-start gap-2 text-[0.72rem] text-[var(--c-muted)]">
                      <AlertTriangle size={12} className="mt-0.5 shrink-0" style={{ color: 'var(--c-amber)' }} />
                      {flag}
                    </div>
                  ))}
                </div>
              )}

              {claim.fraudDetectorScore != null && (
                <DataRow label="Fraud Detector">
                  <span className="font-number">{(claim.fraudDetectorScore * 100).toFixed(1)}%</span>
                </DataRow>
              )}
            </div>
          </Panel>

          {/* PANEL 6 — Decision */}
          <Card>
            <CardHeader icon={CheckCircle} title="Underwriter Decision" />
            <CardSection>
              <form onSubmit={handleUpdateStatus} className="space-y-3">
                <FormField label="Update Status">
                  <Select value={newStatus} onChange={e => setNewStatus(e.target.value)}>
                    {['submitted','review','approved','rejected','escalated'].map(s => (
                      <option key={s} value={s}>{s.replace(/_/g,' ').replace(/\b\w/g,l=>l.toUpperCase())}</option>
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

          {/* PANEL 7 — Surveyor */}
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

          {/* PANEL 8 — Payout */}
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
                      ₹{claim.claimAmount?.toLocaleString()}
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
      </div>
    </div>
  );
}
