import React, { useState, useEffect, useCallback } from 'react';
import { apiFetch } from './api.js';
import { Toaster, toast } from 'react-hot-toast';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { LoginView } from './views/LoginView';
import { ClaimSubmissionView } from './views/ClaimSubmissionView';
import { UnderwriterLedgerView } from './views/UnderwriterLedgerView';
import { CaseDetailView } from './views/CaseDetailView';
import { AnalyticsView } from './views/AnalyticsView';
import { AdminView } from './views/AdminView';
import { useSSE } from './hooks/useSSE';

export function App() {
  const [token, setToken] = useState(localStorage.getItem('ledger_jwt_token'));
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('ledger_user_profile');
    return saved ? JSON.parse(saved) : null;
  });

  const [activeTab, setActiveTab] = useState(() => {
    const saved = localStorage.getItem('ledger_user_profile');
    if (saved) {
      try {
        const u = JSON.parse(saved);
        if (u.role === 'claimant') return 'file-claim';
      } catch { /* ignore */ }
    }
    return 'ledger';
  });
  const [selectedCaseId, setSelectedCaseId] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [claimRefreshTrigger, setClaimRefreshTrigger] = useState(0);

  // ── Real-time SSE event handler ─────────────────────────────────────────────
  const handleSSEEvent = useCallback((event) => {
    switch (event.type) {
      case 'CLAIM_SUBMITTED':
        if (user?.role !== 'claimant') {
          toast.custom((t) => (
            <div className={`${t.visible ? 'animate-enter' : 'animate-leave'}
              max-w-sm w-full bg-white shadow-lg rounded-xl border border-[#E2DEC9] p-4 flex items-start gap-3`}>
              <div className="w-8 h-8 bg-[#14213D] rounded-lg flex items-center justify-center shrink-0">
                <span className="text-[#C8862A] text-sm font-bold">📋</span>
              </div>
              <div>
                <div className="font-bold text-xs text-[#14213D]">New Claim Submitted</div>
                <div className="text-xs text-[#5C6B73] mt-0.5">
                  {event.data.claimantName} — ₹{event.data.claimAmount?.toLocaleString('en-IN')} ({event.data.policyType})
                </div>
                <div className="text-[0.65rem] font-mono text-[#C8862A] mt-0.5">
                  Risk Score: {event.data.riskScore}/100 · AI: {event.data.aiRecommendation}
                </div>
              </div>
            </div>
          ), { duration: 6000 });
          // Trigger ledger refresh
          setClaimRefreshTrigger(n => n + 1);
        }
        break;

      case 'CLAIM_STATUS_CHANGED':
        toast.success(
          `Claim ${event.data.claimId} → ${event.data.newStatus?.toUpperCase()}`,
          { duration: 4000, icon: '⚡' }
        );
        setClaimRefreshTrigger(n => n + 1);
        break;

      case 'CLAIM_ESCALATED':
        if (user?.role === 'senior_underwriter' || user?.role === 'admin') {
          toast.custom((t) => (
            <div className={`${t.visible ? 'animate-enter' : 'animate-leave'}
              max-w-sm w-full bg-[#F3E8FF] shadow-lg rounded-xl border border-purple-300 p-4 flex items-start gap-3`}>
              <div className="text-xl">🔺</div>
              <div>
                <div className="font-bold text-xs text-purple-800">Claim Escalated to You</div>
                <div className="text-xs text-purple-600 mt-0.5">
                  {event.data.claimId} requires senior review
                </div>
              </div>
            </div>
          ), { duration: 8000 });
        }
        setClaimRefreshTrigger(n => n + 1);
        break;

      case 'PAYOUT_DISBURSED':
        toast.success(
          `Payout ₹${event.data.amount?.toLocaleString('en-IN')} disbursed`,
          { duration: 4000, icon: '💳' }
        );
        break;

      case 'CONFIG_UPDATED':
        toast('System configuration updated', { icon: '⚙️', duration: 3000 });
        break;

      default:
        break;
    }
  }, [user]);

  // SSE connection
  const { isConnected } = useSSE(token, handleSSEEvent);

  // ── Validate saved JWT Token on launch ──────────────────────────────────────
  useEffect(() => {
    async function checkAuth() {
      if (token) {
        try {
          const res = await apiFetch('/api/auth/me', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const json = await res.json();
          if (json.success) {
            setUser(json.user);
            localStorage.setItem('ledger_user_profile', JSON.stringify(json.user));
            if (json.user.role === 'claimant' && activeTab === 'ledger') {
              setActiveTab('file-claim');
            }
          } else {
            handleLogout();
          }
        } catch (err) {
          console.error('Auth check failed:', err);
          // Don't logout on network error — could be offline
        }
      }
      setLoadingAuth(false);
    }
    checkAuth();
  }, [token]);

  const handleLoginSuccess = (userProfile, jwtToken) => {
    setUser(userProfile);
    setToken(jwtToken);
    if (userProfile.role === 'claimant') {
      setActiveTab('file-claim');
    } else {
      setActiveTab('ledger');
    }
    toast.success(`Welcome back, ${userProfile.name.split(' ')[0]}!`, { duration: 3000 });
  };

  const handleLogout = async () => {
    // Invalidate token server-side
    if (token) {
      try {
        await apiFetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      } catch { /* ignore */ }
    }
    localStorage.removeItem('ledger_jwt_token');
    localStorage.removeItem('ledger_user_profile');
    setToken(null);
    setUser(null);
  };

  const handleSelectCase = (caseId) => {
    setSelectedCaseId(caseId);
    setActiveTab('case-detail');
  };

  const handleClaimSubmitted = (newClaim) => {
    setSelectedCaseId(newClaim.id);
    setActiveTab('case-detail');
    toast.success(`Claim ${newClaim.id} submitted successfully!`, { duration: 5000, icon: '✅' });
  };

  if (loadingAuth) {
    return (
      <div className="min-h-screen bg-[#F7F6F1] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-[#14213D] border-t-transparent rounded-full animate-spin mx-auto" />
          <div className="text-sm text-[#5C6B73] font-mono">Verifying Security Credentials...</div>
        </div>
      </div>
    );
  }

  if (!token || !user) {
    return (
      <>
        <Toaster position="top-right" />
        <LoginView onLoginSuccess={handleLoginSuccess} />
      </>
    );
  }

  const currentRole = user.role || 'underwriter';

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#F7F6F1] text-[#14213D] font-sans antialiased">
      {/* Toast notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          style: { fontFamily: 'Inter, sans-serif', fontSize: '0.78rem' },
          success: { style: { background: '#D1E7DD', color: '#3E6E5B', border: '1px solid #3E6E5B' } },
          error: { style: { background: '#F8D7DA', color: '#A6394A', border: '1px solid #A6394A' } },
        }}
      />

      {/* Top Header Bar */}
      <Header
        activeUser={user}
        onLogout={handleLogout}
        isLive={isConnected}
      />

      {/* Main Workspace Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Navigation Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={(tab) => {
            setActiveTab(tab);
            if (tab !== 'case-detail') setSelectedCaseId(null);
          }}
          currentRole={currentRole}
        />

        {/* Content View Area */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto">
          {(activeTab === 'file-claim' || (activeTab === 'ledger' && currentRole === 'claimant')) && (
            <ClaimSubmissionView
              onClaimSubmitted={handleClaimSubmitted}
              activeUser={user}
              token={token}
            />
          )}

          {activeTab === 'ledger' && currentRole !== 'claimant' && (
            <UnderwriterLedgerView
              onSelectCase={handleSelectCase}
              currentRole={currentRole}
              activeUser={user}
              token={token}
              refreshTrigger={claimRefreshTrigger}
            />
          )}

          {activeTab === 'case-detail' && selectedCaseId && (
            <CaseDetailView
              claimId={selectedCaseId}
              onBack={() => setActiveTab('ledger')}
              currentRole={currentRole}
              activeUser={user}
              token={token}
            />
          )}

          {activeTab === 'analytics' && (
            <AnalyticsView token={token} />
          )}

          {activeTab === 'admin' && (
            <AdminView currentRole={currentRole} token={token} />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
