import React, { useState, useEffect, useRef } from "react";
import {
  Send,
  Image as ImageIcon,
  FileText,
  AlertTriangle,
  CheckCircle2,
  X,
  Upload,
} from "lucide-react";
import { notificationsApi, usersApi } from "../services/api";
import { User } from "../types";

const AREAS = [
  "MARKETING DIGITAL",
  "DESARROLLO Y PROGRAMACIÓN WEB",
  "DISEÑO Y PRODUCCIÓN AUDIOVISUAL",
  "SECRETARÍA DE GERENCIA",
  "LEGAL",
  "PLANEAMIENTO ESTRATÉGICO",
  "SOMA",
  "PLANIFICACIÓN Y DESARROLLO DE EMPRESAS",
];

interface Props {
  onCreated?: () => void;
}

const CrearNotificacion: React.FC<Props> = ({ onCreated }) => {
  // ── ESTADOS DEL FORMULARIO ──
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<"all" | "area" | "user">("all");
  const [audienceValue, setAudienceValue] = useState("");

  // ── ESTADOS DE ARCHIVOS ──
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");

  // ── ESTADOS DE UI ──
  const [users, setUsers] = useState<User[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const imageInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  // Cargar usuarios para el select si elige "Usuario Específico"
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const data = await usersApi.getAll();
        setUsers(Array.isArray(data) ? data : (data as any)?.data || []);
      } catch (e) {
        console.error("Error cargando usuarios", e);
      }
    };
    loadUsers();
  }, []);

  // Manejar cambio de imagen local
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError("La imagen no puede pesar más de 5MB.");
      return;
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setError("");
  };

  // Manejar cambio de PDF local
  const handlePdfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setError("El PDF no puede pesar más de 10MB.");
      return;
    }
    if (file.type !== "application/pdf") {
      setError("El archivo debe ser un PDF.");
      return;
    }

    setPdfFile(file);
    setError("");
  };

  // Limpiar archivos
  const removeImage = () => {
    setImageFile(null);
    setImagePreview("");
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  const removePdf = () => {
    setPdfFile(null);
    if (pdfInputRef.current) pdfInputRef.current.value = "";
  };

  const resetForm = () => {
    setTitle("");
    setBody("");
    setAudience("all");
    setAudienceValue("");
    removeImage();
    removePdf();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!title) {
      setError("El título es obligatorio.");
      return;
    }

    if (!body && !imageFile && !pdfFile) {
      setError("Debes incluir un mensaje, una imagen o un archivo PDF.");
      return;
    }

    if (audience !== "all" && !audienceValue) {
      setError("Debes seleccionar a quién va dirigida la notificación.");
      return;
    }

    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("title", title);
      if (body) formData.append("body", body);
      formData.append("audience", audience);
      if (audienceValue) formData.append("audience_value", audienceValue);

      if (imageFile) formData.append("image", imageFile);
      if (pdfFile) formData.append("pdf", pdfFile);

      // Llave de idempotencia simple
      const idempotencyKey =
        Math.random().toString(36).substring(2) + Date.now().toString(36);
      formData.append("idempotency_key", idempotencyKey);

      await notificationsApi.create(formData);

      setSuccess("¡Notificación enviada correctamente!");
      resetForm();

      if (onCreated) onCreated();

      // Ocultar mensaje de éxito después de 5 segundos
      setTimeout(() => setSuccess(""), 5000);
    } catch (err: any) {
      setError(err.message || "Error al enviar la notificación.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 max-w-4xl mx-auto">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-jbBlue font-heading">
            Enviar <span className="text-jbOrange">Notificación</span>
          </h1>
          <p className="text-jbGray font-medium mt-1">
            Comunica avisos, políticas o archivos a los colaboradores.
          </p>
        </div>
      </div>

      {/* FORMULARIO */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden">
        <form onSubmit={handleSubmit} className="p-8 md:p-10 space-y-8">
          {/* Título y Segmentación */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-[10px] font-black text-jbGray uppercase tracking-widest">
                Título del Aviso *
              </label>
              <input
                required
                placeholder="Ej: Código de Vestimenta para Gincana"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm font-semibold focus:outline-none focus:border-jbBlue transition-all"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-jbGray uppercase tracking-widest">
                ¿A quién va dirigido? *
              </label>
              <select
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm font-semibold focus:outline-none focus:border-jbBlue transition-all"
                value={audience}
                onChange={(e) => {
                  setAudience(e.target.value as any);
                  setAudienceValue(""); // Resetear valor al cambiar tipo
                }}
              >
                <option value="all">Todos los colaboradores (Global)</option>
                <option value="area">Un Área específica</option>
                <option value="user">Un Usuario específico</option>
              </select>
            </div>

            {/* Selector Condicional: Área o Usuario */}
            {audience === "area" && (
              <div className="space-y-1.5 animate-in slide-in-from-left-4 duration-300">
                <label className="text-[10px] font-black text-jbGray uppercase tracking-widest">
                  Seleccionar Área *
                </label>
                <select
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm font-semibold focus:outline-none focus:border-jbBlue transition-all"
                  value={audienceValue}
                  onChange={(e) => setAudienceValue(e.target.value)}
                >
                  <option value="">-- Elige un área --</option>
                  {AREAS.map((area) => (
                    <option key={area} value={area}>
                      {area}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {audience === "user" && (
              <div className="space-y-1.5 animate-in slide-in-from-left-4 duration-300">
                <label className="text-[10px] font-black text-jbGray uppercase tracking-widest">
                  Seleccionar Usuario *
                </label>
                <select
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm font-semibold focus:outline-none focus:border-jbBlue transition-all"
                  value={audienceValue}
                  onChange={(e) => setAudienceValue(e.target.value)}
                >
                  <option value="">-- Elige un usuario --</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.area})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Cuerpo del mensaje */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-jbGray uppercase tracking-widest">
              Mensaje Descriptivo
            </label>
            <textarea
              rows={6}
              placeholder="Escribe aquí los detalles, reglas o indicaciones de la notificación..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm font-semibold focus:outline-none focus:border-jbBlue transition-all resize-none custom-scrollbar"
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>

          {/* Zona de Archivos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
            {/* Carga de Imagen */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-jbGray uppercase tracking-widest">
                Adjuntar Imagen
              </label>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden bg-slate-50 flex-shrink-0 relative group">
                  {imagePreview ? (
                    <>
                      <img
                        src={imagePreview}
                        alt="preview"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={removeImage}
                        className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-6 h-6" />
                      </button>
                    </>
                  ) : (
                    <ImageIcon className="w-8 h-8 text-slate-300" />
                  )}
                </div>
                <div className="flex-1">
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageChange}
                  />
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    className="flex items-center gap-2 px-5 py-3 bg-jbBlue/10 text-jbBlue rounded-xl font-black text-xs uppercase tracking-widest hover:bg-jbBlue hover:text-white transition-all"
                  >
                    <Upload className="w-4 h-4" /> SELECCIONAR IMAGEN
                  </button>
                  <p className="text-[10px] text-slate-400 mt-1.5">
                    JPG, PNG, WEBP — Máx 5MB
                  </p>
                </div>
              </div>
            </div>

            {/* Carga de PDF */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-jbGray uppercase tracking-widest">
                Adjuntar PDF
              </label>
              <div className="flex items-center gap-4">
                <div
                  className={`w-20 h-20 rounded-2xl border-2 border-dashed flex items-center justify-center overflow-hidden flex-shrink-0 relative group transition-colors ${pdfFile ? "border-jbOrange bg-jbOrange/10" : "border-slate-200 bg-slate-50"}`}
                >
                  {pdfFile ? (
                    <>
                      <FileText className="w-8 h-8 text-jbOrange" />
                      <button
                        type="button"
                        onClick={removePdf}
                        className="absolute inset-0 bg-jbOrange/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-6 h-6" />
                      </button>
                    </>
                  ) : (
                    <FileText className="w-8 h-8 text-slate-300" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <input
                    ref={pdfInputRef}
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={handlePdfChange}
                  />
                  <button
                    type="button"
                    onClick={() => pdfInputRef.current?.click()}
                    className="flex items-center gap-2 px-5 py-3 bg-jbOrange/10 text-jbOrange rounded-xl font-black text-xs uppercase tracking-widest hover:bg-jbOrange hover:text-white transition-all"
                  >
                    <Upload className="w-4 h-4" /> SELECCIONAR PDF
                  </button>
                  {pdfFile ? (
                    <p className="text-[10px] font-bold text-jbOrange mt-1.5 truncate pr-2">
                      {pdfFile.name}
                    </p>
                  ) : (
                    <p className="text-[10px] text-slate-400 mt-1.5">
                      Solo documentos PDF — Máx 10MB
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Alertas */}
          {error && (
            <div className="flex items-center gap-3 text-jbRed text-xs font-bold bg-jbRed/10 py-4 px-5 rounded-2xl border border-jbRed/20 animate-in fade-in">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-3 text-emerald-600 text-xs font-bold bg-emerald-50 py-4 px-5 rounded-2xl border border-emerald-200 animate-in fade-in slide-in-from-bottom-2">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              <p>{success}</p>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-3 bg-jbBlue text-white py-5 rounded-[1.5rem] font-black text-sm tracking-widest hover:bg-jbNavy shadow-xl shadow-jbBlue/20 transition-all disabled:opacity-60 mt-4"
          >
            {submitting ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
            {submitting ? "ENVIANDO..." : "ENVIAR NOTIFICACIÓN"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CrearNotificacion;
