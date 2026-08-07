import React, { useState, useEffect } from "react";
import { User } from "../types";
import {
  FileText, Search, Filter, ChevronLeft, ChevronRight,
  X, CheckCircle2, Clock, AlertCircle, Eye, MessageSquare,
} from "lucide-react";
import { API_BASE } from "../services/api";

interface Report {
  id: string;
  userId: string;
  userName: string;
  area: string;
  categoria: string;
  descripcion: string;
  foto1: string | null;
  foto2: string | null;
  foto3: string | null;
  estado: "pendiente" | "en_revision" | "resuelto";
  notaAdmin: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Props { user: User; }

const ESTADOS = [
  { value: "",            label: "TODOS LOS ESTADOS" },
  { value: "pendiente",   label: "PENDIENTE" },
  { value: "en_revision", label: "EN REVISIÓN" },
  { value: "resuelto",    label: "RESUELTO" },
];

const LIMIT = 10;

const estadoConfig = (estado: string) => {
  switch (estado) {
    case "pendiente":   return { label: "Pendiente",   color: "bg-jbOrange/10 text-jbOrange border-jbOrange/20",         icon: <Clock className="w-3 h-3" /> };
    case "en_revision": return { label: "En revisión", color: "bg-jbBlue/10 text-jbBlue border-jbBlue/20",               icon: <AlertCircle className="w-3 h-3" /> };
    case "resuelto":    return { label: "Resuelto",    color: "bg-green-100 text-green-700 border-green-200",            icon: <CheckCircle2 className="w-3 h-3" /> };
    default:            return { label: estado,        color: "bg-slate-100 text-slate-500 border-slate-200",            icon: null };
  }
};

// ─── MODAL DETALLE ────────────────────────────────────────────
const DetalleModal: React.FC<{
  report: Report;
  onClose: () => void;
  onUpdate: (id: string, estado: string, nota: string) => void;
}> = ({ report, onClose, onUpdate }) => {
  const [estado, setEstado]     = useState(report.estado);
  const [nota, setNota]         = useState(report.notaAdmin || "");
  const [guardando, setGuardando] = useState(false);
  const [fotoAmpliada, setFotoAmpliada] = useState<string | null>(null);
  const fotos = [report.foto1, report.foto2, report.foto3].filter(Boolean) as string[];

  const handleGuardar = async () => {
    setGuardando(true);
    try {
      const token = sessionStorage.getItem("jb_token");
      const res   = await fetch(`${API_BASE}/api/employee_reports/`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ id: report.id, estado, nota_admin: nota }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      onUpdate(report.id, estado, nota);
      onClose();
    } catch (e: any) {
      alert(e.message || "Error al guardar.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Foto ampliada */}
      {fotoAmpliada && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/80" onClick={() => setFotoAmpliada(null)}>
          <img src={fotoAmpliada} alt="ampliada" className="max-w-3xl max-h-[85vh] rounded-2xl shadow-2xl object-contain" />
          <button className="absolute top-6 right-6 p-2 bg-white/20 rounded-full text-white hover:bg-white/40 transition-all" onClick={() => setFotoAmpliada(null)}>
            <X className="w-6 h-6" />
          </button>
        </div>
      )}

      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="sticky top-0 bg-white rounded-t-3xl border-b border-slate-100 px-7 py-5 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-jbBlue/10 rounded-xl text-jbBlue"><FileText className="w-5 h-5" /></div>
            <div>
              <h2 className="text-base font-black text-jbBlue font-heading uppercase tracking-wide">Detalle del Reporte</h2>
              <p className="text-[10px] text-jbGray font-semibold mt-0.5">
                {new Date(report.createdAt).toLocaleDateString("es-ES", { day:"2-digit", month:"long", year:"numeric", hour:"2-digit", minute:"2-digit" })}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-7 py-6 space-y-5">

          {/* Info colaborador */}
          <div className="flex items-center gap-4 bg-slate-50 rounded-2xl p-4 border border-slate-100">
            <img
              src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${report.userName}`}
              className="w-12 h-12 rounded-full border-2 border-white shadow-sm"
              alt={report.userName}
            />
            <div>
              <p className="font-black text-jbBlue text-sm font-heading">{report.userName}</p>
              <p className="text-[10px] text-jbGray font-semibold uppercase tracking-widest">{report.area}</p>
            </div>
          </div>

          {/* Categoría */}
          <div>
            <p className="text-[10px] font-black text-jbGray uppercase tracking-widest mb-1">Categoría</p>
            <p className="text-sm font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3">{report.categoria}</p>
          </div>

          {/* Descripción */}
          <div>
            <p className="text-[10px] font-black text-jbGray uppercase tracking-widest mb-1">Descripción</p>
            <p className="text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 leading-relaxed whitespace-pre-wrap">{report.descripcion}</p>
          </div>

          {/* Fotos */}
          {fotos.length > 0 && (
            <div>
              <p className="text-[10px] font-black text-jbGray uppercase tracking-widest mb-2">Evidencia fotográfica</p>
              <div className="flex gap-3 flex-wrap">
                {fotos.map((src, i) => (
                  <button
                    key={i}
                    onClick={() => setFotoAmpliada(src)}
                    className="relative w-24 h-24 rounded-2xl overflow-hidden border-2 border-slate-200 hover:border-jbBlue transition-all group"
                  >
                    <img src={src} alt={`foto ${i + 1}`} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Eye className="w-5 h-5 text-white" />
                    </div>
                    <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">{i + 1}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Cambiar estado */}
          <div>
            <p className="text-[10px] font-black text-jbGray uppercase tracking-widest mb-2">Estado del reporte</p>
            <div className="grid grid-cols-3 gap-2">
              {["pendiente","en_revision","resuelto"].map(e => {
                const cfg = estadoConfig(e);
                return (
                  <button
                    key={e}
                    onClick={() => setEstado(e as any)}
                    className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[10px] font-black uppercase border transition-all ${
                      estado === e ? cfg.color + " ring-2 ring-offset-1 ring-current" : "bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {cfg.icon} {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Nota admin */}
          <div>
            <label className="block text-[10px] font-black text-jbGray uppercase tracking-widest mb-2">
              <MessageSquare className="w-3 h-3 inline mr-1" />
              Nota interna (opcional)
            </label>
            <textarea
              value={nota}
              onChange={e => setNota(e.target.value)}
              placeholder="Escribe una nota sobre este reporte..."
              rows={3}
              maxLength={500}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 text-sm font-medium text-slate-700 focus:outline-none focus:border-jbBlue focus:bg-white transition-all resize-none"
            />
          </div>

          {/* Botones */}
          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 py-3.5 rounded-2xl border-2 border-slate-200 text-slate-500 font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all">
              Cancelar
            </button>
            <button
              onClick={handleGuardar}
              disabled={guardando}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-jbBlue text-white font-black text-xs uppercase tracking-widest hover:bg-jbNavy transition-all shadow-lg shadow-jbBlue/20 disabled:opacity-60"
            >
              {guardando ? <><Clock className="w-4 h-4 animate-spin" /> Guardando...</> : <><CheckCircle2 className="w-4 h-4" /> Guardar cambios</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────
const ReportsAdmin: React.FC<Props> = ({ user }) => {
  const [reports, setReports]   = useState<Report[]>([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [filterEstado, setFilterEstado] = useState("");
  const [selected, setSelected] = useState<Report | null>(null);

  if (user.role !== "admin") return null;

  const loadReports = async (p = 1, s = search, e = filterEstado) => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem("jb_token");
      const params = new URLSearchParams({ page: String(p), limit: String(LIMIT) });
      if (s) params.set("search", s);
      if (e) params.set("estado", e);

      const res  = await fetch(`${API_BASE}/api/employee_reports/?${params}`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      setReports(json.data.reports);
      setTotal(json.data.total);
      setPage(p);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadReports(1); }, []);

  const handleSearch = () => { setSearch(searchInput); loadReports(1, searchInput, filterEstado); };
  const handleEstado = (e: string) => { setFilterEstado(e); loadReports(1, search, e); };

  const handleUpdate = (id: string, estado: string, nota: string) => {
    setReports(prev => prev.map(r => r.id === id ? { ...r, estado: estado as any, notaAdmin: nota } : r));
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">

      {selected && (
        <DetalleModal
          report={selected}
          onClose={() => setSelected(null)}
          onUpdate={handleUpdate}
        />
      )}

      {/* Encabezado */}
      <div>
        <h1 className="text-3xl font-extrabold text-jbBlue font-heading">
          Reportes <span className="text-jbOrange">JB</span>
        </h1>
        <p className="text-jbGray font-medium mt-1">Gestiona los reportes enviados por los colaboradores.</p>
      </div>

      {/* Contadores rápidos */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Pendientes",   estado: "pendiente",   color: "text-jbOrange", bg: "bg-jbOrange/10", icon: <Clock className="w-5 h-5" /> },
          { label: "En revisión",  estado: "en_revision", color: "text-jbBlue",   bg: "bg-jbBlue/10",   icon: <AlertCircle className="w-5 h-5" /> },
          { label: "Resueltos",    estado: "resuelto",    color: "text-green-600", bg: "bg-green-100",  icon: <CheckCircle2 className="w-5 h-5" /> },
        ].map(item => (
          <button
            key={item.estado}
            onClick={() => handleEstado(filterEstado === item.estado ? "" : item.estado)}
            className={`bg-white rounded-2xl border p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-all text-left ${
              filterEstado === item.estado ? "border-jbBlue ring-2 ring-jbBlue/20" : "border-slate-100"
            }`}
          >
            <div className={`p-3 rounded-xl ${item.bg} ${item.color}`}>{item.icon}</div>
            <div>
              <p className="text-[10px] font-black text-jbGray uppercase tracking-widest">{item.label}</p>
              <p className={`text-2xl font-black font-heading ${item.color}`}>
                {reports.filter(r => r.estado === item.estado).length}
              </p>
            </div>
          </button>
        ))}
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">

        {/* Filtros */}
        <div className="p-8 border-b border-slate-50 bg-slate-50/30">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-jbGray" />
                <input
                  type="text"
                  placeholder="Buscar por colaborador..."
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSearch()}
                  className="w-full bg-white border border-slate-200 rounded-2xl py-3 pl-12 pr-4 text-xs font-semibold focus:outline-none focus:border-jbBlue transition-all shadow-sm"
                />
              </div>
              <button onClick={handleSearch} className="px-4 py-3 bg-jbBlue text-white rounded-2xl text-xs font-black hover:bg-jbNavy transition-all">
                Buscar
              </button>
            </div>
            <div className="relative">
              <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-jbGray" />
              <select
                value={filterEstado}
                onChange={e => handleEstado(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-2xl py-3 pl-12 pr-4 text-xs font-semibold focus:outline-none focus:border-jbBlue appearance-none transition-all shadow-sm"
              >
                {ESTADOS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Listado */}
        <div className="divide-y divide-slate-100">
          {loading ? (
            <div className="py-20 flex justify-center">
              <div className="w-8 h-8 border-4 border-jbBlue border-t-jbOrange rounded-full animate-spin" />
            </div>
          ) : reports.length === 0 ? (
            <div className="py-32 text-center">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-100">
                <FileText className="w-10 h-10 text-slate-200" />
              </div>
              <p className="text-jbBlue text-lg font-black uppercase tracking-widest font-heading">Sin reportes</p>
            </div>
          ) : (
            reports.map(r => {
              const cfg  = estadoConfig(r.estado);
              const fotos = [r.foto1, r.foto2, r.foto3].filter(Boolean) as string[];
              return (
                <div key={r.id} className="p-6 hover:bg-slate-50/80 transition-colors flex items-start gap-5 flex-wrap">
                  {/* Avatar */}
                  <img
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${r.userName}`}
                    className="w-11 h-11 rounded-full border-2 border-slate-100 shadow-sm flex-shrink-0"
                    alt={r.userName}
                  />

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <p className="text-sm font-black text-jbBlue font-heading">{r.userName}</p>
                      <span className="text-[9px] font-black text-jbGray uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded-full">{r.area}</span>
                      <span className={`inline-flex items-center gap-1 text-[9px] font-black uppercase px-2.5 py-1 rounded-full border ${cfg.color}`}>
                        {cfg.icon} {cfg.label}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-jbOrange mt-1">{r.categoria}</p>
                    <p className="text-xs text-slate-600 mt-1 line-clamp-2">{r.descripcion}</p>

                    {/* Miniaturas fotos */}
                    {fotos.length > 0 && (
                      <div className="flex gap-2 mt-2">
                        {fotos.map((src, i) => (
                          <img key={i} src={src} alt={`foto ${i+1}`} className="w-10 h-10 rounded-lg object-cover border border-slate-200" />
                        ))}
                      </div>
                    )}

                    <p className="text-[10px] text-slate-400 font-semibold mt-2">
                      {new Date(r.createdAt).toLocaleDateString("es-ES", { day:"2-digit", month:"long", year:"numeric" })} ·{" "}
                      {new Date(r.createdAt).toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" })}
                    </p>
                  </div>

                  {/* Botón ver */}
                  <button
                    onClick={() => setSelected(r)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-jbBlue/10 text-jbBlue rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-jbBlue hover:text-white transition-all border border-jbBlue/20"
                  >
                    <Eye className="w-3.5 h-3.5" /> Ver detalle
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Paginación */}
        <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
          <p className="text-[10px] font-black text-jbGray uppercase tracking-widest font-heading">
            {total} reporte{total !== 1 ? "s" : ""} encontrado{total !== 1 ? "s" : ""}
          </p>
          <div className="flex items-center gap-2">
            <button disabled={page <= 1} onClick={() => loadReports(page - 1)}
              className="flex items-center gap-1 px-4 py-2 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-jbBlue hover:bg-slate-50 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
              <ChevronLeft className="w-3 h-3" /> Anterior
            </button>
            <span className="px-3 py-2 text-[10px] font-black text-jbGray">{page} / {totalPages || 1}</span>
            <button disabled={page >= totalPages} onClick={() => loadReports(page + 1)}
              className="flex items-center gap-1 px-4 py-2 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-jbBlue hover:bg-slate-50 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
              Siguiente <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsAdmin;