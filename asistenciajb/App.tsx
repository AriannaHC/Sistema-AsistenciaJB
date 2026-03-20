import React, { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Clock,
  History,
  LogOut,
  Menu,
  X,
  Bell,
  User as UserIcon,
  ChevronRight,
  Users as UsersIcon,
  Calendar,
  CalendarDays,
  Gift,
} from "lucide-react";
import { AttendanceRecord, User, View, Schedule } from "./types";
import Dashboard from "./views/Dashboard";
import AttendanceControl from "./views/AttendanceControl";
import AttendanceHistory from "./views/History";
import UsersManagement from "./views/UsersManagement";
import Auth from "./views/Auth";
import SchedulesManagement from "./views/SchedulesManagement";
import NotificationsView from "./views/NotificationsView";
import MySchedule from "./views/MySchedule";
import Convenios from "./views/Convenios";
import ConveniosAdmin from "./views/ConveniosAdmin";
import { authApi, attendanceApi, usersApi, schedulesApi } from "./services/api";

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<View>("attendance");
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [allSchedules, setAllSchedules] = useState<Schedule[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState(3);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) setSidebarOpen(true);
      else setSidebarOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const init = async () => {
      if (!authApi.isLoggedIn()) { setLoading(false); return; }
      try {
        const user = await authApi.me();
        setCurrentUser(user);
        setCurrentView(user.role === "admin" ? "dashboard" : "attendance");
        await loadData(user);
      } catch {
        authApi.logout();
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const loadData = async (user: User) => {
    try {
      const [attendanceData, usersData, schedulesResponse] = await Promise.all([
        attendanceApi.getAll({ limit: 100 }),
        user.role === "admin" ? usersApi.getAll() : Promise.resolve([]),
        schedulesApi.getAll(),
      ]);

      let schedulesArray: Schedule[] = [];
      if (Array.isArray(schedulesResponse)) {
        schedulesArray = schedulesResponse;
      } else if (schedulesResponse && typeof schedulesResponse === "object") {
        schedulesArray = [schedulesResponse as Schedule];
      }
      setAllSchedules(schedulesArray);

      setRecords(
        attendanceData?.records ? attendanceData.records.map(normalizeRecord) : []
      );

      if (user.role === "admin") {
        const usersArray = Array.isArray(usersData) ? usersData : (usersData as any)?.data || [];
        setUsers(usersArray);
      }
    } catch (e) {
      console.error("Error cargando datos:", e);
    }
  };

  const normalizeRecord = (r: any): AttendanceRecord => ({
    id: r.id,
    userId: r.userId || r.user_id,
    userName: r.userName || r.user_name,
    date: r.date,
    checkIn: r.checkIn || r.check_in,
    checkOut: r.checkOut || r.check_out || undefined,
    status: r.status,
    location: r.location,
    lunchStart: r.lunchStart || r.lunch_start || undefined,
    lunchEnd: r.lunchEnd || r.lunch_end || undefined,
    lunchLimit: r.lunchLimit || r.lunch_limit || undefined,
  });

  const handleLogin = async (user: User) => {
    setCurrentUser(user);
    setCurrentView(user.role === "admin" ? "dashboard" : "attendance");
    await loadData(user);
  };

  const handleLogout = () => {
    authApi.logout();
    setCurrentUser(null);
    setRecords([]);
    setUsers([]);
    setAllSchedules([]);
  };

  const addRecord = async (_record: AttendanceRecord) => {
    try {
      const newRecord = await attendanceApi.checkIn();
      setRecords((prev) => [normalizeRecord(newRecord), ...prev]);
    } catch (e: any) { alert(e.message); }
  };

  const updateRecord = async (updatedRecord: AttendanceRecord) => {
    try {
      const updated = await attendanceApi.checkOut(updatedRecord.id);
      setRecords((prev) =>
        prev.map((r) => r.id === updatedRecord.id ? normalizeRecord(updated) : r)
      );
    } catch (e: any) { alert(e.message); }
  };

  const handleUpdateUsers = async (newUsers: User[]) => {
    setUsers(newUsers);
    try {
      const fresh = await usersApi.getAll();
      setUsers(Array.isArray(fresh) ? fresh : (fresh as any)?.data || []);
    } catch {}
  };

  const handleNavigation = (view: View) => {
    setCurrentView(view);
    if (window.innerWidth < 1024) setSidebarOpen(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-jbBlue border-t-jbOrange rounded-full animate-spin mx-auto mb-4" />
          <p className="text-jbGray font-bold text-sm uppercase tracking-widest">Cargando sistema JB...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) return <Auth onLogin={handleLogin} />;

  const NavItem: React.FC<{ view: View; icon: React.ReactNode; label: string }> = ({ view, icon, label }) => (
    <button
      onClick={() => handleNavigation(view)}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 font-heading ${
        currentView === view
          ? "bg-jbBlue text-white shadow-lg shadow-jbBlue/20"
          : "text-jbGray hover:bg-slate-100 hover:text-jbBlue"
      }`}
    >
      {icon}
      <span className="font-semibold text-sm truncate">{label}</span>
      {currentView === view && <ChevronRight className="ml-auto w-4 h-4" />}
    </button>
  );

  const viewTitles: Partial<Record<View, string>> = {
    dashboard: "PANEL DE CONTROL",
    attendance: "CONTROL DE ASISTENCIA",
    history: "HISTORIAL",
    users: "GESTIÓN DE COLABORADORES",
    schedules: "GESTIÓN DE HORARIOS",
    notifications: "NOTIFICACIONES",
    "my-schedule": "MI HORARIO",
    convenios: "CONVENIOS Y BENEFICIOS",
    "convenios-admin": "GESTIONAR CONVENIOS",
  };

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans relative">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 shadow-sm transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex flex-col h-full">
          <div className="p-6 text-center border-b border-slate-50 mb-4 relative">
            <h1 className="text-xl font-extrabold text-jbBlue font-heading">
              ASISTENCIA <span className="text-jbOrange">JB</span>
            </h1>
            <p className="text-[9px] font-black text-jbGray tracking-[0.2em] mt-1">SISTEMA CORPORATIVO</p>
            <button onClick={() => setSidebarOpen(false)}
              className="lg:hidden absolute right-4 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-slate-100 text-jbGray transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
            {/* Solo admin */}
            {currentUser.role === "admin" && (
              <>
                <NavItem view="dashboard" icon={<LayoutDashboard className="w-5 h-5" />} label="Dashboard" />
                <NavItem view="users" icon={<UsersIcon className="w-5 h-5" />} label="Gestión Usuarios" />
                <NavItem view="schedules" icon={<Calendar className="w-5 h-5" />} label="Gestión Horarios" />
                <NavItem view="convenios-admin" icon={<Gift className="w-5 h-5" />} label="Gestionar Convenios" />
              </>
            )}

            {/* Todos los usuarios */}
            <NavItem view="attendance" icon={<Clock className="w-5 h-5" />} label="Marcar Asistencia" />
            <NavItem view="history" icon={<History className="w-5 h-5" />} label="Historial" />
            <NavItem view="my-schedule" icon={<CalendarDays className="w-5 h-5" />} label="Mi Horario" />
           <NavItem view="convenios" icon={<Gift className="w-5 h-5" />} label="Convenios" />
          </nav>

          <div className="p-4 border-t border-slate-100 bg-slate-50/50">
            <button onClick={handleLogout}
              className="w-full mb-4 flex items-center justify-center gap-2 px-3 py-3 bg-jbRed/10 text-jbRed rounded-xl text-xs font-black hover:bg-jbRed hover:text-white transition-all font-heading">
              <LogOut className="w-4 h-4" /> CERRAR SESIÓN
            </button>
            <div className="bg-white p-3 rounded-2xl flex items-center gap-3 border border-slate-100 shadow-sm">
              <img src={currentUser.avatar} className="w-10 h-10 rounded-full border-2 border-jbBlue/10 p-0.5 bg-slate-50 flex-shrink-0" alt="avatar" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate font-heading">{currentUser.name}</p>
                <p className="text-[10px] text-jbGray font-bold uppercase tracking-tight truncate">{currentUser.area}</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Contenido principal */}
      <main className={`flex-1 min-w-0 transition-all duration-300 ${sidebarOpen ? "lg:ml-64" : "ml-0"}`}>
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-xl border-b border-slate-200 px-4 md:px-8 h-16 md:h-20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 md:gap-6 min-w-0">
            <button onClick={() => setSidebarOpen(!sidebarOpen)}
              className="flex-shrink-0 p-2.5 rounded-xl hover:bg-slate-100 text-jbBlue transition-colors">
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <h2 className="text-sm md:text-lg font-bold text-jbBlue font-heading uppercase tracking-wide truncate">
              {viewTitles[currentView] || ""}
            </h2>
          </div>

          <div className="flex items-center gap-2 md:gap-6 flex-shrink-0">
            <div className={`hidden sm:block px-3 md:px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest font-heading shadow-sm ${
              currentUser.role === "admin"
                ? "bg-jbBlue/10 text-jbBlue border border-jbBlue/20"
                : "bg-jbOrange/10 text-jbOrange border border-jbOrange/20"
            }`}>
              {currentUser.role}
            </div>
            <div className="hidden md:block h-8 w-px bg-slate-200" />
            <button onClick={() => handleNavigation("notifications" as View)}
              className={`relative p-2 rounded-full transition-colors ${currentView === "notifications" ? "bg-jbBlue/10 text-jbBlue" : "hover:bg-slate-100 text-jbGray hover:text-jbBlue"}`}>
              <Bell className="w-5 h-5" />
              {unreadNotifications > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-jbRed text-[9px] font-black text-white border-2 border-white">
                  {unreadNotifications > 9 ? "9+" : unreadNotifications}
                </span>
              )}
            </button>
            <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-slate-100 flex items-center justify-center text-jbBlue border border-slate-200">
              <UserIcon className="w-4 h-4 md:w-5 md:h-5" />
            </div>
          </div>
        </header>

        {/* Vistas */}
        <div className="p-4 md:p-6 lg:p-10 max-w-7xl mx-auto">
          {currentView === "dashboard" && currentUser.role === "admin" && (
            <Dashboard records={records} user={currentUser} />
          )}
          {currentView === "users" && currentUser.role === "admin" && (
            <UsersManagement users={users} onUpdateUsers={handleUpdateUsers} currentUser={currentUser} />
          )}
          {currentView === "attendance" && (
            <AttendanceControl
              records={records}
              user={currentUser}
              schedule={
                (Array.isArray(allSchedules) ? allSchedules : []).find(
                  (s) => s.id === currentUser.schedule_id
                ) || null
              }
              onAdd={addRecord}
              onUpdate={updateRecord}
            />
          )}
          {currentView === "history" && (
            <AttendanceHistory records={records} user={currentUser} />
          )}
          {currentView === "schedules" && currentUser.role === "admin" && (
            <SchedulesManagement />
          )}
          {currentView === "notifications" && <NotificationsView />}
          {currentView === "my-schedule" && <MySchedule />}
          {currentView === "convenios" && <Convenios />}
          {currentView === "convenios-admin" && currentUser.role === "admin" && <ConveniosAdmin />}
        </div>
      </main>
    </div>
  );
};

export default App;