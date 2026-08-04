import React from 'react';

const STATUS_MAP = {
  submitted:    { cls: 'stamp-submitted',  label: 'SUBMITTED' },
  review:       { cls: 'stamp-review',     label: 'UNDER REVIEW' },
  under_review: { cls: 'stamp-review',     label: 'UNDER REVIEW' },
  'under review':{ cls: 'stamp-review',    label: 'UNDER REVIEW' },
  approved:     { cls: 'stamp-approved',   label: 'APPROVED' },
  rejected:     { cls: 'stamp-rejected',   label: 'REJECTED' },
  escalated:    { cls: 'stamp-escalated',  label: 'ESCALATED' },
};

export function StampBadge({ status }) {
  const key = (status || 'submitted').toLowerCase();
  const { cls, label } = STATUS_MAP[key] || { cls: 'stamp-submitted', label: (status || '').toUpperCase() };
  return <span className={`stamp ${cls}`}>{label}</span>;
}
