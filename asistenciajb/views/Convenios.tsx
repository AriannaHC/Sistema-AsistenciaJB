import React, { useState, useEffect } from "react";
import { Tag, Search, X, Phone, Clock, Users, CheckCircle2, ExternalLink, ChevronDown } from "lucide-react";
import { conveniosApi } from "../services/api";

const CATEGORIAS = ["Todas", "Salud", "Alimentación", "Educación", "Transporte", "Entretenimiento", "Moda", "Finanzas", "Otros"];

const CATEGORIA_COLORS: Record<string, string> = {
  "Salud":           "bg-emerald-100 text-emerald-700 border-emerald-200",
  "Alimentación":    "bg-orange-100 text-orange-700 border-orange-200",
  "Educación":       "bg-blue-100 text-blue-700 border-blue-200",
  "Transporte":      "bg-purple-100 text-purple-700 border-purple-200",
  "Entretenimiento": "bg-pink-100 text-pink-700 border-pink-200",
  "Moda":            "bg-rose-100 text-rose-700 border-rose-200",
  "Finanzas":        "bg-yellow-100 text-yellow-700 border-yellow-200",
  "Otros":           "bg-slate-100 text-slate-700 border-slate-200",
};

interface Convenio {
  id: string;
  nombre: string;
  empresa: string;
  categoria: string;
  descripcion: string;
  beneficios: string;
  quienes: string;
  como_acceder: string;
  vigencia: string;
  contacto: string;
  descuento: string;
  imagen_url: string;
  activo: number;
}

// ─── MODAL DE DETALLES ────────────────────────────────────────
const ConvenioModal: React.FC<{ convenio: Convenio; onClose: () => void }> = ({ convenio, onClose }) => {
  const colorClass = CATEGORIA_COLORS[convenio.categoria] || CATEGORIA_COLORS["Otros"];

  const renderList = (text: string) =>
    text.split("\n").filter(Boolean).map((line, i) => (
      <li key={i} className="flex items-start gap-2">
        <CheckCircle2 className="w-3.5 h-3.5 text-jbTurquoise mt-0.5 flex-shrink-0" />
        <span className="text-sm text-slate-600">{line.replace(/^[-•*]\s*/, "")}</span>
      </li>
    ));

  // Cerrar con Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  // Bloquear scroll del body mientras el modal está abierto
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">

        {/* Header con imagen */}
        <div className="relative h-48 bg-slate-100 flex-shrink-0">
          {convenio.imagen_url ? (
            <img
              src={convenio.imagen_url}
              alt={convenio.nombre}
              className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-jbBlue/10 to-jbOrange/10">
              <Tag className="w-16 h-16 text-jbBlue/20" />
            </div>
          )}

          {/* Gradiente sobre imagen */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />

          {/* Badge categoría */}
          <span className={`absolute top-4 left-4 text-[10px] font-black uppercase px-3 py-1 rounded-full border ${colorClass}`}>
            {convenio.categoria}
          </span>

          {/* Badge descuento */}
          {convenio.descuento && (
            <span className="absolute top-4 right-12 bg-jbRed text-white text-[11px] font-black px-3 py-1 rounded-full shadow">
              {convenio.descuento}
            </span>
          )}

          {/* Botón cerrar */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 bg-white/90 hover:bg-white rounded-full flex items-center justify-center text-slate-600 hover:text-slate-900 transition-all shadow-md"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Título sobre imagen */}
          <div className="absolute bottom-4 left-4 right-4">
            <p className="text-[10px] font-black text-white/80 uppercase tracking-widest mb-0.5">{convenio.empresa}</p>
            <h2 className="text-lg font-black text-white font-heading leading-tight drop-shadow">{convenio.nombre}</h2>
          </div>
        </div>

        {/* Cuerpo scrolleable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          {convenio.descripcion && (
            <p className="text-sm text-slate-500 font-medium leading-relaxed border-b border-slate-100 pb-4">
              {convenio.descripcion}
            </p>
          )}

          {convenio.beneficios && (
            <div>
              <p className="text-[10px] font-black text-jbBlue uppercase tracking-widest mb-2.5">¿Qué incluye?</p>
              <ul className="space-y-2">{renderList(convenio.beneficios)}</ul>
            </div>
          )}

          {convenio.quienes && (
            <div>
              <p className="text-[10px] font-black text-jbBlue uppercase tracking-widest mb-2.5 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" /> ¿Quiénes pueden acceder?
              </p>
              <ul className="space-y-2">{renderList(convenio.quienes)}</ul>
            </div>
          )}

          {convenio.como_acceder && (
            <div>
              <p className="text-[10px] font-black text-jbBlue uppercase tracking-widest mb-2.5 flex items-center gap-1.5">
                <ExternalLink className="w-3.5 h-3.5" /> ¿Cómo acceder?
              </p>
              <ul className="space-y-2">{renderList(convenio.como_acceder)}</ul>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 pt-1">
            {convenio.vigencia && (
              <div className="flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-2xl p-4">
                <Clock className="w-4 h-4 text-jbOrange mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-[10px] font-black text-jbOrange uppercase tracking-widest mb-0.5">Vigencia</p>
                  <p className="text-sm text-slate-600">{convenio.vigencia}</p>
                </div>
              </div>
            )}
            {convenio.contacto && (
              <div className="flex items-start gap-3 bg-jbBlue/5 border border-jbBlue/10 rounded-2xl p-4">
                <Phone className="w-4 h-4 text-jbBlue mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-[10px] font-black text-jbBlue uppercase tracking-widest mb-0.5">Contacto</p>
                  <p className="text-sm text-slate-600">{convenio.contacto}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-6 py-4 border-t border-slate-100 bg-slate-50/60">
          <button
            onClick={onClose}
            className="w-full py-3 bg-jbBlue text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-jbNavy transition-all"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── CARD ────────────────────────────────────────────────────
const ConvenioCard: React.FC<{ convenio: Convenio; onVerDetalles: (c: Convenio) => void }> = ({ convenio, onVerDetalles }) => {
  const colorClass = CATEGORIA_COLORS[convenio.categoria] || CATEGORIA_COLORS["Otros"];

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden flex flex-col">
      {/* Imagen */}
      <div className="relative h-44 bg-slate-100 overflow-hidden flex-shrink-0">
        {convenio.imagen_url ? (
          <img
            src={convenio.imagen_url}
            alt={convenio.nombre}
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-jbBlue/10 to-jbOrange/10">
            <Tag className="w-12 h-12 text-jbBlue/30" />
          </div>
        )}
        <span className={`absolute top-3 left-3 text-[10px] font-black uppercase px-3 py-1 rounded-full border ${colorClass}`}>
          {convenio.categoria}
        </span>
        {convenio.descuento && (
          <span className="absolute top-3 right-3 bg-jbRed text-white text-[11px] font-black px-3 py-1 rounded-full shadow">
            {convenio.descuento}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="p-5 flex flex-col flex-1">
        <p className="text-[10px] font-black text-jbOrange uppercase tracking-widest mb-1">{convenio.empresa}</p>
        <h3 className="text-base font-black text-jbBlue font-heading leading-tight mb-2">{convenio.nombre}</h3>
        {convenio.descripcion && (
          <p className="text-xs text-slate-500 font-medium leading-relaxed line-clamp-2 mb-4 flex-1">{convenio.descripcion}</p>
        )}

        <button
          onClick={() => onVerDetalles(convenio)}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-jbBlue text-white font-black text-xs uppercase tracking-widest hover:bg-jbNavy transition-all shadow-md shadow-jbBlue/20 mt-auto"
        >
          <ChevronDown className="w-3.5 h-3.5" /> Ver detalles
        </button>
      </div>
    </div>
  );
};

// ─── VISTA PRINCIPAL ─────────────────────────────────────────
const Convenios: React.FC = () => {
  const [convenios, setConvenios] = useState<Convenio[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoriaActiva, setCategoriaActiva] = useState("Todas");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [selectedConvenio, setSelectedConvenio] = useState<Convenio | null>(null);

  const loadConvenios = async (cat = categoriaActiva, q = search) => {
    setLoading(true);
    try {
      const data = await conveniosApi.getAll({ categoria: cat, search: q });
      setConvenios(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Error cargando convenios:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadConvenios(); }, []);

  const handleCategoria = (cat: string) => {
    setCategoriaActiva(cat);
    loadConvenios(cat, search);
  };

  const handleSearch = () => {
    setSearch(searchInput);
    loadConvenios(categoriaActiva, searchInput);
  };

  const clearSearch = () => {
    setSearchInput("");
    setSearch("");
    loadConvenios(categoriaActiva, "");
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Modal */}
      {selectedConvenio && (
        <ConvenioModal
          convenio={selectedConvenio}
          onClose={() => setSelectedConvenio(null)}
        />
      )}

      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-jbBlue font-heading">
          Convenios y <span className="text-jbOrange">Beneficios</span>
        </h1>
        <p className="text-jbGray font-medium mt-1">
          Beneficios exclusivos para colaboradores de Consultora JB.
        </p>
      </div>

      {/* Búsqueda */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-jbGray" />
          <input
            type="text"
            placeholder="Buscar convenio o empresa..."
            className="w-full bg-white border border-slate-200 rounded-2xl py-3 pl-12 pr-10 text-sm font-semibold focus:outline-none focus:border-jbBlue transition-all shadow-sm"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          {searchInput && (
            <button onClick={clearSearch} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <button
          onClick={handleSearch}
          className="px-6 py-3 bg-jbBlue text-white rounded-2xl text-sm font-black hover:bg-jbNavy transition-all shadow-lg shadow-jbBlue/20"
        >
          Buscar
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIAS.map((cat) => (
          <button
            key={cat}
            onClick={() => handleCategoria(cat)}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border transition-all ${
              categoriaActiva === cat
                ? "bg-jbBlue text-white border-jbBlue shadow-lg shadow-jbBlue/20"
                : "bg-white text-jbGray border-slate-200 hover:border-jbBlue hover:text-jbBlue"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-32">
          <div className="w-10 h-10 border-4 border-jbBlue border-t-jbOrange rounded-full animate-spin" />
        </div>
      ) : convenios.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 bg-white rounded-2xl border border-slate-100">
          <Tag className="w-14 h-14 text-slate-200 mb-4" />
          <p className="text-jbBlue font-black text-lg uppercase tracking-widest font-heading">Sin convenios disponibles</p>
          <p className="text-jbGray text-sm mt-1">Pronto se agregarán nuevos beneficios.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {convenios.map((c) => (
            <ConvenioCard
              key={c.id}
              convenio={c}
              onVerDetalles={setSelectedConvenio}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Convenios;