// ==============================================================================
// SmurfDecisions · Layout Principal del Dashboard
// Corrección: todos los hooks ANTES de cualquier return condicional
// Guard de autenticación: redirige a /login si no hay sesión
// ==============================================================================
import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate, Navigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Newspaper,
  Compass,
  Lightbulb,
  Calculator,
  RefreshCw,
  Building2,
  Menu,
  X,
  LogOut,
  Database,
  Loader2
} from 'lucide-react';
import { isSupabaseConfigured } from '../lib/supabase';
import { getConexionStatus } from '../lib/dataService';
import { useAuth } from '../lib/authContext';

const NAV_ITEMS = [
  { path: '/dashboard',               label: 'Panel Ejecutivo',   icon: LayoutDashboard, end: true },
  { path: '/dashboard/noticias',      label: 'Noticias Analizadas', icon: Newspaper },
  { path: '/dashboard/pestel',        label: 'Análisis PESTEL',   icon: Compass },
  { path: '/dashboard/recomendador',  label: 'Recomendador',      icon: Lightbulb },
  { path: '/dashboard/simulador',     label: 'Simulador Económico', icon: Calculator },
  { path: '/dashboard/actualizaciones', label: 'Actualizaciones', icon: RefreshCw },
];

const ROL_COLOR = {
  gerente:   'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
  analista:  'bg-blue-500/20   text-blue-300   border border-blue-500/30',
  consultor: 'bg-slate-500/20  text-slate-400  border border-slate-500/30',
};

export default function Layout() {
  // ── Todos los hooks PRIMERO, sin excepción ──────────────────────────────────
  const { user, empresa, empresaId, rol, sector, logout, estaAutenticado, loading } = useAuth();
  const navigate = useNavigate();

  const [status,          setStatus]          = useState(null);
  const [sidebarOpen,     setSidebarOpen]     = useState(false);
  const [logoutLoading,   setLogoutLoading]   = useState(false);
  const [logoutError,     setLogoutError]     = useState('');

  useEffect(() => {
    let alive = true;
    getConexionStatus(empresaId)
      .then((res) => { if (alive) setStatus(res); })
      .catch((error) => { if (alive) setStatus({ error: error.message }); });
    return () => { alive = false; };
  }, [empresaId]);

  // ── Guard de autenticación ──────────────────────────────────────────────────
  // Esperar a que cargue antes de decidir
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  // Sin sesión → login (DESPUÉS de todos los hooks)
  if (!estaAutenticado) {
    return <Navigate to="/login" replace />;
  }

  // ── Handlers ────────────────────────────────────────────────────────────────
  async function handleLogout() {
    setLogoutLoading(true);
    setLogoutError('');
    try {
      const result = await logout();
      if (result.error) {
        setLogoutError(result.error.message);
        return;
      }
      navigate('/', { replace: true });
    } catch (error) {
      setLogoutError(error.message || 'No se pudo cerrar la sesión.');
    } finally {
      setLogoutLoading(false);
    }
  }

  function handleNavClick() {
    setSidebarOpen(false);
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  const iniciales = empresa.substring(0, 2).toUpperCase();

  return (
    <div className="dashboard-shell">
      {/* ── OVERLAY MÓVIL ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── SIDEBAR ── */}
      <aside
        className={`
          dashboard-sidebar fixed inset-y-0 left-0 z-40 w-64
          bg-slate-900 border-r border-white/5
          transform transition-transform duration-300 ease-in-out
          lg:relative lg:translate-x-0 lg:z-auto
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Logo + botón cerrar (móvil) */}
        <div className="flex items-center justify-between px-5 h-14 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-black text-[10px] text-white shadow-md">
              SD
            </div>
            <div>
              <span className="font-bold text-white text-xs tracking-tight">
                Smurf<span className="text-blue-400">Decisions</span>
              </span>
              <p className="text-[10px] text-blue-300/60 leading-none mt-0.5 hidden sm:block">
                Risk &amp; Strategy Intelligence
              </p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-slate-500 hover:text-white transition-colors p-1"
            aria-label="Cerrar menú"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Empresa activa */}
        <div className="px-4 py-3 border-b border-white/5 shrink-0">
          <div className="bg-slate-800/80 rounded-xl p-3 border border-white/5">
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Organización activa
            </div>
            <div className="font-bold text-white text-xs truncate flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span className="truncate">{empresa}</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5 truncate">{sector}</div>
          </div>
        </div>

        {/* Navegación */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 mt-1">
            Módulos
          </p>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                onClick={handleNavClick}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-900/40'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Pie del sidebar */}
        <div className="p-4 border-t border-white/5 shrink-0 space-y-3">
          {/* Estado BD */}
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <Database className="w-3 h-3" />
              Base de Datos
            </span>
            {status?.tieneFilas ? (
              <span className="text-[10px] text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800 font-semibold">● Cloud</span>
            ) : status?.error ? (
              <span className="text-[10px] text-rose-300 bg-rose-950/80 px-2 py-0.5 rounded border border-rose-800 font-semibold">Error</span>
            ) : isSupabaseConfigured ? (
              <span className="text-[10px] text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800 font-semibold">Sin datos</span>
            ) : (
              <span className="text-[10px] text-rose-300 bg-rose-950/80 px-2 py-0.5 rounded border border-rose-800 font-semibold">No configurada</span>
            )}
          </div>

          {logoutError && <p role="alert" className="text-[11px] text-rose-300">{logoutError}</p>}

          {/* Logout */}
          <button
            id="btn-cerrar-sesion"
            onClick={handleLogout}
            disabled={logoutLoading}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-500 hover:text-rose-400 hover:bg-rose-500/5 rounded-lg transition-all disabled:opacity-60"
          >
            {logoutLoading
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <LogOut className="w-3.5 h-3.5" />
            }
            {logoutLoading ? 'Cerrando sesión...' : 'Cerrar sesión'}
          </button>
        </div>
      </aside>

      {/* ── ÁREA PRINCIPAL ── */}
      <div className="dashboard-content min-w-0">
        {/* ── TOPBAR ── */}
        <header className="flex-shrink-0 h-14 bg-slate-900/95 border-b border-white/5 px-4 sm:px-6 flex items-center gap-3">
          {/* Hamburger */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-slate-400 hover:text-white transition-colors p-1 -ml-1"
            aria-label="Abrir menú"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Empresa en topbar */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-blue-600/20 border border-blue-500/20 flex items-center justify-center text-blue-300 font-extrabold text-[10px] shrink-0">
              {iniciales}
            </div>
            <div className="hidden sm:block min-w-0">
              <span className="font-bold text-white text-sm truncate block">{empresa}</span>
              <span className="text-[10px] text-slate-500 truncate block">
                Inteligencia PESTEL · Toma de Decisiones
              </span>
            </div>
          </div>

          <div className="flex-1" />

          {/* Perfil de usuario */}
          <div className="flex items-center gap-2 bg-slate-800 border border-white/5 rounded-xl px-3 py-1.5">
            <div className="w-7 h-7 rounded-lg bg-slate-700 text-white flex items-center justify-center text-xs font-bold shrink-0">
              {user?.nombre ? user.nombre.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-xs font-bold text-white leading-tight truncate max-w-[110px]">
                {user?.nombre || 'Usuario'}
              </div>
              <div className={`text-[9px] font-black uppercase px-1.5 py-0 rounded inline-block mt-0.5 ${ROL_COLOR[rol] || ROL_COLOR.consultor}`}>
                {rol}
              </div>
            </div>
          </div>
        </header>

        {/* ── CONTENIDO ── */}
        <main className="dashboard-main">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
