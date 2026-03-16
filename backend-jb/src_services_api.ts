// ============================================================
// src/services/api.ts
// Servicio central para comunicación con el backend PHP
// ============================================================

const API_BASE = import.meta.env.VITE_API_URL || 'https://tudominio.com/backend';

// ─── Utilidad base de fetch ───────────────────────────────────
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data: T; message: string }> {
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
    throw new Error(json.message || 'Error desconocido del servidor.');
  }

  return json;
}

// ─── AUTH ─────────────────────────────────────────────────────
export const authApi = {
  login: async (email: string, password: string) => {
    const res = await apiFetch<{ user: any; token: string }>(
      '/api/auth/?action=login',
      { method: 'POST', body: JSON.stringify({ email, password }) }
    );
    localStorage.setItem('jb_token', res.data.token);
    return res.data.user;
  },

  register: async (name: string, email: string, password: string, area: string) => {
    const res = await apiFetch<{ user: any; token: string }>(
      '/api/auth/?action=register',
      { method: 'POST', body: JSON.stringify({ name, email, password, area }) }
    );
    localStorage.setItem('jb_token', res.data.token);
    return res.data.user;
  },

  me: async () => {
    const res = await apiFetch<any>('/api/auth/?action=me');
    return res.data;
  },

  logout: () => {
    localStorage.removeItem('jb_token');
  },
};

// ─── ATTENDANCE ───────────────────────────────────────────────
export const attendanceApi = {
  getAll: async (params?: {
    userId?: string;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
    page?: number;
  }) => {
    const query = new URLSearchParams(params as any).toString();
    const res = await apiFetch<any>(`/api/attendance/${query ? '?' + query : ''}`);
    return res.data;
  },

  getToday: async () => {
    const res = await apiFetch<any[]>('/api/attendance/?action=today');
    return res.data;
  },

  checkIn: async () => {
    const res = await apiFetch<any>('/api/attendance/?action=checkin', {
      method: 'POST',
    });
    return res.data;
  },

  checkOut: async (recordId: string) => {
    const res = await apiFetch<any>('/api/attendance/?action=checkout', {
      method: 'PUT',
      body: JSON.stringify({ id: recordId }),
    });
    return res.data;
  },
};

// ─── USERS ────────────────────────────────────────────────────
export const usersApi = {
  getAll: async (params?: { status?: string; search?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    const res = await apiFetch<any[]>(`/api/users/${query ? '?' + query : ''}`);
    return res.data;
  },

  create: async (userData: {
    name: string;
    email: string;
    password: string;
    role: string;
    area: string;
  }) => {
    const res = await apiFetch<any>('/api/users/', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    return res.data;
  },

  update: async (id: string, userData: Partial<{
    name: string;
    email: string;
    password: string;
    role: string;
    area: string;
    status: string;
  }>) => {
    const res = await apiFetch<any>(`/api/users/?id=${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
    return res.data;
  },

  deactivate: async (id: string) => {
    await apiFetch(`/api/users/?id=${id}`, { method: 'DELETE' });
  },
};

// ─── REPORTS ──────────────────────────────────────────────────
export const reportsApi = {
  getDashboard: async () => {
    const res = await apiFetch<any>('/api/reports/?action=dashboard');
    return res.data;
  },

  getByArea: async (month?: string) => {
    const query = month ? `?action=areas&month=${month}` : '?action=areas';
    const res = await apiFetch<any[]>(`/api/reports/${query}`);
    return res.data;
  },

  exportCSV: (dateFrom?: string, dateTo?: string) => {
    const token = localStorage.getItem('jb_token');
    const params = new URLSearchParams({
      action: 'export',
      ...(dateFrom ? { dateFrom } : {}),
      ...(dateTo ? { dateTo } : {}),
    });
    // Abrir en nueva pestaña para descargar
    window.open(
      `${API_BASE}/api/reports/?${params}&token=${token}`,
      '_blank'
    );
  },
};
