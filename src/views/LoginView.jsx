import React, { useState } from 'react';
import { Lock, Mail, User, Building2, ArrowRight, AlertCircle, ShieldCheck } from 'lucide-react';
import { Input, Select, FormField, Button, Alert, Spinner, Divider } from '../components/ui';

const COMPANIES = [
  'HDFC ERGO Health & General',
  'Star Health & Allied Insurance',
  'ICICI Lombard General Insurance',
  'Bajaj Allianz General',
  'Care Health Insurance',
  'Niva Bupa Health Insurance',
];

const DEMO_ACCOUNTS = [
  { label: 'Ananya Sharma', role: 'Underwriter · Star Health', email: 'a.sharma@ledger-insurance.com', pass: 'password123' },
  { label: 'Vikram Malhotra', role: 'Underwriter · ICICI Lombard', email: 'v.malhotra@ledger-insurance.com', pass: 'password123' },
  { label: 'Siddharth Verma', role: 'Senior Underwriter · HDFC ERGO', email: 's.verma@ledger-insurance.com', pass: 'password123' },
  { label: 'Ramesh Kumar', role: 'Claimant', email: 'ramesh.k@example.com', pass: 'password123' },
  { label: 'System Admin', role: 'Administrator', email: 'admin@ledger-insurance.com', pass: 'admin123' },
];

export function LoginView({ onLoginSuccess }) {
  const [tab, setTab]         = useState('login');   // 'login' | 'register'
  const [email, setEmail]     = useState('a.sharma@ledger-insurance.com');
  const [password, setPassword] = useState('password123');
  const [name, setName]       = useState('');
  const [role, setRole]       = useState('underwriter');
  const [company, setCompany] = useState(COMPANIES[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const isRegister = tab === 'register';
    const endpoint   = isRegister ? '/api/auth/register' : '/api/auth/login';
    const payload    = isRegister ? { name, email, password, role, company } : { email, password };

    try {
      const res  = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();

      if (json.success) {
        localStorage.setItem('ledger_jwt_token', json.token);
        localStorage.setItem('ledger_user_profile', JSON.stringify(json.user));
        onLoginSuccess(json.user, json.token);
      } else {
        setError(json.detail || json.error || 'Authentication failed.');
      }
    } catch {
      setError('Network error — could not reach the backend server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--c-paper)] flex">

      {/* ── Left panel (branding) ── */}
      <div
        className="hidden lg:flex lg:w-2/5 flex-col justify-between p-12"
        style={{ background: 'var(--c-ink)' }}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center font-heading font-bold text-xl"
            style={{ background: 'var(--c-amber)', color: 'var(--c-ink)' }}>L</div>
          <span className="font-heading text-xl font-bold text-[var(--c-paper)]">LEDGER</span>
        </div>

        <div className="space-y-6">
          <div>
            <h1 className="font-heading text-4xl font-bold text-[var(--c-paper)] leading-tight">
              Insurance Claims<br />
              <span style={{ color: 'var(--c-amber)' }}>Powered by AI.</span>
            </h1>
            <p className="mt-4 text-[var(--c-ink-dim)] text-sm leading-relaxed max-w-xs">
              Underwriting decisions that once took 30–40 days now complete in under 2 minutes,
              with explainable AI recommendations and full regulatory audit trails.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { n: '96.4%', l: 'AI Confidence' },
              { n: '1.5m',  l: 'Avg Decision Time' },
              { n: '7+',    l: 'AWS AI Services' },
              { n: '100%',  l: 'Auditable' },
            ].map(s => (
              <div key={s.l} className="rounded-lg p-3 border border-[var(--c-ink-3)] bg-[var(--c-ink-2)]">
                <div className="font-heading text-xl font-bold" style={{ color: 'var(--c-amber)' }}>{s.n}</div>
                <div className="text-[0.7rem] text-[var(--c-ink-dim)] mt-0.5">{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="text-[0.65rem] font-mono text-[var(--c-ink-dim)]">
          AWS Bedrock · Textract · Comprehend Medical · Fraud Detector · Step Functions
        </div>
      </div>

      {/* ── Right panel (form) ── */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 py-12">
        {/* Mobile brand */}
        <div className="lg:hidden flex items-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center font-heading font-bold"
            style={{ background: 'var(--c-ink)', color: 'var(--c-amber)' }}>L</div>
          <span className="font-heading font-bold text-lg text-[var(--c-ink)]">LEDGER</span>
        </div>

        <div className="w-full max-w-sm space-y-6">
          <div>
            <h2 className="font-heading text-2xl font-bold text-[var(--c-ink)]">
              {tab === 'login' ? 'Welcome back' : 'Create account'}
            </h2>
            <p className="text-sm text-[var(--c-muted)] mt-1">
              {tab === 'login' ? 'Sign in to your underwriting portal.' : 'Register a new insurer account.'}
            </p>
          </div>

          {/* Tab toggle */}
          <div className="flex bg-[var(--c-paper)] rounded-lg border border-[var(--c-border)] p-0.5">
            {['login', 'register'].map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-1 py-1.5 text-xs font-bold rounded-md transition capitalize
                  ${tab === t
                    ? 'bg-[var(--c-ink)] text-[var(--c-paper)] shadow-sm'
                    : 'text-[var(--c-muted)] hover:text-[var(--c-ink)]'
                  }`}>
                {t === 'login' ? 'Sign In' : 'Register'}
              </button>
            ))}
          </div>

          {error && (
            <Alert type="error" icon={AlertCircle}>{error}</Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {tab === 'register' && (
              <FormField label="Full Name">
                <Input icon={User} type="text" required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Rahul Sharma" />
              </FormField>
            )}

            <FormField label="Corporate Email">
              <Input icon={Mail} type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="name@insurer.com" />
            </FormField>

            <FormField label="Password">
              <Input icon={Lock} type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
            </FormField>

            {tab === 'register' && (
              <>
                <FormField label="Insurance Organization">
                  <Select icon={Building2} value={company} onChange={e => setCompany(e.target.value)}>
                    {COMPANIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </Select>
                </FormField>

                <FormField label="System Role">
                  <Select value={role} onChange={e => setRole(e.target.value)}>
                    <option value="underwriter">Underwriter</option>
                    <option value="senior_underwriter">Senior Underwriter / Committee</option>
                    <option value="claimant">Claimant</option>
                    <option value="admin">System Administrator</option>
                  </Select>
                </FormField>
              </>
            )}

            <Button type="submit" disabled={loading} className="w-full py-2.5 mt-1">
              {loading ? <Spinner size={14} /> : <ArrowRight size={14} />}
              {tab === 'login' ? 'Sign In to Portal' : 'Create Account'}
            </Button>
          </form>

          <Divider />

          {/* Demo quick-fill */}
          <div>
            <p className="text-[0.65rem] font-bold font-mono uppercase tracking-widest text-[var(--c-muted)] mb-2">
              Quick Demo Access
            </p>
            <div className="space-y-1.5">
              {DEMO_ACCOUNTS.map((acc, i) => (
                <button
                  key={i}
                  onClick={() => { setEmail(acc.email); setPassword(acc.pass); setTab('login'); }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg
                    border border-[var(--c-border)] bg-[var(--c-paper)]
                    hover:border-[var(--c-ink)] hover:bg-[var(--c-surface)]
                    transition text-left group"
                >
                  <div>
                    <div className="text-[0.75rem] font-semibold text-[var(--c-ink)] group-hover:text-[var(--c-ink)]">
                      {acc.label}
                    </div>
                    <div className="text-[0.65rem] text-[var(--c-muted)] font-mono">{acc.role}</div>
                  </div>
                  <ArrowRight size={12} className="text-[var(--c-muted)] group-hover:text-[var(--c-amber)] transition shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
