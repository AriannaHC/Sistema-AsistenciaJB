import React, { useRef } from "react";
import { Schedule } from "../types";

interface Props {
  schedule: Schedule | null;
}

const DIAS_SEMANA = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];

const START_HOUR = 6;
const END_HOUR = 23;
const HOUR_HEIGHT = 64;
const COL_WIDTH = 120;
const HOUR_COL_W = 64;

const HOURS = Array.from(
  { length: END_HOUR - START_HOUR + 1 },
  (_, i) => START_HOUR + i,
);

const GRID_HEIGHT = HOURS.length * HOUR_HEIGHT;
const GRID_WIDTH = DIAS_SEMANA.length * COL_WIDTH;

const TURNO_COLORS = [
  "bg-blue-50 border-blue-500 text-blue-900",
  "bg-purple-50 border-purple-500 text-purple-900",
  "bg-pink-50 border-pink-400 text-pink-900",
  "bg-cyan-50 border-cyan-500 text-cyan-900",
  "bg-orange-50 border-orange-500 text-orange-900",
];

const timeToMinutes = (t: string) => {
  if (!t) return 0;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

const formatHourLabel = (hour: number) => {
  const ampm = hour >= 12 ? "PM" : "AM";
  const h = hour % 12 || 12;
  return `${h} ${ampm}`;
};

const formatTimeAMPM = (t: string) => {
  if (!t) return "";
  const [hStr, mStr] = t.split(":");
  let h = parseInt(hStr, 10);
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${mStr} ${ampm}`;
};

const ScheduleCalendar: React.FC<Props> = ({ schedule }) => {
  const bodyScrollRef = useRef<HTMLDivElement>(null);
  const headerScrollRef = useRef<HTMLDivElement>(null);

  if (!schedule) return null;

  const getTurnosForDay = (dia: string) => {
    if (schedule.type === "simple") {
      if (!["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"].includes(dia))
        return [];
      return [
        {
          ingreso: schedule.time_in?.substring(0, 5) || "",
          salida: schedule.time_out?.substring(0, 5) || "",
          colorClass: TURNO_COLORS[0],
          title: "Horario Fijo",
        },
      ];
    }
    const bloque = schedule.blocks?.find((b) => b.day === dia);
    if (!bloque) return [];
    return bloque.turnos.map((turno, i) => ({
      ...turno,
      colorClass: TURNO_COLORS[i % TURNO_COLORS.length],
      title: `Turno ${i + 1}`,
    }));
  };

  const handleBodyScroll = () => {
    if (headerScrollRef.current && bodyScrollRef.current) {
      headerScrollRef.current.scrollLeft = bodyScrollRef.current.scrollLeft;
    }
  };

  return (
    // ✅ overflow-hidden en el wrapper — evita que el contenido se desborde
    <div className="w-full bg-white border border-slate-200 rounded-xl shadow-sm font-sans overflow-hidden">
      {/* ══ CABECERA ══ */}
      <div className="flex border-b border-slate-200 bg-white">
        {/* ✅ Celda esquina con fondo blanco igual que el header */}
        <div
          className="flex-shrink-0 border-r border-slate-200 bg-white flex items-end justify-center pb-2"
          style={{ width: HOUR_COL_W, minWidth: HOUR_COL_W }}
        >
          <span className="text-[9px] font-medium text-slate-400 uppercase tracking-widest">
            hora
          </span>
        </div>

        {/* Header de días — overflow hidden, sincronizado con body */}
        <div
          ref={headerScrollRef}
          className="overflow-hidden flex-1"
          style={{ pointerEvents: "none" }}
        >
          <div className="flex" style={{ width: GRID_WIDTH }}>
            {DIAS_SEMANA.map((dia) => {
              const isWeekend = dia === "Sábado" || dia === "Domingo";
              return (
                <div
                  key={dia}
                  className={`
                    flex-shrink-0 py-3 text-center
                    border-r border-slate-200 last:border-r-0
                    ${isWeekend ? "bg-rose-50/40" : "bg-white"}
                  `}
                  style={{ width: COL_WIDTH }}
                >
                  <span
                    className={`
                    text-[11px] font-bold uppercase tracking-wider
                    ${isWeekend ? "text-rose-400" : "text-slate-600"}
                  `}
                  >
                    {dia}
                  </span>
                  {/* ✅ Etiqueta "Fin de semana" debajo del nombre */}
                  {isWeekend && (
                    <p className="text-[9px] text-rose-300 font-medium mt-0.5">
                      Fin de semana
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ══ CUERPO ══ */}
      <div
        ref={bodyScrollRef}
        onScroll={handleBodyScroll}
        className="overflow-auto"
        style={{ maxHeight: 520 }}
      >
        {/* ✅ Wrapper con ancho exacto = columna horas + grid días */}
        <div
          className="flex relative"
          style={{ width: HOUR_COL_W + GRID_WIDTH, height: GRID_HEIGHT }}
        >
          {/* ── Columna de horas ──────────────────────────────
              ✅ sticky left:0 con z-index alto y fondo sólido
              para que NUNCA quede tapada por las columnas de días
          ────────────────────────────────────────────────── */}
          <div
            className="flex-shrink-0 border-r border-slate-200 bg-white"
            style={{
              width: HOUR_COL_W,
              minWidth: HOUR_COL_W,
              height: GRID_HEIGHT,
              // ✅ sticky via style — más confiable que Tailwind en combinación con overflow-auto
              position: "sticky",
              left: 0,
              zIndex: 20,
              boxShadow: "2px 0 6px -2px rgba(0,0,0,0.06)", // sombra sutil para separar visualmente
            }}
          >
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="relative border-t border-slate-100 first:border-t-0"
                style={{ height: HOUR_HEIGHT }}
              >
                <span className="absolute -top-2.5 right-2 text-[10px] font-medium text-slate-400 whitespace-nowrap">
                  {formatHourLabel(hour)}
                </span>
              </div>
            ))}
          </div>

          {/* ── Grid de días ── */}
          <div
            className="relative flex"
            style={{ width: GRID_WIDTH, height: GRID_HEIGHT }}
          >
            {/* Líneas horizontales de fondo */}
            <div className="absolute inset-0 pointer-events-none z-0">
              {HOURS.map((hour) => (
                <div
                  key={hour}
                  className="w-full border-t border-slate-100 first:border-t-0"
                  style={{ height: HOUR_HEIGHT }}
                />
              ))}
            </div>

            {/* Columnas de cada día */}
            {DIAS_SEMANA.map((dia) => {
              const turnos = getTurnosForDay(dia);
              const isWeekend = dia === "Sábado" || dia === "Domingo";

              return (
                <div
                  key={dia}
                  className={`
                    relative flex-shrink-0
                    border-r border-slate-200 last:border-r-0
                  `}
                  style={{
                    width: COL_WIDTH,
                    height: GRID_HEIGHT,
                    // ✅ fondo diferenciado para fin de semana — más visible que opacity
                    background: isWeekend
                      ? "repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(251,207,232,0.15) 8px, rgba(251,207,232,0.15) 9px)"
                      : undefined,
                    backgroundColor: isWeekend
                      ? "rgba(255,241,245,0.5)"
                      : undefined,
                  }}
                >
                  {/* ✅ Indicador visual sutil en fin de semana */}
                  {isWeekend && turnos.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <span
                        className="text-[9px] font-bold text-rose-200 uppercase tracking-widest"
                        style={{ writingMode: "vertical-rl", rotate: "180deg" }}
                      >
                        Descanso
                      </span>
                    </div>
                  )}

                  {turnos.map((turno, idx) => {
                    if (!turno.ingreso || !turno.salida) return null;

                    const startMins = timeToMinutes(turno.ingreso);
                    const endMins = timeToMinutes(turno.salida);
                    const topPx =
                      (startMins - START_HOUR * 60) * (HOUR_HEIGHT / 60);
                    const heightPx = (endMins - startMins) * (HOUR_HEIGHT / 60);

                    if (topPx < 0 || heightPx <= 0) return null;

                    return (
                      <div
                        key={idx}
                        className="absolute left-1 right-1 z-10"
                        style={{ top: topPx, height: heightPx }}
                      >
                        <div
                          className={`
                          w-full h-full rounded-md border-l-4
                          px-1.5 py-1 flex flex-col overflow-hidden
                          shadow-sm hover:shadow-md transition-shadow
                          cursor-default select-none
                          ${turno.colorClass}
                        `}
                        >
                          <span className="text-[9px] font-bold leading-tight truncate opacity-80">
                            {formatTimeAMPM(turno.ingreso)} —{" "}
                            {formatTimeAMPM(turno.salida)}
                          </span>
                          {heightPx > 32 && (
                            <span className="text-[10px] font-semibold leading-tight truncate mt-0.5">
                              {turno.title}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScheduleCalendar;
