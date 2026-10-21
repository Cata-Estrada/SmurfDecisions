import React, { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  Newspaper,
  Compass,
  Lightbulb,
  Calculator,
  RefreshCw,
  Database,
  Building2,
  AlertTriangle,
  CheckCircle,
  X
} from 'lucide-react';
import { isSupabaseConfigured } from '../lib/supabase';
import { getConexionStatus } from '../lib/dataService';

const NAV_ITEMS = [
  { path: '/', label: 'Panel Ejecutivo', icon: LayoutDashboard },
  { path: '/noticias', label: 'Noticias Analizadas', icon: Newspaper },
  { path: '/pestel', label: 'Análisis PESTEL', icon: Compass },
  { path: '/recomendador', label: 'Recomendador de Decisiones', icon: Lightbulb },
  { path: '/simulador', label: 'Simulador Económico', icon: Calculator },
  { path: '/actualizaciones', label: 'Centro de Actualizaciones', icon: RefreshCw },
];

export default function Layout() {
  const [status, setStatus] = useState(null);
  const [mostrarModalSql, setMostrarModalSql] = useState(false);

  useEffect(() => {
    async function verificar() {
      const res = await getConexionStatus();
      setStatus(res);
    }
    verificar();
  }, []);

  return (
    <div className="min-h-screen flex bg-slate-100 text-slate-800">
      {/* Barra lateral de navegación (Desktop-first) */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 border-r border-slate-800">
        {/* Encabezado institucional */}
        <div className="p-5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <img
              src="https://cl-paris-media-hub.ecomm.cencosud.com/files/landing/institucional/dia-de-madre/paris-cajita.png"
              alt="Smurfit Westrock"
              className="w-9 h-9 rounded object-cover shadow-sm"
            />
            <div>
              <h1 className="text-sm font-bold text-white tracking-tight leading-none">
                SmurfDecisions
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Smurfit Westrock Colombia
              </p>
            </div>
          </div>
          <div className="mt-3 text-[11px] text-slate-400 bg-slate-800/80 rounded px-2.5 py-1.5 border border-slate-700/60 leading-snug">
            Inteligencia del entorno PESTEL &bull; Planta Yumbo
          </div>
        </div>

        {/* Menú de los 6 módulos */}
        <nav className="flex-1 p-3 space-y-1">
          <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Módulos del Sistema
          </div>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-md text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Estado de Supabase y pie de barra lateral */}
        <div className="p-4 border-t border-slate-800 text-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="flex items-center gap-1.5 text-[11px]">
              <Database className="w-3.5 h-3.5" />
              Base de Datos
            </span>
            {status?.tieneFilas ? (
              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Supabase ({status.conteos.alertas})
              </span>
            ) : isSupabaseConfigured ? (
              <button
                onClick={() => setMostrarModalSql(true)}
                className="inline-flex items-center gap-1 text-[10px] text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800 hover:bg-amber-900 transition-colors"
                title="Revisar conexión, datos y permisos de Supabase."
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                Supabase (revisar)
              </button>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] text-sky-400 bg-sky-950/80 px-2 py-0.5 rounded border border-sky-800">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                Modo Local
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            {status?.tieneFilas
              ? 'Conectado a la nube. Cambios persisten en Supabase.'
              : 'Mostrando datos locales de respaldo del análisis PESTEL.'}
          </p>
        </div>
      </aside>

      {/* Área de contenido principal */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Banner de Diagnóstico si Supabase tiene 0 filas o RLS activo */}
        {isSupabaseConfigured && !status?.tieneFilas && (
          <div className="bg-amber-50 border-b border-amber-200 px-8 py-2.5 flex items-center justify-between text-xs text-amber-900">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                {status?.conectado ? (
                  <>
                    <strong>Conexión establecida con Supabase</strong>, pero la clave pública no ve filas en <code>alertas</code>. La aplicación está mostrando los <strong>27 hallazgos locales de respaldo</strong>; no se han insertado datos de ejemplo.
                  </>
                ) : (
                  <>
                    <strong>No se pudo confirmar la conexión con Supabase.</strong> {status?.mensaje || 'Revisa la URL, la clave pública y los permisos de lectura.'} La aplicación está mostrando los <strong>27 hallazgos locales de respaldo</strong>.
                  </>
                )}
              </span>
            </div>
            <button
              onClick={() => setMostrarModalSql(true)}
              className="ml-4 shrink-0 px-2.5 py-1 bg-amber-600 text-white rounded font-semibold text-[11px] hover:bg-amber-700 transition-colors"
            >
              Revisar conexión
            </button>
          </div>
        )}

        {/* Cabecera superior institucional */}
        <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <Building2 className="w-5 h-5 text-slate-500" />
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Operación Integrada Smurfit Westrock Colombia
              </span>
              <div className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <span>Panel de Decisión Estratégica &bull; Horizonte 12 Meses</span>
                {status?.tieneFilas ? (
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                    Datos en Vivo desde Supabase
                  </span>
                ) : (
                  <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                    Datos Locales de Respaldo PESTEL
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <div className="hidden sm:flex items-center gap-2 border-r border-slate-200 pr-4">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Sistema Operativo (Octubre 2026)</span>
            </div>
            <span className="font-medium text-slate-700">Yumbo, Valle del Cauca</span>
          </div>
        </header>

        {/* Vista del módulo activo */}
        <main className="flex-1 p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Guía de diagnóstico sin modificar el esquema o los permisos del proyecto */}
      {mostrarModalSql && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <Database className="w-4 h-4 text-blue-600" />
                Diagnóstico de conexión a Supabase
              </div>
              <button
                onClick={() => setMostrarModalSql(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs text-slate-700">
              <p>
                {status?.mensaje || 'No se ha podido determinar el estado de la conexión.'}
              </p>

              {status?.conteos && (
                <div className="rounded border border-slate-200 bg-slate-50 p-3">
                  <strong>Filas visibles para la clave pública:</strong>
                  <ul className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1 text-slate-600">
                    {Object.entries(status.conteos).map(([tabla, cantidad]) => (
                      <li key={tabla}><code>{tabla}</code>: {cantidad}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="space-y-1.5 text-slate-600 text-[11px]">
                <div><strong>Verificaciones:</strong></div>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Confirma que el archivo local <code>.env</code> tenga <code>VITE_SUPABASE_URL</code> y <code>VITE_SUPABASE_ANON_KEY</code>; reinicia <code>npm run dev</code> después de cambiarlas.</li>
                  <li>Verifica que existan las tablas <code>alertas</code>, <code>indicadores</code>, <code>valores_indicador</code>, <code>reglas</code>, <code>fuentes</code> y <code>ejecuciones</code>.</li>
                  <li>Si RLS está activo, revisa las políticas para las operaciones de lectura y actualización que necesita la app.</li>
                  <li>En n8n, configura sus credenciales de Supabase y Gemini directamente en la instancia. Nunca uses la clave <code>service_role</code> en la app ni en variables <code>VITE_</code>.</li>
                  <li>No ejecutes los scripts de esquema, semilla o permisos de este repositorio sobre una base personalizada sin revisar primero sus efectos.</li>
                </ol>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setMostrarModalSql(false)}
                className="px-4 py-2 bg-slate-900 text-white rounded text-xs font-semibold hover:bg-slate-800"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
