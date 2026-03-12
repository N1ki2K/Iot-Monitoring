interface DashboardStatusBarProps {
  lastUpdate: Date | null;
  locale: string;
  liveLabel: string;
  lastUpdatedLabel: (time: string) => string;
  autoRefreshLabel: string;
}

export function DashboardStatusBar({
  lastUpdate,
  locale,
  liveLabel,
  lastUpdatedLabel,
  autoRefreshLabel,
}: DashboardStatusBarProps) {
  if (!lastUpdate) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        <span className="text-green-400">{liveLabel}</span>
      </span>
      <span className="text-gray-600">•</span>
      <span className="text-gray-500">{lastUpdatedLabel(lastUpdate.toLocaleTimeString(locale))}</span>
      <span className="text-gray-600">•</span>
      <span className="text-gray-500">{autoRefreshLabel}</span>
    </div>
  );
}
