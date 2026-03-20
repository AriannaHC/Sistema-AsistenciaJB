import React, { useState, useEffect, useRef } from "react";
import { AttendanceRecord, AttendanceStatus, User, Schedule } from "../types";
import {
  LogIn, LogOut, CheckCircle2, Clock, Building2, Calendar,
  Timer, TrendingUp, AlertCircle, Lock, CalendarDays,
  UtensilsCrossed, RotateCcw,
} from "lucide-react";
import { attendanceApi } from "../services/api";

interface Props {
  records: AttendanceRecord[];
  user: User;
  schedule: Schedule | null;
  onAdd: (record: AttendanceRecord) => void;
  onUpdate: (record: AttendanceRecord) => void;
}

const AttendanceControl: React.FC<Props> = ({ records, user, schedule, onAdd, onUpdate }) => {
  const [time, setTime] = useState(new Date());
  const [active, setActive] = useState<AttendanceRecord | null>(null);
  const [workedSeconds, setWorkedSeconds] = useState(0);

  // Estados de almuerzo
  const [lunchSeconds, setLunchSeconds] = useState(0);
  const [isOnLunch, setIsOnLunch] = useState(false);
  const [lunchDone, setLunchDone] = useState(false);
  const [lunchTardanza, setLunchTardanza] = useState(false);
  const [lunchResult, setLunchResult] = useState("");
  const [loadingLunch, setLoadingLunch] = useState(false);

  const lunchStartRef = useRef<Date | null>(null);
  const lunchIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reloj
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const getToday = () => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
  };
  const today = getToday();

  // Timer de almuerzo
  const startLunchTimer = (from: Date) => {
    lunchStartRef.current = from;
    if (lunchIntervalRef.current) clearInterval(lunchIntervalRef.current);
    const update = () => {
      if (!lunchStartRef.current) return;
      setLunchSeconds(Math.floor((Date.now() - lunchStartRef.current.getTime()) / 1000));
    };
    update();
    lunchIntervalRef.current = setInterval(update, 1000);
  };

  const stopLunchTimer = () => {
    if (lunchIntervalRef.current) { clearInterval(lunchIntervalRef.current); lunchIntervalRef.current = null; }
    lunchStartRef.current = null;
  };

  useEffect(() => () => stopLunchTimer(), []);

  // Detectar registro activo
  useEffect(() => {
    const found = records.find(r => r.userId === user.id && r.date === today && !r.checkOut);
    setActive(found || null);

    if (found) {
      const r = found as any;
      if (r.lunchStart && r.lunchEnd) {
        setLunchDone(true); setIsOnLunch(false); stopLunchTimer();
        const ms = new Date(r.lunchEnd).getTime() - new Date(r.lunchStart).getTime();
        setLunchSeconds(Math.floor(ms / 1000));
        if (r.lunchLimit) {
          setLunchTardanza(new Date(r.lunchEnd) > new Date(today + "T" + r.lunchLimit));
        }
      } else if (r.lunchStart && !r.lunchEnd) {
        setIsOnLunch(true); setLunchDone(false);
        startLunchTimer(new Date(r.lunchStart));
      } else {
        setIsOnLunch(false); setLunchDone(false); setLunchSeconds(0); stopLunchTimer();
      }
    } else { stopLunchTimer(); }
  }, [records, user.id]);

  // Cronómetro horas trabajadas
  useEffect(() => {
    if (!active) { setWorkedSeconds(0); return; }
    const update = () => {
      const checkInDate = new Date(active.checkIn.replace(" ", "T"));
      setWorkedSeconds(Math.max(0, Math.floor((Date.now() - checkInDate.getTime()) / 1000)));
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [active]);

  // Turnos del día
  const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  const diaHoy = DIAS[time.getDay()];
  const registrosHoyConCheckout = records.filter(r => r.userId === user.id && r.date === today && !!r.checkOut);

  const getTurnosHoy = (): { ingreso: string; salida: string }[] => {
    if (!schedule || schedule.id === "default-schedule-id") return [];
    if (schedule.type === "simple") {
      if (!["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"].includes(diaHoy)) return [];
      return [{ ingreso: (schedule.time_in || "").substring(0, 5), salida: (schedule.time_out || "").substring(0, 5) }];
    }
    if (schedule.type === "bloques" && schedule.blocks) {
      const blocks = typeof schedule.blocks === "string" ? JSON.parse(schedule.blocks) : schedule.blocks;
      const bloque = blocks.find((b: any) => b.day === diaHoy);
      return bloque?.turnos || [];
    }
    return [];
  };

  const turnosHoy = getTurnosHoy();
  const turnoActual = turnosHoy[registrosHoyConCheckout.length] || null;

  const toDateHoy = (hhmm: string): Date => {
    const [h, m] = hhmm.split(":").map(Number);
    const d = new Date(); d.setHours(h, m, 0, 0); return d;
  };

  // ── Calcular si el botón de almuerzo está bloqueado ──────────
  const lunchStartTime = (active as any)?.lunchStartTime || (active as any)?.lunch_start_time;
  const lunchStartBlocked = (() => {
    if (!lunchStartTime) return false;
    const horaAlmuerzo = toDateHoy(lunchStartTime);
    return time < horaAlmuerzo;
  })();
  const lunchStartHoraTexto = lunchStartTime
    ? toDateHoy(lunchStartTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "";

  // Estado botones entrada/salida
  const calcularEstadoBotones = () => {
    const tieneHorarioReal = schedule && schedule.id !== "default-schedule-id";

    if (!tieneHorarioReal) {
      return {
        entradaDeshabilitada: !!active || isOnLunch,
        salidaDeshabilitada: !active || isOnLunch,
        txtEntrada: active
          ? `Entrada a las ${new Date(active.checkIn.replace(" ", "T")).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
          : "Control Flexible JB",
        txtSalida: isOnLunch ? "Regresa del almuerzo primero" : "Control Flexible JB",
        completedToday: false,
      };
    }

    if (active) {
      const fechaEntrada = active.checkIn.replace(" ", "T").split("T")[0];
      if (fechaEntrada !== today) {
        return {
          entradaDeshabilitada: true, salidaDeshabilitada: false,
          txtEntrada: `Entrada el ${new Date(active.checkIn.replace(" ", "T")).toLocaleDateString("es-ES")}`,
          txtSalida: "Registrar salida pendiente", completedToday: false,
        };
      }
    }

    if (!turnoActual) {
      const hayTurnosCompletados = registrosHoyConCheckout.length > 0;
      return {
        entradaDeshabilitada: true, salidaDeshabilitada: !active || isOnLunch,
        txtEntrada: hayTurnosCompletados ? "Jornada de hoy completada" : "Sin turnos programados hoy",
        txtSalida: isOnLunch ? "Regresa del almuerzo primero" : "Fin de Jornada",
        completedToday: hayTurnosCompletados && !active,
      };
    }

    const ahora = time;
    if (!active) {
      const horaIngreso = toDateHoy(turnoActual.ingreso);
      const limiteApertura = new Date(horaIngreso.getTime() - 5 * 60000);
      if (ahora < limiteApertura) {
        return {
          entradaDeshabilitada: true, salidaDeshabilitada: true,
          txtEntrada: `Habilitado a las ${limiteApertura.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
          txtSalida: "Fin de Jornada", completedToday: false,
        };
      }
      return { entradaDeshabilitada: false, salidaDeshabilitada: true, txtEntrada: `Turno de las ${turnoActual.ingreso}`, txtSalida: "Fin de Jornada", completedToday: false };
    }

    if (isOnLunch) {
      return {
        entradaDeshabilitada: true, salidaDeshabilitada: true,
        txtEntrada: `Entrada a las ${new Date(active.checkIn.replace(" ", "T")).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
        txtSalida: "Regresa del almuerzo primero", completedToday: false,
      };
    }

    const horaSalida = toDateHoy(turnoActual.salida);
    const limiteSalida = new Date(horaSalida.getTime() - 5 * 60000);

    if (ahora >= horaSalida) {
      return {
        entradaDeshabilitada: true, salidaDeshabilitada: false,
        txtEntrada: `Entrada a las ${new Date(active.checkIn.replace(" ", "T")).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
        txtSalida: `Turno de las ${turnoActual.salida} (vencido)`, completedToday: false,
      };
    }
    if (ahora < limiteSalida) {
      return {
        entradaDeshabilitada: true, salidaDeshabilitada: true,
        txtEntrada: `Entrada a las ${new Date(active.checkIn.replace(" ", "T")).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
        txtSalida: `Habilitado a las ${limiteSalida.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`, completedToday: false,
      };
    }
    return {
      entradaDeshabilitada: true, salidaDeshabilitada: false,
      txtEntrada: `Entrada a las ${new Date(active.checkIn.replace(" ", "T")).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
      txtSalida: `Termina tu turno de las ${turnoActual.salida}`, completedToday: false,
    };
  };

  const { entradaDeshabilitada, salidaDeshabilitada, txtEntrada, txtSalida, completedToday } = calcularEstadoBotones();

  const mark = (isEntry: boolean) => {
    const now = new Date();
    if (isEntry) {
      onAdd({ id: "", userId: user.id, userName: user.name, date: today, checkIn: now.toISOString(), status: AttendanceStatus.PRESENT });
    } else if (active) {
      onUpdate({ ...active, checkOut: now.toISOString() });
    }
  };

  const handleLunchStart = async () => {
    setLoadingLunch(true);
    try {
      const result = await attendanceApi.lunchStart();
      const lunchStartTime = new Date(result.lunchStart || result.lunch_start);
      setIsOnLunch(true);
      setActive((prev: any) => prev ? { ...prev, lunchStart: lunchStartTime.toISOString() } : prev);
      startLunchTimer(lunchStartTime);
    } catch (e: any) { alert(e.message); }
    finally { setLoadingLunch(false); }
  };

  const handleLunchEnd = async () => {
    setLoadingLunch(true);
    try {
      const result = await attendanceApi.lunchEnd();
      stopLunchTimer();
      setIsOnLunch(false); setLunchDone(true); setLunchTardanza(result.tardanza);
      setLunchResult(result.tardanza ? "⚠️ Regresaste tarde del almuerzo" : "✅ Regresaste a tiempo");
      const ls = result.lunchStart || result.lunch_start;
      const le = result.lunchEnd || result.lunch_end;
      if (ls && le) setLunchSeconds(Math.floor((new Date(le).getTime() - new Date(ls).getTime()) / 1000));
    } catch (e: any) { alert(e.message); }
    finally { setLoadingLunch(false); }
  };

  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60), s = secs % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const recentRecords = records
    .filter(r => r.userId === user.id && r.date !== today && r.checkOut)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  const getGreeting = () => { const h = time.getHours(); if (h < 12) return "Buenos días"; if (h < 18) return "Buenas tardes"; return "Buenas noches"; };
  const getStatusColor = (status: string) => {
    switch (status) {
      case "Tardanza": return "bg-jbOrange/10 text-jbOrange border-jbOrange/20";
      case "Falta": return "bg-jbRed/10 text-jbRed border-jbRed/20";
      default: return "bg-jbTurquoise/10 text-jbTurquoise border-jbTurquoise/20";
    }
  };

  const firstName = user.name.split(" ")[0];
  const isTardanza = active?.status === "Tardanza";
  const tieneHorarioReal = schedule && schedule.id !== "default-schedule-id";
  const activeLunchLimit = (active as any)?.lunchLimit || (active as any)?.lunch_limit;

  return (
    <div className="max-w-4xl mx-auto py-8 space-y-6 animate-in slide-in-from-bottom-10 duration-700">

      {/* Saludo */}
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
            {time.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })}
          </p>
          <p className="text-xl font-black font-heading text-jbBlue tabular-nums mt-0.5">
            {time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
      </div>

      {/* Banner horario */}
      {tieneHorarioReal && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-6 py-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-jbBlue/10 rounded-xl text-jbBlue"><CalendarDays className="w-4 h-4" /></div>
            <div>
              <p className="text-[10px] font-black text-jbGray uppercase tracking-widest">Tu horario asignado</p>
              <p className="text-sm font-black text-jbBlue font-heading">{schedule?.name}</p>
            </div>
          </div>
          {turnosHoy.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {turnosHoy.map((t, i) => (
                <span key={i} className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase border ${
                  i === registrosHoyConCheckout.length && !active ? "bg-jbBlue/10 text-jbBlue border-jbBlue/20"
                  : i < registrosHoyConCheckout.length ? "bg-jbTurquoise/10 text-jbTurquoise border-jbTurquoise/20 line-through opacity-60"
                  : "bg-slate-100 text-slate-500 border-slate-200"
                }`}>
                  {i < registrosHoyConCheckout.length ? "✓ " : ""}{t.ingreso} — {t.salida}
                  {i === registrosHoyConCheckout.length && active ? " ← activo" : ""}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-[11px] text-slate-400 font-semibold">Sin turnos hoy ({diaHoy})</span>
          )}
        </div>
      )}

      {/* Reloj + Botones */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
        <div className={`h-1 ${active && isTardanza ? "bg-jbOrange" : active ? "bg-jbTurquoise" : "bg-slate-200"}`} />
        <div className="p-10 text-center">
          <h2 className="text-7xl font-black text-jbBlue tabular-nums tracking-tighter font-heading">
            {time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </h2>

          {/* Cronómetro almuerzo */}
          {isOnLunch && (
            <div className="mt-4 inline-flex items-center gap-3 bg-jbOrange/10 border border-jbOrange/20 px-6 py-3 rounded-2xl">
              <Clock className="w-5 h-5 text-jbOrange animate-pulse" />
              <span className="font-black text-jbOrange text-2xl tabular-nums font-heading">{formatTime(lunchSeconds)}</span>
              <span className="text-jbOrange font-black text-xs uppercase tracking-widest">ALMUERZO EN CURSO</span>
              {activeLunchLimit && (
                <span className="text-jbOrange/60 font-bold text-xs border-l border-jbOrange/20 pl-3">límite: {activeLunchLimit}</span>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-10">
            {/* Botón Entrada */}
            <button disabled={entradaDeshabilitada} onClick={() => mark(true)}
              className={`flex items-center gap-5 p-6 rounded-2xl transition-all duration-200 text-left ${
                entradaDeshabilitada
                  ? "bg-slate-50 text-slate-400 border-2 border-slate-200 cursor-not-allowed"
                  : "bg-jbBlue text-white hover:bg-jbNavy hover:scale-[1.02] active:scale-95 shadow-lg shadow-jbBlue/20 cursor-pointer"
              }`}>
              <div className={`p-3.5 rounded-xl flex-shrink-0 ${entradaDeshabilitada ? "bg-slate-200" : "bg-white/15"}`}>
                {entradaDeshabilitada && !active ? <Lock className="w-6 h-6 text-slate-400" /> : <LogIn className="w-6 h-6" />}
              </div>
              <div>
                <p className="font-black uppercase tracking-wide text-sm font-heading">Registrar Entrada</p>
                <p className={`text-xs font-semibold mt-0.5 ${entradaDeshabilitada && !active && !completedToday ? "text-jbOrange" : "opacity-60"}`}>{txtEntrada}</p>
              </div>
            </button>

            {/* Botón Salida */}
            <button disabled={salidaDeshabilitada} onClick={() => mark(false)}
              className={`flex items-center gap-5 p-6 rounded-2xl transition-all duration-200 text-left ${
                salidaDeshabilitada
                  ? "bg-slate-50 text-slate-400 border-2 border-slate-200 cursor-not-allowed"
                  : "bg-jbOrange text-white hover:bg-orange-600 hover:scale-[1.02] active:scale-95 shadow-lg shadow-jbOrange/20 cursor-pointer"
              }`}>
              <div className={`p-3.5 rounded-xl flex-shrink-0 ${salidaDeshabilitada ? "bg-slate-200" : "bg-white/15"}`}>
                {salidaDeshabilitada && active ? <Lock className="w-6 h-6 text-slate-400" /> : <LogOut className="w-6 h-6" />}
              </div>
              <div>
                <p className="font-black uppercase tracking-wide text-sm font-heading">Registrar Salida</p>
                <p className={`text-xs font-semibold mt-0.5 ${salidaDeshabilitada && active ? "text-jbOrange" : "opacity-60"}`}>{txtSalida}</p>
              </div>
            </button>
          </div>

          {/* Sección Almuerzo */}
          {active && !completedToday && (
            <div className="mt-5">
              {!isOnLunch && !lunchDone && (
                <button onClick={handleLunchStart} disabled={loadingLunch || lunchStartBlocked}
                  className={`w-full flex items-center justify-center gap-3 p-4 rounded-2xl font-black text-sm transition-all border disabled:opacity-60 ${
                    lunchStartBlocked
                      ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                      : "bg-slate-100 hover:bg-slate-200 text-jbBlue border-slate-200"
                  }`}>
                  {loadingLunch
                    ? <><Clock className="w-4 h-4 animate-spin" /> REGISTRANDO...</>
                    : lunchStartBlocked
                      ? <><Lock className="w-4 h-4" /> ALMUERZO DISPONIBLE A LAS {lunchStartHoraTexto}</>
                      : <><UtensilsCrossed className="w-4 h-4" /> INICIAR ALMUERZO {lunchStartTime ? `(desde ${lunchStartTime})` : ""}</>
                  }
                </button>
              )}

              {isOnLunch && (
                <button onClick={handleLunchEnd} disabled={loadingLunch}
                  className="w-full flex items-center justify-center gap-3 p-5 rounded-2xl bg-jbOrange text-white font-black text-sm transition-all shadow-lg shadow-jbOrange/20 hover:bg-orange-600 disabled:opacity-60">
                  {loadingLunch
                    ? <><Clock className="w-4 h-4 animate-spin" /> REGISTRANDO...</>
                    : <><RotateCcw className="w-4 h-4" /> VOLVER DEL ALMUERZO — FINALIZAR DESCANSO</>
                  }
                </button>
              )}

              {lunchDone && (
                <div className={`flex items-center justify-center gap-3 p-4 rounded-2xl font-black text-sm border ${
                  lunchTardanza ? "bg-red-50 text-red-500 border-red-200" : "bg-green-50 text-green-600 border-green-200"
                }`}>
                  <span>{lunchResult}</span>
                  <span className="font-mono text-lg tabular-nums">{formatTime(lunchSeconds)}</span>
                  {lunchTardanza && <span className="text-[10px] uppercase tracking-widest bg-red-100 px-2 py-1 rounded-full">TARDANZA</span>}
                </div>
              )}
            </div>
          )}

          {/* Banner jornada */}
          {active && (
            <div className={`mt-6 flex items-center justify-center gap-2.5 font-black py-3.5 px-6 rounded-2xl border font-heading text-sm ${
              isOnLunch ? "bg-jbOrange/10 text-jbOrange border-jbOrange/20"
              : isTardanza ? "bg-jbOrange/10 text-jbOrange border-jbOrange/20"
              : "bg-jbTurquoise/10 text-jbTurquoise border-jbTurquoise/20"
            }`}>
              {isOnLunch ? <UtensilsCrossed className="w-4 h-4" /> : isTardanza ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
              {isOnLunch ? "EN ALMUERZO" : isTardanza ? "ENTRADA CON TARDANZA" : "JORNADA ACTIVA"} —{" "}
              {new Date(active.checkIn.replace(" ", "T")).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </div>
          )}

          {!active && completedToday && (
            <div className="mt-6 flex items-center justify-center gap-2.5 text-jbTurquoise font-bold bg-jbTurquoise/10 py-3.5 px-6 rounded-2xl border border-jbTurquoise/20 text-sm">
              <CheckCircle2 className="w-4 h-4" /> Jornada completada. ¡Buen trabajo hoy!
            </div>
          )}
        </div>
      </div>

      {/* Tarjetas resumen */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4">
          <div className="p-3 bg-jbBlue/10 rounded-xl text-jbBlue"><Timer className="w-5 h-5" /></div>
          <div>
            <p className="text-[10px] font-black text-jbGray uppercase tracking-widest">Tiempo trabajado</p>
            <p className="text-lg font-black text-jbBlue font-heading tabular-nums">{active ? formatTime(workedSeconds) : "00:00:00"}</p>
            {isOnLunch && <p className="text-[9px] text-jbOrange font-black uppercase">(PAUSA)</p>}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4">
          <div className="p-3 bg-slate-100 rounded-xl text-slate-500"><Clock className="w-5 h-5" /></div>
          <div>
            <p className="text-[10px] font-black text-jbGray uppercase tracking-widest">Hora de entrada</p>
            <p className="text-lg font-black text-jbBlue font-heading">
              {active ? new Date(active.checkIn.replace(" ", "T")).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4">
          <div className={`p-3 rounded-xl ${lunchDone ? lunchTardanza ? "bg-red-100 text-red-500" : "bg-green-100 text-green-600" : isOnLunch ? "bg-jbOrange/10 text-jbOrange" : "bg-slate-100 text-slate-400"}`}>
            <UtensilsCrossed className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-black text-jbGray uppercase tracking-widest">Tiempo almuerzo</p>
            <p className={`text-sm font-black font-heading tabular-nums ${lunchDone ? lunchTardanza ? "text-red-500" : "text-green-600" : isOnLunch ? "text-jbOrange" : "text-slate-400"}`}>
              {(lunchDone || isOnLunch) ? formatTime(lunchSeconds) : "—"}
            </p>
            {lunchDone && <p className={`text-[9px] font-black uppercase ${lunchTardanza ? "text-red-400" : "text-green-500"}`}>{lunchTardanza ? "⚠️ TARDANZA" : "✅ A TIEMPO"}</p>}
            {isOnLunch && <p className="text-[9px] text-jbOrange font-black uppercase animate-pulse">EN CURSO</p>}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4">
          <div className={`p-3 rounded-xl ${isOnLunch ? "bg-jbOrange/10 text-jbOrange" : active ? isTardanza ? "bg-jbOrange/10 text-jbOrange" : "bg-jbTurquoise/10 text-jbTurquoise" : "bg-slate-100 text-slate-400"}`}>
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-black text-jbGray uppercase tracking-widest">Estado hoy</p>
            <p className={`text-sm font-black font-heading uppercase ${isOnLunch ? "text-jbOrange" : active ? isTardanza ? "text-jbOrange" : "text-jbTurquoise" : "text-slate-400"}`}>
              {isOnLunch ? "En almuerzo" : active ? `En jornada (${active.status})` : completedToday ? "Completado" : "Sin registrar"}
            </p>
          </div>
        </div>
      </div>

      {/* Historial rápido */}
      {recentRecords.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-7">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2.5 bg-jbBlue/10 rounded-xl text-jbBlue"><Calendar className="w-4 h-4" /></div>
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
              const diffH = Math.floor(diffMs / 3600000), diffM = Math.floor((diffMs % 3600000) / 60000);
              const rAny = r as any;
              const tieneAlmuerzo = rAny.lunchStart && rAny.lunchEnd;
              const almTardanza = tieneAlmuerzo && rAny.lunchLimit
                ? new Date(rAny.lunchEnd) > new Date(r.date + "T" + rAny.lunchLimit)
                : false;

              return (
                <div key={r.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-jbBlue/20 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-slate-300 flex-shrink-0" />
                    <p className="text-sm font-bold text-slate-700 uppercase">
                      {new Date(r.date).toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" })}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 flex-wrap justify-end">
                    <div className="text-right hidden sm:block">
                      <p className="text-[9px] text-jbGray font-black uppercase tracking-widest">Entrada</p>
                      <p className="text-sm font-black text-jbBlue font-heading">{checkInTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                    </div>
                    <div className="text-right hidden sm:block">
                      <p className="text-[9px] text-jbGray font-black uppercase tracking-widest">Salida</p>
                      <p className="text-sm font-black text-jbBlue font-heading">{checkOutTime ? checkOutTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}</p>
                    </div>
                    {/* Almuerzo en historial */}
                    {tieneAlmuerzo && (
                      <div className="text-right">
                        <p className="text-[9px] text-jbGray font-black uppercase tracking-widest">Almuerzo</p>
                        <p className={`text-xs font-black ${almTardanza ? "text-red-500" : "text-green-600"}`}>
                          {new Date(rAny.lunchStart).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          {" → "}
                          {new Date(rAny.lunchEnd).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          {almTardanza ? " ⚠️" : " ✅"}
                        </p>
                      </div>
                    )}
                    <div className="text-right">
                      <p className="text-[9px] text-jbGray font-black uppercase tracking-widest">Duración</p>
                      <p className="text-sm font-black text-slate-600 font-heading">{diffH > 0 ? `${diffH}h ${diffM}m` : diffM > 0 ? `${diffM}m` : "—"}</p>
                    </div>
                    <span className={`px-3 py-1.5 text-[9px] font-black uppercase rounded-lg border font-heading ${getStatusColor(r.status)}`}>{r.status}</span>
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