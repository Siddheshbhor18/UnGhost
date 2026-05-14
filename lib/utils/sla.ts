export function slaCountdown(deadlineISO: string, now = new Date()): {
  expired: boolean;
  hours: number;
  minutes: number;
  pulse: boolean;
  label: string;
} {
  const diffMs = new Date(deadlineISO).getTime() - now.getTime();
  const expired = diffMs <= 0;
  const absMs = Math.abs(diffMs);
  const hours = Math.floor(absMs / 3600_000);
  const minutes = Math.floor((absMs % 3600_000) / 60_000);
  const pulse = !expired && diffMs < 4 * 3600_000; // <4h
  const label = expired
    ? `BREACHED · ${hours}h${minutes.toString().padStart(2, "0")}m ago`
    : `${hours.toString().padStart(2, "0")}h : ${minutes.toString().padStart(2, "0")}m`;
  return { expired, hours, minutes, pulse, label };
}
