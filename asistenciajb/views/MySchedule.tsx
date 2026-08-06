import React, { useState, useEffect } from "react";
import { CalendarDays, Loader2, Info, Download } from "lucide-react";
import { Schedule, User } from "../types";
import { authApi, schedulesApi } from "../services/api";
import ScheduleCalendar from "../components/ScheduleCalendar";

interface Props {
  user?: User;
}

const DIAS_SEMANA = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const HOUR_HEIGHT = 38;

const EVENT_COLORS = [
  { bg: "#3b82f6", border: "#2563eb" },
  { bg: "#8b5cf6", border: "#7c3aed" },
  { bg: "#06b6d4", border: "#0891b2" },
  { bg: "#f97316", border: "#ea580c" },
  { bg: "#10b981", border: "#059669" },
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

function getTodayIndex(): number {
  const jsDay = new Date().getDay();
  return jsDay === 0 ? 6 : jsDay - 1;
}

const MySchedule: React.FC<Props> = ({ user }) => {
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMySchedule = async () => {
      setLoading(true);
      try {
        // Siempre obtener datos frescos del servidor para evitar props desactualizados
        const freshUser = await authApi.me();
        const scheduleId = freshUser?.schedule_id;

        if (scheduleId && scheduleId !== "default-schedule-id") {
          // Búsqueda directa por ID: no depende del orden del array
          const found = await schedulesApi.getById(scheduleId);
          setSchedule(found || null);
        } else {
          // Usuario sin horario asignado
          setSchedule(null);
        }
      } catch (err) {
        console.error("Error cargando horario:", err);
        setSchedule(null);
      } finally {
        setLoading(false);
      }
    };
    fetchMySchedule();
  }, [user?.id]); // Re-ejecutar solo si cambia el usuario (nueva sesión)

  const handleDownloadPDF = () => {
    if (!schedule) return;

    const todayIdx = getTodayIndex();
    const fecha = new Date().toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" });
    const nombreColaborador = user?.name || "Colaborador";
    const areaColaborador = user?.area || "";

    interface Evento {
      dia: number;
      startMin: number;
      endMin: number;
      ingreso: string;
      salida: string;
      colorIdx: number;
      titulo: string;
    }

    const eventos: Evento[] = [];
    DIAS_SEMANA.forEach((dia, dayIdx) => {
      if (schedule.type === "simple") {
        if (!["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"].includes(dia)) return;
        if (schedule.time_in && schedule.time_out) {
          const ingreso = schedule.time_in.substring(0, 5);
          const salida = schedule.time_out.substring(0, 5);
          eventos.push({ dia: dayIdx, startMin: timeToMinutes(ingreso), endMin: timeToMinutes(salida), ingreso, salida, colorIdx: 0, titulo: schedule.name });
        }
      } else {
        const blocks = typeof schedule.blocks === "string" ? JSON.parse(schedule.blocks) : schedule.blocks;
        const bloque = blocks?.find((b: any) => b.day === dia);
        if (bloque?.turnos) {
          bloque.turnos.forEach((turno: any, i: number) => {
            if (turno.ingreso && turno.salida) {
              eventos.push({ dia: dayIdx, startMin: timeToMinutes(turno.ingreso), endMin: timeToMinutes(turno.salida), ingreso: turno.ingreso, salida: turno.salida, colorIdx: i % EVENT_COLORS.length, titulo: `Turno ${i + 1}` });
            }
          });
        }
      }
    });

    const minHour = eventos.length > 0 ? Math.max(0, Math.floor(Math.min(...eventos.map(e => e.startMin)) / 60) - 1) : 6;
    const maxHour = eventos.length > 0 ? Math.min(23, Math.ceil(Math.max(...eventos.map(e => e.endMin)) / 60) + 1) : 22;
    const visibleHours = Array.from({ length: maxHour - minHour + 1 }, (_, i) => minHour + i);

    const eventosPorDia: Record<number, Evento[]> = {};
    for (let d = 0; d < 7; d++) eventosPorDia[d] = [];
    eventos.forEach(e => eventosPorDia[e.dia].push(e));

    const totalH = visibleHours.length * HOUR_HEIGHT;
    const colWidth = 100;
    const labelWidth = 52;

    const calendarHtml = `
      <div style="display:flex;font-family:Arial,sans-serif;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
        <div style="width:${labelWidth}px;flex-shrink:0;background:#f8fafc;border-right:1px solid #e2e8f0;">
          <div style="height:44px;border-bottom:1px solid #e2e8f0;"></div>
          <div style="position:relative;height:${totalH}px;">
            ${visibleHours.map((h, idx) => idx === 0 ? '' : `
              <div style="position:absolute;top:${idx * HOUR_HEIGHT - 9}px;right:6px;font-size:9px;color:#94a3b8;font-weight:600;background:#f8fafc;padding:0 2px;">
                ${formatHourLabel(h)}
              </div>
            `).join('')}
          </div>
        </div>
        ${DIAS_SEMANA.map((dia, dayIdx) => {
          const isToday = dayIdx === todayIdx;
          const isWeekend = dayIdx >= 5;
          const evsDia = eventosPorDia[dayIdx];
          return `
            <div style="flex:1;min-width:${colWidth}px;border-right:1px solid #e2e8f0;${dayIdx === 6 ? 'border-right:none;' : ''}">
              <div style="height:44px;display:flex;flex-direction:column;align-items:center;justify-content:center;border-bottom:1px solid #e2e8f0;background:${isToday ? '#eff6ff' : isWeekend ? '#fafafa' : 'white'};">
                <span style="font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:1px;padding:3px 8px;border-radius:20px;${isToday ? 'background:#1a3a6b;color:white;' : isWeekend ? 'color:#f87171;' : 'color:#64748b;'}">
                  ${dia}
                </span>
                ${isToday ? '<span style="font-size:8px;font-weight:900;color:#1a3a6b;text-transform:uppercase;letter-spacing:1px;margin-top:2px;">HOY</span>' : ''}
              </div>
              <div style="position:relative;height:${totalH}px;background:${isWeekend ? '#fafafa' : 'white'};">
                ${visibleHours.map((_, idx) => `
                  <div style="position:absolute;top:${idx * HOUR_HEIGHT}px;left:0;right:0;border-top:1px solid #f1f5f9;"></div>
                `).join('')}
                ${evsDia.map(ev => {
                  const topPx = ((ev.startMin / 60) - minHour) * HOUR_HEIGHT;
                  const heightPx = Math.max(((ev.endMin - ev.startMin) / 60) * HOUR_HEIGHT, 20);
                  const color = EVENT_COLORS[ev.colorIdx];
                  const isShort = heightPx < 40;
                  return `
                    <div style="position:absolute;top:${topPx}px;left:2px;right:2px;height:${heightPx}px;background:${color.bg};border:1px solid ${color.border};border-radius:6px;padding:4px 6px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.2);">
                      ${isShort
                        ? `<span style="font-size:9px;font-weight:700;color:white;white-space:nowrap;">${formatTimeAMPM(ev.ingreso)}</span>`
                        : `<span style="font-size:9px;font-weight:700;color:rgba(255,255,255,0.9);display:block;margin-bottom:2px;">${formatTimeAMPM(ev.ingreso)} - ${formatTimeAMPM(ev.salida)}</span>
                           <span style="font-size:10px;font-weight:900;color:white;display:block;">${ev.titulo}</span>`
                      }
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8" />
        <title>Horario - ${nombreColaborador}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; color: #1e293b; background: white; padding: 20px; }
          @media print {
            body { padding: 12px; }
            @page { margin: 0.8cm; size: A4 portrait; }
          }
        </style>
      </head>
      <body>
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px;border-bottom:3px solid #1a3a6b;padding-bottom:10px;">
          <div>
            <div style="font-size:20px;font-weight:900;color:#1a3a6b;text-transform:uppercase;letter-spacing:2px;">
              ASISTENCIA <span style="color:#f97316;">JB</span>
            </div>
            <div style="font-size:11px;color:#64748b;font-weight:600;margin-top:2px;text-transform:uppercase;letter-spacing:1px;">
              Sistema Corporativo — Horario Semanal
            </div>
          </div>
          <div style="text-align:right;">
            <div style="background:#f97316;color:white;font-size:10px;font-weight:900;padding:4px 14px;border-radius:20px;text-transform:uppercase;letter-spacing:1px;display:inline-block;">
              Documento Oficial
            </div>
            <div style="font-size:10px;color:#94a3b8;margin-top:6px;">Generado el ${fecha}</div>
          </div>
        </div>
        <div style="display:flex;gap:0;margin-bottom:12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
          ${[
            { label: "Colaborador", value: nombreColaborador, highlight: true },
            { label: "Área", value: areaColaborador },
            { label: "Horario", value: schedule.name, highlight: true },
            { label: "Tipo", value: schedule.type === "simple" ? "Horario Fijo" : "Por Bloques" },
            { label: "Tolerancia", value: `${schedule.tolerance_minutes} min`, highlight: true },
          ].map((item, i) => `
            <div style="flex:1;padding:8px 12px;${i > 0 ? 'border-left:1px solid #e2e8f0;' : ''}">
              <div style="font-size:9px;font-weight:900;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">${item.label}</div>
              <div style="font-size:12px;font-weight:${item.highlight ? '900' : '700'};color:${item.highlight ? '#1a3a6b' : '#1e293b'};">${item.value}</div>
            </div>
          `).join('')}
        </div>
        ${calendarHtml}
        <div style="margin-top:10px;background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:8px 12px;">
          <span style="font-size:10px;color:#92400e;line-height:1.6;">
            ⚠️ <strong>Importante:</strong> Las marcaciones fuera del rango horario y la tolerancia de ${schedule.tolerance_minutes} minutos serán registradas como "Tardanza". Ante consultas, comunícate con RRHH.
          </span>
        </div>
      </body>
      </html>
    `;

    const ventana = window.open("", "_blank", "width=1100,height=800");
    if (!ventana) return;
    ventana.document.write(htmlContent);
    ventana.document.close();
    ventana.focus();
    setTimeout(() => {
      ventana.print();
      ventana.close();
    }, 600);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-jbBlue" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-700 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-jbBlue font-heading">
            Mi <span className="text-jbOrange">Horario Semanal</span>
          </h1>
          <p className="text-jbGray font-medium mt-1">
            Visualiza tus turnos y días de descanso.
          </p>
        </div>
        {schedule && (
          <button
            onClick={handleDownloadPDF}
            className="flex items-center gap-2 bg-jbBlue text-white px-6 py-3 rounded-xl font-black text-[10px] tracking-widest uppercase hover:bg-jbNavy transition-all shadow-lg shadow-jbBlue/20"
          >
            <Download className="w-4 h-4" />
            DESCARGAR PDF
          </button>
        )}
      </div>

      {schedule ? (
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 p-6 md:p-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 bg-jbOrange/10 rounded-xl text-jbOrange">
              <CalendarDays className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800 font-heading">
                {schedule.name}
              </h2>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                Tolerancia de ingreso:{" "}
                <span className="text-jbOrange">{schedule.tolerance_minutes} min</span>
              </p>
            </div>
          </div>

          <ScheduleCalendar schedule={schedule} />

          <div className="mt-8 flex items-start gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <Info className="w-5 h-5 text-jbBlue flex-shrink-0" />
            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              Este es tu horario corporativo asignado. Las marcaciones fuera del
              rango horario establecido y su tiempo de tolerancia serán
              registradas automáticamente como "Tardanza". Puedes descargar
              este horario en PDF usando el botón superior.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-100 shadow-sm">
          <p className="text-jbGray font-bold">
            No tienes un horario asignado actualmente.
          </p>
        </div>
      )}
    </div>
  );
};

export default MySchedule;