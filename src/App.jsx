import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { LoginView } from './views/LoginView';
import { ClaimSubmissionView } from './views/ClaimSubmissionView';
import { UnderwriterLedgerView } from './views/UnderwriterLedgerView';
import { CaseDetailView } from './views/CaseDetailView';
import { AnalyticsView } from './views/AnalyticsView';
import { AdminView } from './views/AdminView';

export function App() {
  const [token, setToken] = useState(localStorage.getItem('ledger_jwt_token'));
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('ledger_user_profile');
    return saved ? JSON.parse(saved) : null;
  });

  const [activeTab, setActiveTab] = useState('ledger');
  const [selectedCaseId, setSelectedCaseId] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  // Validate saved JWT Token on launch
  useEffect(() => {
    async function checkAuth() {
      if (token) {
        try {
          const res = await fetch('/api/auth/me', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const json = await res.json();
          if (json.success) {
            setUser(json.user);
            localStorage.setItem('ledger_user_profile', JSON.stringify(json.user));
          } else {
            handleLogout();
          }
        } catch (err) {
          console.error("Auth check failed:", err);
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
  };

  const handleLogout = () => {
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
  };

  if (loadingAuth) {
    return (
      <div className="min-h-screen bg-[#F7F6F1] flex items-center justify-center text-[#5C6B73] font-mono-val">
        Verifying Security Credentials...
      </div>
    );
  }

  // Render Login Screen if not authenticated
  if (!token || !user) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  const currentRole = user.role || 'underwriter';

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F6F1] text-[#14213D] font-sans antialiased">
      {/* Top Header Bar */}
      <Header
        activeUser={user}
        onLogout={handleLogout}
      />

      {/* Main Workspace Layout */}
      <div className="flex flex-1">
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
          {activeTab === 'file-claim' && (
            <ClaimSubmissionView
              onClaimSubmitted={handleClaimSubmitted}
              activeUser={user}
            />
          )}

          {activeTab === 'ledger' && (
            <UnderwriterLedgerView
              onSelectCase={handleSelectCase}
              currentRole={currentRole}
              activeUser={user}
            />
          )}

          {activeTab === 'case-detail' && selectedCaseId && (
            <CaseDetailView
              claimId={selectedCaseId}
              onBack={() => setActiveTab('ledger')}
              currentRole={currentRole}
              activeUser={user}
            />
          )}

          {activeTab === 'analytics' && (
            <AnalyticsView />
          )}

          {activeTab === 'admin' && (
            <AdminView currentRole={currentRole} />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
