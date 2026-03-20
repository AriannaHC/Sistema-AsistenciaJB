// ============================================================
// src/services/api.ts
// ============================================================

import { Schedule, Notification } from "../types";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost/backend-jb";

let _token: string | null = sessionStorage.getItem("jb_token");

function saveToken(token: string): void {
  _token = token;
  sessionStorage.setItem("jb_token", token);
  localStorage.removeItem("jb_token");
}
function getToken(): string | null {
  return _token ?? sessionStorage.getItem("jb_token");
}
function clearToken(): void {
  _token = null;
  sessionStorage.removeItem("jb_token");
  localStorage.removeItem("jb_token");
}

async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.message || "Error del servidor.");
  return json.data as T;
}

// ─── AUTH ─────────────────────────────────────────────────────
export const authApi = {
  login: async (email: string, password: string) => {
    const data = await apiFetch<{ user: any; token: string }>(
      "/api/auth/?action=login",
      { method: "POST", body: JSON.stringify({ email, password }) },
    );
    saveToken(data.token);
    return data.user;
  },
  register: async (
    name: string,
    email: string,
    password: string,
    area: string,
  ) => {
    const data = await apiFetch<{ user: any; token: string }>(
      "/api/auth/?action=register",
      { method: "POST", body: JSON.stringify({ name, email, password, area }) },
    );
    return data.user;
  },
  me: async () => apiFetch<any>("/api/auth/?action=me"),
  logout: () => clearToken(),
  isLoggedIn: () => !!getToken(),
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
    const query = params
      ? "?" + new URLSearchParams(params as any).toString()
      : "";
    return apiFetch<{
      records: any[];
      total: number;
      page: number;
      limit: number;
    }>(`/api/attendance/${query}`);
  },
  getToday: async () => apiFetch<any[]>("/api/attendance/?action=today"),
  checkIn: async () =>
    apiFetch<any>("/api/attendance/?action=checkin", { method: "POST" }),
  checkOut: async (recordId: string) =>
    apiFetch<any>("/api/attendance/?action=checkout", {
      method: "PUT",
      body: JSON.stringify({ id: recordId }),
    }),
  lunchStart: async () =>
    apiFetch<any>("/api/attendance/?action=lunch_start", { method: "POST" }),
  lunchEnd: async () =>
    apiFetch<any>("/api/attendance/?action=lunch_end", { method: "POST" }),
};

// ─── USERS ────────────────────────────────────────────────────
export const usersApi = {
  getAll: async (params?: { status?: string; search?: string }) => {
    const query = params
      ? "?" + new URLSearchParams(params as any).toString()
      : "";
    return apiFetch<any[]>(`/api/users/${query}`);
  },
  create: async (userData: {
    name: string;
    email: string;
    password: string;
    role: string;
    area: string;
    schedule_id?: string;
    lunchLimit?: string;
  }) =>
    apiFetch<any>("/api/users/", {
      method: "POST",
      body: JSON.stringify(userData),
    }),

  update: async (
    id: string,
    userData: Partial<{
      name: string;
      email: string;
      password: string;
      role: string;
      area: string;
      status: string;
      schedule_id: string;
      lunchLimit: string;
    }>,
  ) =>
    apiFetch<any>(`/api/users/?id=${id}`, {
      method: "PUT",
      body: JSON.stringify(userData),
    }),

  deactivate: async (id: string) =>
    apiFetch<any>(`/api/users/?id=${id}`, { method: "DELETE" }),
};

// ─── SCHEDULES ────────────────────────────────────────────────
export const schedulesApi = {
  getAll: async () => apiFetch<Schedule[]>("/api/schedules/"),
  getById: async (id: string) => apiFetch<Schedule>(`/api/schedules/?id=${id}`),
  create: async (scheduleData: {
    name: string;
    type: "simple" | "bloques";
    time_in?: string;
    time_out?: string;
    tolerance_minutes: number;
    blocks?: any[];
  }) =>
    apiFetch<Schedule>("/api/schedules/", {
      method: "POST",
      body: JSON.stringify(scheduleData),
    }),
  update: async (
    id: string,
    scheduleData: Partial<{
      name: string;
      type: "simple" | "bloques";
      time_in: string;
      time_out: string;
      tolerance_minutes: number;
      blocks: any[];
    }>,
  ) =>
    apiFetch<Schedule>(`/api/schedules/?id=${id}`, {
      method: "PUT",
      body: JSON.stringify(scheduleData),
    }),
  delete: async (id: string) =>
    apiFetch<any>(`/api/schedules/?id=${id}`, { method: "DELETE" }),
};

// ─── REPORTS ──────────────────────────────────────────────────
export const reportsApi = {
  getDashboard: async () =>
    apiFetch<{
      activeNow: number;
      todayCount: number;
      totalRecords: number;
      totalUsers: number;
      recentRecords: any[];
      byArea: any[];
      attendanceRate: number;
    }>("/api/reports/?action=dashboard"),

  exportCSV: async (dateFrom?: string, dateTo?: string) => {
    const token = getToken();
    const params = new URLSearchParams({
      action: "export",
      ...(dateFrom ? { dateFrom } : {}),
      ...(dateTo ? { dateTo } : {}),
    });
    const res = await fetch(`${API_BASE}/api/reports/?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Error al exportar el reporte.");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `asistencia_jb_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
};

// ─── CONVENIOS ────────────────────────────────────────────────
export const conveniosApi = {
  getAll: async (params?: { categoria?: string; search?: string }) => {
    const query = params
      ? "?" + new URLSearchParams(params as any).toString()
      : "";
    return apiFetch<any[]>(`/api/convenios/${query}`);
  },
  getById: async (id: string) => apiFetch<any>(`/api/convenios/?id=${id}`),
  create: async (data: any) =>
    apiFetch<any>("/api/convenios/", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: async (id: string, data: any) =>
    apiFetch<any>(`/api/convenios/?id=${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: async (id: string) =>
    apiFetch<any>(`/api/convenios/?id=${id}`, { method: "DELETE" }),
  uploadImage: async (file: File): Promise<string> => {
    const token = getToken();
    const formData = new FormData();
    formData.append("imagen", file);
    const res = await fetch(`${API_BASE}/api/convenios/?action=upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    const json = await res.json();
    if (!json.success)
      throw new Error(json.message || "Error al subir imagen.");
    return json.data.url;
  },
};

// ─── NOTIFICATIONS ────────────────────────────────────────────
export const notificationsApi = {
  // GET — lista notificaciones del usuario con paginación
  getAll: async (page = 1, limit = 20) => {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });
    return apiFetch<{
      notifications: Notification[];
      total: number;
      page: number;
      limit: number;
      unread_count: number;
    }>(`/api/notifications/?${params.toString()}`);
  },

  // GET — solo el contador de no leídas
  getUnreadCount: async (): Promise<number> => {
    const data = await apiFetch<{ unread_count: number }>(
      "/api/notifications/?action=unread_count",
    );
    return data.unread_count;
  },

  // PUT — marcar una notificación como leída
  markAsRead: async (notificationId: string) =>
    apiFetch<{ unread_count: number }>("/api/notifications/?action=mark_read", {
      method: "PUT",
      body: JSON.stringify({ notification_id: notificationId }),
    }),

  // POST — crear notificación con multipart/form-data
  // ⚠️ NO se envía Content-Type manualmente — el navegador lo pone solo con el boundary
  create: async (formData: FormData) => {
    const token = getToken();
    const res = await fetch(`${API_BASE}/api/notifications/`, {
      method: "POST",
      headers: {
        // Solo Authorization — sin Content-Type para que el browser maneje el boundary
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });
    const json = await res.json();
    if (!json.success)
      throw new Error(json.message || "Error al crear notificación.");
    return json.data;
  },
};
