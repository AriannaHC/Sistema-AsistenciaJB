import React, { useState, useEffect, useRef } from "react";
import { AttendanceRecord, AttendanceStatus, User, Schedule } from "../types";
import { attendanceApi } from "../services/api";
import {
  LogIn,
  LogOut,
  CheckCircle2,
  Clock,
  Building2,
  Timer,
  TrendingUp,
  AlertCircle,
  Lock,
  CalendarDays,
  UtensilsCrossed,
  RotateCcw,
  FileText,
  X,
  Upload,
  ImageIcon,
  Send,
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost/backend-jb";

interface Props {
  records: AttendanceRecord[];
  user: User;
  schedule: Schedule | null;
  userLunchStartTime: string;
  userLunchLimit: string;
  onAdd: (record: AttendanceRecord) => void;
  onUpdate: (record: AttendanceRecord) => void;
}

const CATEGORIAS_REPORTE = [
  "Falla en mi marcación de asistencia",
  "No pude marcar mi entrada",
  "No pude marcar mi salida",
  "No pude marcar mi almuerzo",
  "Error en el sistema",
  "Problema con mi horario asignado",
  "Ausencia justificada",
  "Llegada tarde justificada",
  "Salida anticipada justificada",
  "Otro",
];

// ─── HELPERS PARA LA TABLA DE REGISTROS ─────────────────────
const formatShortDate = (dateStr: string) => {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const dayName = date
    .toLocaleDateString("es-ES", { weekday: "short" })
    .substring(0, 3)
    .toUpperCase();
  const monthName = date
    .toLocaleDateString("es-ES", { month: "short" })
    .substring(0, 3)
    .toUpperCase();
  return `${dayName}, ${date.getDate()} ${monthName}`;
};

const formatTimeOnly = (dateTimeStr?: string) => {
  if (!dateTimeStr) return "—";
  const d = new Date(dateTimeStr.replace(" ", "T"));
  return d
    .toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
    .toLowerCase();
};

const StatusBadge = ({ status }: { status: string }) => {
  if (status === "Presente")
    return (
      <span className="px-3 py-1.5 bg-jbTurquoise/10 text-jbTurquoise border border-jbTurquoise/20 rounded-lg text-[10px] font-black uppercase tracking-widest">
        {status}
      </span>
    );
  if (status === "Tardanza")
    return (
      <span className="px-3 py-1.5 bg-jbOrange/10 text-jbOrange border border-jbOrange/20 rounded-lg text-[10px] font-black uppercase tracking-widest">
        {status}
      </span>
    );
  return (
    <span className="px-3 py-1.5 bg-red-100 text-red-600 border border-red-200 rounded-lg text-[10px] font-black uppercase tracking-widest">
      {status}
    </span>
  );
};

// ─── MODAL REPORTE ───────────────────────────────────────────
const ReporteModal: React.FC<{ user: User; onClose: () => void }> = ({
  user,
  onClose,
}) => {
  const [categoria, setCategoria] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [fotos, setFotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const agregarFotos = (files: FileList | null) => {
    if (!files) return;
    const disponibles = 3 - fotos.length;
    if (disponibles <= 0) return;
    const nuevas = Array.from(files).slice(0, disponibles);

    nuevas.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setPreviews((prev) => [...prev, e.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });

    setFotos((prev) => [...prev, ...nuevas]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const eliminarFoto = (idx: number) => {
    setFotos((prev) => prev.filter((_, i) => i !== idx));
    setPreviews((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleEnviar = async () => {
    setError("");
    if (!categoria) {
      setError("Por favor selecciona una categoría.");
      return;
    }
    if (!descripcion.trim()) {
      setError("Por favor escribe una descripción.");
      return;
    }
    if (descripcion.trim().length < 10) {
      setError("La descripción debe tener al menos 10 caracteres.");
      return;
    }

    setEnviando(true);
    try {
      const token = sessionStorage.getItem("jb_token");
      const formData = new FormData();
      formData.append("categoria", categoria);
      formData.append("descripcion", descripcion);
      fotos.forEach((foto, i) => formData.append(`foto${i + 1}`, foto));

      const res = await fetch(`${API_BASE}/api/employee_reports/`, {
        method: "POST",
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: formData,
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Error al enviar.");
      setEnviado(true);
    } catch (e: any) {
      setError(e.message || "Error al enviar el reporte.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
        <div className="sticky top-0 bg-white rounded-t-3xl border-b border-slate-100 px-7 py-5 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-jbBlue/10 rounded-xl text-jbBlue">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-jbBlue font-heading uppercase tracking-wide">
                Registrar Reporte
              </h2>
              <p className="text-[10px] text-jbGray font-semibold mt-0.5">
                {user.name} · {user.area}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-7 py-6 space-y-5">
          {enviado ? (
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </div>
              <div>
                <h3 className="text-lg font-black text-jbBlue font-heading">
                  ¡Reporte enviado!
                </h3>
                <p className="text-sm text-jbGray font-medium mt-1">
                  Tu reporte ha sido registrado. El equipo de RRHH lo revisará
                  pronto.
                </p>
              </div>
              <button
                onClick={onClose}
                className="mt-2 px-6 py-3 bg-jbBlue text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-jbNavy transition-all"
              >
                Cerrar
              </button>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-[10px] font-black text-jbGray uppercase tracking-widest mb-2">
                  Categoría del reporte <span className="text-red-500">*</span>
                </label>
                <select
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 text-sm font-semibold text-slate-700 focus:outline-none focus:border-jbBlue focus:bg-white transition-all appearance-none"
                >
                  <option value="">— Selecciona una categoría —</option>
                  {CATEGORIAS_REPORTE.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-jbGray uppercase tracking-widest mb-2">
                  Descripción <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Describe detalladamente lo que ocurrió..."
                  rows={4}
                  maxLength={500}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 text-sm font-medium text-slate-700 focus:outline-none focus:border-jbBlue focus:bg-white transition-all resize-none"
                />
                <p className="text-[10px] text-slate-400 font-semibold text-right mt-1">
                  {descripcion.length}/500
                </p>
              </div>

              <div>
                <label className="block text-[10px] font-black text-jbGray uppercase tracking-widest mb-2">
                  Evidencia fotográfica
                  <span className="text-slate-400 font-semibold normal-case ml-1">
                    (opcional · máx. 3 fotos)
                  </span>
                </label>

                {previews.length > 0 && (
                  <div className="flex gap-3 mb-3 flex-wrap">
                    {previews.map((src, idx) => (
                      <div
                        key={idx}
                        className="relative w-24 h-24 rounded-2xl overflow-hidden border-2 border-slate-200 group bg-slate-100"
                      >
                        <img
                          src={src}
                          alt={`foto ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          onClick={() => eliminarFoto(idx)}
                          className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                        >
                          <X className="w-5 h-5 text-white" />
                        </button>
                        <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">
                          {idx + 1}
                        </span>
                      </div>
                    ))}
                    {fotos.length < 3 && (
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-24 h-24 rounded-2xl border-2 border-dashed border-slate-300 hover:border-jbBlue flex flex-col items-center justify-center gap-1 text-slate-400 hover:text-jbBlue transition-all"
                      >
                        <ImageIcon className="w-5 h-5" />
                        <span className="text-[9px] font-black uppercase">
                          Agregar
                        </span>
                      </button>
                    )}
                  </div>
                )}

                {fotos.length === 0 && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex items-center justify-center gap-3 py-5 rounded-2xl border-2 border-dashed border-slate-200 hover:border-jbBlue text-slate-400 hover:text-jbBlue transition-all font-black text-xs uppercase tracking-wide"
                  >
                    <Upload className="w-4 h-4" /> Subir fotos (JPG, PNG · máx.
                    3)
                  </button>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  className="hidden"
                  onChange={(e) => agregarFotos(e.target.files)}
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <p className="text-xs font-bold text-red-600">{error}</p>
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  onClick={onClose}
                  className="flex-1 py-3.5 rounded-2xl border-2 border-slate-200 text-slate-500 font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleEnviar}
                  disabled={enviando}
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-jbBlue text-white font-black text-xs uppercase tracking-widest hover:bg-jbNavy transition-all shadow-lg shadow-jbBlue/20 disabled:opacity-60"
                >
                  {enviando ? (
                    <>
                      <Clock className="w-4 h-4 animate-spin" /> Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" /> Enviar Reporte
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── COMPONENTE PRINCIPAL ────────────────────────────────────
const AttendanceControl: React.FC<Props> = ({
  records,
  user,
  schedule,
  userLunchStartTime,
  userLunchLimit,
  onAdd,
  onUpdate,
}) => {
  const [time, setTime] = useState(new Date());
  const [active, setActive] = useState<AttendanceRecord | null>(null);
  const [workedSeconds, setWorkedSeconds] = useState(0);
  const [showReporte, setShowReporte] = useState(false);

  const [lunchSeconds, setLunchSeconds] = useState(0);
  const [isOnLunch, setIsOnLunch] = useState(false);
  const [lunchDone, setLunchDone] = useState(false);
  const [lunchTardanza, setLunchTardanza] = useState(false);
  const [lunchResult, setLunchResult] = useState("");
  const [loadingLunch, setLoadingLunch] = useState(false);

  const lunchStartRef = useRef<Date | null>(null);
  const lunchIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Filtrar los últimos 5 registros del usuario logueado
  const ultimosRegistros = records
    .filter((r) => r.userId === user.id)
    .slice(0, 5);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const getToday = (): string =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Lima",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());

  const today = getToday();

  const startLunchTimer = (from: Date) => {
    lunchStartRef.current = from;
    if (lunchIntervalRef.current) clearInterval(lunchIntervalRef.current);
    const update = () => {
      if (!lunchStartRef.current) return;
      setLunchSeconds(
        Math.floor((Date.now() - lunchStartRef.current.getTime()) / 1000),
      );
    };
    update();
    lunchIntervalRef.current = setInterval(update, 1000);
  };

  const stopLunchTimer = () => {
    if (lunchIntervalRef.current) {
      clearInterval(lunchIntervalRef.current);
      lunchIntervalRef.current = null;
    }
    lunchStartRef.current = null;
  };

  useEffect(() => () => stopLunchTimer(), []);

  const getLimitInSeconds = (limitStr: string) => {
    if (!limitStr) return 0;
    const [h, m] = limitStr.split(":").map(Number);
    return h * 3600 + (m || 0) * 60;
  };

  // Helper para la tabla de últimos registros
  const checkLunchLate = (start?: string, end?: string, limit?: string) => {
    if (!start || !end || !limit) return null;
    const s = new Date(start.replace(" ", "T")).getTime();
    const e = new Date(end.replace(" ", "T")).getTime();
    const limitSecs = getLimitInSeconds(limit.substring(0, 5));
    if (limitSecs <= 0) return null;
    return (e - s) / 1000 > limitSecs;
  };

  useEffect(() => {
    const found = records.find(
      (r) => r.userId === user.id && r.date === today && !r.checkOut,
    );
    setActive(found || null);

    if (found) {
      const r = found as any;
      if (r.lunchStart && r.lunchEnd) {
        setLunchDone(true);
        setIsOnLunch(false);
        stopLunchTimer();
        const ms =
          new Date(r.lunchEnd).getTime() - new Date(r.lunchStart).getTime();
        const secs = Math.floor(ms / 1000);
        setLunchSeconds(secs);

        const limitRaw = (r.lunchLimit || userLunchLimit || "").substring(0, 5);
        const limitSecs = getLimitInSeconds(limitRaw);

        if (limitSecs > 0) {
          const isLate = secs > limitSecs;
          setLunchTardanza(isLate);
          setLunchResult(
            isLate
              ? "⚠️ Regresaste tarde del almuerzo"
              : "✅ Regresaste a tiempo",
          );
        }
      } else if (r.lunchStart && !r.lunchEnd) {
        setIsOnLunch(true);
        setLunchDone(false);
        startLunchTimer(new Date(r.lunchStart));
      } else {
        setIsOnLunch(false);
        setLunchDone(false);
        setLunchSeconds(0);
        stopLunchTimer();
      }
    } else {
      stopLunchTimer();
    }
  }, [records, user.id, today, userLunchLimit]);

  useEffect(() => {
    if (!active) {
      setWorkedSeconds(0);
      return;
    }
    const update = () => {
      const checkInDate = new Date(active.checkIn.replace(" ", "T"));
      setWorkedSeconds(
        Math.max(0, Math.floor((Date.now() - checkInDate.getTime()) / 1000)),
      );
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [active]);

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
  const registrosHoyConCheckout = records.filter(
    (r) => r.userId === user.id && r.date === today && !!r.checkOut,
  );

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

  const toDateHoy = (hhmm: string): Date => {
    const [h, m] = hhmm.split(":").map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d;
  };

  const lunchStartBlocked = userLunchStartTime
    ? time < toDateHoy(userLunchStartTime)
    : false;
  const lunchStartHoraTexto = userLunchStartTime
    ? toDateHoy(userLunchStartTime).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  const calcularEstadoBotones = () => {
    const tieneHorarioReal = schedule && schedule.id !== "default-schedule-id";

    if (!tieneHorarioReal) {
      return {
        entradaDeshabilitada: !!active || isOnLunch,
        salidaDeshabilitada: !active || isOnLunch,
        txtEntrada: active
          ? `Entrada a las ${new Date(active.checkIn.replace(" ", "T")).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
          : "Control Flexible JB",
        txtSalida: isOnLunch
          ? "Regresa del almuerzo primero"
          : "Control Flexible JB",
        completedToday: false,
      };
    }

    if (active && active.checkIn) {
      const fechaEntrada = active.checkIn.replace(" ", "T").split("T")[0];
      if (fechaEntrada !== today) {
        return {
          entradaDeshabilitada: false,
          salidaDeshabilitada: false,
          txtEntrada: turnoActual
            ? `Turno de las ${turnoActual.ingreso}`
            : "Registrar entrada",
          txtSalida: "Registrar salida pendiente del día anterior",
          completedToday: false,
        };
      }
    }

    if (!turnoActual) {
      const hayTurnosCompletados = registrosHoyConCheckout.length > 0;
      return {
        entradaDeshabilitada: true,
        salidaDeshabilitada: !active || isOnLunch,
        txtEntrada: hayTurnosCompletados
          ? "Jornada de hoy completada"
          : "Sin turnos programados hoy",
        txtSalida: isOnLunch
          ? "Regresa del almuerzo primero"
          : "Fin de Jornada",
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

    if (isOnLunch) {
      return {
        entradaDeshabilitada: true,
        salidaDeshabilitada: true,
        txtEntrada: `Entrada a las ${new Date(active.checkIn.replace(" ", "T")).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
        txtSalida: "Regresa del almuerzo primero",
        completedToday: false,
      };
    }

    const horaSalida = toDateHoy(turnoActual.salida);
    const limiteSalida = new Date(horaSalida.getTime() - 5 * 60000);

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
        salidaDeshabilitada: false,
        txtEntrada: `Entrada a las ${new Date(active.checkIn.replace(" ", "T")).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
        txtSalida: `Termina tu turno de las ${turnoActual.salida}`,
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

  const mark = (isEntry: boolean) => {
    const now = new Date();
    if (isEntry) {
      onAdd({
        id: "",
        userId: user.id,
        userName: user.name,
        date: today,
        checkIn: now.toISOString(),
        status: AttendanceStatus.PRESENT,
      });
    } else if (active) {
      onUpdate({ ...active, checkOut: now.toISOString() });
    }
  };

  const handleLunchStart = async () => {
    setLoadingLunch(true);
    try {
      const result = await attendanceApi.lunchStart();
      const lunchStartDate = new Date(result.lunchStart || result.lunch_start);
      setIsOnLunch(true);
      setActive((prev: any) =>
        prev ? { ...prev, lunchStart: lunchStartDate.toISOString() } : prev,
      );
      startLunchTimer(lunchStartDate);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoadingLunch(false);
    }
  };

  const handleLunchEnd = async () => {
    setLoadingLunch(true);
    try {
      const result = await attendanceApi.lunchEnd();
      stopLunchTimer();
      setIsOnLunch(false);
      setLunchDone(true);

      const ls = result.lunchStart || result.lunch_start;
      const le = result.lunchEnd || result.lunch_end;
      const limitRaw = (
        result.lunchLimit ||
        result.lunch_limit ||
        userLunchLimit ||
        ""
      ).substring(0, 5);

      let esTardanza = false;

      if (ls && le) {
        const ms = new Date(le).getTime() - new Date(ls).getTime();
        const secs = Math.floor(ms / 1000);
        setLunchSeconds(secs);

        const limitSecs = getLimitInSeconds(limitRaw);
        if (limitSecs > 0) {
          esTardanza = secs > limitSecs;
        }
      }

      setLunchTardanza(esTardanza);
      setLunchResult(
        esTardanza
          ? "⚠️ Regresaste tarde del almuerzo"
          : "✅ Regresaste a tiempo",
      );
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoadingLunch(false);
    }
  };

  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600),
      m = Math.floor((secs % 3600) / 60),
      s = secs % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const getGreeting = () => {
    const h = time.getHours();
    if (h < 12) return "Buenos días";
    if (h < 18) return "Buenas tardes";
    return "Buenas noches";
  };

  const firstName = user.name.split(" ")[0];
  const isTardanza = active?.status === "Tardanza";
  const tieneHorarioReal = schedule && schedule.id !== "default-schedule-id";
  const activeLunchLimit = (
    userLunchLimit ||
    (active as any)?.lunchLimit ||
    (active as any)?.lunch_limit ||
    ""
  ).substring(0, 5);

  return (
    <div className="max-w-4xl mx-auto py-8 space-y-6 animate-in slide-in-from-bottom-10 duration-700">
      {showReporte && (
        <ReporteModal user={user} onClose={() => setShowReporte(false)} />
      )}

      {/* Saludo */}
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

      {/* Banner horario */}
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
                {schedule?.name}
              </p>
            </div>
          </div>
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

      {/* Reloj + Botones */}
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

          {isOnLunch && (
            <div className="mt-4 inline-flex items-center gap-3 bg-jbOrange/10 border border-jbOrange/20 px-6 py-3 rounded-2xl">
              <Clock className="w-5 h-5 text-jbOrange animate-pulse" />
              <span className="font-black text-jbOrange text-2xl tabular-nums font-heading">
                {formatTime(lunchSeconds)}
              </span>
              <span className="text-jbOrange font-black text-xs uppercase tracking-widest">
                ALMUERZO EN CURSO
              </span>
              {activeLunchLimit && (
                <span className="text-jbOrange/60 font-bold text-xs border-l border-jbOrange/20 pl-3">
                  límite: {activeLunchLimit}
                </span>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-10">
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
                  className={`text-xs font-semibold mt-0.5 ${entradaDeshabilitada && !active && !completedToday ? "text-jbOrange" : "opacity-60"}`}
                >
                  {txtEntrada}
                </p>
              </div>
            </button>

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
                  className={`text-xs font-semibold mt-0.5 ${salidaDeshabilitada && active ? "text-jbOrange" : "opacity-60"}`}
                >
                  {txtSalida}
                </p>
              </div>
            </button>
          </div>

          {/* Almuerzo */}
          {active && !completedToday && (
            <div className="mt-5">
              {!isOnLunch && !lunchDone && (
                <button
                  onClick={handleLunchStart}
                  disabled={loadingLunch || lunchStartBlocked}
                  className={`w-full flex items-center justify-center gap-3 p-4 rounded-2xl font-black text-sm transition-all border disabled:opacity-60 ${
                    lunchStartBlocked
                      ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                      : "bg-slate-100 hover:bg-slate-200 text-jbBlue border-slate-200"
                  }`}
                >
                  {loadingLunch ? (
                    <>
                      <Clock className="w-4 h-4 animate-spin" /> REGISTRANDO...
                    </>
                  ) : lunchStartBlocked ? (
                    <>
                      <Lock className="w-4 h-4" /> ALMUERZO DISPONIBLE A LAS{" "}
                      {lunchStartHoraTexto}
                    </>
                  ) : (
                    <>
                      <UtensilsCrossed className="w-4 h-4" /> INICIAR ALMUERZO{" "}
                      {userLunchStartTime
                        ? `(desde ${userLunchStartTime})`
                        : ""}
                    </>
                  )}
                </button>
              )}
              {isOnLunch && (
                <button
                  onClick={handleLunchEnd}
                  disabled={loadingLunch}
                  className="w-full flex items-center justify-center gap-3 p-5 rounded-2xl bg-jbOrange text-white font-black text-sm transition-all shadow-lg shadow-jbOrange/20 hover:bg-orange-600 disabled:opacity-60"
                >
                  {loadingLunch ? (
                    <>
                      <Clock className="w-4 h-4 animate-spin" /> REGISTRANDO...
                    </>
                  ) : (
                    <>
                      <RotateCcw className="w-4 h-4" /> VOLVER DEL ALMUERZO —
                      FINALIZAR DESCANSO
                    </>
                  )}
                </button>
              )}
              {lunchDone && (
                <div
                  className={`flex items-center justify-center gap-3 p-4 rounded-2xl font-black text-sm border ${
                    lunchTardanza
                      ? "bg-red-50 text-red-500 border-red-200"
                      : "bg-green-50 text-green-600 border-green-200"
                  }`}
                >
                  <span>{lunchResult}</span>
                  <span className="font-mono text-lg tabular-nums">
                    {formatTime(lunchSeconds)}
                  </span>
                  {lunchTardanza && (
                    <span className="text-[10px] uppercase tracking-widest bg-red-100 px-2 py-1 rounded-full">
                      TARDANZA
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Banner jornada */}
          {active && (
            <div
              className={`mt-6 flex items-center justify-center gap-2.5 font-black py-3.5 px-6 rounded-2xl border font-heading text-sm ${
                isOnLunch
                  ? "bg-jbOrange/10 text-jbOrange border-jbOrange/20"
                  : isTardanza
                    ? "bg-jbOrange/10 text-jbOrange border-jbOrange/20"
                    : "bg-jbTurquoise/10 text-jbTurquoise border-jbTurquoise/20"
              }`}
            >
              {isOnLunch ? (
                <UtensilsCrossed className="w-4 h-4" />
              ) : isTardanza ? (
                <AlertCircle className="w-4 h-4" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              {isOnLunch
                ? "EN ALMUERZO"
                : isTardanza
                  ? "ENTRADA CON TARDANZA"
                  : "JORNADA ACTIVA"}{" "}
              —{" "}
              {new Date(active.checkIn.replace(" ", "T")).toLocaleTimeString(
                [],
                { hour: "2-digit", minute: "2-digit" },
              )}
            </div>
          )}

          {!active && completedToday && (
            <div className="mt-6 flex items-center justify-center gap-2.5 text-jbTurquoise font-bold bg-jbTurquoise/10 py-3.5 px-6 rounded-2xl border border-jbTurquoise/20 text-sm">
              <CheckCircle2 className="w-4 h-4" /> Jornada completada. ¡Buen
              trabajo hoy!
            </div>
          )}
        </div>
      </div>

      {/* Tarjetas resumen */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4">
          <div className="p-3 bg-jbBlue/10 rounded-xl text-jbBlue">
            <Timer className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-black text-jbGray uppercase tracking-widest">
              Tiempo trabajado
            </p>
            <p className="text-lg font-black text-jbBlue font-heading tabular-nums">
              {active ? formatTime(workedSeconds) : "00:00:00"}
            </p>
            {isOnLunch && (
              <p className="text-[9px] text-jbOrange font-black uppercase">
                (PAUSA)
              </p>
            )}
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
                    { hour: "2-digit", minute: "2-digit" },
                  )
                : "—"}
            </p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4">
          <div
            className={`p-3 rounded-xl ${lunchDone ? (lunchTardanza ? "bg-red-100 text-red-500" : "bg-green-100 text-green-600") : isOnLunch ? "bg-jbOrange/10 text-jbOrange" : "bg-slate-100 text-slate-400"}`}
          >
            <UtensilsCrossed className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-black text-jbGray uppercase tracking-widest">
              Tiempo almuerzo
            </p>
            <p
              className={`text-sm font-black font-heading tabular-nums ${lunchDone ? (lunchTardanza ? "text-red-500" : "text-green-600") : isOnLunch ? "text-jbOrange" : "text-slate-400"}`}
            >
              {lunchDone || isOnLunch ? formatTime(lunchSeconds) : "—"}
            </p>
            {lunchDone && (
              <p
                className={`text-[9px] font-black uppercase ${lunchTardanza ? "text-red-400" : "text-green-500"}`}
              >
                {lunchTardanza ? "⚠️ TARDANZA" : "✅ A TIEMPO"}
              </p>
            )}
            {isOnLunch && (
              <p className="text-[9px] text-jbOrange font-black uppercase animate-pulse">
                EN CURSO
              </p>
            )}
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4">
          <div
            className={`p-3 rounded-xl ${isOnLunch ? "bg-jbOrange/10 text-jbOrange" : active ? (isTardanza ? "bg-jbOrange/10 text-jbOrange" : "bg-jbTurquoise/10 text-jbTurquoise") : "bg-slate-100 text-slate-400"}`}
          >
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-black text-jbGray uppercase tracking-widest">
              Estado hoy
            </p>
            <p
              className={`text-sm font-black font-heading uppercase ${isOnLunch ? "text-jbOrange" : active ? (isTardanza ? "text-jbOrange" : "text-jbTurquoise") : "text-slate-400"}`}
            >
              {isOnLunch
                ? "En almuerzo"
                : active
                  ? `En jornada (${active.status})`
                  : completedToday
                    ? "Completado"
                    : "Sin registrar"}
            </p>
          </div>
        </div>
      </div>

      {/* ── MIS ÚLTIMOS REGISTROS ── */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl p-6 md:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-jbBlue/10 rounded-xl text-jbBlue">
            <CalendarDays className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-jbBlue font-heading uppercase tracking-wide">
              Mis Últimos Registros
            </h3>
            <p className="text-[10px] text-jbGray font-semibold mt-0.5">
              Historial reciente de asistencia
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {ultimosRegistros.length === 0 ? (
            <p className="text-center text-slate-400 text-sm font-bold py-4">
              No hay registros recientes.
            </p>
          ) : (
            ultimosRegistros.map((r) => {
              const lunchLate = checkLunchLate(
                r.lunchStart,
                r.lunchEnd,
                r.lunchLimit,
              );
              return (
                <div
                  key={r.id}
                  className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 bg-slate-50/50 hover:bg-slate-50 border border-slate-100 hover:border-jbBlue/20 rounded-2xl transition-all gap-4"
                >
                  {/* Fecha */}
                  <div className="flex items-center gap-3 min-w-[130px]">
                    <div className="w-2 h-2 rounded-full bg-slate-300" />
                    <span className="font-black text-slate-700 text-sm uppercase">
                      {formatShortDate(r.date)}
                    </span>
                  </div>

                  <div className="flex flex-wrap md:flex-nowrap flex-1 w-full gap-4 md:gap-8 justify-between md:justify-end items-center">
                    {/* Entrada */}
                    <div className="text-center md:text-left">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">
                        Entrada
                      </p>
                      <p className="text-xs font-bold text-jbBlue">
                        {formatTimeOnly(r.checkIn)}
                      </p>
                    </div>

                    {/* Salida */}
                    <div className="text-center md:text-left">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">
                        Salida
                      </p>
                      <p className="text-xs font-bold text-jbBlue">
                        {formatTimeOnly(r.checkOut)}
                      </p>
                    </div>

                    {/* Almuerzo */}
                    <div className="text-center md:text-left flex-1 min-w-[150px] max-w-[200px]">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">
                        Almuerzo
                      </p>
                      {r.lunchStart && r.lunchEnd ? (
                        <div className="flex items-center justify-center md:justify-start gap-1.5">
                          <span className="text-xs font-bold text-slate-600">
                            {formatTimeOnly(r.lunchStart)} →{" "}
                            {formatTimeOnly(r.lunchEnd)}
                          </span>
                          {lunchLate !== null && (
                            <span
                              title={
                                lunchLate ? "Tardanza de almuerzo" : "A tiempo"
                              }
                            >
                              {lunchLate ? "⚠️" : "✅"}
                            </span>
                          )}
                        </div>
                      ) : r.lunchStart ? (
                        <span className="text-xs font-bold text-jbOrange animate-pulse">
                          En curso...
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-slate-400">
                          —
                        </span>
                      )}
                    </div>

                    {/* Estado */}
                    <div className="text-right flex items-center justify-end min-w-[90px]">
                      <StatusBadge status={r.status} />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Botón Registrar Reporte */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl p-7">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-jbBlue/10 rounded-xl text-jbBlue">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-jbBlue font-heading uppercase tracking-wide">
                ¿Tuviste un problema con tu asistencia?
              </h3>
              <p className="text-[10px] text-jbGray font-semibold mt-0.5">
                Registra un reporte y el equipo de RRHH lo revisará.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowReporte(true)}
            className="flex items-center gap-2 bg-jbBlue text-white px-6 py-3 rounded-2xl font-black text-[10px] tracking-widest uppercase hover:bg-jbNavy transition-all shadow-lg shadow-jbBlue/20"
          >
            <FileText className="w-4 h-4" />
            REGISTRAR REPORTE
          </button>
        </div>
      </div>
    </div>
  );
};

export default AttendanceControl;
