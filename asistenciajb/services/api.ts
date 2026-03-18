// ============================================================
// src/services/api.ts
// Servicio central
// ⚠️  Edita VITE_API_URL en tu .env.local
// ============================================================

// ✅ IMPORTAMOS EL TIPO SCHEDULE DESDE TYPES.TS
import { Schedule } from "../types";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost/backend-jb";

// ─── TOKEN en memoria — más seguro que localStorage ───────────
// Se pierde al recargar — App debe llamar authApi.me() al montar
// ─────────────────────────────────────────────────────────────
let _token: string | null = sessionStorage.getItem("jb_token");

function saveToken(token: string): void {
  _token = token;
  sessionStorage.setItem("jb_token", token);
  localStorage.removeItem("jb_token"); // limpiar rastro anterior
}

function getToken(): string | null {
  return _token ?? sessionStorage.getItem("jb_token");
}

function clearToken(): void {
  _token = null;
  sessionStorage.removeItem("jb_token");
  localStorage.removeItem("jb_token");
}

// ─── Fetch base ───────────────────────────────────────────────
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken(); // ✅ usa getToken() en lugar de localStorage directo

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const json = await res.json();

  if (!json.success) {
    throw new Error(json.message || "Error del servidor.");
  }

  return json.data as T;
}

// ─── AUTH ─────────────────────────────────────────────────────
export const authApi = {
  login: async (email: string, password: string) => {
    const data = await apiFetch<{ user: any; token: string }>(
      "/api/auth/?action=login",
      { method: "POST", body: JSON.stringify({ email, password }) },
    );
    saveToken(data.token); // ✅ usa saveToken()
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
    // NO guardamos token — redirigimos al login
    return data.user;
  },

  me: async () => {
    return apiFetch<any>("/api/auth/?action=me");
  },

  logout: () => {
    clearToken(); // ✅ usa clearToken()
  },

  isLoggedIn: () => !!getToken(), // ✅ usa getToken()
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

  getToday: async () => {
    return apiFetch<any[]>("/api/attendance/?action=today");
  },

  checkIn: async () => {
    return apiFetch<any>("/api/attendance/?action=checkin", { method: "POST" });
  },

  checkOut: async (recordId: string) => {
    return apiFetch<any>("/api/attendance/?action=checkout", {
      method: "PUT",
      body: JSON.stringify({ id: recordId }),
    });
  },
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
    schedule_id?: string; // 🚀 Agregado para soportar creación con horario
  }) => {
    return apiFetch<any>("/api/users/", {
      method: "POST",
      body: JSON.stringify(userData),
    });
  },

  update: async (
    id: string,
    userData: Partial<{
      name: string;
      email: string;
      password: string;
      role: string;
      area: string;
      status: string;
      schedule_id: string; // 🚀 Agregado para permitir cambio de horario
    }>,
  ) => {
    return apiFetch<any>(`/api/users/?id=${id}`, {
      method: "PUT",
      body: JSON.stringify(userData),
    });
  },

  deactivate: async (id: string) => {
    return apiFetch<any>(`/api/users/?id=${id}`, { method: "DELETE" });
  },
};

// ─── SCHEDULES (NUEVO) ────────────────────────────────────────
export const schedulesApi = {
  getAll: async () => {
    return apiFetch<Schedule[]>("/api/schedules/");
  },

  getById: async (id: string) => {
    return apiFetch<Schedule>(`/api/schedules/?id=${id}`);
  },

  create: async (scheduleData: {
    name: string;
    type: "simple" | "bloques";
    time_in?: string;
    time_out?: string;
    tolerance_minutes: number;
    blocks?: any[];
  }) => {
    return apiFetch<Schedule>("/api/schedules/", {
      method: "POST",
      body: JSON.stringify(scheduleData),
    });
  },

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
  ) => {
    return apiFetch<Schedule>(`/api/schedules/?id=${id}`, {
      method: "PUT",
      body: JSON.stringify(scheduleData),
    });
  },

  delete: async (id: string) => {
    return apiFetch<any>(`/api/schedules/?id=${id}`, { method: "DELETE" });
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
    }>("/api/reports/?action=dashboard");
  },

  // ✅ fetch con Authorization header — token nunca viaja en URL
  exportCSV: async (dateFrom?: string, dateTo?: string) => {
    const token = getToken(); // ✅ usa getToken()
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
