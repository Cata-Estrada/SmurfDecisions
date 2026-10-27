// ==============================================================================
// SmurfDecisions · Página de Registro Corporativo
// ==============================================================================
import React, { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import {
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Info
} from 'lucide-react';
import { useAuth } from '../lib/authContext';

export default function Registro() {
  // ── Todos los hooks PRIMERO ─────────────────────────────────────────────────
  const { register, estaAutenticado, loading } = useAuth();

  const [nombre,          setNombre]          = useState('');
  const [email,           setEmail]           = useState('');
  const [password,        setPassword]        = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword,    setShowPassword]    = useState(false);
  const [showConfirm,     setShowConfirm]     = useState(false);
  const [cargando,        setCargando]        = useState(false);
  const [error,           setError]           = useState('');
  const [exito,           setExito]           = useState(false);

  const passwordMatch    = password && confirmPassword && password === confirmPassword;
  const passwordMismatch = confirmPassword && password !== confirmPassword;

  // ── Guards: ya autenticado o cargando ──────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (!loading && estaAutenticado) {
    return <Navigate to="/dashboard" replace />;
  }


  async function handleRegister(e) {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setCargando(true);
    try {
      const { error: registerError } = await register(email, password, { nombre });
      if (registerError) {
        setError(registerError.message || 'No se pudo completar el registro. Intenta nuevamente.');
      } else {
        setExito(true);
      }
    } catch (registerError) {
      setError(registerError.message || 'No se pudo completar el registro. Intenta nuevamente.');
    } finally {
      setCargando(false);
    }
  }

  // Pantalla de éxito
  if (exito) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="max-w-sm w-full text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-extrabold text-white mb-3">Solicitud recibida</h2>
          <p className="text-slate-400 text-sm mb-2">
            La cuenta se creó en el sistema de autenticación. Un administrador debe asignarle empresa y rol antes de habilitar el acceso.
          </p>
          <Link to="/login" className="inline-flex mt-5 text-sm font-semibold text-blue-400 hover:text-blue-300">
            Volver al inicio de sesión
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Navbar mínimo */}
      <nav className="flex-shrink-0 h-14 border-b border-white/5 flex items-center px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-black text-[10px] text-white">
            SD
          </div>
          <span className="font-bold text-white text-sm tracking-tight">
            Smurf<span className="text-blue-400">Decisions</span>
          </span>
        </Link>
        <div className="ml-auto text-xs text-slate-500">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="text-blue-400 hover:text-blue-300 font-semibold transition-colors">
            Iniciar sesión
          </Link>
        </div>
      </nav>

      {/* Contenido */}
      <div className="flex-1 flex items-start justify-center py-10 px-4 sm:px-8 overflow-auto">
        <div className="w-full max-w-md">
          {/* Encabezado */}
          <div className="mb-8">
            <h1 className="text-2xl font-extrabold text-white">Crear cuenta corporativa</h1>
            <p className="text-slate-400 text-sm mt-1">
              La empresa y el rol se asignan desde el panel administrativo, nunca desde el formulario.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-5 flex items-start gap-3 bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 text-sm text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Formulario */}
          <form onSubmit={handleRegister} className="space-y-4">
            {/* Nombre */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Nombre completo
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                <input
                  id="reg-nombre"
                  type="text"
                  required
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Tu nombre y apellido"
                  className="w-full bg-slate-900 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                />
              </div>
            </div>

            {/* Correo */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Correo electrónico corporativo
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                <input
                  id="reg-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="usuario@empresa.com"
                  className="w-full bg-slate-900 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                />
              </div>

            </div>

            {/* Contraseña */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                <input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full bg-slate-900 border border-white/10 rounded-xl pl-10 pr-12 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirmar contraseña */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Confirmar contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                <input
                  id="reg-confirm-password"
                  type={showConfirm ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repite tu contraseña"
                  className={`w-full bg-slate-900 border rounded-xl pl-10 pr-12 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 transition-all ${
                    passwordMismatch
                      ? 'border-rose-500/50 focus:ring-rose-500/30'
                      : passwordMatch
                      ? 'border-emerald-500/50 focus:ring-emerald-500/30'
                      : 'border-white/10 focus:ring-blue-500/50 focus:border-blue-500/50'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {passwordMismatch && (
                <p className="mt-1 text-xs text-rose-400">Las contraseñas no coinciden.</p>
              )}
              {passwordMatch && (
                <p className="mt-1 text-xs text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Contraseñas coinciden.
                </p>
              )}
            </div>

            {/* Nota de seguridad */}
            <div className="flex items-start gap-2.5 bg-slate-900/80 border border-white/5 rounded-xl p-3 text-xs text-slate-500">
              <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-600" />
              <span>
                Crear una cuenta no otorga acceso a datos. El administrador debe vincularla a una de las empresas autorizadas y asignarle el rol correspondiente.
              </span>
            </div>

            {/* Botón */}
            <button
              id="btn-register"
              type="submit"
              disabled={cargando || passwordMismatch}
              className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-900/30 disabled:opacity-60 disabled:cursor-not-allowed mt-1"
            >
              {cargando ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Registrando...
                </>
              ) : (
                <>
                  Crear cuenta corporativa
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-5">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="text-blue-400 hover:text-blue-300 font-semibold transition-colors">
              Iniciar sesión
            </Link>
          </p>

          {/* Empresas y roles disponibles */}
          <div className="mt-6 bg-slate-900/60 border border-white/5 rounded-2xl p-5">
            <p className="text-xs font-semibold text-slate-400 mb-3">Organizaciones habilitadas:</p>
            <div className="space-y-2">
              {[
                { empresa: 'Smurfit', roles: 'Consultor, Analista y Gerente', color: 'text-blue-400' },
                { empresa: 'Asociación de Mujeres Caficultoras del Cauca (AMUCC)', roles: 'Gerente', color: 'text-emerald-400' },
              ].map((d) => (
                <div key={d.empresa} className="flex items-center justify-between text-xs">
                  <span className={`font-semibold ${d.color}`}>{d.empresa}</span>
                  <span className="text-slate-500">{d.roles}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
