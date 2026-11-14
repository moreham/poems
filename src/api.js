export async function api(path, options = {}) {
  const response = await fetch(`/api${path}`, {
    credentials: 'same-origin', cache: 'no-store', ...options,
    headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data.error || '请求失败，请稍后重试');
    error.status = response.status;
    error.retryAfter = Number(response.headers.get('Retry-After')) || 0;
    throw error;
  }
  return data;
}
export const statusLabels = { pending: '待审核', approved: '通过', rejected: '驳回' };
export const statusTypes = { pending: 'warning', approved: 'success', rejected: 'danger' };
export function displayDate(value) {
  if (!value) return '—';
  return new Date(value.replace(' ', 'T') + 'Z').toLocaleString('zh-CN', { hour12: false });
}
export function requestId() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, value => value.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
