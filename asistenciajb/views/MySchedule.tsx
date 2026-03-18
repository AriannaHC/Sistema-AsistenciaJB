import React, { useState, useEffect } from "react";
import { CalendarDays, Loader2, Info } from "lucide-react";
import { Schedule } from "../types";
import { schedulesApi } from "../services/api";
import ScheduleCalendar from "../components/ScheduleCalendar";

const MySchedule: React.FC = () => {
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMySchedule = async () => {
      try {
        const data = await schedulesApi.getAll();
        if (Array.isArray(data)) {
          setSchedule(data[0] || null);
        } else {
          setSchedule(data as Schedule);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchMySchedule();
  }, []);

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
                <span className="text-jbOrange">
                  {schedule.tolerance_minutes} min
                </span>
              </p>
            </div>
          </div>

          <ScheduleCalendar schedule={schedule} />

          <div className="mt-8 flex items-start gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <Info className="w-5 h-5 text-jbBlue flex-shrink-0" />
            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              Este es tu horario corporativo asignado. Las marcaciones fuera del
              rango horario establecido y su tiempo de tolerancia serán
              registradas automáticamente como "Tardanza" en el sistema.
              Próximamente podrás sincronizar esto con tu Google Calendar.
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
