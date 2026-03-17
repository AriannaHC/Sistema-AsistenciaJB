import React from "react";
import { Plus, Clock, Edit2, Trash2, Users } from "lucide-react";

const SchedulesManagement: React.FC = () => {
  // Datos mockeados para el diseño
  const mockSchedules = [
    {
      id: 1,
      name: "Turno Administrativo",
      in: "09:00",
      out: "18:00",
      tolerance: 15,
      assignedCount: 24,
    },
    {
      id: 2,
      name: "Turno Mañana (Operaciones)",
      in: "07:00",
      out: "15:00",
      tolerance: 10,
      assignedCount: 45,
    },
    {
      id: 3,
      name: "Turno Tarde (Operaciones)",
      in: "14:00",
      out: "22:00",
      tolerance: 10,
      assignedCount: 38,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-jbBlue font-heading">
            Gestión de Horarios
          </h2>
          <p className="text-sm text-jbGray mt-1">
            Configura los turnos y tolerancias para el personal.
          </p>
        </div>
        <button className="flex items-center justify-center gap-2 bg-jbBlue text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-jbBlue/90 transition-all shadow-lg shadow-jbBlue/20 font-heading">
          <Plus className="w-5 h-5" />
          NUEVO HORARIO
        </button>
      </div>

      {/* Tarjetas de Resumen (Opcional, pero da buen aspecto) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-jbBlue/10 flex items-center justify-center text-jbBlue">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-800">
              {mockSchedules.length}
            </p>
            <p className="text-xs text-jbGray font-bold uppercase tracking-wider">
              Turnos Activos
            </p>
          </div>
        </div>
      </div>

      {/* Tabla de Horarios */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider font-heading">
                  Nombre del Turno
                </th>
                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider font-heading">
                  Entrada / Salida
                </th>
                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider font-heading">
                  Tolerancia
                </th>
                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider font-heading">
                  Asignados
                </th>
                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider text-right font-heading">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {mockSchedules.map((schedule) => (
                <tr
                  key={schedule.id}
                  className="hover:bg-slate-50/50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <span className="font-bold text-slate-800">
                      {schedule.name}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                      <span className="bg-slate-100 px-2 py-1 rounded-md">
                        {schedule.in}
                      </span>
                      <span>—</span>
                      <span className="bg-slate-100 px-2 py-1 rounded-md">
                        {schedule.out}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    <span className="text-jbOrange font-bold">
                      {schedule.tolerance} min
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-sm text-slate-600">
                      <Users className="w-4 h-4 text-jbGray" />
                      <span className="font-bold">
                        {schedule.assignedCount}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button className="p-2 text-jbGray hover:text-jbBlue hover:bg-jbBlue/10 rounded-lg transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-jbGray hover:text-jbRed hover:bg-jbRed/10 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SchedulesManagement;
