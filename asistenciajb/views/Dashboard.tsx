import React, { useEffect, useState } from 'react';
import { AttendanceRecord, User } from '../types';
import { Users, Clock, TrendingUp, CheckCircle2, RefreshCw } from 'lucide-react';
import { reportsApi } from '../services/api';

interface DashboardProps {
  records: AttendanceRecord[];
  user: User;
}

const AREAS = [
  "MARKETING DIGITAL", "DESARROLLO Y PROGRAMACIÓN WEB",
  "DISEÑO Y PRODUCCIÓN AUDIOVISUAL", "SECRETARÍA DE GERENCIA",
  "LEGAL", "PLANEAMIENTO ESTRATÉGICO", "SOMA",
  "PLANIFICACIÓN Y DESARROLLO DE EMPRESAS"
];

const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadStats = async () => {
    setLoading(true);
    try {
      const data = await reportsApi.getDashboard();
      setStats(data);
    } catch (e) {
      console.error('Error cargando dashboard:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadStats(); }, []);

  const StatCard = ({ label, value, icon, color, textColor, subtitle }: any) => (
    <div className="bg-white p-7 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300">
      <div className="flex justify-between items-start mb-5">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${color} ${textColor}`}>{icon}</div>
        {subtitle && <span className="text-[10px] font-black bg-slate-100 px-3 py-1 rounded-full text-slate-500 uppercase tracking-tighter">{subtitle}</span>}
      </div>
      <p className="text-jbGray text-xs font-bold uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-3xl font-black font-heading ${textColor}`}>{value}</p>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-40">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-jbBlue border-t-jbOrange rounded-full animate-spin mx-auto mb-4" />
          <p className="text-jbGray font-bold text-xs uppercase tracking-widest">Cargando datos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-jbBlue font-heading">Gestión Operativa <span className="text-jbOrange">JB</span></h1>
          <p className="text-jbGray font-medium mt-1">Visión global de asistencia y rendimiento institucional.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={loadStats} className="flex items-center gap-2 bg-slate-100 text-jbBlue px-5 py-3 rounded-xl font-black text-[10px] tracking-widest uppercase hover:bg-slate-200 transition-all">
            <RefreshCw className="w-4 h-4" />
            ACTUALIZAR
          </button>
          <button onClick={() => reportsApi.exportCSV()} className="bg-jbBlue text-white px-6 py-3 rounded-xl font-black text-[10px] tracking-widest uppercase hover:bg-jbNavy transition-all shadow-lg shadow-jbBlue/20 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            DESCARGAR REPORTE
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard label="Colaboradores con Jornada Activa" value={stats?.activeNow ?? 0}
          icon={<Clock className="w-7 h-7" />} color="bg-jbTurquoise/10" textColor="text-jbTurquoise" subtitle="En Vivo" />
        <StatCard label="Índice de Asistencia" value={`${stats?.attendanceRate ?? 0}%`}
          icon={<CheckCircle2 className="w-7 h-7" />} color="bg-jbBlue/10" textColor="text-jbBlue" subtitle="Histórico" />
        <StatCard label="Marcaciones Totales Hoy" value={stats?.todayCount ?? 0}
          icon={<Users className="w-7 h-7" />} color="bg-jbNavy/10" textColor="text-jbNavy" subtitle={new Date().toLocaleDateString()} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Últimas marcaciones */}
        <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold text-jbBlue font-heading">Últimas Marcaciones de Personal</h2>
            <span className="text-[10px] font-black text-jbOrange uppercase tracking-widest px-4 py-1 bg-jbOrange/10 rounded-full">Actualizado</span>
          </div>
          <div className="space-y-4">
            {(stats?.recentRecords ?? []).map((r: any) => (
              <div key={r.id} className="flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl border border-slate-100 hover:border-jbBlue/20 transition-all">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${r.userName}`} className="w-11 h-11 rounded-full border-2 border-white shadow-sm bg-white" alt={r.userName} />
                    {!r.checkOut && <div className="absolute bottom-0 right-0 w-3 h-3 bg-jbTurquoise border-2 border-white rounded-full" />}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-jbBlue font-heading">{r.userName}</p>
                    <p className="text-[9px] font-black text-jbGray uppercase tracking-tighter">
                      {new Date(r.date).toLocaleDateString('es-ES')}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-jbBlue font-heading">
                    {new Date(r.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <span className="text-[9px] font-black uppercase px-3 py-1 rounded-full border bg-jbTurquoise/10 text-jbTurquoise border-jbTurquoise/20">
                    {r.status}
                  </span>
                </div>
              </div>
            ))}
            {(!stats?.recentRecords || stats.recentRecords.length === 0) && (
              <div className="text-center py-20 bg-slate-50/30 rounded-[2rem] border border-dashed border-slate-200">
                <Users className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                <p className="text-jbGray text-sm font-bold uppercase tracking-widest">Sin actividad registrada hoy</p>
              </div>
            )}
          </div>
        </div>

        {/* Eficiencia por áreas — datos reales */}
        <div className="space-y-8">
          <div className="bg-jbBlue p-8 rounded-[2.5rem] text-white shadow-2xl shadow-jbBlue/30 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16" />
            <h2 className="text-lg font-bold font-heading mb-4 relative z-10">Colaboradores por Área</h2>
            <div className="space-y-4 relative z-10 max-h-[400px] overflow-y-auto pr-1">
              {AREAS.map(area => {
                const areaData = stats?.byArea?.find((a: any) => a.area === area);
                const count = areaData?.count ?? 0;
                const maxCount = Math.max(...(stats?.byArea?.map((a: any) => Number(a.count)) ?? [1]), 1);
                const pct = Math.round((count / maxCount) * 100);
                return (
                  <div key={area} className="space-y-1.5">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-tighter">
                      <span className="truncate max-w-[180px]">{area}</span>
                      <span>{count} colaborador{count !== 1 ? 'es' : ''}</span>
                    </div>
                    <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-jbTurquoise transition-all duration-1000" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
            <h2 className="text-sm font-black text-jbBlue font-heading uppercase tracking-widest mb-4 text-center">Resumen Institucional</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-slate-50">
                <span className="text-xs text-jbGray font-semibold">Total colaboradores</span>
                <span className="text-sm font-black text-jbBlue font-heading">{stats?.totalUsers ?? 0}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-50">
                <span className="text-xs text-jbGray font-semibold">Registros históricos</span>
                <span className="text-sm font-black text-jbBlue font-heading">{stats?.totalRecords ?? 0}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-xs text-jbGray font-semibold">Activos hoy</span>
                <span className="text-sm font-black text-jbTurquoise font-heading">{stats?.activeNow ?? 0}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
