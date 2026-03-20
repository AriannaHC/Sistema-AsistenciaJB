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

export type View =
  | "dashboard"
  | "attendance"
  | "history"
  | "users"
  | "settings"
  | "schedules"
  | "notifications"
  | "my-schedule"
  | "convenios"
  | "convenios-admin";