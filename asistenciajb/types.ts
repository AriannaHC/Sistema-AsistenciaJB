
export enum AttendanceStatus {
  PRESENT = 'Presente',
  LATE = 'Tardanza',
  ABSENT = 'Falta'
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
  role: 'admin' | 'employee';
  avatar: string;
  area: string;
  status: 'active' | 'inactive';
}

export type View = 'dashboard' | 'attendance' | 'history' | 'users' | 'settings';
