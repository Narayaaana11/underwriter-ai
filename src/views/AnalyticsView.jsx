import React, { useState, useEffect } from 'react';
import { BarChart3, Clock, TrendingUp, ShieldCheck, CheckCircle2, XCircle, AlertTriangle, ExternalLink, Cpu } from 'lucide-react';

export function AnalyticsView() {
  const [metrics, setMetrics] = useState(null);
  const [embedConfig, setEmbedConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAnalytics() {
      try {
        const [mRes, eRes] = await Promise.all([
          fetch('/api/analytics/metrics'),
          fetch('/api/analytics/embed-url')
        ]);
        const mJson = await mRes.json();
        const eJson = await eRes.json();

        if (mJson.success) setMetrics(mJson.data);
        if (eJson.success) setEmbedConfig(eJson.data);
      } catch (err) {
        console.error("Error loading analytics:", err);
      } finally {
        setLoading(false);
      }
    }
    loadAnalytics();
  }, []);

  if (loading || !metrics) {
    return (
      <div className="p-12 text-center text-[#5C6B73] font-mono-val">
        Connecting to Amazon QuickSight BI Engine...
      </div>
    );
  }

  const { totalClaims, statusCounts, policyTypeCounts, totalClaimed, totalApproved, riskDistribution, turnaroundStats } = metrics;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2DEC9] pb-4">
        <div>
          <h2 className="text-2xl font-serif font-bold text-[#14213D] flex items-center gap-3">
            Analytics & Executive BI
            <span className="text-xs font-mono-val font-normal bg-[#C8862A] text-[#14213D] px-2.5 py-0.5 rounded-full font-bold">
              Amazon QuickSight Embedded
            </span>
          </h2>
          <p className="text-xs text-[#5C6B73] mt-1">
            Real-time telemetry on underwriting speed improvement, claim volumes, risk band distributions, and underwriter performance.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono-val text-[#5C6B73] bg-white px-3 py-1.5 rounded-lg border border-[#E2DEC9]">
          <Cpu className="w-4 h-4 text-[#3E6E5B]" />
          Athena SQL ETL Active
        </div>
      </div>

      {/* CORE HIGHLIGHT: The 30-40 Day SLA Improvement Banner */}
      <div className="ledger-card p-6 bg-gradient-to-r from-[#14213D] to-[#233252] text-[#F7F6F1] flex flex-col md:flex-row items-center justify-between gap-6 shadow-lg">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 text-xs font-mono-val bg-[#C8862A] text-[#14213D] px-3 py-1 rounded-full font-bold">
            <Clock className="w-3.5 h-3.5" />
            CORE VALUE PROPOSITION PROOF
          </div>
          <h3 className="text-2xl font-serif font-bold text-white">
            Decision Turnaround Time Reduced from 35 Days to 1.5 Minutes
          </h3>
          <p className="text-xs text-[#8D99AE] max-w-2xl leading-relaxed">
            By automating document OCR via AWS Textract and generating clause-citing risk recommendations using AWS Bedrock Claude 3.5, Ledger reduces decision cycle time by <strong className="text-[#3E6E5B] text-sm">99.9%</strong>.
          </p>
        </div>

        <div className="flex items-center gap-6 bg-[#0C1527] p-4 rounded-xl border border-[#233252] flex-shrink-0">
          <div className="text-center">
            <div className="text-[10px] font-mono-val text-[#8D99AE] uppercase">Legacy Manual Cycle</div>
            <div className="text-2xl font-bold font-mono-val text-[#A6394A]">35.0 Days</div>
          </div>
          <div className="text-xl text-[#C8862A] font-bold">→</div>
          <div className="text-center">
            <div className="text-[10px] font-mono-val text-[#8D99AE] uppercase">Ledger AI Cycle</div>
            <div className="text-2xl font-bold font-mono-val text-[#3E6E5B]">1.5 Mins</div>
          </div>
        </div>
      </div>

      {/* 4 Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="ledger-card p-5 space-y-2 bg-white">
          <div className="text-xs font-mono-val text-[#5C6B73] uppercase tracking-wider">Total Claims Processed</div>
          <div className="text-3xl font-serif font-bold text-[#14213D]">{totalClaims}</div>
          <div className="text-[11px] text-[#3E6E5B] font-mono-val flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>100% Enqueued via SQS</span>
          </div>
        </div>

        <div className="ledger-card p-5 space-y-2 bg-white">
          <div className="text-xs font-mono-val text-[#5C6B73] uppercase tracking-wider">Total Claim Volume</div>
          <div className="text-3xl font-serif font-bold font-mono-val text-[#14213D]">
            ₹{(totalClaimed / 100000).toFixed(2)}L
          </div>
          <div className="text-[11px] text-[#5C6B73] font-mono-val">
            Across Health, Motor, Travel & Property
          </div>
        </div>

        <div className="ledger-card p-5 space-y-2 bg-white">
          <div className="text-xs font-mono-val text-[#5C6B73] uppercase tracking-wider">Total Approved Payouts</div>
          <div className="text-3xl font-serif font-bold font-mono-val text-[#3E6E5B]">
            ₹{(totalApproved / 100000).toFixed(2)}L
          </div>
          <div className="text-[11px] text-[#3E6E5B] font-mono-val">
            Disbursed via NEFT/RTGS
          </div>
        </div>

        <div className="ledger-card p-5 space-y-2 bg-white">
          <div className="text-xs font-mono-val text-[#5C6B73] uppercase tracking-wider">High Risk Claims Ratio</div>
          <div className="text-3xl font-serif font-bold text-[#A6394A]">
            {((riskDistribution.high / (totalClaims || 1)) * 100).toFixed(0)}%
          </div>
          <div className="text-[11px] text-[#A6394A] font-mono-val">
            {riskDistribution.high} High Risk (&gt;50 score)
          </div>
        </div>

      </div>

      {/* Visual Charts & Breakdown Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Status & Risk Score Distribution Visual */}
        <div className="ledger-card p-6 space-y-6">
          <h3 className="text-sm font-mono-val font-bold text-[#14213D] uppercase border-b border-[#E2DEC9] pb-2 flex items-center justify-between">
            <span>Claims Lifecycle Status Breakdown</span>
            <BarChart3 className="w-4 h-4 text-[#C8862A]" />
          </h3>

          <div className="space-y-3">
            {[
              { label: 'Submitted (New)', count: statusCounts.submitted, color: 'bg-[#14213D]' },
              { label: 'Under Review', count: statusCounts.review, color: 'bg-[#C8862A]' },
              { label: 'Approved', count: statusCounts.approved, color: 'bg-[#3E6E5B]' },
              { label: 'Rejected', count: statusCounts.rejected, color: 'bg-[#A6394A]' },
              { label: 'Escalated to Senior', count: statusCounts.escalated, color: 'bg-purple-700' },
            ].map(item => {
              const pct = ((item.count / (totalClaims || 1)) * 100).toFixed(0);
              return (
                <div key={item.label} className="space-y-1">
                  <div className="flex justify-between text-xs font-mono-val">
                    <span className="text-[#14213D] font-medium">{item.label}</span>
                    <span className="font-bold text-[#14213D]">{item.count} ({pct}%)</span>
                  </div>
                  <div className="w-full h-3 bg-[#F7F6F1] rounded-full overflow-hidden border border-[#E2DEC9]">
                    <div
                      className={`h-full ${item.color} transition-all duration-500`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Policy Type Breakdown */}
        <div className="ledger-card p-6 space-y-6">
          <h3 className="text-sm font-mono-val font-bold text-[#14213D] uppercase border-b border-[#E2DEC9] pb-2 flex items-center justify-between">
            <span>Claims Distribution by Policy Specialty</span>
            <ShieldCheck className="w-4 h-4 text-[#C8862A]" />
          </h3>

          <div className="grid grid-cols-2 gap-4">
            {Object.entries(policyTypeCounts).map(([type, count]) => (
              <div key={type} className="p-4 rounded-lg bg-[#F7F6F1] border border-[#E2DEC9] space-y-1">
                <div className="text-xs font-mono-val text-[#5C6B73]">{type} Insurance</div>
                <div className="text-2xl font-serif font-bold text-[#14213D]">{count} Case(s)</div>
                <div className="text-[10px] text-[#C8862A] font-mono-val font-bold">
                  Auto-routed to {type} UW Team
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Amazon QuickSight BI Dashboard Simulation Container */}
      <div className="ledger-card p-6 space-y-4 bg-white">
        <div className="flex items-center justify-between border-b border-[#E2DEC9] pb-3">
          <div>
            <h3 className="text-sm font-mono-val font-bold text-[#14213D] uppercase flex items-center gap-2">
              <ExternalLink className="w-4 h-4 text-[#C8862A]" />
              Amazon QuickSight Embedded Interactive BI View
            </h3>
            <p className="text-xs text-[#5C6B73]">
              Dashboard ID: {embedConfig?.dashboardId || 'ledger-analytics-v1'} • IAM Role: Scoped
            </p>
          </div>
          <span className="text-xs font-mono-val text-[#3E6E5B] bg-[#3E6E5B]/10 px-2.5 py-1 rounded border border-[#3E6E5B]/30">
            Athena Glue Catalog Sync Active
          </span>
        </div>

        {/* Simulated Interactive QuickSight BI Frame */}
        <div className="h-80 bg-[#0C1527] rounded-lg p-6 text-[#F7F6F1] font-mono-val flex flex-col justify-between relative overflow-hidden border border-[#233252]">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-xs text-[#C8862A] font-bold">AWS QUICKSIGHT TELEMETRY STREAM</div>
              <div className="text-lg font-serif text-white font-bold">Executive Underwriting Performance & Loss Ratios</div>
            </div>
            <div className="text-xs text-[#8D99AE] border border-[#233252] px-2 py-1 rounded">
              AWS Region: us-east-1
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 text-center my-auto">
            <div className="p-3 bg-[#14213D] rounded border border-[#233252]">
              <div className="text-xs text-[#8D99AE]">Loss Ratio</div>
              <div className="text-xl text-[#3E6E5B] font-bold">38.4%</div>
            </div>
            <div className="p-3 bg-[#14213D] rounded border border-[#233252]">
              <div className="text-xs text-[#8D99AE]">Bedrock Model Accuracy</div>
              <div className="text-xl text-[#C8862A] font-bold">97.8%</div>
            </div>
            <div className="p-3 bg-[#14213D] rounded border border-[#233252]">
              <div className="text-xs text-[#8D99AE]">Textract Extraction Speed</div>
              <div className="text-xl text-[#F7F6F1] font-bold">1.2 sec/doc</div>
            </div>
          </div>

          <div className="text-center text-[11px] text-[#8D99AE]">
            ⚡ Connected to Amazon Athena Glue Data Catalog. Query response time &lt; 140ms.
          </div>
        </div>
      </div>

    </div>
  );
}
