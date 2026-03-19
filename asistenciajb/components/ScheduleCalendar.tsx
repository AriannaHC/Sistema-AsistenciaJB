import React, { useMemo, useRef, useEffect } from "react";
import { Schedule } from "../types";

interface Props {
  schedule: Schedule | null;
}

interface CalendarEvent {
  id: string;
  title: string;
  day: number;
  startHour: number;
  endHour: number;
  ingreso: string;
  salida: string;
  colorClass: string;
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

const START_HOUR = 0; // Empezamos a las 0 para tener las 24 horas completas en la tabla
const END_HOUR = 23;
const HOUR_HEIGHT = 64;

const HOURS = Array.from({ length: 24 }, (_, i) => i);

// Colores sólidos y modernos basados en el diseño propuesto
const EVENT_COLORS = [
  "bg-blue-500 text-white border-blue-600",
  "bg-purple-500 text-white border-purple-600",
  "bg-cyan-500 text-white border-cyan-600",
  "bg-orange-500 text-white border-orange-600",
  "bg-emerald-500 text-white border-emerald-600",
];

const timeToMinutes = (t: string) => {
  if (!t) return 0;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

const formatHourLabel = (hour: number) => {
  if (hour === 0) return "12 AM";
  if (hour === 12) return "12 PM";
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

// 🚀 NUEVO: Función para saber qué día es hoy y pintarlo en el header
function getTodayIndex(): number {
  const jsDay = new Date().getDay(); // 0=Domingo
  return jsDay === 0 ? 6 : jsDay - 1; // Convertimos a nuestro formato 0=Lunes...6=Domingo
}

const ScheduleCalendar: React.FC<Props> = ({ schedule }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const todayIdx = useMemo(() => getTodayIndex(), []);

  // ── 1. Adaptar el Horario a Eventos de Calendario ──
  const events = useMemo(() => {
    if (!schedule) return [];
    const evts: CalendarEvent[] = [];

    DIAS_SEMANA.forEach((dia, dayIdx) => {
      if (schedule.type === "simple") {
        if (
          ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"].includes(dia)
        ) {
          if (schedule.time_in && schedule.time_out) {
            const ingreso = schedule.time_in.substring(0, 5);
            const salida = schedule.time_out.substring(0, 5);
            evts.push({
              id: `${dia}-simple`,
              title: schedule.name || "Horario Fijo",
              day: dayIdx,
              startHour: timeToMinutes(ingreso) / 60,
              endHour: timeToMinutes(salida) / 60,
              ingreso,
              salida,
              colorClass: EVENT_COLORS[0],
            });
          }
        }
      } else {
        const blocksArray =
          typeof schedule.blocks === "string"
            ? JSON.parse(schedule.blocks)
            : schedule.blocks;

        const bloque = blocksArray?.find((b: any) => b.day === dia);

        if (bloque && bloque.turnos) {
          bloque.turnos.forEach((turno: any, i: number) => {
            if (turno.ingreso && turno.salida) {
              evts.push({
                id: `${dia}-${i}`,
                title: `Turno ${i + 1}`,
                day: dayIdx,
                startHour: timeToMinutes(turno.ingreso) / 60,
                endHour: timeToMinutes(turno.salida) / 60,
                ingreso: turno.ingreso,
                salida: turno.salida,
                colorClass: EVENT_COLORS[i % EVENT_COLORS.length],
              });
            }
          });
        }
      }
    });
    return evts;
  }, [schedule]);

  // Agrupar eventos por día para facilitar el renderizado
  const eventsByDay = useMemo(() => {
    const map: Record<number, CalendarEvent[]> = {};
    for (let d = 0; d < 7; d++) map[d] = [];
    events.forEach((e) => map[e.day].push(e));
    return map;
  }, [events]);

  // Auto-scroll Inteligente al primer turno
  useEffect(() => {
    if (scrollRef.current && events.length > 0) {
      const earliest = Math.min(...events.map((e) => e.startHour));
      const scrollPos = earliest * HOUR_HEIGHT - 40;
      scrollRef.current.scrollTop = Math.max(0, scrollPos);
    }
  }, [events]);

  if (!schedule) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[70vh] min-h-[500px]">
      <div
        className="flex-1 overflow-y-auto overflow-x-auto custom-scrollbar"
        ref={scrollRef}
      >
        <table className="w-full min-w-[700px] border-collapse table-fixed">
          <colgroup>
            <col className="w-16" />
            {DIAS_SEMANA.map((_, i) => (
              <col key={i} />
            ))}
          </colgroup>

          {/* ── CABECERA STICKY ── */}
          <thead className="sticky top-0 z-20 shadow-sm">
            <tr>
              <th className="border-b border-r border-slate-200 bg-slate-50" />
              {DIAS_SEMANA.map((dia, i) => {
                const isToday = i === todayIdx;
                const isWeekend = i >= 5;
                return (
                  <th
                    key={dia}
                    className={`border-b border-r border-slate-200 py-3 text-center transition-colors ${
                      isWeekend && !isToday ? "bg-slate-50/80" : "bg-white"
                    } ${isToday ? "bg-blue-50/40" : ""}`}
                  >
                    <div className="flex flex-col items-center justify-center gap-0.5">
                      <span
                        className={`text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full ${
                          isToday
                            ? "bg-jbBlue text-white shadow-md"
                            : isWeekend
                              ? "text-rose-400"
                              : "text-slate-500"
                        }`}
                      >
                        {dia}
                      </span>
                      {isToday && (
                        <span className="text-[9px] font-black text-jbBlue uppercase tracking-widest mt-0.5">
                          Hoy
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* ── CUERPO DE LA TABLA ── */}
          <tbody>
            {HOURS.map((h) => (
              <tr key={h} style={{ height: HOUR_HEIGHT }}>
                {/* Columna de Horas */}
                <td className="relative border-r border-b border-slate-100 align-top p-0 bg-slate-50/50">
                  {h !== 0 && (
                    <span className="absolute right-2 -top-[9px] text-[10px] text-slate-400 font-medium select-none bg-slate-50 px-1 rounded">
                      {formatHourLabel(h)}
                    </span>
                  )}
                </td>

                {/* Columnas de Días */}
                {DIAS_SEMANA.map((_, dayIdx) => (
                  <td
                    key={dayIdx}
                    className={`relative border-b border-r border-slate-100 p-0 transition-colors ${
                      dayIdx >= 5 ? "bg-slate-50/40" : "bg-white"
                    } ${dayIdx === todayIdx ? "bg-blue-50/10" : ""}`}
                  >
                    {/* Renderizamos los eventos que empiezan en esta hora exacta */}
                    {eventsByDay[dayIdx]
                      .filter((ev) => Math.floor(ev.startHour) === h)
                      .map((ev) => {
                        const top = (ev.startHour - h) * HOUR_HEIGHT;
                        let height = (ev.endHour - ev.startHour) * HOUR_HEIGHT;

                        // Si el turno cruza la medianoche (ej: 22:00 a 06:00)
                        if (height <= 0) {
                          height = (24 - ev.startHour) * HOUR_HEIGHT;
                        }

                        const isShort = height < 50;

                        return (
                          <div
                            key={ev.id}
                            className={`absolute left-0.5 right-0.5 rounded-md px-2 py-1.5 overflow-hidden shadow-sm hover:shadow-md cursor-default z-[10] border ${ev.colorClass}`}
                            style={{
                              top,
                              height: Math.max(height, 24),
                            }}
                          >
                            {isShort ? (
                              <span className="text-[10px] font-bold leading-tight truncate block">
                                {formatTimeAMPM(ev.ingreso)}
                              </span>
                            ) : (
                              <>
                                <span className="text-[10px] font-bold leading-tight truncate block opacity-90 mb-0.5">
                                  {formatTimeAMPM(ev.ingreso)} -{" "}
                                  {formatTimeAMPM(ev.salida)}
                                </span>
                                <span className="text-[11px] font-semibold leading-tight truncate block">
                                  {ev.title}
                                </span>
                              </>
                            )}
                          </div>
                        );
                      })}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ScheduleCalendar;
