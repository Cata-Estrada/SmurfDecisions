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
  Copy,
  Check,
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
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    async function verificar() {
      const res = await getConexionStatus();
      setStatus(res);
    }
    verificar();
  }, []);

  const sqlSolucion = `-- Ejecuta en el SQL Editor de tu proyecto Supabase:
-- 1. Deshabilitar RLS en las 6 tablas para permitir lectura y escritura pública del prototipo:
ALTER TABLE IF EXISTS public.fuentes DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.indicadores DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.valores_indicador DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.reglas DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.alertas DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ejecuciones DISABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.fuentes TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.indicadores TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.valores_indicador TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.reglas TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.alertas TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.ejecuciones TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- 2. Ejecuta a continuación el contenido de supabase/seed.sql para cargar los 27 hallazgos PESTEL.`;

  const handleCopiarSql = () => {
    navigator.clipboard.writeText(sqlSolucion);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  };

  return (
    <div className="min-h-screen flex bg-slate-100 text-slate-800">
      {/* Barra lateral de navegación (Desktop-first) */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 border-r border-slate-800">
        {/* Encabezado institucional */}
        <div className="p-5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded bg-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
              S
            </div>
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
                title="Conectado pero sin datos o RLS bloqueado. Clic para ver solución."
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                Supabase (0 filas / RLS)
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
                <strong>Conexión establecida con Supabase</strong>, pero las tablas tienen 0 registros visibles o RLS está bloqueando la clave anónima. La aplicación está mostrando los <strong>27 hallazgos locales de respaldo</strong>.
              </span>
            </div>
            <button
              onClick={() => setMostrarModalSql(true)}
              className="ml-4 shrink-0 px-2.5 py-1 bg-amber-600 text-white rounded font-semibold text-[11px] hover:bg-amber-700 transition-colors"
            >
              Cómo activar datos en Supabase
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

      {/* Modal con instrucciones para activar Supabase si RLS o seed está pendiente */}
      {mostrarModalSql && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <Database className="w-4 h-4 text-blue-600" />
                Instrucciones para Habilitar Acceso Completo en Supabase
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
                Tu proyecto de Supabase (<code>https://yzgbigrqoodyvmbhiuxz.supabase.co</code>) responde correctamente, pero tiene <strong>Row Level Security (RLS)</strong> activo por defecto sin políticas permisivas, o las tablas aún no tienen filas sembradas.
              </p>

              <div className="bg-slate-900 text-slate-200 p-4 rounded-lg font-mono text-[11px] relative overflow-x-auto">
                <button
                  onClick={handleCopiarSql}
                  className="absolute right-3 top-3 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded text-[10px] flex items-center gap-1"
                >
                  {copiado ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  {copiado ? 'Copiado' : 'Copiar SQL'}
                </button>
                <pre>{sqlSolucion}</pre>
              </div>

              <div className="space-y-1.5 text-slate-600 text-[11px]">
                <div><strong>Pasos:</strong></div>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Abre tu proyecto en <a href="https://supabase.com/dashboard/project/yzgbigrqoodyvmbhiuxz/sql" target="_blank" rel="noreferrer" className="text-blue-600 underline">Supabase SQL Editor</a>.</li>
                  <li>Pega y ejecuta el comando anterior (o el archivo <code>supabase/fix_rls.sql</code>).</li>
                  <li>Ejecuta el archivo <code>supabase/seed.sql</code> para insertar los 27 hallazgos base y los indicadores.</li>
                  <li>Recarga esta página. SmurfDecisions cambiará automáticamente a <strong>"Datos en Vivo desde Supabase"</strong>.</li>
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
