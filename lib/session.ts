const SESSION_KEY = 'abh_session_id';

export function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = `s_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    localStorage.setItem(SESSION_KEY, id);
    document.cookie = `abh_sid=${id}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
  }
  return id;
}
