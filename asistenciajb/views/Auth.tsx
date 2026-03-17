import React, { useState } from "react";
import { User } from "../types";
import {
  Mail,
  Lock,
  User as UserIcon,
  Building2,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { authApi } from "../services/api";

interface AuthProps {
  onLogin: (user: User) => void;
}

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

const ALLOWED_DOMAINS = [
  "gmail.com",
  "outlook.com",
  "hotmail.com",
  "yahoo.com",
  "outlook.es",
  "hotmail.es",
  "jb.com",
];

const isValidEmail = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const isAllowedDomain = (email: string) =>
  ALLOWED_DOMAINS.includes(email.split("@")[1]?.toLowerCase());

const passwordRules = [
  { label: "Mínimo 8 caracteres", test: (p: string) => p.length >= 8 },
  {
    label: "Al menos una letra mayúscula",
    test: (p: string) => /[A-Z]/.test(p),
  },
  { label: "Al menos un símbolo", test: (p: string) => /[^a-zA-Z0-9]/.test(p) },
];

const PasswordRequirements: React.FC<{ password: string }> = ({ password }) => (
  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-2">
    {passwordRules.map((rule) => {
      const ok = rule.test(password);
      return (
        <div key={rule.label} className="flex items-center gap-2">
          <div
            className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ${ok ? "bg-jbTurquoise" : "bg-slate-200"}`}
          >
            {ok && (
              <CheckCircle2 className="w-3 h-3 text-white" strokeWidth={3} />
            )}
          </div>
          <p
            className={`text-[11px] font-bold transition-colors duration-300 ${ok ? "text-jbTurquoise" : "text-jbGray"}`}
          >
            {rule.label}
          </p>
        </div>
      );
    })}
  </div>
);

interface FieldProps {
  label: string;
  name: string;
  icon: React.ReactNode;
  type?: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  onClearError?: () => void;
  suffix?: React.ReactNode;
}

const Field: React.FC<FieldProps> = ({
  label,
  icon,
  type = "text",
  placeholder,
  value,
  onChange,
  error,
  onClearError,
  suffix,
}) => (
  <div className="space-y-1.5">
    <label className="text-[10px] font-black text-jbGray uppercase tracking-widest px-1">
      {label}
    </label>
    <div className="relative">
      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-jbBlue">
        {icon}
      </span>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          if (onClearError) onClearError();
        }}
        // 🚀 AUMENTO DE PADDING EN INPUTS (py-4 a py-5) para que sean más grandes/fáciles de tocar en móvil
        className={`w-full bg-slate-50 border rounded-2xl py-4 md:py-4 pl-12 ${suffix ? "pr-12" : "pr-4"} text-base md:text-sm font-semibold focus:outline-none transition-all ${
          error
            ? "border-jbRed bg-jbRed/5 focus:border-jbRed"
            : "border-slate-200 focus:border-jbBlue"
        }`}
      />
      {suffix && (
        <span className="absolute right-4 top-1/2 -translate-y-1/2">
          {suffix}
        </span>
      )}
    </div>
    {error && (
      <p className="flex items-center gap-1.5 text-jbRed text-[11px] font-bold px-1">
        <AlertCircle className="w-3 h-3 flex-shrink-0" />
        {error}
      </p>
    )}
  </div>
);

const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    area: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const validateLogin = () => {
    const e: Record<string, string> = {};

    if (!formData.email.trim()) {
      e.email = "El usuario o correo es obligatorio.";
    } else if (formData.email.includes("@") && !isValidEmail(formData.email)) {
      e.email = "Ingresa un correo electrónico válido.";
    } else if (
      formData.email.includes("@") &&
      !isAllowedDomain(formData.email)
    ) {
      e.email = `Solo se permiten correos de: ${ALLOWED_DOMAINS.join(", ")}.`;
    }

    if (!formData.password.trim()) {
      e.password = "La contraseña es obligatoria.";
    } else if (formData.password.length < 8) {
      e.password = "La contraseña debe tener mínimo 8 caracteres.";
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateRegister = () => {
    const e: Record<string, string> = {};
    if (!formData.name.trim()) e.name = "El nombre completo es obligatorio.";
    else if (formData.name.trim().length < 3)
      e.name = "El nombre debe tener al menos 3 caracteres.";
    if (!formData.email.trim()) e.email = "El correo es obligatorio.";
    else if (!isValidEmail(formData.email))
      e.email = "Ingresa un correo electrónico válido.";
    else if (!isAllowedDomain(formData.email))
      e.email = `Solo se permiten correos de: ${ALLOWED_DOMAINS.join(", ")}.`;
    if (!formData.password.trim()) e.password = "La contraseña es obligatoria.";
    else if (formData.password.length < 8) e.password = "Mínimo 8 caracteres.";
    else if (!/[A-Z]/.test(formData.password))
      e.password = "Debe contener al menos una mayúscula.";
    else if (!/[^a-zA-Z0-9]/.test(formData.password))
      e.password = "Debe contener al menos un símbolo.";
    if (!formData.area) e.area = "Debes seleccionar un área.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalError("");
    setSuccessMessage("");

    if (isLogin) {
      if (!validateLogin()) return;
      setSubmitting(true);
      try {
        const user = await authApi.login(
          formData.email.trim(),
          formData.password,
        );
        onLogin(user);
      } catch (err: any) {
        setGlobalError(err.message || "Credenciales incorrectas.");
      } finally {
        setSubmitting(false);
      }
    } else {
      if (!validateRegister()) return;
      setSubmitting(true);
      try {
        await authApi.register(
          formData.name.trim(),
          formData.email.trim().toLowerCase(),
          formData.password,
          formData.area,
        );
        setIsLogin(true);
        setFormData({ name: "", email: "", password: "", area: "" });
        setErrors({});
        setSuccessMessage(
          "¡Cuenta creada exitosamente! Ahora ingresa con tus credenciales.",
        );
      } catch (err: any) {
        setGlobalError(err.message || "Error al crear la cuenta.");
      } finally {
        setSubmitting(false);
      }
    }
  };

  const handleTabSwitch = (login: boolean) => {
    setIsLogin(login);
    setErrors({});
    setGlobalError("");
    setSuccessMessage("");
    setFormData({ name: "", email: "", password: "", area: "" });
  };

  return (
    // 🚀 AJUSTE DEL CONTENEDOR PRINCIPAL: p-0 en móvil, p-6 en desktop. min-h-screen se mantiene.
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-0 md:p-6 font-sans">
      {/* 🚀 AJUSTE DE LA TARJETA: rounded-none en móvil, rounded-[3rem] en desktop. max-w-none w-full en móvil, max-w-4xl en desktop. height h-screen en móvil para abarcar todo. */}
      <div className="w-full h-screen md:h-auto md:max-w-4xl bg-white rounded-none md:rounded-[3rem] shadow-none md:shadow-2xl shadow-jbBlue/10 overflow-y-auto md:overflow-hidden flex flex-col md:flex-row border-none md:border md:border-slate-100">
        {/* Panel izquierdo (Encabezado azul) - Ajustado el padding en móvil */}
        <div className="md:w-1/2 bg-jbBlue p-8 md:p-12 text-white flex flex-col justify-center md:justify-between relative overflow-hidden flex-shrink-0 min-h-[35vh] md:min-h-0">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-jbOrange/20 rounded-full -ml-24 -mb-24" />
          {/* Logo */}
          <div className="relative z-10 mb-6 md:mb-0">
            <h1 className="text-2xl font-black tracking-tighter mb-1">
              ASISTENCIA <span className="text-jbOrange">JB</span>
            </h1>
            <p className="text-white/60 text-xs font-medium">
              Control corporativo de tiempos y colaboradores.
            </p>
          </div>
          {/* Título central */}
          <div className="relative z-10 space-y-4">
            <h2 className="text-3xl md:text-4xl font-black leading-tight">
              {isLogin
                ? "Bienvenido de nuevo"
                : "Únete a nuestra fuerza operativa"}
            </h2>
            <div className="w-12 h-1 bg-jbOrange rounded-full" />
            <p className="text-white/70 text-sm md:text-base leading-relaxed hidden md:block">
              {isLogin
                ? "Registra tu entrada y salida de forma rápida, segura y desde cualquier dispositivo."
                : "Forma parte del equipo JB y lleva el control de tu asistencia de manera eficiente."}
            </p>
          </div>
          {/* Footer - Oculto en móvil para ahorrar espacio */}
          <div className="relative z-10 hidden md:block">
            <p className="text-white/30 text-[10px] font-medium">
              Consultora de Asesoría Empresarial JB.
            </p>
          </div>
        </div>

        {/* Panel derecho (Formulario) - Ajustado el padding y ocupando el resto de la pantalla en móvil */}
        <div className="md:w-1/2 p-6 md:p-12 flex-grow flex flex-col justify-center bg-white rounded-t-3xl md:rounded-none -mt-6 md:mt-0 relative z-20">
          <div className="flex justify-center mb-8">
            <div className="bg-slate-100 p-1.5 rounded-2xl flex gap-1 w-full md:w-auto">
              <button
                onClick={() => handleTabSwitch(true)}
                className={`flex-1 md:flex-none px-6 py-3 md:py-2 rounded-xl text-xs md:text-sm font-black font-heading transition-all ${isLogin ? "bg-white text-jbBlue shadow-sm" : "text-jbGray hover:text-jbBlue"}`}
              >
                INGRESAR
              </button>
              <button
                onClick={() => handleTabSwitch(false)}
                className={`flex-1 md:flex-none px-6 py-3 md:py-2 rounded-xl text-xs md:text-sm font-black font-heading transition-all ${!isLogin ? "bg-white text-jbBlue shadow-sm" : "text-jbGray hover:text-jbBlue"}`}
              >
                REGISTRO
              </button>
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            noValidate
            className="space-y-6 md:space-y-5"
          >
            {!isLogin && (
              <Field
                label="Nombre Completo"
                name="name"
                icon={<UserIcon className="w-4 h-4 md:w-5 md:h-5" />}
                placeholder="Ej. Juan Pérez"
                value={formData.name}
                onChange={(v) => setFormData({ ...formData, name: v })}
                error={errors.name}
                onClearError={() => setErrors((p) => ({ ...p, name: "" }))}
              />
            )}

            <Field
              label={
                isLogin ? "Usuario o Correo Corporativo" : "Correo Corporativo"
              }
              name="email"
              icon={<Mail className="w-4 h-4 md:w-5 md:h-5" />}
              placeholder={
                isLogin ? "Ingresa tu usuario o correo" : "tucorreo@dominio.com"
              }
              value={formData.email}
              onChange={(v) => setFormData({ ...formData, email: v })}
              error={errors.email}
              onClearError={() => setErrors((p) => ({ ...p, email: "" }))}
            />

            <Field
              label="Contraseña"
              name="password"
              icon={<Lock className="w-4 h-4 md:w-5 md:h-5" />}
              type={showPassword ? "text" : "password"}
              placeholder="Mínimo 8 caracteres"
              value={formData.password}
              onChange={(v) => setFormData({ ...formData, password: v })}
              error={errors.password}
              onClearError={() => setErrors((p) => ({ ...p, password: "" }))}
              suffix={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-jbGray hover:text-jbBlue transition-colors p-2"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              }
            />

            {!isLogin && <PasswordRequirements password={formData.password} />}

            {!isLogin && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-jbGray uppercase tracking-widest px-1">
                  Área JB
                </label>
                <div className="relative">
                  <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-jbBlue" />
                  <select
                    value={formData.area}
                    onChange={(e) => {
                      setFormData({ ...formData, area: e.target.value });
                      setErrors((p) => ({ ...p, area: "" }));
                    }}
                    // 🚀 IGUALAMOS EL ESTILO DEL SELECT AL DE LOS INPUTS
                    className={`w-full bg-slate-50 border rounded-2xl py-4 md:py-4 pl-12 pr-4 text-base md:text-sm font-semibold focus:outline-none appearance-none transition-all ${errors.area ? "border-jbRed bg-jbRed/5" : "border-slate-200 focus:border-jbBlue"}`}
                  >
                    <option value="">— Selecciona tu área —</option>
                    {AREAS.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </div>
                {errors.area && (
                  <p className="flex items-center gap-1.5 text-jbRed text-[11px] font-bold px-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.area}
                  </p>
                )}
              </div>
            )}

            {successMessage && (
              <div className="flex items-center gap-2 text-jbTurquoise text-[11px] font-bold bg-jbTurquoise/10 py-3 px-4 rounded-xl border border-jbTurquoise/20">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                {successMessage}
              </div>
            )}

            {globalError && (
              <div className="flex items-center gap-2 text-jbRed text-[11px] font-bold bg-jbRed/10 py-3 px-4 rounded-xl border border-jbRed/20">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {globalError}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-jbBlue text-white py-5 md:py-5 rounded-[1.5rem] font-black font-heading tracking-widest hover:bg-jbNavy hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-jbBlue/20 disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100 mt-4 md:mt-2 text-base md:text-sm"
            >
              {submitting
                ? "PROCESANDO..."
                : isLogin
                  ? "INGRESAR AL SISTEMA"
                  : "CREAR MI CUENTA JB"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Auth;
