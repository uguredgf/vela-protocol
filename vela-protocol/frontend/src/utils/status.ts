const STATUS_LABELS: Record<string, string> = {
  pending_user_transfer_start: 'Waiting for your transfer',
  pending_user_transfer_complete: 'Transfer received',
  pending_anchor: 'Processing with the Anchor',
  pending_stellar: 'Settling on Stellar',
  pending_external: 'Waiting for bank confirmation',
  pending_trust: 'Trustline required',
  completed: 'Completed',
  error: 'Needs attention',
  incomplete: 'More information required',
  expired: 'Request expired',
  timeout: 'Still processing — check again shortly',
};

export function formatAnchorStatus(status?: string | null): string {
  if (!status) return 'Checking status…';
  if (status.startsWith('timeout')) return STATUS_LABELS.timeout;
  return STATUS_LABELS[status.toLowerCase()] || 'Processing securely';
}
