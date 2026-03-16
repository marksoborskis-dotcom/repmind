export const generateId = (): string =>
  `session_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

export const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });

export const todayISO = (): string =>
  new Date().toISOString().split('T')[0];
