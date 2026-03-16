// ============================================================
// src/services/api.ts
// Servicio central — reemplaza todo el localStorage
// ⚠️  Edita VITE_API_URL en tu .env.local
// ============================================================

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost/backend-jb';

// ─── Fetch base ───────────────────────────────────────────────
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('jb_token');

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const json = await res.json();

  if (!json.success) {
    throw new Error(json.message || 'Error del servidor.');
  }

  return json.data as T;
}

// ─── AUTH ─────────────────────────────────────────────────────
export const authApi = {
  login: async (email: string, password: string) => {
    const data = await apiFetch<{ user: any; token: string }>(
      '/api/auth/?action=login',
      { method: 'POST', body: JSON.stringify({ email, password }) }
    );
    localStorage.setItem('jb_token', data.token);
    return data.user;
  },

  register: async (name: string, email: string, password: string, area: string) => {
    const data = await apiFetch<{ user: any; token: string }>(
      '/api/auth/?action=register',
      { method: 'POST', body: JSON.stringify({ name, email, password, area }) }
    );
    // NO guardamos token — redirigimos al login
    return data.user;
  },

  me: async () => {
    return apiFetch<any>('/api/auth/?action=me');
  },

  logout: () => {
    localStorage.removeItem('jb_token');
  },

  isLoggedIn: () => !!localStorage.getItem('jb_token'),
};

// ─── ATTENDANCE ───────────────────────────────────────────────
export const attendanceApi = {
  getAll: async (params?: {
    userId?: string;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) => {
    const query = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return apiFetch<{ records: any[]; total: number; page: number; limit: number }>(
      `/api/attendance/${query}`
    );
  },

  getToday: async () => {
    return apiFetch<any[]>('/api/attendance/?action=today');
  },

  checkIn: async () => {
    return apiFetch<any>('/api/attendance/?action=checkin', { method: 'POST' });
  },

  checkOut: async (recordId: string) => {
    return apiFetch<any>('/api/attendance/?action=checkout', {
      method: 'PUT',
      body: JSON.stringify({ id: recordId }),
    });
  },
};

// ─── USERS ────────────────────────────────────────────────────
export const usersApi = {
  getAll: async (params?: { status?: string; search?: string }) => {
    const query = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return apiFetch<any[]>(`/api/users/${query}`);
  },

  create: async (userData: {
    name: string; email: string; password: string;
    role: string; area: string;
  }) => {
    return apiFetch<any>('/api/users/', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  update: async (id: string, userData: Partial<{
    name: string; email: string; password: string;
    role: string; area: string; status: string;
  }>) => {
    return apiFetch<any>(`/api/users/?id=${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  },

  deactivate: async (id: string) => {
    return apiFetch<any>(`/api/users/?id=${id}`, { method: 'DELETE' });
  },
};

// ─── REPORTS ──────────────────────────────────────────────────
export const reportsApi = {
  getDashboard: async () => {
    return apiFetch<{
      activeNow: number;
      todayCount: number;
      totalRecords: number;
      totalUsers: number;
      recentRecords: any[];
      byArea: any[];
      attendanceRate: number;
    }>('/api/reports/?action=dashboard');
  },

exportCSV: (dateFrom?: string, dateTo?: string) => {
    const token = localStorage.getItem('jb_token');
    const params = new URLSearchParams({
      action: 'export',
      ...(dateFrom ? { dateFrom } : {}),
      ...(dateTo ? { dateTo } : {}),
      ...(token ? { token } : {}),
    });
    window.open(`${API_BASE}/api/reports/?${params.toString()}`, '_blank');
  },
};
