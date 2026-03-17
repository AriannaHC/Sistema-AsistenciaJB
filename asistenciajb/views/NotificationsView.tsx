import React, { useState } from "react";
import { Mail, Bell, CheckCircle2, AlertCircle, Clock } from "lucide-react";

const NotificationsView: React.FC = () => {
  const [filter, setFilter] = useState<"all" | "system" | "email">("all");

  // Datos mockeados
  const mockNotifications = [
    {
      id: 1,
      type: "system",
      title: "Llegada tarde registrada",
      message:
        "El colaborador Juan Pérez registró su ingreso fuera del tiempo de tolerancia.",
      time: "Hace 10 min",
      isRead: false,
    },
    {
      id: 2,
      type: "email",
      title: "Reporte Semanal Enviado",
      message:
        "El reporte de asistencia semanal fue enviado exitosamente a rrhh@empresa.com",
      time: "Hace 2 horas",
      isRead: true,
    },
    {
      id: 3,
      type: "system",
      title: "Nuevo horario creado",
      message: "El administrador actualizó el 'Turno Mañana (Operaciones)'.",
      time: "Ayer, 15:30",
      isRead: true,
    },
    {
      id: 4,
      type: "email",
      title: "Error al enviar notificación",
      message:
        "No se pudo enviar el correo de inasistencia a m.gomez@empresa.com",
      time: "Ayer, 09:15",
      isRead: true,
      isError: true,
    },
  ];

  const filteredNotifications = mockNotifications.filter(
    (n) => filter === "all" || n.type === filter,
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-jbBlue font-heading">
            Centro de Notificaciones
          </h2>
          <p className="text-sm text-jbGray mt-1">
            Historial de alertas del sistema y correos enviados.
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex bg-white p-1.5 rounded-xl border border-slate-200 inline-flex shadow-sm">
        <button
          onClick={() => setFilter("all")}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${filter === "all" ? "bg-jbBlue text-white shadow-md" : "text-jbGray hover:bg-slate-50"}`}
        >
          Todas
        </button>
        <button
          onClick={() => setFilter("system")}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${filter === "system" ? "bg-jbBlue text-white shadow-md" : "text-jbGray hover:bg-slate-50"}`}
        >
          <Bell className="w-4 h-4" /> Sistema
        </button>
        <button
          onClick={() => setFilter("email")}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${filter === "email" ? "bg-jbBlue text-white shadow-md" : "text-jbGray hover:bg-slate-50"}`}
        >
          <Mail className="w-4 h-4" /> Correos
        </button>
      </div>

      {/* Lista de Notificaciones */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="divide-y divide-slate-100">
          {filteredNotifications.map((notif) => (
            <div
              key={notif.id}
              className={`p-5 flex gap-4 transition-colors hover:bg-slate-50/50 ${!notif.isRead ? "bg-slate-50" : ""}`}
            >
              {/* Icono */}
              <div className="flex-shrink-0 mt-1">
                {notif.type === "email" ? (
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${notif.isError ? "bg-jbRed/10 text-jbRed" : "bg-green-100 text-green-600"}`}
                  >
                    {notif.isError ? (
                      <AlertCircle className="w-5 h-5" />
                    ) : (
                      <Mail className="w-5 h-5" />
                    )}
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-jbOrange/10 flex items-center justify-center text-jbOrange">
                    <Bell className="w-5 h-5" />
                  </div>
                )}
              </div>

              {/* Contenido */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h4
                    className={`text-sm font-bold ${!notif.isRead ? "text-slate-900" : "text-slate-700"}`}
                  >
                    {notif.title}
                  </h4>
                  <span className="text-[11px] font-medium text-slate-400 whitespace-nowrap flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {notif.time}
                  </span>
                </div>
                <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                  {notif.message}
                </p>
              </div>

              {/* Indicador de no leído */}
              {!notif.isRead && (
                <div className="flex-shrink-0 flex items-center justify-center w-3">
                  <div className="w-2.5 h-2.5 bg-jbBlue rounded-full"></div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default NotificationsView;
