import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Plus, Edit2, Trash2, X, Upload, AlertTriangle, Tag, Image } from "lucide-react";
import { conveniosApi } from "../services/api";

const CATEGORIAS = ["Salud", "Alimentación", "Educación", "Transporte", "Entretenimiento", "Moda", "Finanzas", "Otros"];

interface Convenio {
  id: string; nombre: string; empresa: string; categoria: string;
  descripcion: string; beneficios: string; quienes: string;
  como_acceder: string; vigencia: string; contacto: string;
  descuento: string; imagen_url: string; activo: number;
}

const EMPTY_FORM = {
  nombre: "", empresa: "", categoria: CATEGORIAS[0],
  descripcion: "", beneficios: "", quienes: "",
  como_acceder: "", vigencia: "", contacto: "",
  descuento: "", imagen_url: "", activo: 1,
};

const ConveniosAdmin: React.FC = () => {
  const [convenios, setConvenios] = useState<Convenio[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ ...EMPTY_FORM });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [uploadingImg, setUploadingImg] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; convenio: Convenio | null }>({ open: false, convenio: null });
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await conveniosApi.getAll({});
      setConvenios(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openModal = (convenio?: Convenio) => {
    setError("");
    if (convenio) {
      setEditingId(convenio.id);
      setFormData({
        nombre: convenio.nombre, empresa: convenio.empresa,
        categoria: convenio.categoria, descripcion: convenio.descripcion || "",
        beneficios: convenio.beneficios || "", quienes: convenio.quienes || "",
        como_acceder: convenio.como_acceder || "", vigencia: convenio.vigencia || "",
        contacto: convenio.contacto || "", descuento: convenio.descuento || "",
        imagen_url: convenio.imagen_url || "", activo: convenio.activo,
      });
      setPreviewUrl(convenio.imagen_url || "");
    } else {
      setEditingId(null);
      setFormData({ ...EMPTY_FORM });
      setPreviewUrl("");
    }
    setIsModalOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImg(true);
    try {
      const url = await conveniosApi.uploadImage(file);
      setFormData(f => ({ ...f, imagen_url: url }));
      setPreviewUrl(url);
    } catch (err: any) {
      setError(err.message || "Error al subir la imagen.");
    } finally {
      setUploadingImg(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      if (editingId) {
        await conveniosApi.update(editingId, formData);
      } else {
        await conveniosApi.create(formData);
      }
      await load();
      setIsModalOpen(false);
    } catch (err: any) {
      setError(err.message || "Error al guardar el convenio.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteModal.convenio) return;
    setDeleting(true);
    try {
      await conveniosApi.delete(deleteModal.convenio.id);
      await load();
      setDeleteModal({ open: false, convenio: null });
    } catch (err: any) {
      alert(err.message || "Error al eliminar.");
    } finally {
      setDeleting(false);
    }
  };

  const set = (field: string, value: any) => setFormData(f => ({ ...f, [field]: value }));

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-jbBlue font-heading">
            Gestión de <span className="text-jbOrange">Convenios</span>
          </h1>
          <p className="text-jbGray font-medium mt-1">Administra los beneficios corporativos de Consultora JB.</p>
        </div>
        <button onClick={() => openModal()}
          className="flex items-center gap-2 bg-jbBlue text-white px-8 py-4 rounded-2xl font-black text-xs tracking-widest hover:bg-jbNavy transition-all shadow-xl shadow-jbBlue/20">
          <Plus className="w-4 h-4" /> NUEVO CONVENIO
        </button>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/80">
              <tr>
                <th className="px-8 py-5 text-[11px] font-black text-jbBlue uppercase tracking-widest">Convenio</th>
                <th className="px-8 py-5 text-[11px] font-black text-jbBlue uppercase tracking-widest">Categoría</th>
                <th className="px-8 py-5 text-[11px] font-black text-jbBlue uppercase tracking-widest">Descuento</th>
                <th className="px-8 py-5 text-[11px] font-black text-jbBlue uppercase tracking-widest">Estado</th>
                <th className="px-8 py-5 text-[11px] font-black text-jbBlue uppercase tracking-widest text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={5} className="px-8 py-20 text-center">
                  <div className="w-8 h-8 border-4 border-jbBlue border-t-jbOrange rounded-full animate-spin mx-auto" />
                </td></tr>
              ) : convenios.map(c => (
                <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      {c.imagen_url ? (
                        <img src={c.imagen_url} alt={c.nombre} className="w-12 h-12 rounded-xl object-cover border border-slate-100" />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center">
                          <Tag className="w-5 h-5 text-slate-400" />
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-bold text-jbBlue font-heading">{c.nombre}</p>
                        <p className="text-[10px] text-jbGray font-bold">{c.empresa}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5"><span className="text-xs font-black text-slate-600 uppercase">{c.categoria}</span></td>
                  <td className="px-8 py-5"><span className="text-sm font-black text-jbRed font-heading">{c.descuento || "—"}</span></td>
                  <td className="px-8 py-5">
                    <span className={`flex items-center gap-1.5 text-[10px] font-black uppercase ${c.activo ? "text-jbTurquoise" : "text-jbRed"}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${c.activo ? "bg-jbTurquoise" : "bg-jbRed"}`} />
                      {c.activo ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openModal(c)} className="p-2.5 rounded-xl bg-slate-100 text-jbBlue hover:bg-jbBlue hover:text-white transition-all"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => setDeleteModal({ open: true, convenio: c })} className="p-2.5 rounded-xl bg-jbRed/10 text-jbRed hover:bg-jbRed hover:text-white transition-all"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && convenios.length === 0 && (
                <tr><td colSpan={5} className="px-8 py-20 text-center text-jbGray font-bold">Sin convenios creados</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal crear/editar */}
      {isModalOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="bg-jbBlue p-8 text-white flex justify-between items-center flex-shrink-0">
              <h3 className="text-xl font-black uppercase tracking-tighter font-heading">{editingId ? "EDITAR CONVENIO" : "NUEVO CONVENIO"}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/10 rounded-xl"><X className="w-6 h-6" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-5 overflow-y-auto">
              {/* Imagen */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-jbGray uppercase tracking-widest">Imagen del Convenio</label>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden bg-slate-50 flex-shrink-0">
                    {previewUrl ? <img src={previewUrl} alt="preview" className="w-full h-full object-cover" /> : <Image className="w-8 h-8 text-slate-300" />}
                  </div>
                  <div className="flex-1">
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                    <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadingImg}
                      className="flex items-center gap-2 px-5 py-3 bg-jbBlue/10 text-jbBlue rounded-xl font-black text-xs uppercase tracking-widest hover:bg-jbBlue hover:text-white transition-all disabled:opacity-60">
                      <Upload className="w-4 h-4" />{uploadingImg ? "SUBIENDO..." : "SUBIR IMAGEN"}
                    </button>
                    <p className="text-[10px] text-slate-400 mt-1.5">JPG, PNG, WEBP — Máx 5MB</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {[["Nombre del Convenio","nombre","Ej: Convenio JB x TrueDent"],["Empresa","empresa","Ej: TrueDent"]].map(([label,field,ph]) => (
                  <div key={field} className="space-y-1.5">
                    <label className="text-[10px] font-black text-jbGray uppercase tracking-widest">{label}</label>
                    <input placeholder={ph} required className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm font-semibold focus:outline-none focus:border-jbBlue transition-all"
                      value={(formData as any)[field]} onChange={e => set(field, e.target.value)} />
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-jbGray uppercase tracking-widest">Categoría</label>
                  <select required className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm font-semibold focus:outline-none focus:border-jbBlue transition-all"
                    value={formData.categoria} onChange={e => set("categoria", e.target.value)}>
                    {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-jbGray uppercase tracking-widest">Descuento (opcional)</label>
                  <input placeholder="Ej: Hasta 50% DSCTO" className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm font-semibold focus:outline-none focus:border-jbBlue transition-all"
                    value={formData.descuento} onChange={e => set("descuento", e.target.value)} />
                </div>
              </div>

              {[
                ["Descripción breve","descripcion","Breve descripción del convenio...",2],
                ["¿Qué incluye el convenio?","beneficios","Consultas generales gratuitas\nHasta 50% de descuento",4],
                ["¿Quiénes pueden acceder?","quienes","Colaboradores activos de Consultora JB\nFamiliares directos",3],
                ["¿Cómo acceder?","como_acceder","Indicar que perteneces a Consultora JB\nPresentar identificación",3],
              ].map(([label,field,ph,rows]) => (
                <div key={field as string} className="space-y-1.5">
                  <label className="text-[10px] font-black text-jbGray uppercase tracking-widest">{label}</label>
                  {(rows as number) > 1 && <p className="text-[10px] text-slate-400">Una línea por ítem</p>}
                  <textarea rows={rows as number} placeholder={ph as string}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm font-semibold focus:outline-none focus:border-jbBlue transition-all resize-none"
                    value={(formData as any)[field]} onChange={e => set(field as string, e.target.value)} />
                </div>
              ))}

              <div className="grid grid-cols-2 gap-4">
                {[["Vigencia","vigencia","Ej: Válido por 12 meses"],["Contacto","contacto","Ej: 968-978-774"]].map(([label,field,ph]) => (
                  <div key={field} className="space-y-1.5">
                    <label className="text-[10px] font-black text-jbGray uppercase tracking-widest">{label}</label>
                    <input placeholder={ph} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm font-semibold focus:outline-none focus:border-jbBlue transition-all"
                      value={(formData as any)[field]} onChange={e => set(field, e.target.value)} />
                  </div>
                ))}
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-jbGray uppercase tracking-widest">Estado</label>
                <div className="flex gap-3">
                  <button type="button" onClick={() => set("activo", 1)}
                    className={`flex-1 py-3 rounded-xl text-xs font-black uppercase transition-all border ${formData.activo ? "bg-jbTurquoise text-white border-jbTurquoise" : "bg-slate-50 text-jbGray border-slate-200"}`}>
                    Activo
                  </button>
                  <button type="button" onClick={() => set("activo", 0)}
                    className={`flex-1 py-3 rounded-xl text-xs font-black uppercase transition-all border ${!formData.activo ? "bg-jbRed text-white border-jbRed" : "bg-slate-50 text-jbGray border-slate-200"}`}>
                    Inactivo
                  </button>
                </div>
              </div>

              {error && <p className="text-jbRed text-xs font-bold bg-jbRed/10 py-3 px-4 rounded-xl border border-jbRed/20">{error}</p>}

              <button type="submit" disabled={submitting}
                className="w-full bg-jbBlue text-white py-5 rounded-[1.5rem] font-black tracking-widest hover:bg-jbNavy shadow-xl shadow-jbBlue/20 transition-all disabled:opacity-60">
                {submitting ? "GUARDANDO..." : editingId ? "GUARDAR CAMBIOS" : "CREAR CONVENIO"}
              </button>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Modal eliminar */}
      {deleteModal.open && deleteModal.convenio && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden">
            <div className="bg-jbRed p-8 text-white text-center">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4"><AlertTriangle className="w-8 h-8" /></div>
              <h3 className="text-xl font-black uppercase font-heading">Eliminar Convenio</h3>
            </div>
            <div className="p-8 text-center space-y-4">
              <p className="text-jbGray font-semibold text-sm">¿Eliminar <strong className="text-jbBlue">{deleteModal.convenio.nombre}</strong>?</p>
              <p className="text-[11px] text-slate-400">Esta acción no se puede deshacer.</p>
            </div>
            <div className="px-8 pb-8 grid grid-cols-2 gap-4">
              <button onClick={() => setDeleteModal({ open: false, convenio: null })} disabled={deleting}
                className="py-4 rounded-2xl border-2 border-slate-200 text-jbGray font-black text-xs uppercase tracking-widest hover:bg-slate-50 disabled:opacity-60">CANCELAR</button>
              <button onClick={handleDelete} disabled={deleting}
                className="py-4 rounded-2xl bg-jbRed text-white font-black text-xs uppercase tracking-widest hover:bg-red-700 disabled:opacity-60">
                {deleting ? "ELIMINANDO..." : "SÍ, ELIMINAR"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default ConveniosAdmin;