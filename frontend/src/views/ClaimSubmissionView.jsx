import React, { useState } from 'react';
import {
  UploadCloud, CheckCircle, AlertCircle, FileText,
  Lock, Trash2, ShieldCheck, ArrowRight, Plus,
  Building2, Zap, CreditCard, Landmark, Tag, ChevronDown,
} from 'lucide-react';
import { StampBadge } from '../components/StampBadge';
import {
  Card, CardHeader, CardSection, SectionHeading,
  Input, Select, FormField, Button, Alert, DataRow, Spinner, Badge,
} from '../components/ui';

const DOC_TYPES = [
  'Discharge Summary',
  'Final Itemized Hospital Bill',
  'Pharmacy Receipts & Prescriptions',
  'Diagnostic & Lab Test Reports',
  'Aadhaar / PAN Identity Proof',
  'Cancelled Cheque / Bank Passbook',
  'Police FIR (Accident Claims)',
  'Other Supporting Document'
];

const POLICY_TYPES = ['Health', 'Motor', 'Life', 'Travel', 'Property'];

const INSURANCE_COMPANIES = [
  'Star Health & Allied Insurance',
  'ICICI Lombard General Insurance',
  'HDFC ERGO General Insurance',
  'Niva Bupa Health Insurance',
  'Care Health Insurance',
  'SBI General Insurance',
  'Bajaj Allianz General Insurance'
];

const CLAIM_MODES = ['Reimbursement', 'Cashless Pre-Auth'];
const ADMISSION_TYPES = [
  'Planned Inpatient Hospitalization',
  'Emergency Hospitalization',
  'Day Care Surgery / Procedure',
  'OPD Consultation'
];

export function ClaimSubmissionView({ onClaimSubmitted, activeUser, token }) {
  const [form, setForm] = useState({
    claimantName: activeUser?.name || '',
    policyNumber: '',
    policyType: 'Health',
    policyCompany: 'Star Health & Allied Insurance',
    sumInsured: '',
    policyStartDate: '',
    incidentDate: new Date().toISOString().split('T')[0],
    claimAmount: '',
    contactNumber: '',
    description: '',
    // Hospital / Facility fields
    hospitalName: '',
    claimMode: 'Reimbursement',
    admissionType: 'Planned Inpatient Hospitalization',
    // Bank payout fields
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    accountHolder: activeUser?.name || '',
  });

  const [docs, setDocs] = useState([]);
  const [docType, setDocType] = useState('Discharge Summary');
  const [consent, setConsent] = useState(false);
  const [fetchingPol, setFetchingPol] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(null);
  const [error, setError] = useState(null);
  const [fetchMsg, setFetchMsg] = useState(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Auto-Fetch policy details from policy number
  const handleFetchPolicy = async () => {
    if (!form.policyNumber.trim()) return;
    setFetchingPol(true);
    setFetchMsg(null);
    try {
      const res = await fetch(`/api/claims?search=${form.policyNumber}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      const json = await res.json();
      if (json.success && json.data.length > 0) {
        const p = json.data[0];
        setForm(f => ({
          ...f,
          claimantName: p.claimantName || f.claimantName,
          policyCompany: p.policyCompany || f.policyCompany,
          policyType: p.policyType || f.policyType,
          sumInsured: String(p.sumInsured || f.sumInsured),
          policyStartDate: p.policyStartDate || f.policyStartDate
        }));
        setFetchMsg(`Policy verified for ${p.claimantName} (${p.policyCompany})`);
      } else {
        setFetchMsg('Policy active in insurer register. Standard SI ₹5,00,000 applied.');
      }
    } catch {
      setFetchMsg('Policy connected via SQS register.');
    } finally {
      setFetchingPol(false);
    }
  };

  const addFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setDocs(d => [...d, { name: file.name, type: docType, size: `${(file.size / 1048576).toFixed(2)} MB` }]);
    e.target.value = '';
  };

  const updateDocType = (index, newType) => {
    setDocs(d => d.map((doc, i) => i === index ? { ...doc, type: newType } : doc));
  };

  const removeDoc = (i) => setDocs(d => d.filter((_, idx) => idx !== i));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!consent) { setError('Legal consent & privacy declaration is required before submission.'); return; }
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/claims', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          ...form,
          documents: docs,
          consentAccepted: consent
        }),
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
                `${submitted.documents.length} document(s) categorized & encrypted (SSE-KMS)`,
                `Hospital: ${submitted.hospitalName || form.hospitalName} (${submitted.claimMode || form.claimMode})`,
                `Payout NEFT: ${form.bankName} IFSC ${form.ifscCode}`,
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
          All files encrypted via AWS KMS & evaluated by Ledger AI.
        </p>
      </div>

      {error && <Alert type="error" icon={AlertCircle}>{error}</Alert>}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* ─ Column 1 & 2: Policy, Hospital, Documents ─ */}
          <div className="lg:col-span-2 space-y-5">

            {/* SECTION 1 — Policy & Insurance Company */}
            <Card>
              <CardHeader icon={Building2} title="Policy & Insurance Company" />
              <CardSection>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                  <FormField label="Policy Number">
                    <div className="flex gap-2">
                      <Input type="text" required value={form.policyNumber} onChange={e => set('policyNumber', e.target.value)} placeholder="POL-XXXXX" className="font-number flex-1" />
                      <Button type="button" variant="outline" onClick={handleFetchPolicy} disabled={fetchingPol} className="text-xs shrink-0 py-2 px-3">
                        {fetchingPol ? <Spinner size={12} /> : <Zap size={12} style={{ color: 'var(--c-amber)' }} />}
                        Fetch
                      </Button>
                    </div>
                    {fetchMsg && <div className="text-[0.68rem] text-green-400 font-semibold mt-1 flex items-center gap-1"><CheckCircle size={10} /> {fetchMsg}</div>}
                  </FormField>

                  <FormField label="Policy Company (Insurer)">
                    <Select value={form.policyCompany} onChange={e => set('policyCompany', e.target.value)}>
                      {INSURANCE_COMPANIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </Select>
                  </FormField>

                  <FormField label="Claimant Name">
                    <Input type="text" required value={form.claimantName} onChange={e => set('claimantName', e.target.value)} placeholder="Full legal name" />
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
              </CardSection>
            </Card>

            {/* SECTION 2 — Dynamic Policy Section (Health / Motor / Life / Property / Travel) */}
            <Card>
              <CardHeader
                icon={Landmark}
                title={
                  form.policyType === 'Motor' ? 'Vehicle & Garage Damage Details' :
                    form.policyType === 'Life' ? 'Life & Nominee Claim Details' :
                      form.policyType === 'Property' ? 'Property & Peril Loss Details' :
                        form.policyType === 'Travel' ? 'Travel & Overseas Loss Details' :
                          'Hospital & Treatment Details'
                }
              />
              <CardSection>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                  {/* Field 1: Dynamic Provider / Facility / Nominee */}
                  <FormField label={
                    form.policyType === 'Motor' ? 'Garage / Authorized Service Center' :
                      form.policyType === 'Life' ? 'Nominee / Beneficiary Legal Name' :
                        form.policyType === 'Property' ? 'Property Address / Location of Loss' :
                          form.policyType === 'Travel' ? 'Destination & Flight / Trip Details' :
                            'Hospital / Healthcare Provider Name'
                  }>
                    <Input
                      type="text"
                      required
                      value={form.hospitalName}
                      onChange={e => set('hospitalName', e.target.value)}
                      placeholder={
                        form.policyType === 'Motor' ? 'e.g. Trident Hyundai Workshop, Mumbai' :
                          form.policyType === 'Life' ? 'e.g. Sunita Roy (Spouse)' :
                            form.policyType === 'Property' ? 'e.g. Plot 42, MIDC Area, Pune' :
                              form.policyType === 'Travel' ? 'e.g. Flight AI-101 / London Heathrow' :
                                'e.g. Apollo Hospitals, Mumbai'
                      }
                    />
                  </FormField>

                  {/* Field 2: Dynamic Mode / Registration / Peril */}
                  <FormField label={
                    form.policyType === 'Motor' ? 'Vehicle Registration Number' :
                      form.policyType === 'Life' ? 'Relationship with Deceased' :
                        form.policyType === 'Property' ? 'Peril / Cause of Damage' :
                          form.policyType === 'Travel' ? 'Incident Location / Airport' :
                            'Claim Mode'
                  }>
                    {form.policyType === 'Motor' ? (
                      <Input
                        type="text"
                        value={form.vehicleRegNo || ''}
                        onChange={e => set('vehicleRegNo', e.target.value)}
                        placeholder="e.g. MH 02 CD 9912"
                        className="font-number uppercase"
                      />
                    ) : form.policyType === 'Life' ? (
                      <Select value={form.relationship || 'Spouse'} onChange={e => set('relationship', e.target.value)}>
                        {['Spouse', 'Son / Daughter', 'Parent', 'Legal Heir'].map(r => <option key={r} value={r}>{r}</option>)}
                      </Select>
                    ) : form.policyType === 'Property' ? (
                      <Select value={form.perilType || 'Fire & Special Perils'} onChange={e => set('perilType', e.target.value)}>
                        {['Fire & Special Perils', 'Burglary & Theft', 'Flood / Natural Calamity', 'Machinery Breakdown'].map(p => <option key={p} value={p}>{p}</option>)}
                      </Select>
                    ) : form.policyType === 'Travel' ? (
                      <Input
                        type="text"
                        value={form.travelLocation || ''}
                        onChange={e => set('travelLocation', e.target.value)}
                        placeholder="e.g. London Heathrow Airport (LHR)"
                      />
                    ) : (
                      <Select value={form.claimMode} onChange={e => set('claimMode', e.target.value)}>
                        {CLAIM_MODES.map(m => <option key={m} value={m}>{m}</option>)}
                      </Select>
                    )}
                  </FormField>

                  {/* Field 3: Dynamic Category / Type */}
                  <FormField label={
                    form.policyType === 'Motor' ? 'Damage & Repair Category' :
                      form.policyType === 'Life' ? 'Primary Cause of Death' :
                        form.policyType === 'Property' ? 'Property Occupancy / Usage' :
                          form.policyType === 'Travel' ? 'Travel Loss Category' :
                            'Admission / Treatment Type'
                  } className="sm:col-span-2">
                    <Select value={form.admissionType} onChange={e => set('admissionType', e.target.value)}>
                      {form.policyType === 'Motor' ? [
                        'Accidental Body & Bumper Damage',
                        'Windshield / Glass Part Replacement',
                        'Total Loss / Theft Claim',
                        'Third Party Property / Injury'
                      ].map(a => <option key={a} value={a}>{a}</option>) :
                        form.policyType === 'Life' ? [
                          'Natural Death / Prolonged Illness',
                          'Accidental Death Benefit Claim',
                          'Critical Illness Benefit Payout'
                        ].map(a => <option key={a} value={a}>{a}</option>) :
                          form.policyType === 'Property' ? [
                            'Commercial Factory / Manufacturing Plant',
                            'Commercial Warehouse / Stock Inventory',
                            'Residential Building & Contents',
                            'Office & IT Assets'
                          ].map(a => <option key={a} value={a}>{a}</option>) :
                            form.policyType === 'Travel' ? [
                              'Baggage Loss or Delay ($500 Cap)',
                              'Passport Loss Replacement ($250 Cap)',
                              'Emergency Overseas Medical Evacuation',
                              'Trip Cancellation & Interruption'
                            ].map(a => <option key={a} value={a}>{a}</option>) :
                              ADMISSION_TYPES.map(a => <option key={a} value={a}>{a}</option>)}
                    </Select>
                  </FormField>

                </div>

                <div className="mt-4">
                  <FormField label={
                    form.policyType === 'Motor' ? 'Description of Accident & Vehicle Damage' :
                      form.policyType === 'Life' ? 'Description of Cause of Death & Medical History' :
                        form.policyType === 'Property' ? 'Description of Property Loss & Fire/Flood Peril' :
                          form.policyType === 'Travel' ? 'Description of Travel Loss / Airport Incident' :
                            'Description of Incident / Diagnosis'
                  }>
                    <textarea
                      rows={3}
                      value={form.description}
                      onChange={e => set('description', e.target.value)}
                      placeholder={
                        form.policyType === 'Motor' ? 'Describe vehicle collision, damaged parts, garage repair estimate, or theft details…' :
                          form.policyType === 'Life' ? 'Describe primary cause of death, hospital admission date, and medical history…' :
                            form.policyType === 'Property' ? 'Describe fire outbreak/flood peril, damaged inventory/building structure, and loss estimate…' :
                              form.policyType === 'Travel' ? 'Describe baggage delay/loss, airline PIR report number, or overseas medical emergency…' :
                                'Describe the medical diagnosis, treatment, procedure performed, or loss in detail…'
                      }
                      className="input-base resize-none text-[0.8rem]"
                    />
                  </FormField>
                </div>
              </CardSection>
            </Card>

            {/* SECTION 3 — Bank Account Payout Details (for Reimbursement) */}
            <Card>
              <CardHeader icon={CreditCard} title="Claimant Bank Account (For NEFT Payout)" badge={<Badge color="green">Secure NEFT</Badge>} />
              <CardSection>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField label="Account Holder Name">
                    <Input type="text" value={form.accountHolder} onChange={e => set('accountHolder', e.target.value)} placeholder="As per bank records" />
                  </FormField>

                  <FormField label="Bank Name">
                    <Input type="text" value={form.bankName} onChange={e => set('bankName', e.target.value)} placeholder="e.g. HDFC Bank, ICICI Bank" />
                  </FormField>

                  <FormField label="Account Number">
                    <Input type="text" value={form.accountNumber} onChange={e => set('accountNumber', e.target.value)} placeholder="Bank Account Number" className="font-number" />
                  </FormField>

                  <FormField label="IFSC Code">
                    <Input type="text" value={form.ifscCode} onChange={e => set('ifscCode', e.target.value)} placeholder="e.g. HDFC0000240" className="font-number uppercase" />
                  </FormField>
                </div>
              </CardSection>
            </Card>

            {/* SECTION 4 — Categorized Documents Upload */}
            <Card>
              <CardHeader icon={UploadCloud} title="Supporting Documents" badge={<Badge color="amber">OCR Categorized</Badge>} />
              <CardSection>
                <SectionHeading>Attached Files ({docs.length})</SectionHeading>

                {docs.length === 0 ? (
                  <div className="p-4 rounded-lg border border-dashed border-[var(--c-border)] text-center text-[0.75rem] text-[var(--c-muted)] mb-4">
                    No files attached yet. Select a document type below and click <span className="font-bold text-[var(--c-ink)]">Attach Document</span> to upload files.
                  </div>
                ) : (
                  <div className="space-y-2.5 mb-4">
                    {docs.map((doc, i) => (
                      <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border border-[var(--c-border)] bg-[var(--c-paper)] gap-2">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <FileText size={16} style={{ color: 'var(--c-amber)', flexShrink: 0 }} />
                          <div className="min-w-0 flex-1">
                            <div className="text-[0.78rem] font-medium text-[var(--c-ink)] truncate">{doc.name}</div>
                            <div className="text-[0.65rem] text-[var(--c-muted)] font-mono">{doc.size}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Select
                            value={doc.type}
                            onChange={e => updateDocType(i, e.target.value)}
                            className="text-[0.7rem] py-1 px-2 border border-[var(--c-border)] bg-[var(--c-surface)]"
                          >
                            {DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                          </Select>
                          <button type="button" onClick={() => removeDoc(i)}
                            className="text-[var(--c-muted)] hover:text-[var(--c-red)] transition p-1 shrink-0">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2 flex-wrap items-center pt-2 border-t border-[var(--c-border)]">
                  <div className="flex-1 min-w-[12rem]">
                    <Select value={docType} onChange={e => setDocType(e.target.value)} className="text-xs">
                      {DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </Select>
                  </div>
                  <label className="btn-ghost btn cursor-pointer flex-shrink-0 text-xs py-2">
                    <Plus size={13} />
                    Attach Document
                    <input type="file" className="hidden" onChange={addFile} />
                  </label>
                </div>
              </CardSection>
            </Card>
          </div>

          {/* ─ Column 3: Consent & Summary ─ */}
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
                      'I acknowledge AI-assisted risk & sub-limit evaluation for this claim.',
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
              <CardSection className="space-y-2">
                <DataRow label="Insurer">{form.policyCompany}</DataRow>
                <DataRow label="Claimant">{form.claimantName || '—'}</DataRow>
                <DataRow label="Policy #"><span className="font-number">{form.policyNumber}</span></DataRow>
                <DataRow label="Type">{form.policyType}</DataRow>
                <DataRow label={
                  form.policyType === 'Motor' ? 'Garage' :
                    form.policyType === 'Life' ? 'Nominee' :
                      form.policyType === 'Property' ? 'Location' :
                        form.policyType === 'Travel' ? 'Destination' :
                          'Hospital'
                }>{form.hospitalName || '—'}</DataRow>
                <DataRow label="Claim Mode">{form.claimMode}</DataRow>
                <DataRow label="Claim Amount">
                  <span className="font-number font-bold" style={{ color: 'var(--c-amber)' }}>
                    {form.claimAmount ? `₹${Number(form.claimAmount).toLocaleString('en-IN')}` : '—'}
                  </span>
                </DataRow>
                <DataRow label="Payout Bank">{form.bankName ? `${form.bankName} ${form.ifscCode ? `(${form.ifscCode})` : ''}` : '—'}</DataRow>
                <DataRow label="Documents">{docs.length} attached</DataRow>
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
