// ==============================================================================
// SmurfDecisions · Página de Inicio de Sesión
// Todos los hooks declarados ANTES de cualquier return condicional
// ==============================================================================
import React, { useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import {
  Mail, Lock, ArrowRight, Eye, EyeOff,
  ShieldCheck, AlertCircle, Loader2
} from 'lucide-react';
import { useAuth } from '../lib/authContext';

export default function Login() {
  // ── Todos los hooks PRIMERO ─────────────────────────────────────────────────
  const { login, estaAutenticado, loading, authError } = useAuth();
  const navigate = useNavigate();

  const [email,       setEmail]       = useState('');
  const [password,    setPassword]    = useState('');
  const [showPass,    setShowPass]    = useState(false);
  const [cargando,    setCargando]    = useState(false);
  const [error,       setError]       = useState('');

  // ── Guard: ya autenticado → dashboard ──────────────────────────────────────
  if (!loading && estaAutenticado) {
    return <Navigate to="/dashboard" replace />;
  }

  // ── Spinner mientras carga la sesión ───────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  // ── Handlers ────────────────────────────────────────────────────────────────
  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    setCargando(true);
    try {
      const { error: loginError } = await login(email, password);
      if (loginError) {
        let message = loginError.message || 'No se pudo iniciar sesión.';
        if (loginError.message?.toLowerCase().includes('email not confirmed')) {
          message = 'Debes confirmar tu correo antes de iniciar sesión. Revisa tu bandeja.';
        } else if (loginError.message?.toLowerCase().includes('invalid login')) {
          message = 'Correo o contraseña incorrectos.';
        }
        setError(message);
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (loginError) {
      setError(loginError.message || 'No se pudo iniciar sesión.');
    } finally {
      setCargando(false);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Navbar mínima */}
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
          ¿Sin cuenta?{' '}
          <Link to="/registro" className="text-blue-400 hover:text-blue-300 font-semibold transition-colors">
            Registrarse
          </Link>
        </div>
      </nav>

      {/* Cuerpo */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-auto">
        {/* Panel izquierdo decorativo — solo desktop */}
        <div className="hidden lg:flex lg:w-2/5 xl:w-1/2 relative overflow-hidden bg-gradient-to-br from-slate-900 to-slate-950 border-r border-white/5 items-center justify-center p-12">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[400px] bg-blue-600/10 rounded-full blur-[80px] pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-[300px] h-[300px] bg-indigo-700/10 rounded-full blur-[60px] pointer-events-none" />
          <div className="relative z-10 max-w-md text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-blue-900/50">
              <ShieldCheck className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-3xl font-extrabold text-white mb-4">
              Inteligencia estratégica adaptada a tu empresa
            </h2>
            <p className="text-slate-400 leading-relaxed">
              El sistema detecta tu organización automáticamente y adapta los análisis de riesgo PESTEL,
              las recomendaciones y los permisos de acceso a tu rol corporativo.
            </p>
            <div className="mt-10 space-y-3">
              {[
                { icon: '🏢', text: 'Datos aislados por empresa (RLS en Supabase)' },
                { icon: '🔐', text: 'Roles verificados: Consultor, Analista, Gerente' },
                { icon: '📡', text: 'Alertas en tiempo real del entorno colombiano' },
              ].map((item) => (
                <div key={item.text} className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-3 text-sm text-slate-300">
                  <span className="text-base">{item.icon}</span>
                  {item.text}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Panel derecho: formulario + demo */}
        <div className="flex-1 flex flex-col items-center justify-start py-10 px-4 sm:px-8 overflow-y-auto">
          <div className="w-full max-w-md">
            <div className="mb-8">
              <h1 className="text-2xl font-extrabold text-white">Iniciar sesión</h1>
              <p className="text-slate-400 text-sm mt-1">Ingresa con tu correo corporativo</p>
            </div>

            {/* Error */}
            {error && (
              <div className="mb-5 flex items-start gap-3 bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 text-sm text-rose-300">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
            {!error && authError && (
              <div role="alert" className="mb-5 flex items-start gap-3 bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-sm text-amber-200">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{authError}</span>
              </div>
            )}

            {/* Formulario */}
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Correo electrónico
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                  <input
                    id="login-email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="usuario@empresa.com"
                    className="w-full bg-slate-900 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Contraseña
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                  <input
                    id="login-password"
                    type={showPass ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-900 border border-white/10 rounded-xl pl-10 pr-12 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                id="btn-login"
                type="submit"
                disabled={cargando}
                className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-900/30 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
              >
                {cargando ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Verificando...</>
                ) : (
                  <>Iniciar sesión <ArrowRight className="w-4 h-4" /></>
                )}
              </button>
            </form>

            <p className="text-center text-sm text-slate-500 mt-5">
              ¿Sin cuenta?{' '}
              <Link to="/registro" className="text-blue-400 hover:text-blue-300 font-semibold transition-colors">
                Crear una cuenta
              </Link>
            </p>

            <div className="mt-7 rounded-2xl border border-white/10 bg-slate-900/80 p-4">
              <p className="text-xs font-semibold text-slate-300 mb-3">Roles habilitados en las cuentas de prueba</p>
              <div className="space-y-2 text-xs text-slate-400">
                <p><strong className="text-slate-200">Smurfit:</strong> Consultor, Analista y Gerente</p>
                <p><strong className="text-slate-200">AMUCC:</strong> Gerente</p>
              </div>
              <p className="text-[11px] text-slate-500 mt-3">
                Las cuentas y contraseñas se administran en Supabase; no hay acceso de demostración local.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
