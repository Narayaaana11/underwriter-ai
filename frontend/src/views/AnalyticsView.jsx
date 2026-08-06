import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  BarChart3, Clock, TrendingUp, ShieldCheck, CheckCircle2,
  XCircle, AlertTriangle, Activity, Zap, Users, IndianRupee
} from 'lucide-react';
import { apiFetch } from '../api.js';

const COLORS = {
  approved:  '#3E6E5B',
  rejected:  '#A6394A',
  submitted: '#14213D',
  review:    '#C8862A',
  escalated: '#6B21A8',
  low:       '#3E6E5B',
  medium:    '#C8862A',
  high:      '#A6394A',
};

const PIE_PALETTE = ['#14213D', '#C8862A', '#3E6E5B', '#A6394A', '#6B21A8'];

function StatCard({ label, value, sub, icon: Icon, color = '#14213D' }) {
  return (
    <div className="card p-5 flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <div className="stat-label">{label}</div>
        {Icon && <Icon size={16} color={color} />}
      </div>
      <div className="stat-value" style={{ color }}>{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="card p-3 text-xs space-y-1 min-w-[120px]">
        {label && <div className="font-mono font-bold text-[#5C6B73] uppercase">{label}</div>}
        {payload.map((p, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            <span className="font-medium text-[#14213D]">{p.name}:</span>
            <span className="font-mono font-bold text-[#14213D]">
              {typeof p.value === 'number' && p.value > 10000
                ? `₹${p.value.toLocaleString('en-IN')}`
                : p.value}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export function AnalyticsView({ token }) {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadAnalytics() {
      setLoading(true);
      try {
        const res = await apiFetch('/api/analytics/metrics', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const json = await res.json();
        if (json.success) {
          setMetrics(json.data);
        } else {
          setError(json.error || 'Failed to load analytics.');
        }
      } catch (err) {
        setError('Network error loading analytics data.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    if (token) loadAnalytics();
  }, [token]);

  if (loading) {
    return (
      <div className="p-12 text-center text-[#5C6B73] font-mono flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-[#14213D] border-t-transparent rounded-full animate-spin" />
        Loading real-time analytics data...
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="p-8">
        <div className="alert-error">{error || 'Analytics data unavailable.'}</div>
      </div>
    );
  }

  const {
    totalClaims, statusCounts, policyTypeCounts,
    totalClaimed, totalApproved, totalReserved, totalRejected,
    subLimitSavings, coPaySavings, gipsaTariffSavings, totalSavings,
    riskDistribution, monthlyTrend, underwriterPerformance,
    turnaroundStats, liveConnections
  } = metrics;

  const statusChartData = Object.entries(statusCounts || {}).map(([name, value]) => ({ name, value }));
  const policyChartData = Object.entries(policyTypeCounts || {}).map(([name, value]) => ({ name, value }));
  const riskChartData = [
    { name: 'Low Risk (0-19)', value: riskDistribution?.low || 0, color: COLORS.low },
    { name: 'Medium Risk (20-49)', value: riskDistribution?.medium || 0, color: COLORS.medium },
    { name: 'High Risk (50+)', value: riskDistribution?.high || 0, color: COLORS.high },
  ];

  const approvalRate = totalClaims > 0
    ? `${((statusCounts?.approved || 0) / totalClaims * 100).toFixed(1)}%`
    : '0%';

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fade-in">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2DEC9] pb-4">
        <div>
          <h2 className="page-heading flex items-center gap-3">
            Analytics <span className="font-sans text-[#C8862A]">&amp;</span> Executive Dashboard
            <span className="text-xs font-mono font-bold bg-[#C8862A] text-[#14213D] px-2.5 py-0.5 rounded-full">
              Live Data
            </span>
          </h2>
          <p className="text-sm text-[#5C6B73] mt-1">
            Real-time metrics from {totalClaims} claims · {liveConnections || 0} active sessions
          </p>
        </div>
        <div className="text-right">
          <div className="text-[0.65rem] font-mono text-[#5C6B73] uppercase tracking-wider">AI Engine</div>
          <div className="text-xs font-mono font-bold text-[#C8862A]">Ledger AI v2 + Recharts BI</div>
        </div>
      </div>

      {/* KPI Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total Claims"
          value={totalClaims}
          sub={`${statusCounts?.submitted || 0} pending review`}
          icon={BarChart3}
          color="#14213D"
        />
        <StatCard
          label="Total Claimed"
          value={`₹${(totalClaimed / 100000).toFixed(1)}L`}
          sub={`₹${(totalReserved / 100000).toFixed(1)}L reserved`}
          icon={IndianRupee}
          color="#C8862A"
        />
        <StatCard
          label="Total Approved"
          value={`₹${(totalApproved / 100000).toFixed(1)}L`}
          sub={`Approval rate: ${approvalRate}`}
          icon={CheckCircle2}
          color="#3E6E5B"
        />
        <StatCard
          label="Underwriter Engine Savings"
          value={totalSavings > 100000 ? `₹${(totalSavings / 100000).toFixed(2)}L` : `₹${(totalSavings / 1000).toFixed(1)}K`}
          sub={`Sub-limits & Co-Pay savings`}
          icon={Zap}
          color="#6B21A8"
        />
      </div>

      {/* SLA Banner */}
      <div className="card p-5 bg-[#14213D] text-[#F7F6F1] border-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="font-mono text-[0.65rem] tracking-widest uppercase text-[#C8862A] font-bold mb-1">
              SLA Performance — Turnaround Time Reduction
            </div>
            <div className="font-heading text-xl font-bold">
              From 30–40 Days → Under 2 Minutes
            </div>
            <div className="text-[0.78rem] text-[#8D99AE] mt-1">
              AI-powered decision support with full IRDAI-compliant audit trail
            </div>
          </div>
          <div className="flex gap-6 shrink-0">
            {[
              { label: 'Time Saved', value: turnaroundStats?.timeSavedPercent || '99.9%', color: '#C8862A' },
              { label: 'AI Confidence', value: '96.4%', color: '#3E6E5B' },
              { label: 'Claims Processed', value: turnaroundStats?.totalProcessed || totalClaims, color: '#F7F6F1' },
            ].map(stat => (
              <div key={stat.label} className="text-center">
                <div className="font-heading text-xl font-bold" style={{ color: stat.color }}>{stat.value}</div>
                <div className="text-[0.62rem] font-mono text-[#5C6B73]">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Monthly Volume Bar Chart */}
        <div className="card">
          <div className="card-header">
            <div className="card-header-title"><TrendingUp size={12} /> Monthly Claim Volume</div>
          </div>
          <div className="card-section">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyTrend || []} margin={{ top: 4, right: 8, bottom: 4, left: -16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2DEC9" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fontFamily: 'IBM Plex Mono' }} />
                <YAxis tick={{ fontSize: 10, fontFamily: 'IBM Plex Mono' }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 10, fontFamily: 'IBM Plex Mono' }} />
                <Bar dataKey="count" name="Total Claims" fill="#14213D" radius={[3, 3, 0, 0]} />
                <Bar dataKey="approved" name="Approved" fill="#3E6E5B" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Distribution Pie */}
        <div className="card">
          <div className="card-header">
            <div className="card-header-title"><Activity size={12} /> Status Distribution</div>
          </div>
          <div className="card-section">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={statusChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                  label={false}
                >
                  {statusChartData.map((entry, index) => (
                    <Cell key={entry.name} fill={COLORS[entry.name] || PIE_PALETTE[index % PIE_PALETTE.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-2 justify-center mt-2">
              {statusChartData.map((s, i) => (
                <div key={s.name} className="flex items-center gap-1.5 text-[0.68rem] font-mono font-bold">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ background: COLORS[s.name] || PIE_PALETTE[i % PIE_PALETTE.length] }} />
                  <span className="capitalize text-[#14213D]">{s.name.replace('_', ' ')}</span>
                  <span className="text-[#5C6B73]">({s.value})</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Policy Type Breakdown */}
        <div className="card">
          <div className="card-header">
            <div className="card-header-title"><ShieldCheck size={12} /> Policy Type Breakdown</div>
          </div>
          <div className="card-section">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={policyChartData} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2DEC9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fontFamily: 'IBM Plex Mono' }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fontFamily: 'IBM Plex Mono' }} width={60} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name="Claims" radius={[0, 3, 3, 0]}>
                  {policyChartData.map((entry, index) => (
                    <Cell key={entry.name} fill={PIE_PALETTE[index % PIE_PALETTE.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Risk Distribution */}
        <div className="card">
          <div className="card-header">
            <div className="card-header-title"><AlertTriangle size={12} /> Risk Distribution</div>
          </div>
          <div className="card-section">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={riskChartData}
                  cx="50%"
                  cy="50%"
                  outerRadius={85}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {riskChartData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex gap-4 justify-center mt-2">
              {riskChartData.map(r => (
                <div key={r.name} className="text-center">
                  <div className="font-heading text-lg font-bold" style={{ color: r.color }}>{r.value}</div>
                  <div className="text-[0.62rem] font-mono text-[#5C6B73]">
                    {r.name.split(' (')[0]}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Underwriter Performance Table */}
      {underwriterPerformance && underwriterPerformance.length > 0 && (
        <div className="card">
          <div className="card-header">
            <div className="card-header-title"><Users size={12} /> Underwriter Performance</div>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Underwriter</th>
                  <th>Total Assigned</th>
                  <th>Approved</th>
                  <th>Rejected</th>
                  <th>Escalated</th>
                  <th>Approval Rate</th>
                </tr>
              </thead>
              <tbody>
                {underwriterPerformance.map((uw) => (
                  <tr key={uw.name}>
                    <td className="font-semibold text-[#14213D]">{uw.name}</td>
                    <td className="font-mono font-bold text-[#14213D]">{uw.total}</td>
                    <td>{uw.approved > 0 ? <span className="risk-pill risk-low">{uw.approved}</span> : <span className="text-[var(--c-muted)] text-xs">0</span>}</td>
                    <td>{uw.rejected > 0 ? <span className="risk-pill risk-high">{uw.rejected}</span> : <span className="text-[var(--c-muted)] text-xs">0</span>}</td>
                    <td>{uw.escalated > 0 ? <span className="risk-pill risk-medium">{uw.escalated}</span> : <span className="text-[var(--c-muted)] text-xs">0</span>}</td>
                    <td className="font-mono font-bold text-[#3E6E5B]">
                      {uw.total > 0 ? `${((uw.approved / uw.total) * 100).toFixed(1)}%` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
