export enum AttendanceStatus {
  PRESENT = "Presente",
  LATE = "Tardanza",
  ABSENT = "Falta",
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  userName: string;
  date: string;
  checkIn: string;
  checkOut?: string;
  status: AttendanceStatus;
  location?: string;
  lunchStart?: string;
  lunchEnd?: string;
  lunchLimit?: string;
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
  lunch_limit?: string;
  lunchLimit?: string;
}

export interface Schedule {
  id: string;
  name: string;
  type: "simple" | "bloques";
  time_in?: string;
  time_out?: string;
  tolerance_minutes: number;
  blocks?: any;
}

// ✅ Nueva interfaz para Notificaciones
export interface Notification {
  id: string;
  title: string;
  body?: string;
  image_url?: string;
  pdf_url?: string;
  audience: "all" | "area" | "user";
  audience_value?: string;
  created_by: string;
  created_at: string;
  is_read: boolean;
}

export type View =
  | "dashboard"
  | "attendance"
  | "history"
  | "users"
  | "settings"
  | "schedules"
  | "notifications"
  | "crear-notificacion" // ✅ nueva vista
  | "my-schedule"
  | "convenios"
  | "convenios-admin";
