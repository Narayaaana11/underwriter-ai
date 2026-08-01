import React, { useState, useEffect } from 'react';
import { Shield, User, Key, Sliders, ScrollText, CheckCircle, Save, Lock, Database } from 'lucide-react';

export function AdminView({ currentRole }) {
  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('audit'); // 'audit', 'users', 'config'
  const [saveSuccess, setSaveSuccess] = useState(null);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [uRes, aRes, cRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/audit-logs'),
        fetch('/api/admin/config')
      ]);
      const uJson = await uRes.json();
      const aJson = await aRes.json();
      const cJson = await cRes.json();

      if (uJson.success) setUsers(uJson.data);
      if (aJson.success) setAuditLogs(aJson.data);
      if (cJson.success) setConfig(cJson.data);
    } catch (err) {
      console.error("Error loading admin data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleSaveThresholds = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      const json = await res.json();
      if (json.success) {
        setConfig(json.data);
        setSaveSuccess("Monetary escalation thresholds saved successfully!");
        setTimeout(() => setSaveSuccess(null), 4000);
      }
    } catch (err) {
      console.error("Error saving config:", err);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-[#5C6B73] font-mono-val">
        Loading CloudTrail Audit Logs and IAM User Directories...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2DEC9] pb-4">
        <div>
          <h2 className="text-2xl font-serif font-bold text-[#14213D] flex items-center gap-3">
            System Admin & Governance Panel
            <span className="text-xs font-mono-val font-normal bg-[#14213D] text-[#F7F6F1] px-2.5 py-0.5 rounded-full">
              AWS CloudTrail & IAM Sync
            </span>
          </h2>
          <p className="text-xs text-[#5C6B73] mt-1">
            Manage user authorization roles, inspect CloudTrail decision audit trails, and configure monetary escalation gates.
          </p>
        </div>

        {/* Tab Selector Buttons */}
        <div className="flex bg-white p-1 rounded-lg border border-[#E2DEC9]">
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition ${
              activeTab === 'audit'
                ? 'bg-[#14213D] text-[#F7F6F1]'
                : 'text-[#5C6B73] hover:text-[#14213D]'
            }`}
          >
            CloudTrail Audit Logs ({auditLogs.length})
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition ${
              activeTab === 'users'
                ? 'bg-[#14213D] text-[#F7F6F1]'
                : 'text-[#5C6B73] hover:text-[#14213D]'
            }`}
          >
            User Roles ({users.length})
          </button>
          <button
            onClick={() => setActiveTab('config')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition ${
              activeTab === 'config'
                ? 'bg-[#14213D] text-[#F7F6F1]'
                : 'text-[#5C6B73] hover:text-[#14213D]'
            }`}
          >
            Threshold Settings
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-4 rounded-lg bg-[#3E6E5B]/10 border border-[#3E6E5B] text-[#3E6E5B] text-sm flex items-center gap-2">
          <CheckCircle className="w-5 h-5" />
          <span>{saveSuccess}</span>
        </div>
      )}

      {/* TAB 1: CLOUDTRAIL AUDIT LOG VIEWER */}
      {activeTab === 'audit' && (
        <div className="ledger-card p-6 space-y-4">
          <h3 className="text-sm font-mono-val font-bold text-[#14213D] uppercase border-b border-[#E2DEC9] pb-2 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <ScrollText className="w-4 h-4 text-[#C8862A]" />
              AWS CloudTrail Audit Trail (Regulatory Log)
            </span>
            <span className="text-xs font-normal text-[#5C6B73]">Immutable Audit Trail</span>
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse font-mono-val">
              <thead>
                <tr className="bg-[#14213D] text-[#F7F6F1] uppercase">
                  <th className="py-2.5 px-3">Event ID</th>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Action</th>
                  <th className="py-2.5 px-3">Actor / User</th>
                  <th className="py-2.5 px-3">Resource ID</th>
                  <th className="py-2.5 px-3">Audit Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2DEC9]">
                {auditLogs.map((log, idx) => (
                  <tr key={idx} className="hover:bg-[#F7F6F1]">
                    <td className="py-2.5 px-3 text-[#5C6B73]">{log.eventId || `EVT-${1000 + idx}`}</td>
                    <td className="py-2.5 px-3 text-[#14213D]">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-[#C8862A]">
                      {log.action}
                    </td>
                    <td className="py-2.5 px-3 text-[#14213D]">{log.actor}</td>
                    <td className="py-2.5 px-3 font-bold text-[#14213D]">{log.claimId || log.resourceId}</td>
                    <td className="py-2.5 px-3 text-[#5C6B73] max-w-md truncate">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: USER & IAM ROLE MANAGEMENT */}
      {activeTab === 'users' && (
        <div className="ledger-card p-6 space-y-4">
          <h3 className="text-sm font-mono-val font-bold text-[#14213D] uppercase border-b border-[#E2DEC9] pb-2 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <User className="w-4 h-4 text-[#C8862A]" />
              AWS Cognito Directory & IAM Role Assignments
            </span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {users.map((u) => (
              <div key={u.id} className="p-4 rounded-lg bg-[#F7F6F1] border border-[#E2DEC9] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-[#14213D] font-serif text-sm">{u.name}</div>
                  <span className="px-2 py-0.5 rounded bg-[#14213D] text-[#F7F6F1] text-[10px] font-mono-val font-bold uppercase">
                    {u.role.replace('_', ' ')}
                  </span>
                </div>
                <div className="text-xs text-[#5C6B73] font-mono-val">{u.email}</div>
                {u.specialty && (
                  <div className="text-xs text-[#C8862A] font-medium">Specialty: {u.specialty}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: THRESHOLD & POLICY CONFIGURATION */}
      {activeTab === 'config' && config && (
        <div className="ledger-card p-6 space-y-6">
          <h3 className="text-sm font-mono-val font-bold text-[#14213D] uppercase border-b border-[#E2DEC9] pb-2 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#C8862A]" />
              Auto-Approval & Senior Escalation Thresholds
            </span>
          </h3>

          <form onSubmit={handleSaveThresholds} className="space-y-6 max-w-2xl">
            <div className="p-4 rounded-lg bg-[#F7F6F1] border border-[#E2DEC9] space-y-3">
              <label className="block text-xs font-bold text-[#14213D] uppercase">
                Senior Underwriter / Committee Threshold (₹)
              </label>
              <p className="text-xs text-[#5C6B73]">
                Claims exceeding this amount automatically require Senior Underwriter sign-off.
              </p>
              <input
                type="number"
                value={config.seniorApprovalThreshold}
                onChange={(e) => setConfig({ ...config, seniorApprovalThreshold: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-white border border-[#E2DEC9] rounded font-mono-val text-sm font-bold text-[#14213D]"
              />
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-bold text-[#14213D] uppercase">
                Auto-Approval Limits per Policy Type (₹)
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Object.entries(config.autoApprovalThresholds || {}).map(([type, limit]) => (
                  <div key={type} className="p-3 bg-[#F7F6F1] rounded border border-[#E2DEC9]">
                    <div className="text-xs font-medium text-[#5C6B73] mb-1">{type} Policy Limit</div>
                    <input
                      type="number"
                      value={limit}
                      onChange={(e) => setConfig({
                        ...config,
                        autoApprovalThresholds: {
                          ...config.autoApprovalThresholds,
                          [type]: Number(e.target.value)
                        }
                      })}
                      className="w-full px-3 py-1.5 bg-white border border-[#E2DEC9] rounded font-mono-val text-xs font-bold text-[#14213D]"
                    />
                  </div>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="px-6 py-2.5 rounded-lg bg-[#14213D] text-[#F7F6F1] font-bold text-xs hover:bg-[#233252] transition shadow flex items-center gap-2"
            >
              <Save className="w-4 h-4 text-[#C8862A]" />
              <span>Save System Threshold Configuration</span>
            </button>
          </form>
        </div>
      )}

    </div>
  );
}
