import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom"; // 🚀 IMPORTANTE: Añadido para solucionar el z-index
import {
  Plus,
  Clock,
  Edit2,
  Trash2,
  X,
  ListTodo,
  CalendarDays,
  Loader2,
  AlertCircle,
  Eye,
  AlertTriangle, // 🚀 Añadido para el modal de eliminar
} from "lucide-react";
import { Schedule, BloqueDia, Turno } from "../types";
import { schedulesApi } from "../services/api";
import ScheduleCalendar from "../components/ScheduleCalendar";

const DIAS_SEMANA = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];

interface FormState {
  name: string;
  type: "simple" | "bloques";
  time_in: string;
  time_out: string;
  tolerance_minutes: number;
  blocks: Record<string, { activo: boolean; turnos: Turno[] }>;
}

const getInitialBlocks = () =>
  DIAS_SEMANA.reduce(
    (acc, dia) => {
      acc[dia] = { activo: false, turnos: [{ ingreso: "", salida: "" }] };
      return acc;
    },
    {} as FormState["blocks"],
  );

const INITIAL_FORM: FormState = {
  name: "",
  type: "simple",
  time_in: "",
  time_out: "",
  tolerance_minutes: 10,
  blocks: getInitialBlocks(),
};

const SchedulesManagement: React.FC = () => {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);

  const [previewSchedule, setPreviewSchedule] = useState<Schedule | null>(null);

  // 🚀 NUEVO: Estado para el modal de eliminar
  const [deleteModal, setDeleteModal] = useState<{
    open: boolean;
    schedule: Schedule | null;
  }>({
    open: false,
    schedule: null,
  });
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadSchedules();
  }, []);

  const loadSchedules = async () => {
    setLoading(true);
    try {
      const data = await schedulesApi.getAll();
      setSchedules(data);
    } catch (err: any) {
      setError(err.message || "Error al cargar horarios");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (schedule?: Schedule) => {
    setError("");
    if (schedule) {
      setEditingId(schedule.id);

      const loadedBlocks = getInitialBlocks();
      if (schedule.type === "bloques" && schedule.blocks) {
        schedule.blocks.forEach((b) => {
          if (loadedBlocks[b.day]) {
            loadedBlocks[b.day].activo = true;
            loadedBlocks[b.day].turnos = b.turnos.length
              ? b.turnos
              : [{ ingreso: "", salida: "" }];
          }
        });
      }

      setForm({
        name: schedule.name,
        type: schedule.type,
        time_in: schedule.time_in ? schedule.time_in.substring(0, 5) : "",
        time_out: schedule.time_out ? schedule.time_out.substring(0, 5) : "",
        tolerance_minutes: schedule.tolerance_minutes,
        blocks: loadedBlocks,
      });
    } else {
      setEditingId(null);
      setForm(INITIAL_FORM);
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setForm(INITIAL_FORM);
  };

  const toggleDia = (dia: string) => {
    setForm((prev) => ({
      ...prev,
      blocks: {
        ...prev.blocks,
        [dia]: { ...prev.blocks[dia], activo: !prev.blocks[dia].activo },
      },
    }));
  };

  const addTurno = (dia: string) => {
    setForm((prev) => ({
      ...prev,
      blocks: {
        ...prev.blocks,
        [dia]: {
          ...prev.blocks[dia],
          turnos: [...prev.blocks[dia].turnos, { ingreso: "", salida: "" }],
        },
      },
    }));
  };

  const removeTurno = (dia: string, index: number) => {
    setForm((prev) => ({
      ...prev,
      blocks: {
        ...prev.blocks,
        [dia]: {
          ...prev.blocks[dia],
          turnos: prev.blocks[dia].turnos.filter((_, i) => i !== index),
        },
      },
    }));
  };

  const updateTurno = (
    dia: string,
    index: number,
    field: keyof Turno,
    value: string,
  ) => {
    setForm((prev) => {
      const nuevosTurnos = [...prev.blocks[dia].turnos];
      nuevosTurnos[index][field] = value;
      return {
        ...prev,
        blocks: {
          ...prev.blocks,
          [dia]: { ...prev.blocks[dia], turnos: nuevosTurnos },
        },
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!form.name.trim()) return setError("El nombre es obligatorio.");

    const payloadBlocks: BloqueDia[] = [];
    if (form.type === "bloques") {
      DIAS_SEMANA.forEach((dia) => {
        if (form.blocks[dia].activo) {
          payloadBlocks.push({
            day: dia,
            turnos: form.blocks[dia].turnos.filter(
              (t) => t.ingreso && t.salida,
            ),
          });
        }
      });
      if (payloadBlocks.length === 0) {
        return setError("Debes configurar al menos un bloque de horario.");
      }
    } else if (!form.time_in || !form.time_out) {
      return setError("Las horas de entrada y salida son obligatorias.");
    }

    setSubmitting(true);
    try {
      const payload = {
        name: form.name,
        type: form.type,
        tolerance_minutes: form.tolerance_minutes,
        ...(form.type === "simple" && {
          time_in: form.time_in,
          time_out: form.time_out,
        }),
        ...(form.type === "bloques" && { blocks: payloadBlocks }),
      };

      if (editingId) {
        await schedulesApi.update(editingId, payload);
      } else {
        await schedulesApi.create(payload);
      }

      await loadSchedules();
      handleCloseModal();
    } catch (err: any) {
      setError(err.message || "Error al guardar el horario.");
    } finally {
      setSubmitting(false);
    }
  };

  // 🚀 NUEVO: Funciones para manejar el modal de eliminación
  const confirmDelete = (schedule: Schedule) => {
    setDeleteModal({ open: true, schedule });
  };

  const handleDelete = async () => {
    if (!deleteModal.schedule) return;
    setDeleting(true);
    try {
      await schedulesApi.delete(deleteModal.schedule.id);
      await loadSchedules();
      setDeleteModal({ open: false, schedule: null });
    } catch (err: any) {
      alert(err.message || "Error al eliminar");
    } finally {
      setDeleting(false);
    }
  };

  if (loading && schedules.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-jbBlue" />
      </div>
    );
  }

  const inputClass =
    "w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-jbBlue focus:bg-white transition-all";

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-jbBlue font-heading">
            Gestión de <span className="text-jbOrange">Horarios</span>
          </h1>
          <p className="text-jbGray font-medium mt-1">
            Configura los turnos, bloques y tolerancias del personal.
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 bg-jbBlue text-white px-8 py-4 rounded-2xl font-black font-heading text-xs tracking-widest hover:bg-jbNavy transition-all shadow-xl shadow-jbBlue/20"
        >
          <Plus className="w-4 h-4" />
          AÑADIR HORARIO
        </button>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/80">
              <tr>
                <th className="px-8 py-5 text-[11px] font-black text-jbBlue uppercase font-heading tracking-widest">
                  Nombre del Turno
                </th>
                <th className="px-8 py-5 text-[11px] font-black text-jbBlue uppercase font-heading tracking-widest">
                  Tipo
                </th>
                <th className="px-8 py-5 text-[11px] font-black text-jbBlue uppercase font-heading tracking-widest">
                  Detalle / Tolerancia
                </th>
                <th className="px-8 py-5 text-[11px] font-black text-jbBlue uppercase font-heading tracking-widest text-right">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {schedules.map((schedule) => (
                <tr
                  key={schedule.id}
                  className="hover:bg-slate-50/80 transition-colors"
                >
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-2 h-2 rounded-full ${schedule.id === "default-schedule-id" ? "bg-jbOrange" : "bg-jbTurquoise"}`}
                      />
                      <span className="font-bold text-jbBlue font-heading leading-tight">
                        {schedule.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <span
                      className={`text-[10px] font-black uppercase px-3 py-1 rounded-full border ${
                        schedule.type === "simple"
                          ? "bg-jbBlue/10 text-jbBlue border-jbBlue/20"
                          : "bg-indigo-100 text-indigo-700 border border-indigo-200"
                      }`}
                    >
                      {schedule.type === "simple"
                        ? "Fijo Simple"
                        : "Por Bloques"}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex flex-col gap-1">
                      {schedule.type === "simple" ? (
                        <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tighter block max-w-[150px] leading-tight">
                          {schedule.time_in?.substring(0, 5)} —{" "}
                          {schedule.time_out?.substring(0, 5)}
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tighter block max-w-[150px] leading-tight">
                          {schedule.blocks?.length || 0} días configurados
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-[9px] font-black text-jbOrange uppercase tracking-widest mt-1">
                        <Clock className="w-3 h-3" /> Tolerancia:{" "}
                        {schedule.tolerance_minutes} min
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setPreviewSchedule(schedule)}
                        className="p-2.5 rounded-xl bg-slate-100 text-jbBlue hover:bg-jbBlue hover:text-white transition-all"
                        title="Ver Calendario"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleOpenModal(schedule)}
                        className="p-2.5 rounded-xl bg-slate-100 text-jbBlue hover:bg-jbBlue hover:text-white transition-all"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {schedule.id !== "default-schedule-id" && (
                        <button
                          onClick={() => confirmDelete(schedule)} // 🚀 AHORA ABRE EL MODAL
                          className="p-2.5 rounded-xl bg-jbRed/10 text-jbRed hover:bg-jbRed hover:text-white transition-all"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {schedules.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-8 py-20 text-center text-jbGray font-bold text-sm"
                  >
                    Sin horarios configurados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ====================================================================
          MODAL CREAR / EDITAR HORARIO 🚀 PORTAL AÑADIDO
      ==================================================================== */}
      {isModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in zoom-in duration-300">
            <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col border-0">
              <div className="bg-jbBlue p-8 text-white flex justify-between items-center font-heading flex-shrink-0">
                <h3 className="text-xl font-black uppercase tracking-tighter">
                  {editingId ? "EDITAR HORARIO" : "NUEVO HORARIO JB"}
                </h3>
                <button
                  onClick={handleCloseModal}
                  className="p-2 hover:bg-white/10 rounded-xl transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
                {error && (
                  <div className="mb-6 flex items-center gap-2 text-jbRed text-[11px] font-bold bg-jbRed/10 py-3 px-4 rounded-xl border border-jbRed/20">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {error}
                  </div>
                )}

                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2 space-y-2">
                      <label className="text-[10px] font-black text-jbGray uppercase tracking-widest px-1">
                        Nombre del Turno *
                      </label>
                      <input
                        type="text"
                        value={form.name}
                        onChange={(e) =>
                          setForm({ ...form, name: e.target.value })
                        }
                        placeholder="Ej: Turno Operaciones - Part Time"
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-4 text-sm font-semibold focus:outline-none focus:border-jbBlue transition-all"
                        disabled={editingId === "default-schedule-id"}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-jbGray uppercase tracking-widest px-1">
                        Tolerancia (min)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="120"
                        value={form.tolerance_minutes}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            tolerance_minutes: parseInt(e.target.value) || 0,
                          })
                        }
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-4 text-sm font-semibold focus:outline-none focus:border-jbBlue transition-all"
                      />
                    </div>
                  </div>

                  <div className="bg-slate-50 p-2 rounded-[1.5rem] flex gap-2 border border-slate-100">
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, type: "simple" })}
                      className={`flex-1 flex justify-center items-center gap-2 py-4 rounded-2xl text-[10px] font-black tracking-widest uppercase transition-all font-heading ${
                        form.type === "simple"
                          ? "bg-white text-jbBlue shadow-md"
                          : "text-jbGray hover:text-jbBlue"
                      }`}
                    >
                      <ListTodo className="h-4 w-4" /> FIJO SIMPLE
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, type: "bloques" })}
                      className={`flex-1 flex justify-center items-center gap-2 py-4 rounded-2xl text-[10px] font-black tracking-widest uppercase transition-all font-heading ${
                        form.type === "bloques"
                          ? "bg-white text-jbBlue shadow-md"
                          : "text-jbGray hover:text-jbBlue"
                      }`}
                    >
                      <CalendarDays className="h-4 w-4" /> POR BLOQUES
                    </button>
                  </div>

                  {form.type === "simple" && (
                    <div className="grid grid-cols-2 gap-6 p-6 bg-slate-50 rounded-3xl border border-slate-200 animate-in fade-in duration-300">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-jbGray uppercase tracking-widest px-1">
                          Hora Entrada
                        </label>
                        <input
                          type="time"
                          value={form.time_in}
                          onChange={(e) =>
                            setForm({ ...form, time_in: e.target.value })
                          }
                          className="w-full bg-white border border-slate-200 rounded-2xl py-4 px-4 text-sm font-semibold focus:outline-none focus:border-jbBlue transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-jbGray uppercase tracking-widest px-1">
                          Hora Salida
                        </label>
                        <input
                          type="time"
                          value={form.time_out}
                          onChange={(e) =>
                            setForm({ ...form, time_out: e.target.value })
                          }
                          className="w-full bg-white border border-slate-200 rounded-2xl py-4 px-4 text-sm font-semibold focus:outline-none focus:border-jbBlue transition-all"
                        />
                      </div>
                    </div>
                  )}

                  {form.type === "bloques" && (
                    <div className="space-y-4 animate-in fade-in duration-300">
                      <p className="text-xs text-slate-500 font-medium px-1 mb-2">
                        Activa los días laborables y añade los bloques de horas
                        para cada uno.
                      </p>
                      {DIAS_SEMANA.map((dia) => {
                        const isActivo = form.blocks[dia].activo;
                        return (
                          <div
                            key={dia}
                            className={`border rounded-3xl transition-all overflow-hidden ${
                              isActivo
                                ? "border-jbBlue/20 bg-white shadow-sm"
                                : "border-slate-100 bg-slate-50"
                            }`}
                          >
                            <div className="p-5 flex items-center justify-between">
                              <label className="flex items-center gap-4 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={isActivo}
                                  onChange={() => toggleDia(dia)}
                                  className="w-5 h-5 text-jbBlue rounded-md border-slate-300 focus:ring-jbBlue focus:ring-offset-0"
                                />
                                <span
                                  className={`font-bold text-sm ${isActivo ? "text-slate-800" : "text-slate-400"}`}
                                >
                                  {dia}
                                </span>
                              </label>

                              {isActivo && (
                                <button
                                  type="button"
                                  onClick={() => addTurno(dia)}
                                  className="text-[10px] font-black tracking-widest text-jbBlue hover:text-jbNavy flex items-center gap-1 px-4 py-2 bg-jbBlue/10 rounded-xl transition-colors font-heading uppercase"
                                >
                                  <Plus className="h-3 w-3" /> AÑADIR TURNO
                                </button>
                              )}
                            </div>

                            {isActivo && (
                              <div className="p-5 border-t border-slate-50 space-y-3 bg-slate-50/50">
                                {form.blocks[dia].turnos.map((turno, index) => (
                                  <div
                                    key={index}
                                    className="flex items-center gap-4"
                                  >
                                    <input
                                      type="time"
                                      value={turno.ingreso}
                                      onChange={(e) =>
                                        updateTurno(
                                          dia,
                                          index,
                                          "ingreso",
                                          e.target.value,
                                        )
                                      }
                                      className="w-full bg-white border border-slate-200 rounded-2xl py-3 px-4 text-xs font-semibold focus:outline-none focus:border-jbBlue transition-all"
                                    />
                                    <span className="text-slate-400 text-xs font-bold px-1">
                                      a
                                    </span>
                                    <input
                                      type="time"
                                      value={turno.salida}
                                      onChange={(e) =>
                                        updateTurno(
                                          dia,
                                          index,
                                          "salida",
                                          e.target.value,
                                        )
                                      }
                                      className="w-full bg-white border border-slate-200 rounded-2xl py-3 px-4 text-xs font-semibold focus:outline-none focus:border-jbBlue transition-all"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => removeTurno(dia, index)}
                                      disabled={
                                        form.blocks[dia].turnos.length === 1
                                      }
                                      className="p-3 text-slate-400 hover:text-jbRed bg-white hover:bg-jbRed/10 border border-slate-200 rounded-xl disabled:opacity-30 disabled:hover:bg-white transition-colors"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="p-8 border-t border-slate-100 bg-slate-50 flex flex-col-reverse sm:flex-row justify-end gap-3 rounded-b-[3rem] flex-shrink-0">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="w-full sm:w-auto px-8 py-4 text-xs font-black tracking-widest text-jbGray hover:bg-slate-200 rounded-2xl transition-colors uppercase font-heading"
                >
                  CANCELAR
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="w-full sm:w-auto px-8 py-4 text-xs font-black text-white bg-jbBlue rounded-2xl hover:bg-jbNavy transition-all shadow-xl shadow-jbBlue/20 font-heading tracking-widest disabled:opacity-70 flex items-center justify-center gap-2 uppercase"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingId ? "GUARDAR CAMBIOS JB" : "CREAR HORARIO"}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* ====================================================================
          MODAL VISTA PREVIA CALENDARIO 🚀 PORTAL AÑADIDO
      ==================================================================== */}
      {previewSchedule &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-5xl rounded-[3rem] shadow-2xl overflow-hidden border-0">
              <div className="bg-jbBlue p-8 text-white flex justify-between items-center font-heading">
                <h3 className="text-xl font-black uppercase tracking-tighter flex items-center gap-2">
                  <CalendarDays className="w-6 h-6 text-jbOrange" />
                  {previewSchedule.name}
                </h3>
                <button
                  onClick={() => setPreviewSchedule(null)}
                  className="p-2 hover:bg-white/10 rounded-xl transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="p-8 bg-slate-50">
                <ScheduleCalendar schedule={previewSchedule} />
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* ====================================================================
          MODAL DE ELIMINAR 🚀 NUEVO Y CON PORTAL
      ==================================================================== */}
      {deleteModal.open &&
        deleteModal.schedule &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in zoom-in duration-200">
            <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden border-0">
              {/* Cabecera roja */}
              <div className="bg-jbRed p-8 text-white text-center">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-black uppercase tracking-tighter font-heading">
                  Eliminar Horario
                </h3>
              </div>

              {/* Cuerpo */}
              <div className="p-8 text-center space-y-4">
                <p className="text-jbGray font-semibold text-sm leading-relaxed">
                  ¿Estás seguro de que deseas eliminar este horario?
                </p>
                <div className="flex items-center gap-3 bg-slate-50 rounded-2xl p-4 border border-slate-100">
                  <div className="w-12 h-12 rounded-full border-2 border-slate-200 bg-white flex items-center justify-center">
                    <Clock className="w-5 h-5 text-jbBlue" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-black text-jbBlue font-heading">
                      {deleteModal.schedule.name}
                    </p>
                    <p className="text-[10px] text-jbOrange font-black uppercase tracking-widest mt-0.5">
                      {deleteModal.schedule.type === "simple"
                        ? "Fijo Simple"
                        : "Por Bloques"}
                    </p>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 font-semibold">
                  Todos los colaboradores que tengan este horario serán movidos
                  automáticamente al "Horario Base".
                </p>
              </div>

              {/* Botones */}
              <div className="px-8 pb-8 grid grid-cols-2 gap-4">
                <button
                  onClick={() =>
                    setDeleteModal({ open: false, schedule: null })
                  }
                  disabled={deleting}
                  className="py-4 rounded-2xl border-2 border-slate-200 text-jbGray font-black text-xs uppercase tracking-widest font-heading hover:bg-slate-50 transition-all disabled:opacity-60"
                >
                  CANCELAR
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="py-4 rounded-2xl bg-jbRed text-white font-black text-xs uppercase tracking-widest font-heading hover:bg-red-700 transition-all shadow-lg shadow-jbRed/20 disabled:opacity-60"
                >
                  {deleting ? "ELIMINANDO..." : "SÍ, ELIMINAR"}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
};

export default SchedulesManagement;
