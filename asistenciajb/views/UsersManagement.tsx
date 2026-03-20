import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { User, Schedule } from "../types";
import { UserPlus, Search, Edit2, Trash2, X, Clock, AlertTriangle } from "lucide-react";
import { usersApi, schedulesApi } from "../services/api";

interface Props {
  users: User[];
  onUpdateUsers: (users: User[]) => void;
  currentUser: User;
}

const AREAS = [
  "MARKETING DIGITAL", "DESARROLLO Y PROGRAMACIÓN WEB",
  "DISEÑO Y PRODUCCIÓN AUDIOVISUAL", "SECRETARÍA DE GERENCIA",
  "LEGAL", "PLANEAMIENTO ESTRATÉGICO", "SOMA",
  "PLANIFICACIÓN Y DESARROLLO DE EMPRESAS",
];

const UsersManagement: React.FC<Props> = ({ users, onUpdateUsers, currentUser }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; user: User | null }>({ open: false, user: null });
  const [deleting, setDeleting] = useState(false);

  const [formData, setFormData] = useState({
    name: "", email: "", password: "",
    role: "employee" as "admin" | "employee",
    area: AREAS[0],
    status: "active" as "active" | "inactive",
    schedule_id: "default-schedule-id",
    lunchStartTime: "12:00",
    lunchLimit: "13:00",
  });

  useEffect(() => {
    const fetchSchedules = async () => {
      try {
        const data = await schedulesApi.getAll();
        setSchedules(data);
      } catch (err) { console.error("Error al cargar los horarios:", err); }
    };
    fetchSchedules();
  }, []);

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openModal = (user: User | null = null) => {
    setError("");
    if (user) {
      setEditingUser(user);
      setFormData({
        name: user.name, email: user.email, password: "",
        role: user.role, area: user.area, status: user.status,
        schedule_id: user.schedule_id || "default-schedule-id",
        lunchStartTime: (user as any).lunchStartTime || (user as any).lunch_start_time || "12:00",
        lunchLimit: (user as any).lunchLimit || (user as any).lunch_limit || "13:00",
      });
    } else {
      setEditingUser(null);
      setFormData({
        name: "", email: "", password: "", role: "employee", area: AREAS[0],
        status: "active", schedule_id: schedules.length > 0 ? schedules[0].id : "default-schedule-id",
        lunchStartTime: "12:00", lunchLimit: "13:00",
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      if (editingUser) {
        const payload: any = {
          name: formData.name, email: formData.email,
          area: formData.area, schedule_id: formData.schedule_id,
          lunchStartTime: formData.lunchStartTime,
          lunchLimit: formData.lunchLimit,
        };
        if (editingUser.id !== currentUser.id) {
          payload.role = formData.role;
          payload.status = formData.status;
        }
        if (formData.password) payload.password = formData.password;
        await usersApi.update(editingUser.id, payload);
      } else {
        await usersApi.create({
          name: formData.name, email: formData.email, password: formData.password,
          role: formData.role, area: formData.area, schedule_id: formData.schedule_id,
          lunchStartTime: formData.lunchStartTime, lunchLimit: formData.lunchLimit,
        } as any);
      }
      const fresh = await usersApi.getAll();
      onUpdateUsers(fresh);
      setIsModalOpen(false);
    } catch (err: any) {
      setError(err.message || "Error al guardar el colaborador.");
    } finally { setSubmitting(false); }
  };

  const confirmDelete = (user: User) => setDeleteModal({ open: true, user });

  const handleDelete = async () => {
    if (!deleteModal.user) return;
    setDeleting(true);
    try {
      await usersApi.deactivate(deleteModal.user.id);
      const fresh = await usersApi.getAll();
      onUpdateUsers(fresh);
      setDeleteModal({ open: false, user: null });
    } catch (err: any) {
      alert(err.message || "Error al eliminar el usuario.");
    } finally { setDeleting(false); }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-jbBlue font-heading">
            Gestión de <span className="text-jbOrange">Colaboradores</span>
          </h1>
          <p className="text-jbGray font-medium mt-1">Directorio de personal y permisos del sistema JB.</p>
        </div>
        <button onClick={() => openModal()}
          className="flex items-center gap-2 bg-jbBlue text-white px-8 py-4 rounded-2xl font-black font-heading text-xs tracking-widest hover:bg-jbNavy transition-all shadow-xl shadow-jbBlue/20">
          <UserPlus className="w-4 h-4" /> AÑADIR COLABORADOR
        </button>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
        <div className="p-8 border-b border-slate-50">
          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-jbGray" />
            <input type="text" placeholder="Buscar por nombre o usuario..."
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-12 pr-4 text-sm font-semibold focus:outline-none focus:border-jbBlue transition-all"
              value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/80">
              <tr>
                <th className="px-8 py-5 text-[11px] font-black text-jbBlue uppercase font-heading tracking-widest">Colaborador</th>
                <th className="px-8 py-5 text-[11px] font-black text-jbBlue uppercase font-heading tracking-widest">Área / Horario</th>
                <th className="px-8 py-5 text-[11px] font-black text-jbBlue uppercase font-heading tracking-widest">Almuerzo</th>
                <th className="px-8 py-5 text-[11px] font-black text-jbBlue uppercase font-heading tracking-widest">Rol</th>
                <th className="px-8 py-5 text-[11px] font-black text-jbBlue uppercase font-heading tracking-widest">Estado</th>
                <th className="px-8 py-5 text-[11px] font-black text-jbBlue uppercase font-heading tracking-widest text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map(u => (
                <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <img src={u.avatar} className="w-10 h-10 rounded-full border-2 border-slate-100 bg-white shadow-sm" alt={u.name} />
                      <div>
                        <p className="text-sm font-bold text-jbBlue font-heading leading-tight">{u.name}</p>
                        <p className="text-[10px] text-jbGray font-bold">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tighter block max-w-[150px] leading-tight">{u.area}</span>
                    {u.schedule_name && (
                      <span className="flex items-center gap-1 text-[9px] font-black text-jbOrange uppercase tracking-widest mt-1">
                        <Clock className="w-3 h-3" /> {u.schedule_name}
                      </span>
                    )}
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-jbOrange" />
                      <span className="text-xs font-black text-jbOrange font-heading">
                        {(u as any).lunchStartTime || (u as any).lunch_start_time || "12:00"}
                        {" → "}
                        {(u as any).lunchLimit || (u as any).lunch_limit || "13:00"}
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full border ${u.role === "admin" ? "bg-jbBlue/10 text-jbBlue border-jbBlue/20" : "bg-slate-100 text-slate-600 border-slate-200"}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <span className={`flex items-center gap-1.5 text-[10px] font-black uppercase ${u.status === "active" ? "text-jbTurquoise" : "text-jbRed"}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${u.status === "active" ? "bg-jbTurquoise" : "bg-jbRed"}`} />
                      {u.status === "active" ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openModal(u)} className="p-2.5 rounded-xl bg-slate-100 text-jbBlue hover:bg-jbBlue hover:text-white transition-all">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => confirmDelete(u)} className="p-2.5 rounded-xl bg-jbRed/10 text-jbRed hover:bg-jbRed hover:text-white transition-all">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr><td colSpan={6} className="px-8 py-20 text-center text-jbGray font-bold text-sm">Sin colaboradores encontrados</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal crear/editar */}
      {isModalOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in zoom-in duration-300">
          <div className="bg-white w-full max-w-xl rounded-[3rem] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="bg-jbBlue p-8 text-white flex justify-between items-center font-heading flex-shrink-0">
              <h3 className="text-xl font-black uppercase tracking-tighter">
                {editingUser ? "EDITAR COLABORADOR" : "NUEVO COLABORADOR JB"}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/10 rounded-xl">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-10 space-y-6 overflow-y-auto">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-jbGray uppercase tracking-widest px-1">Nombre Completo</label>
                  <input required className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-4 text-sm font-semibold focus:outline-none focus:border-jbBlue transition-all"
                    value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-jbGray uppercase tracking-widest px-1">Usuario / Correo</label>
                  <input required className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-4 text-sm font-semibold focus:outline-none focus:border-jbBlue transition-all"
                    value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-jbGray uppercase tracking-widest px-1">Área Corporativa</label>
                  <select className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-4 text-sm font-semibold focus:outline-none focus:border-jbBlue transition-all"
                    value={formData.area} onChange={e => setFormData({ ...formData, area: e.target.value })}>
                    {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-jbGray uppercase tracking-widest px-1">Horario Asignado</label>
                  <select className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-4 text-sm font-semibold focus:outline-none focus:border-jbBlue transition-all"
                    value={formData.schedule_id} onChange={e => setFormData({ ...formData, schedule_id: e.target.value })}>
                    {schedules.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Horario de almuerzo */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-jbGray uppercase tracking-widest px-1 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-jbOrange" /> Horario de Almuerzo
                </label>
                <div className="bg-jbOrange/5 border border-jbOrange/20 rounded-2xl px-5 py-4 space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] font-black text-jbGray uppercase tracking-widest mb-1.5">Inicio almuerzo</p>
                      <input type="time" required
                        className="w-full bg-white border border-jbOrange/20 rounded-xl py-2.5 px-3 text-lg font-black text-jbOrange font-heading focus:outline-none focus:border-jbOrange tabular-nums"
                        value={formData.lunchStartTime}
                        onChange={e => setFormData({ ...formData, lunchStartTime: e.target.value })} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-jbGray uppercase tracking-widest mb-1.5">Límite de regreso</p>
                      <input type="time" required
                        className="w-full bg-white border border-jbOrange/20 rounded-xl py-2.5 px-3 text-lg font-black text-jbRed font-heading focus:outline-none focus:border-jbOrange tabular-nums"
                        value={formData.lunchLimit}
                        onChange={e => setFormData({ ...formData, lunchLimit: e.target.value })} />
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 font-semibold">
                    El botón de almuerzo se habilita a la hora de inicio. Si regresa después del límite, se marcará en <span className="text-jbRed font-black">ROJO</span>.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-jbGray uppercase tracking-widest px-1">
                  {editingUser ? "Nueva Contraseña (opcional)" : "Contraseña"}
                </label>
                <input type="password" required={!editingUser}
                  placeholder={editingUser ? "Dejar vacío para no cambiar" : ""}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-4 text-sm font-semibold focus:outline-none focus:border-jbBlue transition-all"
                  value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-jbGray uppercase tracking-widest px-1">Rol de Acceso</label>
                  {editingUser?.id === currentUser.id ? (
                    <div className="w-full bg-slate-100 border border-slate-200 rounded-2xl py-4 px-4 text-sm font-semibold text-slate-400 flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase">{formData.role === "admin" ? "ADMIN" : "EMPLEADO"}</span>
                      <span className="text-[9px] text-slate-400 ml-auto">No editable</span>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      {(["admin", "employee"] as const).map(r => (
                        <button key={r} type="button" onClick={() => setFormData({ ...formData, role: r })}
                          className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all border ${formData.role === r ? "bg-jbBlue text-white border-jbBlue" : "bg-slate-50 text-jbGray border-slate-200"}`}>
                          {r === "admin" ? "ADMIN" : "EMPLEADO"}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-jbGray uppercase tracking-widest px-1">Estado de Cuenta</label>
                  {editingUser?.id === currentUser.id ? (
                    <div className="w-full bg-slate-100 border border-slate-200 rounded-2xl py-4 px-4 text-sm font-semibold text-slate-400 flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase text-jbTurquoise">ACTIVO</span>
                      <span className="text-[9px] text-slate-400 ml-auto">No editable</span>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setFormData({ ...formData, status: "active" })}
                        className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all border ${formData.status === "active" ? "bg-jbTurquoise text-white border-jbTurquoise" : "bg-slate-50 text-jbGray border-slate-200"}`}>
                        ACTIVO
                      </button>
                      <button type="button" onClick={() => setFormData({ ...formData, status: "inactive" })}
                        className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all border ${formData.status === "inactive" ? "bg-jbRed text-white border-jbRed" : "bg-slate-50 text-jbGray border-slate-200"}`}>
                        INACTIVO
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {error && <p className="text-jbRed text-[11px] font-bold bg-jbRed/10 py-3 px-4 rounded-xl border border-jbRed/20">{error}</p>}

              <button type="submit" disabled={submitting}
                className="w-full bg-jbBlue text-white py-5 rounded-[1.5rem] font-black font-heading tracking-widest hover:bg-jbNavy shadow-xl shadow-jbBlue/20 transition-all disabled:opacity-60">
                {submitting ? "GUARDANDO..." : editingUser ? "GUARDAR CAMBIOS JB" : "REGISTRAR COLABORADOR"}
              </button>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Modal eliminar */}
      {deleteModal.open && deleteModal.user && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in zoom-in duration-200">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden">
            <div className="bg-jbRed p-8 text-white text-center">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black uppercase tracking-tighter font-heading">Eliminar Colaborador</h3>
            </div>
            <div className="p-8 text-center space-y-4">
              <p className="text-jbGray font-semibold text-sm">¿Estás seguro de que deseas eliminar a</p>
              <div className="flex items-center gap-3 bg-slate-50 rounded-2xl p-4 border border-slate-100">
                <img src={deleteModal.user.avatar} className="w-12 h-12 rounded-full border-2 border-slate-200 bg-white" alt={deleteModal.user.name} />
                <div className="text-left">
                  <p className="text-sm font-black text-jbBlue font-heading">{deleteModal.user.name}</p>
                  <p className="text-[10px] text-jbGray font-bold">{deleteModal.user.email}</p>
                  <p className="text-[10px] text-jbOrange font-black uppercase tracking-widest mt-0.5">{deleteModal.user.area}</p>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 font-semibold">Esta acción eliminará al colaborador. No se puede deshacer.</p>
            </div>
            <div className="px-8 pb-8 grid grid-cols-2 gap-4">
              <button onClick={() => setDeleteModal({ open: false, user: null })} disabled={deleting}
                className="py-4 rounded-2xl border-2 border-slate-200 text-jbGray font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all disabled:opacity-60">
                CANCELAR
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="py-4 rounded-2xl bg-jbRed text-white font-black text-xs uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg shadow-jbRed/20 disabled:opacity-60">
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

export default UsersManagement;