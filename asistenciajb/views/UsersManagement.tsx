import React, { useState } from 'react';
import { User } from '../types';
import { UserPlus, Search, Edit2, Trash2, X } from 'lucide-react';
import { usersApi } from '../services/api';

interface Props {
  users: User[];
  onUpdateUsers: (users: User[]) => void;
}

const AREAS = [
  "MARKETING DIGITAL",
  "DESARROLLO Y PROGRAMACIÓN WEB",
  "DISEÑO Y PRODUCCIÓN AUDIOVISUAL",
  "SECRETARÍA DE GERENCIA",
  "LEGAL",
  "PLANEAMIENTO ESTRATÉGICO",
  "SOMA",
  "PLANIFICACIÓN Y DESARROLLO DE EMPRESAS"
];

const UsersManagement: React.FC<Props> = ({ users, onUpdateUsers }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '', email: '', password: '',
    role: 'employee' as 'admin' | 'employee',
    area: AREAS[0],
    status: 'active' as 'active' | 'inactive'
  });

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openModal = (user: User | null = null) => {
    setError('');
    if (user) {
      setEditingUser(user);
      setFormData({ name: user.name, email: user.email, password: '', role: user.role, area: user.area, status: user.status });
    } else {
      setEditingUser(null);
      setFormData({ name: '', email: '', password: '', role: 'employee', area: AREAS[0], status: 'active' });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (editingUser) {
        // Editar — solo enviar password si se cambió
        const payload: any = {
          name: formData.name,
          email: formData.email,
          role: formData.role,
          area: formData.area,
          status: formData.status,
        };
        if (formData.password) payload.password = formData.password;
        await usersApi.update(editingUser.id, payload);
      } else {
        await usersApi.create({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role: formData.role,
          area: formData.area,
        });
      }
      // Refrescar lista desde API
      const fresh = await usersApi.getAll();
      onUpdateUsers(fresh);
      setIsModalOpen(false);
    } catch (err: any) {
      setError(err.message || 'Error al guardar el colaborador.');
    } finally {
      setSubmitting(false);
    }
  };

  const deleteUser = async (id: string) => {
    if (!window.confirm('¿Está seguro de desactivar este colaborador?')) return;
    try {
      await usersApi.deactivate(id);
      const fresh = await usersApi.getAll();
      onUpdateUsers(fresh);
    } catch (err: any) {
      alert(err.message || 'Error al desactivar el usuario.');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-jbBlue font-heading">Gestión de <span className="text-jbOrange">Colaboradores</span></h1>
          <p className="text-jbGray font-medium mt-1">Directorio de personal y permisos del sistema JB.</p>
        </div>
        <button onClick={() => openModal()}
          className="flex items-center gap-2 bg-jbBlue text-white px-8 py-4 rounded-2xl font-black font-heading text-xs tracking-widest hover:bg-jbNavy transition-all shadow-xl shadow-jbBlue/20">
          <UserPlus className="w-4 h-4" />
          AÑADIR COLABORADOR
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
                <th className="px-8 py-5 text-[11px] font-black text-jbBlue uppercase font-heading tracking-widest">Área JB</th>
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
                  </td>
                  <td className="px-8 py-5">
                    <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full border ${u.role === 'admin' ? 'bg-jbBlue/10 text-jbBlue border-jbBlue/20' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <span className={`flex items-center gap-1.5 text-[10px] font-black uppercase ${u.status === 'active' ? 'text-jbTurquoise' : 'text-jbRed'}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${u.status === 'active' ? 'bg-jbTurquoise' : 'bg-jbRed'}`} />
                      {u.status === 'active' ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openModal(u)} className="p-2.5 rounded-xl bg-slate-100 text-jbBlue hover:bg-jbBlue hover:text-white transition-all">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => deleteUser(u.id)} className="p-2.5 rounded-xl bg-jbRed/10 text-jbRed hover:bg-jbRed hover:text-white transition-all">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr><td colSpan={5} className="px-8 py-20 text-center text-jbGray font-bold text-sm">Sin colaboradores encontrados</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-jbBlue/20 backdrop-blur-sm animate-in fade-in zoom-in duration-300">
          <div className="bg-white w-full max-w-xl rounded-[3rem] shadow-2xl overflow-hidden border border-white">
            <div className="bg-jbBlue p-8 text-white flex justify-between items-center font-heading">
              <h3 className="text-xl font-black uppercase tracking-tighter">
                {editingUser ? 'EDITAR COLABORADOR' : 'NUEVO COLABORADOR JB'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/10 rounded-xl">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-10 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-jbGray uppercase tracking-widest px-1">Nombre Completo</label>
                  <input required className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-4 text-sm font-semibold focus:outline-none focus:border-jbBlue transition-all"
                    value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-jbGray uppercase tracking-widest px-1">Usuario / Correo</label>
                  <input required className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-4 text-sm font-semibold focus:outline-none focus:border-jbBlue transition-all"
                    value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-jbGray uppercase tracking-widest px-1">
                    {editingUser ? 'Nueva Contraseña (opcional)' : 'Contraseña'}
                  </label>
                  <input type="password" required={!editingUser}
                    placeholder={editingUser ? 'Dejar vacío para no cambiar' : ''}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-4 text-sm font-semibold focus:outline-none focus:border-jbBlue transition-all"
                    value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-jbGray uppercase tracking-widest px-1">Área Corporativa</label>
                  <select className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-4 text-sm font-semibold focus:outline-none focus:border-jbBlue transition-all"
                    value={formData.area} onChange={(e) => setFormData({ ...formData, area: e.target.value })}>
                    {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-jbGray uppercase tracking-widest px-1">Rol de Acceso</label>
                  <div className="flex gap-2">
                    {(['admin', 'employee'] as const).map(r => (
                      <button key={r} type="button" onClick={() => setFormData({ ...formData, role: r })}
                        className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all border ${formData.role === r ? 'bg-jbBlue text-white border-jbBlue' : 'bg-slate-50 text-jbGray border-slate-200'}`}>
                        {r === 'admin' ? 'ADMIN' : 'EMPLEADO'}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-jbGray uppercase tracking-widest px-1">Estado de Cuenta</label>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setFormData({ ...formData, status: 'active' })}
                      className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all border ${formData.status === 'active' ? 'bg-jbTurquoise text-white border-jbTurquoise' : 'bg-slate-50 text-jbGray border-slate-200'}`}>
                      ACTIVO
                    </button>
                    <button type="button" onClick={() => setFormData({ ...formData, status: 'inactive' })}
                      className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all border ${formData.status === 'inactive' ? 'bg-jbRed text-white border-jbRed' : 'bg-slate-50 text-jbGray border-slate-200'}`}>
                      INACTIVO
                    </button>
                  </div>
                </div>
              </div>

              {error && (
                <p className="text-jbRed text-[11px] font-bold bg-jbRed/10 py-3 px-4 rounded-xl border border-jbRed/20">{error}</p>
              )}

              <button type="submit" disabled={submitting}
                className="w-full bg-jbBlue text-white py-5 rounded-[1.5rem] font-black font-heading tracking-widest hover:bg-jbNavy shadow-xl shadow-jbBlue/20 transition-all disabled:opacity-60">
                {submitting ? 'GUARDANDO...' : editingUser ? 'GUARDAR CAMBIOS JB' : 'REGISTRAR COLABORADOR'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersManagement;
