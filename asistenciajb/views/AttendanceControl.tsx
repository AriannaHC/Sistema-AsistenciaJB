import React, { useState, useEffect } from "react";
import { AttendanceRecord, AttendanceStatus, User, Schedule } from "../types";
import {
  LogIn,
  LogOut,
  CheckCircle2,
  Clock,
  Building2,
  Calendar,
  Timer,
  TrendingUp,
  AlertCircle,
  Lock,
  CalendarDays,
} from "lucide-react";

interface Props {
  records: AttendanceRecord[];
  user: User;
  schedule: Schedule | null;
  onAdd: (record: AttendanceRecord) => void;
  onUpdate: (record: AttendanceRecord) => void;
}

const AttendanceControl: React.FC<Props> = ({
  records,
  user,
  schedule,
  onAdd,
  onUpdate,
}) => {
  const [time, setTime] = useState(new Date());
  const [active, setActive] = useState<AttendanceRecord | null>(null);
  const [workedSeconds, setWorkedSeconds] = useState(0);

  // Reloj en tiempo real — actualiza cada segundo
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const d = new Date();
  const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  useEffect(() => {
    const found = records.find(
      (r) => r.userId === user.id && r.date === today && !r.checkOut,
    );
    setActive(found || null);
  }, [records, user.id, today]);

  // Turnos completados hoy
  const registrosHoyConCheckout = records.filter(
    (r) => r.userId === user.id && r.date === today && !!r.checkOut,
  );

  // Día de la semana en español
  const DIAS = [
    "Domingo",
    "Lunes",
    "Martes",
    "Miércoles",
    "Jueves",
    "Viernes",
    "Sábado",
  ];
  const diaHoy = DIAS[time.getDay()];

  // ── Calcular turnos de hoy según el horario ──────────────
  const getTurnosHoy = (): { ingreso: string; salida: string }[] => {
    if (!schedule || schedule.id === "default-schedule-id") return [];

    if (schedule.type === "simple") {
      if (
        !["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"].includes(diaHoy)
      )
        return [];
      return [
        {
          ingreso: (schedule.time_in || "").substring(0, 5),
          salida: (schedule.time_out || "").substring(0, 5),
        },
      ];
    }

    if (schedule.type === "bloques" && schedule.blocks) {
      const blocks =
        typeof schedule.blocks === "string"
          ? JSON.parse(schedule.blocks)
          : schedule.blocks;
      const bloque = blocks.find((b: any) => b.day === diaHoy);
      return bloque?.turnos || [];
    }

    return [];
  };

  const turnosHoy = getTurnosHoy();
  const turnoActual = turnosHoy[registrosHoyConCheckout.length] || null;

  // ── Helper: convierte "HH:MM" a Date de hoy ──────────────
  const toDateHoy = (hhmm: string): Date => {
    const [h, m] = hhmm.split(":").map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d;
  };

  // ── Calcular estado de los botones basado en el reloj ────
  // Se recalcula cada segundo porque `time` cambia cada segundo
  const calcularEstadoBotones = () => {
    const tieneHorarioReal = schedule && schedule.id !== "default-schedule-id";

    if (!tieneHorarioReal) {
      return {
        entradaDeshabilitada: !!active,
        salidaDeshabilitada: !active,
        txtEntrada: active
          ? `Entrada a las ${new Date(active.checkIn.replace(" ", "T")).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
          : "Control Flexible JB",
        txtSalida: "Control Flexible JB",
        completedToday: false,
      };
    }

    // ✅ Si hay jornada activa de un día ANTERIOR — habilitar salida siempre
    if (active) {
      const fechaEntrada = active.checkIn.replace(" ", "T").split("T")[0];
      if (fechaEntrada !== today) {
        return {
          entradaDeshabilitada: true,
          salidaDeshabilitada: false,
          txtEntrada: `Entrada el ${new Date(active.checkIn.replace(" ", "T")).toLocaleDateString("es-ES")}`,
          txtSalida: "Registrar salida pendiente",
          completedToday: false,
        };
      }
    }

    if (!turnoActual) {
      const hayTurnosCompletados = registrosHoyConCheckout.length > 0;
      return {
        entradaDeshabilitada: true,
        salidaDeshabilitada: !active,
        txtEntrada: hayTurnosCompletados
          ? "Jornada de hoy completada"
          : "Sin turnos programados hoy",
        txtSalida: "Fin de Jornada",
        completedToday: hayTurnosCompletados && !active,
      };
    }

    const ahora = time;

    if (!active) {
      const horaIngreso = toDateHoy(turnoActual.ingreso);
      const limiteApertura = new Date(horaIngreso.getTime() - 5 * 60000);

      if (ahora < limiteApertura) {
        return {
          entradaDeshabilitada: true,
          salidaDeshabilitada: true,
          txtEntrada: `Habilitado a las ${limiteApertura.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
          txtSalida: "Fin de Jornada",
          completedToday: false,
        };
      }

      return {
        entradaDeshabilitada: false,
        salidaDeshabilitada: true,
        txtEntrada: `Turno de las ${turnoActual.ingreso}`,
        txtSalida: "Fin de Jornada",
        completedToday: false,
      };
    }

    // Jornada activa de HOY
    const horaSalida = toDateHoy(turnoActual.salida);
    const limiteSalida = new Date(horaSalida.getTime() - 5 * 60000);

    // ✅ Si la hora de salida ya pasó — habilitar siempre
    if (ahora >= horaSalida) {
      return {
        entradaDeshabilitada: true,
        salidaDeshabilitada: false,
        txtEntrada: `Entrada a las ${new Date(active.checkIn.replace(" ", "T")).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
        txtSalida: `Turno de las ${turnoActual.salida} (vencido)`,
        completedToday: false,
      };
    }

    if (ahora < limiteSalida) {
      return {
        entradaDeshabilitada: true,
        salidaDeshabilitada: true,
        txtEntrada: `Entrada a las ${new Date(active.checkIn.replace(" ", "T")).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
        txtSalida: `Habilitado a las ${limiteSalida.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
        completedToday: false,
      };
    }

    return {
      entradaDeshabilitada: true,
      salidaDeshabilitada: false,
      txtEntrada: `Entrada a las ${new Date(active.checkIn.replace(" ", "T")).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
      txtSalida: `Termina tu turno de las ${turnoActual.salida}`,
      completedToday: false,
    };
  };

  const {
    entradaDeshabilitada,
    salidaDeshabilitada,
    txtEntrada,
    txtSalida,
    completedToday,
  } = calcularEstadoBotones();

  // Cronómetro
  useEffect(() => {
    if (!active) {
      setWorkedSeconds(0);
      return;
    }

    const update = () => {
      const checkInDate = new Date(active.checkIn.replace(" ", "T"));
      const diff = Math.floor((Date.now() - checkInDate.getTime()) / 1000);
      setWorkedSeconds(diff > 0 ? diff : 0);
    };

    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [active]);

  const formatWorked = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const mark = (isEntry: boolean) => {
    const now = new Date();
    if (isEntry) {
      onAdd({
        id: "",
        userId: user.id,
        userName: user.name,
        date: now.toISOString().split("T")[0],
        checkIn: now.toISOString(),
        status: AttendanceStatus.PRESENT,
      });
    } else if (active) {
      onUpdate({ ...active, checkOut: now.toISOString() });
    }
  };

  const recentRecords = records
    .filter((r) => r.userId === user.id && r.date !== today && r.checkOut)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  const getGreeting = () => {
    const h = time.getHours();
    if (h < 12) return "Buenos días";
    if (h < 18) return "Buenas tardes";
    return "Buenas noches";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Tardanza":
        return "bg-jbOrange/10 text-jbOrange border-jbOrange/20";
      case "Falta":
        return "bg-jbRed/10 text-jbRed border-jbRed/20";
      default:
        return "bg-jbTurquoise/10 text-jbTurquoise border-jbTurquoise/20";
    }
  };

  const firstName = user.name.split(" ")[0];
  const isTardanza = active?.status === "Tardanza";

  // ── Info del horario para mostrar en la UI ────────────────
  const scheduleNombre = schedule?.name || null;
  const tieneHorarioReal = schedule && schedule.id !== "default-schedule-id";

  // Próximo turno para mostrar en el header del horario
  const proximoTurno =
    !active && turnoActual
      ? `${turnoActual.ingreso} — ${turnoActual.salida}`
      : null;

  return (
    <div className="max-w-4xl mx-auto py-8 space-y-6 animate-in slide-in-from-bottom-10 duration-700">
      {/* ── Saludo ── */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm relative overflow-hidden flex items-center justify-between flex-wrap gap-4">
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-jbOrange rounded-l-2xl" />
        <div className="flex items-center gap-4 pl-4">
          <img
            src={user.avatar}
            className="w-11 h-11 rounded-full border-2 border-slate-100 bg-slate-50"
            alt={user.name}
          />
          <div>
            <p className="text-jbGray text-xs font-semibold">
              {getGreeting()},
            </p>
            <h2 className="text-lg font-black text-jbBlue font-heading leading-tight">
              {firstName} 👋
            </h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Building2 className="w-3 h-3 text-jbOrange" />
              <p className="text-jbGray text-[11px] font-semibold">
                {user.area}
              </p>
            </div>
          </div>
        </div>
        <div className="text-right pr-2">
          <p className="text-jbGray text-[10px] font-black uppercase tracking-widest">
            {time.toLocaleDateString("es-ES", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </p>
          <p className="text-xl font-black font-heading text-jbBlue tabular-nums mt-0.5">
            {time.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
      </div>

      {/* ✅ Banner del horario asignado */}
      {tieneHorarioReal && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-6 py-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-jbBlue/10 rounded-xl text-jbBlue">
              <CalendarDays className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] font-black text-jbGray uppercase tracking-widest">
                Tu horario asignado
              </p>
              <p className="text-sm font-black text-jbBlue font-heading">
                {scheduleNombre}
              </p>
            </div>
          </div>

          {/* Turno de hoy */}
          {turnosHoy.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {turnosHoy.map((t, i) => (
                <span
                  key={i}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase border ${
                    i === registrosHoyConCheckout.length && !active
                      ? "bg-jbBlue/10 text-jbBlue border-jbBlue/20"
                      : i < registrosHoyConCheckout.length
                        ? "bg-jbTurquoise/10 text-jbTurquoise border-jbTurquoise/20 line-through opacity-60"
                        : "bg-slate-100 text-slate-500 border-slate-200"
                  }`}
                >
                  {i < registrosHoyConCheckout.length ? "✓ " : ""}
                  {t.ingreso} — {t.salida}
                  {i === registrosHoyConCheckout.length && active
                    ? " ← activo"
                    : ""}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-[11px] text-slate-400 font-semibold">
              Sin turnos hoy ({diaHoy})
            </span>
          )}
        </div>
      )}

      {/* ── Reloj + Botones ── */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
        <div
          className={`h-1 ${active && isTardanza ? "bg-jbOrange" : active ? "bg-jbTurquoise" : "bg-slate-200"}`}
        />
        <div className="p-10 text-center">
          <h2 className="text-7xl font-black text-jbBlue tabular-nums tracking-tighter font-heading">
            {time.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-10">
            {/* Botón Entrada */}
            <button
              disabled={entradaDeshabilitada}
              onClick={() => mark(true)}
              className={`flex items-center gap-5 p-6 rounded-2xl transition-all duration-200 text-left ${
                entradaDeshabilitada
                  ? "bg-slate-50 text-slate-400 border-2 border-slate-200 cursor-not-allowed"
                  : "bg-jbBlue text-white hover:bg-jbNavy hover:scale-[1.02] active:scale-95 shadow-lg shadow-jbBlue/20 cursor-pointer"
              }`}
            >
              <div
                className={`p-3.5 rounded-xl flex-shrink-0 ${entradaDeshabilitada ? "bg-slate-200" : "bg-white/15"}`}
              >
                {entradaDeshabilitada && !active ? (
                  <Lock className="w-6 h-6 text-slate-400" />
                ) : (
                  <LogIn className="w-6 h-6" />
                )}
              </div>
              <div>
                <p className="font-black uppercase tracking-wide text-sm font-heading">
                  Registrar Entrada
                </p>
                <p
                  className={`text-xs font-semibold mt-0.5 ${
                    entradaDeshabilitada && !active && !completedToday
                      ? "text-jbOrange"
                      : "opacity-60"
                  }`}
                >
                  {txtEntrada}
                </p>
              </div>
            </button>

            {/* Botón Salida */}
            <button
              disabled={salidaDeshabilitada}
              onClick={() => mark(false)}
              className={`flex items-center gap-5 p-6 rounded-2xl transition-all duration-200 text-left ${
                salidaDeshabilitada
                  ? "bg-slate-50 text-slate-400 border-2 border-slate-200 cursor-not-allowed"
                  : "bg-jbOrange text-white hover:bg-orange-600 hover:scale-[1.02] active:scale-95 shadow-lg shadow-jbOrange/20 cursor-pointer"
              }`}
            >
              <div
                className={`p-3.5 rounded-xl flex-shrink-0 ${salidaDeshabilitada ? "bg-slate-200" : "bg-white/15"}`}
              >
                {salidaDeshabilitada && active ? (
                  <Lock className="w-6 h-6 text-slate-400" />
                ) : (
                  <LogOut className="w-6 h-6" />
                )}
              </div>
              <div>
                <p className="font-black uppercase tracking-wide text-sm font-heading">
                  Registrar Salida
                </p>
                <p
                  className={`text-xs font-semibold mt-0.5 ${
                    salidaDeshabilitada && active
                      ? "text-jbOrange"
                      : "opacity-60"
                  }`}
                >
                  {txtSalida}
                </p>
              </div>
            </button>
          </div>

          {/* Banner jornada activa */}
          {active && (
            <div
              className={`mt-6 flex items-center justify-center gap-2.5 font-black py-3.5 px-6 rounded-2xl border font-heading text-sm ${
                isTardanza
                  ? "bg-jbOrange/10 text-jbOrange border-jbOrange/20"
                  : "bg-jbTurquoise/10 text-jbTurquoise border-jbTurquoise/20"
              }`}
            >
              {isTardanza ? (
                <AlertCircle className="w-4 h-4" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              JORNADA ACTIVA —{" "}
              {isTardanza ? "ENTRADA CON TARDANZA" : "A TIEMPO"}:{" "}
              {new Date(active.checkIn.replace(" ", "T")).toLocaleTimeString(
                [],
                {
                  hour: "2-digit",
                  minute: "2-digit",
                },
              )}
            </div>
          )}

          {!active && completedToday && (
            <div className="mt-6 flex items-center justify-center gap-2.5 text-jbTurquoise font-bold bg-jbTurquoise/10 py-3.5 px-6 rounded-2xl border border-jbTurquoise/20 text-sm">
              <CheckCircle2 className="w-4 h-4" />
              Jornada completada. ¡Buen trabajo hoy!
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
            <p className="text-[10px] font-black text-jbGray uppercase tracking-widest">
              Tiempo trabajado
            </p>
            <p className="text-lg font-black text-jbBlue font-heading tabular-nums">
              {active ? formatWorked(workedSeconds) : "00:00:00"}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4">
          <div className="p-3 bg-slate-100 rounded-xl text-slate-500">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-black text-jbGray uppercase tracking-widest">
              Hora de entrada
            </p>
            <p className="text-lg font-black text-jbBlue font-heading">
              {active
                ? new Date(active.checkIn.replace(" ", "T")).toLocaleTimeString(
                    [],
                    {
                      hour: "2-digit",
                      minute: "2-digit",
                    },
                  )
                : "—"}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4">
          <div
            className={`p-3 rounded-xl ${
              active
                ? isTardanza
                  ? "bg-jbOrange/10 text-jbOrange"
                  : "bg-jbTurquoise/10 text-jbTurquoise"
                : "bg-slate-100 text-slate-400"
            }`}
          >
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-black text-jbGray uppercase tracking-widest">
              Estado hoy
            </p>
            <p
              className={`text-sm font-black font-heading uppercase ${
                active
                  ? isTardanza
                    ? "text-jbOrange"
                    : "text-jbTurquoise"
                  : "text-slate-400"
              }`}
            >
              {active
                ? `En jornada (${active.status})`
                : completedToday
                  ? "Turnos terminados"
                  : "Sin registrar"}
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
              <h3 className="text-sm font-black text-jbBlue font-heading uppercase tracking-wide">
                Mis últimos registros
              </h3>
              <p className="text-[10px] text-jbGray font-semibold">
                Historial reciente de asistencia
              </p>
            </div>
          </div>

          <div className="space-y-2.5">
            {recentRecords.map((r) => {
              const checkInTime = new Date(r.checkIn);
              const checkOutTime = r.checkOut ? new Date(r.checkOut) : null;
              const diffMs = checkOutTime
                ? checkOutTime.getTime() - checkInTime.getTime()
                : 0;
              const diffH = Math.floor(diffMs / 3600000);
              const diffM = Math.floor((diffMs % 3600000) / 60000);

              return (
                <div
                  key={r.id}
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-jbBlue/20 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-slate-300 flex-shrink-0" />
                    <p className="text-sm font-bold text-slate-700 uppercase">
                      {new Date(r.date).toLocaleDateString("es-ES", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right hidden sm:block">
                      <p className="text-[9px] text-jbGray font-black uppercase tracking-widest">
                        Entrada
                      </p>
                      <p className="text-sm font-black text-jbBlue font-heading">
                        {checkInTime.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <div className="text-right hidden sm:block">
                      <p className="text-[9px] text-jbGray font-black uppercase tracking-widest">
                        Salida
                      </p>
                      <p className="text-sm font-black text-jbBlue font-heading">
                        {checkOutTime
                          ? checkOutTime.toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] text-jbGray font-black uppercase tracking-widest">
                        Duración
                      </p>
                      <p className="text-sm font-black text-slate-600 font-heading">
                        {diffH > 0
                          ? `${diffH}h ${diffM}m`
                          : diffM > 0
                            ? `${diffM}m`
                            : "—"}
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1.5 text-[9px] font-black uppercase rounded-lg border font-heading ${getStatusColor(r.status)}`}
                    >
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
