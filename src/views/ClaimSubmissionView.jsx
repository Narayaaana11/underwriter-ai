import React, { useState } from 'react';
import {
  UploadCloud, CheckCircle, AlertCircle, FileText,
  Lock, Trash2, ShieldCheck, ArrowRight, Plus,
} from 'lucide-react';
import { StampBadge } from '../components/StampBadge';
import {
  Card, CardHeader, CardSection, SectionHeading,
  Input, Select, FormField, Button, Alert, DataRow, Spinner, Badge,
} from '../components/ui';

const DOC_TYPES = ['Bill/Invoice', 'ID Proof', 'Medical Report', 'Police Report (FIR)', 'Photos', 'Other'];
const POLICY_TYPES = ['Health', 'Motor', 'Life', 'Travel', 'Property'];

export function ClaimSubmissionView({ onClaimSubmitted, activeUser }) {
  const [form, setForm] = useState({
    claimantName:  activeUser?.name   || '',
    policyNumber:  'POL-88213',
    policyType:    'Health',
    policyCompany: activeUser?.company || 'HDFC ERGO Health & General',
    sumInsured:    '500000',
    policyStartDate: '2024-11-20',
    incidentDate:  new Date().toISOString().split('T')[0],
    claimAmount:   '145000',
    contactNumber: '',
    description:   '',
  });

  const [docs, setDocs]           = useState([
    { name: 'Hospital_Discharge_Summary.pdf', type: 'Medical Report', size: '1.2 MB' },
    { name: 'Final_Hospital_Bill.pdf',        type: 'Bill/Invoice',   size: '2.4 MB' },
    { name: 'Aadhaar_Identity_Proof.pdf',     type: 'ID Proof',       size: '850 KB' },
  ]);
  const [docType, setDocType]     = useState('Bill/Invoice');
  const [consent, setConsent]     = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted]  = useState(null);
  const [error, setError]          = useState(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const addFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setDocs(d => [...d, { name: file.name, type: docType, size: `${(file.size / 1048576).toFixed(2)} MB` }]);
    e.target.value = '';
  };

  const removeDoc = (i) => setDocs(d => d.filter((_, idx) => idx !== i));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!consent) { setError('Legal consent & privacy declaration is required before submission.'); return; }
    setError(null);
    setSubmitting(true);
    try {
      const res  = await fetch('/api/claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, documents: docs, consentAccepted: consent }),
      });
      const json = await res.json();
      if (json.success) {
        setSubmitted(json.data);
        onClaimSubmitted?.(json.data);
      } else {
        setError(json.error || 'Failed to submit claim.');
      }
    } catch {
      setError('Network error connecting to Ledger backend.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Success state ────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto animate-fade-in">
        <Card>
          <div className="p-10 text-center space-y-5">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
              style={{ background: 'var(--c-green-bg)', color: 'var(--c-green)' }}>
              <CheckCircle size={32} />
            </div>

            <div>
              <div className="text-[0.7rem] font-mono tracking-widest uppercase text-[var(--c-muted)]">
                Claim Submitted & Enqueued via SQS
              </div>
              <h2 className="font-heading text-2xl font-bold text-[var(--c-ink)] mt-1">
                Case {submitted.id}
              </h2>
              <div className="mt-2 flex justify-center">
                <StampBadge status={submitted.status} />
              </div>
            </div>

            {/* Pipeline status */}
            <div className="text-left rounded-lg border border-[var(--c-border)] bg-[var(--c-paper)] p-4 space-y-1.5 max-w-sm mx-auto">
              <div className="flex items-center gap-2 text-[0.72rem] font-bold text-[var(--c-ink)] mb-2">
                <Lock size={12} style={{ color: 'var(--c-amber)' }} />
                AWS Pipeline Status
              </div>
              {[
                `${submitted.documents.length} document(s) encrypted with SSE-KMS → S3`,
                'Step Functions pipeline triggered for Textract OCR',
                `AI Bedrock risk evaluated: ${submitted.riskScore}/100`,
                `Assigned to: ${submitted.assignedUnderwriterName || 'Unassigned'}`,
              ].map((line, i) => (
                <div key={i} className="flex items-start gap-1.5 text-[0.7rem] text-[var(--c-muted)]">
                  <CheckCircle size={11} style={{ color: 'var(--c-green)', marginTop: 2, flexShrink: 0 }} />
                  {line}
                </div>
              ))}
            </div>

            {/* AI summary */}
            {submitted.aiSummary && (
              <div className="text-left rounded-lg border border-[var(--c-border)] bg-[var(--c-surface)] p-4 max-w-sm mx-auto">
                <div className="text-[0.65rem] font-mono font-bold uppercase tracking-wider text-[var(--c-muted)] mb-1.5">
                  AI Initial Assessment
                </div>
                <p className="text-[0.78rem] text-[var(--c-ink)] leading-relaxed italic">"{submitted.aiSummary}"</p>
              </div>
            )}

            <Button onClick={() => setSubmitted(null)} className="px-8">
              Submit Another Claim
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // ── Form ────────────────────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h2 className="page-heading">File a Claim</h2>
        <p className="text-sm text-[var(--c-muted)] mt-1">
          Submit your insurance claim with supporting documentation.
          All files encrypted via AWS KMS.
        </p>
      </div>

      {error && <Alert type="error" icon={AlertCircle}>{error}</Alert>}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* ─ Column 1: Policyholder & Incident ─ */}
          <div className="lg:col-span-2 space-y-5">
            <Card>
              <CardHeader icon={FileText} title="Policy & Incident Details" />
              <CardSection>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField label="Claimant Name">
                    <Input type="text" required value={form.claimantName} onChange={e => set('claimantName', e.target.value)} placeholder="Full legal name" />
                  </FormField>

                  <FormField label="Policy Number">
                    <Input type="text" required value={form.policyNumber} onChange={e => set('policyNumber', e.target.value)} placeholder="POL-XXXXX" className="font-number" />
                  </FormField>

                  <FormField label="Policy Type">
                    <Select value={form.policyType} onChange={e => set('policyType', e.target.value)}>
                      {POLICY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </Select>
                  </FormField>

                  <FormField label="Sum Insured (₹)">
                    <Input type="number" required value={form.sumInsured} onChange={e => set('sumInsured', e.target.value)} placeholder="500000" className="font-number" />
                  </FormField>

                  <FormField label="Policy Start Date">
                    <Input type="date" required value={form.policyStartDate} onChange={e => set('policyStartDate', e.target.value)} />
                  </FormField>

                  <FormField label="Incident / Loss Date">
                    <Input type="date" required value={form.incidentDate} onChange={e => set('incidentDate', e.target.value)} />
                  </FormField>

                  <FormField label="Claim Amount (₹)">
                    <Input type="number" required value={form.claimAmount} onChange={e => set('claimAmount', e.target.value)} className="font-number" />
                  </FormField>

                  <FormField label="Contact Number">
                    <Input type="tel" value={form.contactNumber} onChange={e => set('contactNumber', e.target.value)} placeholder="+91 99999 00000" />
                  </FormField>
                </div>

                <div className="mt-4">
                  <FormField label="Description of Incident">
                    <textarea
                      rows={4}
                      value={form.description}
                      onChange={e => set('description', e.target.value)}
                      placeholder="Describe the incident, treatment, or loss in detail…"
                      className="input-base resize-none text-[0.8rem]"
                    />
                  </FormField>
                </div>
              </CardSection>
            </Card>

            {/* Documents */}
            <Card>
              <CardHeader icon={UploadCloud} title="Supporting Documents" badge={<Badge color="amber">S3 + KMS</Badge>} />
              <CardSection>
                <SectionHeading>Attached Files ({docs.length})</SectionHeading>

                {docs.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {docs.map((doc, i) => (
                      <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg border border-[var(--c-border)] bg-[var(--c-paper)]">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText size={14} style={{ color: 'var(--c-amber)', flexShrink: 0 }} />
                          <div className="min-w-0">
                            <div className="text-[0.75rem] font-medium text-[var(--c-ink)] truncate">{doc.name}</div>
                            <div className="text-[0.65rem] text-[var(--c-muted)] font-mono">{doc.type} · {doc.size}</div>
                          </div>
                        </div>
                        <button type="button" onClick={() => removeDoc(i)}
                          className="text-[var(--c-muted)] hover:text-[var(--c-red)] transition p-1">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2 flex-wrap">
                  <Select value={docType} onChange={e => setDocType(e.target.value)} className="text-xs flex-1 min-w-[10rem]">
                    {DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </Select>
                  <label className="btn-ghost btn cursor-pointer flex-shrink-0">
                    <Plus size={13} />
                    Attach File
                    <input type="file" className="hidden" onChange={addFile} />
                  </label>
                </div>
              </CardSection>
            </Card>
          </div>

          {/* ─ Column 2: Consent & Summary ─ */}
          <div className="space-y-5">
            <Card>
              <CardHeader icon={ShieldCheck} title="Consent & Declaration" />
              <CardSection className="space-y-4">
                <div className="text-[0.72rem] text-[var(--c-muted)] leading-relaxed space-y-2">
                  <p>By submitting this claim I confirm that:</p>
                  <ul className="space-y-1 list-none">
                    {[
                      'All information provided is accurate and complete.',
                      'Documents are authentic and unaltered originals.',
                      'I consent to document verification via AWS Textract & Comprehend Medical.',
                      'I acknowledge AI-assisted risk evaluation for this claim.',
                      'Data will be stored securely in compliance with IRDAI guidelines.',
                    ].map((pt, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="mt-0.5 shrink-0" style={{ color: 'var(--c-green)' }}>✓</span>
                        {pt}
                      </li>
                    ))}
                  </ul>
                </div>

                <label className="flex items-start gap-2.5 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={e => setConsent(e.target.checked)}
                    className="mt-0.5 accent-[#14213D] cursor-pointer"
                  />
                  <span className="text-[0.72rem] text-[var(--c-ink)] font-semibold group-hover:text-[var(--c-ink)] leading-snug">
                    I accept the above declarations and authorise claim processing.
                  </span>
                </label>
              </CardSection>
            </Card>

            {/* Summary card */}
            <Card>
              <CardHeader title="Claim Summary" />
              <CardSection>
                <DataRow label="Claimant">{form.claimantName || '—'}</DataRow>
                <DataRow label="Policy #"><span className="font-number">{form.policyNumber}</span></DataRow>
                <DataRow label="Type">{form.policyType}</DataRow>
                <DataRow label="Claim Amount">
                  <span className="font-number font-bold" style={{ color: 'var(--c-amber)' }}>
                    ₹{Number(form.claimAmount || 0).toLocaleString()}
                  </span>
                </DataRow>
                <DataRow label="Documents">{docs.length}</DataRow>
              </CardSection>
            </Card>

            <Button
              type="submit"
              disabled={submitting || !consent}
              className="w-full py-3 text-sm"
            >
              {submitting ? <Spinner size={14} /> : <ArrowRight size={14} />}
              {submitting ? 'Submitting claim…' : 'Submit Claim to Ledger'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
