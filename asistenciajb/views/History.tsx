import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { History as HistoryIcon, Search, Filter, Download, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { attendanceApi, reportsApi } from '../services/api';

interface Props {
  records: any[];
  user: User;
}

const AREAS = [
  "TODAS LAS ÁREAS", "MARKETING DIGITAL", "DESARROLLO Y PROGRAMACIÓN WEB",
  "DISEÑO Y PRODUCCIÓN AUDIOVISUAL", "SECRETARÍA DE GERENCIA", "LEGAL",
  "PLANEAMIENTO ESTRATÉGICO", "SOMA", "PLANIFICACIÓN Y DESARROLLO DE EMPRESAS"
];

const LIMIT = 10;

const AttendanceHistory: React.FC<Props> = ({ user }) => {
  const [records, setRecords] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const loadRecords = async (p = 1, search = searchTerm, date = filterDate) => {
    setLoading(true);
    try {
      const params: any = { page: p, limit: LIMIT };
      if (search) params.search = search;
      if (date) { params.dateFrom = date; params.dateTo = date; }
      if (user.role !== 'admin') params.userId = user.id;

      const data = await attendanceApi.getAll(params);
      setRecords(data.records);
      setTotal(data.total);
      setPage(p);
    } catch (e) {
      console.error('Error cargando historial:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadRecords(1); }, []);

  const handleSearch = () => {
    setSearchTerm(searchInput);
    loadRecords(1, searchInput, filterDate);
  };

  const handleDateChange = (date: string) => {
    setFilterDate(date);
    loadRecords(1, searchTerm, date);
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-jbBlue font-heading">
            {user.role === 'admin' ? 'Registro Maestro' : 'Mi Historial'} <span className="text-jbOrange">JB</span>
          </h1>
          <p className="text-jbGray font-medium mt-1">
            {user.role === 'admin' ? 'Control detallado de todas las marcaciones corporativas.' : 'Consulta tus tiempos de entrada y salida registrados.'}
          </p>
        </div>
        <button
          onClick={() => reportsApi.exportCSV(filterDate || undefined, filterDate || undefined)}
          className="flex items-center gap-2 bg-jbBlue/10 text-jbBlue px-6 py-3 rounded-xl font-black text-[10px] tracking-widest uppercase hover:bg-jbBlue hover:text-white transition-all border border-jbBlue/20"
        >
          <Download className="w-4 h-4" />
          EXPORTAR CSV
        </button>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
        {/* Filtros */}
        <div className="p-8 border-b border-slate-50 bg-slate-50/30">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Búsqueda */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-jbGray" />
                <input type="text" placeholder="Buscar por nombre..."
                  className="w-full bg-white border border-slate-200 rounded-2xl py-3 pl-12 pr-4 text-xs font-semibold focus:outline-none focus:border-jbBlue transition-all shadow-sm"
                  value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()} />
              </div>
              <button onClick={handleSearch} className="px-4 py-3 bg-jbBlue text-white rounded-2xl text-xs font-black hover:bg-jbNavy transition-all">
                Buscar
              </button>
            </div>

            {/* Filtro área (solo admin) */}
            {user.role === 'admin' ? (
              <div className="relative">
                <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-jbGray" />
                <select className="w-full bg-white border border-slate-200 rounded-2xl py-3 pl-12 pr-4 text-xs font-semibold focus:outline-none focus:border-jbBlue appearance-none transition-all shadow-sm">
                  {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            ) : <div />}

            {/* Filtro fecha */}
            <div className="relative">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-jbGray" />
              <input type="date"
                className="w-full bg-white border border-slate-200 rounded-2xl py-3 pl-12 pr-4 text-xs font-semibold focus:outline-none focus:border-jbBlue transition-all shadow-sm"
                value={filterDate} onChange={(e) => handleDateChange(e.target.value)} />
            </div>
          </div>
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/80">
              <tr>
                {user.role === 'admin' && <th className="px-8 py-5 text-[11px] font-black text-jbBlue uppercase font-heading tracking-widest">Colaborador</th>}
                <th className="px-8 py-5 text-[11px] font-black text-jbBlue uppercase font-heading tracking-widest">Fecha</th>
                <th className="px-8 py-5 text-[11px] font-black text-jbBlue uppercase font-heading tracking-widest">Marcación Entrada</th>
                <th className="px-8 py-5 text-[11px] font-black text-jbBlue uppercase font-heading tracking-widest">Marcación Salida</th>
                <th className="px-8 py-5 text-[11px] font-black text-jbBlue uppercase font-heading tracking-widest">Estado JB</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={user.role === 'admin' ? 5 : 4} className="px-8 py-20 text-center">
                  <div className="w-8 h-8 border-4 border-jbBlue border-t-jbOrange rounded-full animate-spin mx-auto" />
                </td></tr>
              ) : records.map(r => (
                <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                  {user.role === 'admin' && (
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${r.userName}`} className="w-10 h-10 rounded-full bg-white border-2 border-slate-100 shadow-sm" alt={r.userName} />
                        <div>
                          <p className="text-sm font-bold text-jbBlue font-heading leading-tight">{r.userName}</p>
                          <p className="text-[9px] text-jbGray font-black uppercase tracking-widest">ID: {r.userId?.slice(-6)}</p>
                        </div>
                      </div>
                    </td>
                  )}
                  <td className="px-8 py-5">
                    <p className="text-sm font-bold text-slate-700">
                      {new Date(r.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </p>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-jbTurquoise" />
                      <p className="text-sm font-black text-jbBlue font-heading">
                        {new Date(r.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    {r.checkOut ? (
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-jbOrange" />
                        <p className="text-sm font-black text-jbBlue font-heading">
                          {new Date(r.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    ) : (
                      <span className="text-jbOrange/50 italic text-[10px] font-black px-3 py-1 bg-jbOrange/5 rounded-full border border-jbOrange/10">EN CURSO</span>
                    )}
                  </td>
                  <td className="px-8 py-5">
                    <span className="px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest font-heading border shadow-sm bg-jbTurquoise/10 text-jbTurquoise border-jbTurquoise/20">
                      {r.status}
                    </span>
                  </td>
                </tr>
              ))}
              {!loading && records.length === 0 && (
                <tr><td colSpan={user.role === 'admin' ? 5 : 4} className="px-8 py-32 text-center">
                  <div className="flex flex-col items-center">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 mb-6 border border-slate-100">
                      <HistoryIcon className="w-10 h-10" />
                    </div>
                    <p className="text-jbBlue text-lg font-black uppercase tracking-widest font-heading">Sin registros para mostrar</p>
                  </div>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
          <p className="text-[10px] font-black text-jbGray uppercase tracking-widest font-heading">
            {total} registro{total !== 1 ? 's' : ''} encontrado{total !== 1 ? 's' : ''}
          </p>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => loadRecords(page - 1)}
              className="flex items-center gap-1 px-4 py-2 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-jbBlue hover:bg-slate-50 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-3 h-3" /> Anterior
            </button>
            <span className="px-3 py-2 text-[10px] font-black text-jbGray">
              {page} / {totalPages || 1}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => loadRecords(page + 1)}
              className="flex items-center gap-1 px-4 py-2 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-jbBlue hover:bg-slate-50 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Siguiente <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttendanceHistory;
