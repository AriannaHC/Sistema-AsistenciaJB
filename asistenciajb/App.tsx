import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, Clock, History, LogOut, Menu, X,
  Bell, User as UserIcon, ChevronRight, Users as UsersIcon
} from 'lucide-react';
import { AttendanceRecord, User, View } from './types';
import Dashboard from './views/Dashboard';
import AttendanceControl from './views/AttendanceControl';
import AttendanceHistory from './views/History';
import UsersManagement from './views/UsersManagement';
import Auth from './views/Auth';
import { authApi, attendanceApi, usersApi } from './services/api';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<View>('attendance');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Inicialización: verificar sesión activa ──────────────────
  useEffect(() => {
    const init = async () => {
      if (!authApi.isLoggedIn()) { setLoading(false); return; }
      try {
        const user = await authApi.me();
        setCurrentUser(user);
        setCurrentView(user.role === 'admin' ? 'dashboard' : 'attendance');
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
      const [attendanceData, usersData] = await Promise.all([
        attendanceApi.getAll({ limit: 100 }),
        user.role === 'admin' ? usersApi.getAll() : Promise.resolve([]),
      ]);
      setRecords(attendanceData.records.map(normalizeRecord));
      if (user.role === 'admin') setUsers(usersData);
    } catch (e) {
      console.error('Error cargando datos:', e);
    }
  };

  // Normalizar formato API → formato frontend
  const normalizeRecord = (r: any): AttendanceRecord => ({
    id: r.id,
    userId: r.userId || r.user_id,
    userName: r.userName || r.user_name,
    date: r.date,
    checkIn: r.checkIn || r.check_in,
    checkOut: r.checkOut || r.check_out || undefined,
    status: r.status,
    location: r.location,
  });

  const handleLogin = async (user: User) => {
    setCurrentUser(user);
    setCurrentView(user.role === 'admin' ? 'dashboard' : 'attendance');
    await loadData(user);
  };

  const handleLogout = () => {
    authApi.logout();
    setCurrentUser(null);
    setRecords([]);
    setUsers([]);
  };

  // ── Asistencia ───────────────────────────────────────────────
  const addRecord = async (_record: AttendanceRecord) => {
    try {
      const newRecord = await attendanceApi.checkIn();
      setRecords(prev => [normalizeRecord(newRecord), ...prev]);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const updateRecord = async (updatedRecord: AttendanceRecord) => {
    try {
      const updated = await attendanceApi.checkOut(updatedRecord.id);
      setRecords(prev => prev.map(r => r.id === updatedRecord.id ? normalizeRecord(updated) : r));
    } catch (e: any) {
      alert(e.message);
    }
  };

  // ── Usuarios ─────────────────────────────────────────────────
  const handleUpdateUsers = async (newUsers: User[]) => {
    setUsers(newUsers);
    // Re-cargar desde API para tener datos frescos
    try {
      const fresh = await usersApi.getAll();
      setUsers(fresh);
    } catch { }
  };

  // ── Loading ──────────────────────────────────────────────────
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

  if (!currentUser) {
    return <Auth onLogin={handleLogin} />;
  }

  const NavItem: React.FC<{ view: View; icon: React.ReactNode; label: string }> = ({ view, icon, label }) => (
    <button
      onClick={() => setCurrentView(view)}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 font-heading ${
        currentView === view
          ? 'bg-jbBlue text-white shadow-lg shadow-jbBlue/20'
          : 'text-jbGray hover:bg-slate-100 hover:text-jbBlue'
      }`}
    >
      {icon}
      <span className="font-semibold text-sm">{label}</span>
      {currentView === view && <ChevronRight className="ml-auto w-4 h-4" />}
    </button>
  );

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 transition-transform duration-300 shadow-sm ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          <div className="p-8 text-center border-b border-slate-50 mb-4">
            <h1 className="text-xl font-extrabold text-jbBlue font-heading">
              ASISTENCIA <span className="text-jbOrange">JB</span>
            </h1>
            <p className="text-[9px] font-black text-jbGray tracking-[0.2em] mt-1">SISTEMA CORPORATIVO</p>
          </div>

          <nav className="flex-1 px-4 space-y-2">
            {currentUser.role === 'admin' && (
              <>
                <NavItem view="dashboard" icon={<LayoutDashboard className="w-5 h-5" />} label="Dashboard" />
                <NavItem view="users" icon={<UsersIcon className="w-5 h-5" />} label="Gestión Usuarios" />
              </>
            )}
            <NavItem view="attendance" icon={<Clock className="w-5 h-5" />} label="Marcar Asistencia" />
            <NavItem view="history" icon={<History className="w-5 h-5" />} label="Historial" />
          </nav>

          <div className="p-4 border-t border-slate-100 bg-slate-50/50">
            <button
              onClick={handleLogout}
              className="w-full mb-6 flex items-center justify-center gap-2 px-3 py-3 bg-jbRed/10 text-jbRed rounded-xl text-xs font-black hover:bg-jbRed hover:text-white transition-all font-heading"
            >
              <LogOut className="w-4 h-4" />
              CERRAR SESIÓN
            </button>
            <div className="bg-white p-3 rounded-2xl flex items-center gap-3 border border-slate-100 shadow-sm">
              <img src={currentUser.avatar} className="w-10 h-10 rounded-full border-2 border-jbBlue/10 p-0.5 bg-slate-50" alt="avatar" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate font-heading">{currentUser.name}</p>
                <p className="text-[10px] text-jbGray font-bold uppercase tracking-tight">{currentUser.area}</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <main className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-0'}`}>
        <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-slate-200 px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2.5 rounded-xl hover:bg-slate-100 text-jbBlue transition-colors">
              {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
            <h2 className="text-lg font-bold text-jbBlue font-heading uppercase tracking-wide">
              {currentView === 'dashboard' && 'PANEL DE CONTROL'}
              {currentView === 'attendance' && 'CONTROL DE ASISTENCIA'}
              {currentView === 'history' && 'HISTORIAL DE REGISTROS'}
              {currentView === 'users' && 'GESTIÓN DE COLABORADORES'}
            </h2>
          </div>
          <div className="flex items-center gap-6">
            <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest font-heading shadow-sm ${currentUser.role === 'admin' ? 'bg-jbBlue/10 text-jbBlue border border-jbBlue/20' : 'bg-jbOrange/10 text-jbOrange border border-jbOrange/20'}`}>
              PERFIL: {currentUser.role}
            </div>
            <div className="h-10 w-px bg-slate-200" />
            <Bell className="w-5 h-5 text-jbGray cursor-pointer hover:text-jbBlue transition-colors" />
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-jbBlue border border-slate-200">
              <UserIcon className="w-5 h-5" />
            </div>
          </div>
        </header>

        <div className="p-10 max-w-7xl mx-auto">
          {currentView === 'dashboard' && currentUser.role === 'admin' && (
            <Dashboard records={records} user={currentUser} />
          )}
          {currentView === 'users' && currentUser.role === 'admin' && (
            <UsersManagement users={users} onUpdateUsers={handleUpdateUsers} />
          )}
          {currentView === 'attendance' && (
            <AttendanceControl records={records} user={currentUser} onAdd={addRecord} onUpdate={updateRecord} />
          )}
          {currentView === 'history' && (
            <AttendanceHistory records={records} user={currentUser} />
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
