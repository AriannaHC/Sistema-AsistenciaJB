import React, { useState, useEffect, useMemo } from "react";
import {
  Bell,
  Clock,
  Image as ImageIcon,
  FileText,
  Download,
  Search,
  Inbox,
  CheckCircle2,
  ArrowLeft,
  X,
} from "lucide-react";
import { notificationsApi } from "../services/api";
import { Notification } from "../types";

interface Props {
  onUnreadChange?: (count: number) => void;
}

const NotificationsView: React.FC<Props> = ({ onUnreadChange }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados para la interfaz
  const [selectedNotif, setSelectedNotif] = useState<Notification | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "unread">("all");

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const data = await notificationsApi.getAll(1, 50);
      setNotifications(data.notifications);
      if (onUnreadChange) onUnreadChange(data.unread_count);
    } catch (e) {
      console.error("Error cargando notificaciones", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectNotification = async (notif: Notification) => {
    setSelectedNotif(notif);

    if (!notif.is_read) {
      try {
        const res = await notificationsApi.markAsRead(notif.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n)),
        );
        if (onUnreadChange) onUnreadChange(res.unread_count);
      } catch (e) {
        console.error("Error al marcar como leída", e);
      }
    }
  };

  // 🚀 MEJORA: Filtrado exclusivo por el Título de la notificación
  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      if (activeTab === "unread" && n.is_read) return false;

      if (searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase();
        // Búsqueda estricta solo en el título
        if (!n.title.toLowerCase().includes(query)) return false;
      }

      return true;
    });
  }, [notifications, activeTab, searchQuery]);

  const formatearFecha = (fechaString: string) => {
    const fecha = new Date(fechaString);
    const hoy = new Date();

    if (fecha.toDateString() === hoy.toDateString()) {
      return fecha.toLocaleTimeString("es-ES", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    }

    return fecha.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
    });
  };

  const formatearFechaCompleta = (fechaString: string) => {
    const fecha = new Date(fechaString);
    return fecha.toLocaleString("es-ES", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  // ── SUBCOMPONENTE DE LA LISTA ──
  const NotificationListItem: React.FC<{ notif: Notification }> = ({ notif }) => {
    const isSelected = selectedNotif?.id === notif.id;
    const hasAttachments = notif.image_url || notif.pdf_url;

    return (
      <button
        onClick={() => handleSelectNotification(notif)}
        className={`w-full text-left p-4 flex gap-4 items-start transition-all border-l-4 ${
          isSelected
            ? "bg-blue-50/50 border-jbBlue"
            : !notif.is_read
              ? "bg-white hover:bg-slate-50 border-transparent"
              : "bg-white hover:bg-slate-50 border-transparent opacity-80"
        } border-b border-b-slate-100 last:border-b-0`}
      >
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-sm font-heading ${
            notif.audience === "all" ? "bg-jbOrange" : "bg-jbBlue"
          }`}
        >
          {notif.created_by.substring(0, 2).toUpperCase() || "AD"}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-baseline mb-1">
            <span
              className={`text-sm truncate pr-2 ${!notif.is_read ? "font-black text-slate-900" : "font-bold text-slate-700"}`}
            >
              Administración JB
            </span>
            <span
              className={`text-[10px] whitespace-nowrap flex-shrink-0 ${!notif.is_read ? "font-bold text-jbBlue" : "font-semibold text-slate-400"}`}
            >
              {formatearFecha(notif.created_at)}
            </span>
          </div>

          <h4
            className={`text-xs truncate mb-1 ${!notif.is_read ? "font-bold text-jbBlue" : "font-semibold text-slate-600"}`}
          >
            {notif.title}
          </h4>

          <p className="text-[11px] text-slate-500 line-clamp-1 leading-relaxed">
            {notif.body ||
              (notif.image_url ? "Imagen adjunta" : "Documento PDF adjunto")}
          </p>

          {hasAttachments && (
            <div className="flex gap-2 mt-2">
              {notif.image_url && (
                <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                  <ImageIcon className="w-3 h-3" /> Imagen
                </span>
              )}
              {notif.pdf_url && (
                <span className="inline-flex items-center gap-1 text-[9px] font-bold text-jbOrange bg-jbOrange/10 px-1.5 py-0.5 rounded">
                  <FileText className="w-3 h-3" /> PDF
                </span>
              )}
            </div>
          )}
        </div>

        {!notif.is_read && (
          <div className="w-2.5 h-2.5 bg-jbBlue rounded-full flex-shrink-0 mt-1.5 shadow-sm" />
        )}
      </button>
    );
  };

  return (
    // 🚀 MEJORA VISUAL: Ancho extendido en Desktop (max-w-6xl) y Pantalla completa nativa en móviles (-mx-4 -my-4)
    <div
      className="
      flex flex-col bg-white overflow-hidden animate-in fade-in duration-500
      -mx-4 -my-4 h-[calc(100vh-64px)] rounded-none border-none
      md:mx-auto md:my-0 md:h-[calc(100vh-140px)] md:rounded-[2.5rem] md:border md:border-slate-200 md:shadow-xl max-w-6xl
    "
    >
      {/* ── BARRA SUPERIOR ── */}
      <header className="h-14 md:h-16 border-b border-slate-200 bg-white md:bg-slate-50 flex items-center px-2 md:px-6 gap-2 md:gap-4 shrink-0">
        {/* Botón de regresar en móviles (Solo aparece si hay un correo abierto) */}
        {selectedNotif && (
          <button
            onClick={() => setSelectedNotif(null)}
            className="md:hidden p-2 ml-1 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-jbBlue transition-colors active:scale-95"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}

        <div className="flex-1 max-w-xl px-2 md:px-0">
          <div className="flex items-center gap-2 px-4 py-2 md:py-2.5 rounded-full md:rounded-xl bg-slate-100 md:bg-white border border-transparent md:border-slate-200 focus-within:border-jbBlue focus-within:ring-2 focus-within:ring-jbBlue/10 transition-all md:shadow-sm">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por título..."
              className="bg-transparent border-none outline-none w-full text-sm font-semibold placeholder:text-slate-400 text-slate-700"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Pestañas (Ocultas en móvil cuando se lee un correo) */}
        <div
          className={`sm:flex bg-white p-1 rounded-xl md:border border-slate-200 md:shadow-sm ${selectedNotif ? "hidden" : "flex"}`}
        >
          <button
            onClick={() => setActiveTab("all")}
            className={`px-3 md:px-4 py-1.5 rounded-lg text-[10px] md:text-xs font-black uppercase tracking-wider transition-all ${activeTab === "all" ? "bg-slate-100 text-jbBlue" : "text-slate-400 hover:text-slate-600"}`}
          >
            Todas
          </button>
          <button
            onClick={() => setActiveTab("unread")}
            className={`px-3 md:px-4 py-1.5 rounded-lg text-[10px] md:text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${activeTab === "unread" ? "bg-jbBlue text-white shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
          >
            <span className="hidden sm:inline">No leídas</span>
            <span className="sm:hidden">Nuevas</span>
          </button>
        </div>
      </header>

      {/* ── CUERPO DIVIDIDO ── */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* PANEL IZQUIERDO: LISTA */}
        <div
          className={`w-full md:w-[350px] lg:w-[420px] flex-shrink-0 border-r border-slate-200 bg-white flex flex-col ${selectedNotif ? "hidden md:flex" : "flex"}`}
        >
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
            <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest">
              Bandeja de entrada
            </h2>
            <span className="text-[10px] font-bold text-jbBlue bg-blue-50 px-2 py-0.5 rounded-full">
              {filteredNotifications.filter((n) => !n.is_read).length} sin leer
            </span>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {loading ? (
              <div className="flex justify-center py-10">
                <div className="w-8 h-8 border-4 border-slate-200 border-t-jbBlue rounded-full animate-spin" />
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                <CheckCircle2 className="w-12 h-12 text-slate-200 mb-3" />
                <p className="text-sm font-bold text-slate-400">
                  Bandeja vacía.
                </p>
              </div>
            ) : (
              <div className="pb-4">
                {filteredNotifications.map((notif) => (
                  <NotificationListItem key={notif.id} notif={notif} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* PANEL DERECHO: DETALLE DEL CORREO */}
        <div
          className={`flex-1 bg-white md:bg-slate-50/30 flex flex-col overflow-hidden ${!selectedNotif ? "hidden md:flex" : "flex"}`}
        >
          {selectedNotif ? (
            <div className="flex-1 overflow-y-auto custom-scrollbar animate-in slide-in-from-right-2 md:slide-in-from-right-4 duration-300">
              <div className="max-w-4xl mx-auto px-5 py-6 md:px-10 md:py-10">
                <div className="mb-8">
                  <h1
                    className="text-xl md:text-3xl font-black text-slate-800 font-heading leading-tight mb-6"
                    style={{ textWrap: "balance" }}
                  >
                    {selectedNotif.title}
                  </h1>

                  <div className="flex items-center gap-3 pb-6 border-b border-slate-100">
                    <div className="w-10 md:w-12 h-10 md:h-12 rounded-full bg-jbBlue text-white flex items-center justify-center font-bold text-sm md:text-base font-heading shadow-sm">
                      {selectedNotif.created_by.substring(0, 2).toUpperCase() ||
                        "AD"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-4">
                        <p className="text-sm font-bold text-slate-800 truncate">
                          Administración JB
                        </p>
                        <p className="text-xs font-semibold text-slate-400 shrink-0">
                          {formatearFechaCompleta(selectedNotif.created_at)}
                        </p>
                      </div>
                      <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider mt-0.5">
                        Para:{" "}
                        {selectedNotif.audience === "all"
                          ? "Toda la empresa"
                          : "Segmentado"}
                      </p>
                    </div>
                  </div>
                </div>

                {selectedNotif.body && (
                  <div
                    className="text-[14px] md:text-[15px] text-slate-700 leading-relaxed whitespace-pre-wrap mb-10"
                    style={{ overflowWrap: "break-word" }}
                  >
                    {selectedNotif.body}
                  </div>
                )}

                {(selectedNotif.image_url || selectedNotif.pdf_url) && (
                  <div className="border-t border-slate-200 pt-8 mt-4">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <FileText className="w-4 h-4" /> Archivos Adjuntos
                    </p>

                    <div className="space-y-6">
                      {selectedNotif.pdf_url && (
                        <div className="flex items-center justify-between p-3 md:p-4 bg-white border border-slate-200 rounded-2xl shadow-sm hover:border-jbOrange/50 transition-colors group">
                          <div className="flex items-center gap-3 md:gap-4 overflow-hidden">
                            <div className="w-10 h-10 md:w-12 md:h-12 bg-jbOrange/10 text-jbOrange rounded-xl flex items-center justify-center shrink-0">
                              <FileText className="w-5 h-5 md:w-6 md:h-6" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-slate-700 truncate">
                                Documento Oficial
                              </p>
                              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">
                                Formato PDF
                              </p>
                            </div>
                          </div>
                          <a
                            href={selectedNotif.pdf_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2.5 md:p-3 bg-slate-50 text-slate-500 rounded-xl hover:bg-jbOrange hover:text-white transition-all group-hover:shadow-md shrink-0 ml-2"
                            title="Descargar PDF"
                          >
                            <Download className="w-5 h-5" />
                          </a>
                        </div>
                      )}

                      {selectedNotif.image_url && (
                        <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-white p-1.5 md:p-2">
                          <img
                            src={selectedNotif.image_url}
                            alt="Imagen adjunta"
                            className="w-full h-auto rounded-xl object-contain max-h-[600px] bg-slate-50"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-300">
              <Inbox className="w-20 h-20 text-slate-200 mb-4" />
              <h3 className="text-lg font-bold text-slate-400">
                Bandeja de entrada
              </h3>
              <p className="text-sm font-medium">
                Selecciona un mensaje para leerlo.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationsView;
