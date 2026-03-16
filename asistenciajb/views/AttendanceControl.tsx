import React, { useState, useEffect } from 'react';
import { AttendanceRecord, AttendanceStatus, User } from '../types';
import { LogIn, LogOut, CheckCircle2, Clock, Building2, Calendar, Timer, TrendingUp } from 'lucide-react';

interface Props {
  records: AttendanceRecord[];
  user: User;
  onAdd: (record: AttendanceRecord) => void;
  onUpdate: (record: AttendanceRecord) => void;
}

const AttendanceControl: React.FC<Props> = ({ records, user, onAdd, onUpdate }) => {
  const [time, setTime] = useState(new Date());
  const [active, setActive] = useState<AttendanceRecord | null>(null);
  const [workedSeconds, setWorkedSeconds] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const found = records.find(r => r.userId === user.id && r.date === today && !r.checkOut);
    setActive(found || null);
  }, [records, user.id]);

  // Verificar si ya completó la jornada hoy (tiene entrada Y salida)
  const today = new Date().toISOString().split('T')[0];
  const completedToday = records.some(r => r.userId === user.id && r.date === today && !!r.checkOut);

  useEffect(() => {
    if (!active) { setWorkedSeconds(0); return; }
    const update = () => {
      const diff = Math.floor((Date.now() - new Date(active.checkIn).getTime()) / 1000);
      setWorkedSeconds(diff);
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [active]);

  const formatWorked = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const mark = (isEntry: boolean) => {
    const now = new Date();
    if (isEntry) {
      onAdd({
        id: Math.random().toString(36).substr(2, 9),
        userId: user.id,
        userName: user.name,
        date: now.toISOString().split('T')[0],
        checkIn: now.toISOString(),
        status: AttendanceStatus.PRESENT,
      });
    } else if (active) {
      onUpdate({ ...active, checkOut: now.toISOString() });
    }
  };

  const recentRecords = records
    .filter(r => r.userId === user.id && r.date !== today && r.checkOut)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  const getGreeting = () => {
    const h = time.getHours();
    if (h < 12) return 'Buenos días';
    if (h < 18) return 'Buenas tardes';
    return 'Buenas noches';
  };

  const firstName = user.name.split(' ')[0];

  return (
    <div className="max-w-4xl mx-auto py-8 space-y-6 animate-in slide-in-from-bottom-10 duration-700">

      {/* ── Saludo limpio con acento naranja lateral ── */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm relative overflow-hidden flex items-center justify-between flex-wrap gap-4">
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-jbOrange rounded-l-2xl" />
        <div className="flex items-center gap-4 pl-4">
          <img src={user.avatar} className="w-11 h-11 rounded-full border-2 border-slate-100 bg-slate-50" alt={user.name} />
          <div>
            <p className="text-jbGray text-xs font-semibold">{getGreeting()},</p>
            <h2 className="text-lg font-black text-jbBlue font-heading leading-tight">{firstName} 👋</h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Building2 className="w-3 h-3 text-jbOrange" />
              <p className="text-jbGray text-[11px] font-semibold">{user.area}</p>
            </div>
          </div>
        </div>
        <div className="text-right pr-2">
          <p className="text-jbGray text-[10px] font-black uppercase tracking-widest">
            {time.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          <p className="text-xl font-black font-heading text-jbBlue tabular-nums mt-0.5">
            {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </div>

      {/* ── Reloj + Botones ── */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
        <div className="h-1 bg-jbOrange" />
        <div className="p-10 text-center">
          <h2 className="text-7xl font-black text-jbBlue tabular-nums tracking-tighter font-heading">
            {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-10">
            <button
              disabled={!!active || completedToday}
              onClick={() => mark(true)}
              className={`flex items-center gap-5 p-6 rounded-2xl transition-all duration-200 text-left ${
                (!!active || completedToday)
                  ? 'bg-slate-50 text-slate-300 border-2 border-dashed border-slate-200 cursor-not-allowed'
                  : 'bg-jbBlue text-white hover:bg-jbNavy hover:scale-[1.02] active:scale-95 shadow-lg shadow-jbBlue/20 cursor-pointer'
              }`}
            >
              <div className={`p-3.5 rounded-xl flex-shrink-0 ${(!!active || completedToday) ? 'bg-slate-200' : 'bg-white/15'}`}>
                <LogIn className="w-6 h-6" />
              </div>
              <div>
                <p className="font-black uppercase tracking-wide text-sm font-heading">Registrar Entrada</p>
                <p className="text-xs font-semibold opacity-60 mt-0.5">
                  {completedToday
                    ? 'Jornada completada hoy'
                    : !!active
                    ? `Entrada: ${new Date(active.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                    : 'Control Flexible JB'}
                </p>
              </div>
            </button>

            <button
              disabled={!active}
              onClick={() => mark(false)}
              className={`flex items-center gap-5 p-6 rounded-2xl transition-all duration-200 text-left ${
                !active
                  ? 'bg-slate-50 text-slate-300 border-2 border-dashed border-slate-200 cursor-not-allowed'
                  : 'bg-jbOrange text-white hover:bg-orange-600 hover:scale-[1.02] active:scale-95 shadow-lg shadow-jbOrange/20 cursor-pointer'
              }`}
            >
              <div className={`p-3.5 rounded-xl flex-shrink-0 ${!active ? 'bg-slate-200' : 'bg-white/15'}`}>
                <LogOut className="w-6 h-6" />
              </div>
              <div>
                <p className="font-black uppercase tracking-wide text-sm font-heading">Registrar Salida</p>
                <p className="text-xs font-semibold opacity-60 mt-0.5">Fin de Jornada</p>
              </div>
            </button>
          </div>

          {active && (
            <div className="mt-6 flex items-center justify-center gap-2.5 text-jbTurquoise font-black bg-jbTurquoise/10 py-3.5 px-6 rounded-2xl border border-jbTurquoise/20 font-heading text-sm">
              <CheckCircle2 className="w-4 h-4" />
              JORNADA ACTIVA — ENTRADA: {new Date(active.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          )}

          {!active && completedToday && (
            <div className="mt-6 flex items-center justify-center gap-2.5 text-jbOrange font-black bg-jbOrange/10 py-3.5 px-6 rounded-2xl border border-jbOrange/20 font-heading text-sm">
              <CheckCircle2 className="w-4 h-4" />
              JORNADA COMPLETADA — Hasta mañana 
            </div>
          )}
        </div>
      </div>

      {/* ── Resumen del día ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4">
          <div className="p-3 bg-jbBlue/10 rounded-xl text-jbBlue">
            <Timer className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-black text-jbGray uppercase tracking-widest">Tiempo trabajado</p>
            <p className="text-lg font-black text-jbBlue font-heading tabular-nums">
              {active ? formatWorked(workedSeconds) : '00:00:00'}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4">
          <div className="p-3 bg-jbOrange/10 rounded-xl text-jbOrange">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-black text-jbGray uppercase tracking-widest">Hora de entrada</p>
            <p className="text-lg font-black text-jbBlue font-heading">
              {active ? new Date(active.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4">
          <div className={`p-3 rounded-xl ${active ? 'bg-jbTurquoise/10 text-jbTurquoise' : 'bg-slate-100 text-slate-400'}`}>
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-black text-jbGray uppercase tracking-widest">Estado hoy</p>
            <p className={`text-sm font-black font-heading uppercase ${active ? 'text-jbTurquoise' : 'text-slate-400'}`}>
              {active ? 'En jornada' : 'Sin registrar'}
            </p>
          </div>
        </div>
      </div>

      {/* ── Historial rápido ── */}
      {recentRecords.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-7">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2.5 bg-jbBlue/10 rounded-xl text-jbBlue">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-jbBlue font-heading uppercase tracking-wide">Mis últimos registros</h3>
              <p className="text-[10px] text-jbGray font-semibold">Historial reciente de asistencia</p>
            </div>
          </div>

          <div className="space-y-2.5">
            {recentRecords.map(r => {
              const checkInTime = new Date(r.checkIn);
              const checkOutTime = r.checkOut ? new Date(r.checkOut) : null;
              const diffMs = checkOutTime ? checkOutTime.getTime() - checkInTime.getTime() : 0;
              const diffH = Math.floor(diffMs / 3600000);
              const diffM = Math.floor((diffMs % 3600000) / 60000);

              return (
                <div key={r.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-jbBlue/20 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-jbTurquoise flex-shrink-0" />
                    <p className="text-sm font-bold text-slate-700">
                      {new Date(r.date).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-[9px] text-jbGray font-black uppercase tracking-widest">Entrada</p>
                      <p className="text-sm font-black text-jbBlue font-heading">
                        {checkInTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] text-jbGray font-black uppercase tracking-widest">Salida</p>
                      <p className="text-sm font-black text-jbBlue font-heading">
                        {checkOutTime ? checkOutTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] text-jbGray font-black uppercase tracking-widest">Duración</p>
                      <p className="text-sm font-black text-jbOrange font-heading">
                        {diffH > 0 ? `${diffH}h ${diffM}m` : diffM > 0 ? `${diffM}m` : '—'}
                      </p>
                    </div>
                    <span className="px-3 py-1 text-[9px] font-black uppercase rounded-full bg-jbTurquoise/10 text-jbTurquoise border border-jbTurquoise/20 font-heading">
                      {r.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceControl;