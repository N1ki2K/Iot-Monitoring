interface HealthStatCardProps {
  label: string;
  value: string | number;
  subLabel?: string;
  tone?: 'default' | 'success' | 'warning' | 'danger';
}

const toneStyles: Record<NonNullable<HealthStatCardProps['tone']>, string> = {
  default: 'border-slate-700/40 bg-slate-800/40',
  success: 'border-emerald-500/30 bg-emerald-500/10',
  warning: 'border-amber-500/30 bg-amber-500/10',
  danger: 'border-red-500/30 bg-red-500/10',
};

export function HealthStatCard({ label, value, subLabel, tone = 'default' }: HealthStatCardProps) {
  return (
    <div className={`rounded-xl border ${toneStyles[tone]} p-4`}> 
      <p className="text-xs uppercase tracking-wide text-gray-400">{label}</p>
      <p className="text-2xl font-semibold text-white mt-2">{value}</p>
      {subLabel && <p className="text-xs text-gray-400 mt-2">{subLabel}</p>}
    </div>
  );
}

export default HealthStatCard;
