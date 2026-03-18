export enum AttendanceStatus {
  PRESENT = "Presente",
  LATE = "Tardanza",
  ABSENT = "Falta",
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  userName: string;
  date: string; // ISO Date (YYYY-MM-DD)
  checkIn: string; // ISO DateTime
  checkOut?: string; // ISO DateTime
  status: AttendanceStatus;
  location?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: "admin" | "employee";
  avatar: string;
  area: string;
  status: "active" | "inactive";
  schedule_id?: string;
  schedule_name?: string;
}

export type View =
  | "dashboard"
  | "attendance"
  | "history"
  | "users"
  | "settings"
  | "schedules"
  | "notifications"
  | "my-schedule";

// ─── SCHEDULES (HORARIOS) ────────────────────────────────────

export interface Turno {
  ingreso: string; // formato HH:mm
  salida: string; // formato HH:mm
}

export interface BloqueDia {
  day: string; // "Lunes", "Martes", etc.
  turnos: Turno[];
}

export interface Schedule {
  id: string;
  name: string;
  type: "simple" | "bloques";
  time_in?: string | null;
  time_out?: string | null;
  tolerance_minutes: number;
  blocks?: BloqueDia[] | null;
  created_at?: string;
  updated_at?: string;
}
