// ==============================================================================
// SmurfDecisions · Landing Page pública
// ==============================================================================
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  ShieldCheck,
  Zap,
  BarChart3,
  Globe,
  Lightbulb,
  ArrowRight,
  CheckCircle2,
  Newspaper,
  Compass,
  Calculator,
  RefreshCw,
  ChevronRight
} from 'lucide-react';

const FEATURES = [
  {
    icon: Newspaper,
    color: 'text-blue-600',
    bg: 'bg-blue-50 border-blue-200',
    title: 'Noticias Analizadas con IA',
    desc: 'Monitoreo continuo del entorno. Alertas clasificadas por factor PESTEL, probabilidad e impacto para tu organización.'
  },
  {
    icon: Compass,
    color: 'text-indigo-600',
    bg: 'bg-indigo-50 border-indigo-200',
    title: 'Análisis PESTEL Dinámico',
    desc: 'Matriz de riesgos y oportunidades adaptada al sector de tu empresa, actualizada en tiempo real con datos del entorno colombiano.'
  },
  {
    icon: Lightbulb,
    color: 'text-amber-600',
    bg: 'bg-amber-50 border-amber-200',
    title: 'Recomendador de Decisiones',
    desc: 'Motor de reglas determinístico que convierte alertas validadas en acciones estratégicas trazables y auditables.'
  },
  {
    icon: Calculator,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50 border-emerald-200',
    title: 'Simulador Económico',
    desc: 'Modela escenarios de TRM, inflación y tasa BanRep para anticipar el impacto financiero en tu cadena de valor.'
  },
  {
    icon: BarChart3,
    color: 'text-violet-600',
    bg: 'bg-violet-50 border-violet-200',
    title: 'Panel Ejecutivo',
    desc: 'Síntesis gerencial de riesgos prioritarios, decisiones pendientes y estado de los indicadores macroeconómicos clave.'
  },
  {
    icon: RefreshCw,
    color: 'text-cyan-700',
    bg: 'bg-cyan-50 border-cyan-200',
    title: 'Automatización con n8n',
    desc: 'Flujos de actualización automatizados que nutren la plataforma con datos frescos desde múltiples fuentes externas.'
  }
];

const BENEFITS = [
  'Aislamiento de datos por empresa con RLS en Supabase',
  'Roles diferenciados: Consultor, Analista y Gerente',
  'Adaptación automática al sector y contexto de tu organización',
  'Decisiones estratégicas trazables y auditables',
  'Inteligencia de entorno en tiempo real para Colombia',
  'Despliegue multiempresa sin configuración adicional'
];

const EMPRESAS = [
  { sigla: 'SW', nombre: 'Smurfit', sector: 'Empaques y papel', color: 'from-blue-600 to-blue-800' },
  { sigla: 'AM', nombre: 'Asociación de Mujeres Caficultoras del Cauca (AMUCC)', sector: 'Caficultura', color: 'from-emerald-600 to-teal-700' }
];

export default function Landing() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 overflow-x-hidden">
      {/* ── NAVBAR ── */}
      <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-black text-xs text-white shadow-lg shadow-blue-900/40">
              SD
            </div>
            <span className="font-bold text-slate-900 text-sm tracking-tight">
              Smurf<span className="text-blue-600">Decisions</span>
            </span>
          </div>

          {/* Nav links desktop */}
          <div className="hidden md:flex items-center gap-6 text-sm text-slate-600">
            <a href="#funcionalidades" className="hover:text-slate-900 transition-colors">Funcionalidades</a>
            <a href="#beneficios" className="hover:text-slate-900 transition-colors">Beneficios</a>
            <a href="#empresas" className="hover:text-slate-900 transition-colors">Empresas</a>
          </div>

          {/* CTA */}
          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="px-3 py-1.5 text-sm text-slate-700 hover:text-slate-950 transition-colors font-medium"
            >
              Iniciar sesión
            </Link>
            <Link
              to="/registro"
              className="px-4 py-1.5 text-sm bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition-colors shadow-lg shadow-blue-900/30"
            >
              Registrarse
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative min-h-[88vh] flex items-center overflow-hidden bg-gradient-to-b from-white via-blue-50/40 to-slate-50">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-blue-600/10 rounded-full blur-[100px]" />
          <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-indigo-700/10 rounded-full blur-[80px]" />
          {/* Grid lines */}
          <div
            className="absolute inset-0 opacity-[0.025]"
            style={{
              backgroundImage: 'linear-gradient(rgba(15,23,42,.08) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,.08) 1px, transparent 1px)',
              backgroundSize: '60px 60px'
            }}
          />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-20 lg:py-28 w-full">
          <div className="max-w-4xl mx-auto text-center">
            {/* Badge */}
            <div
              className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-xs font-semibold mb-6 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
            >
              <Zap className="w-3.5 h-3.5" />
              Plataforma de Inteligencia Estratégica para Colombia
            </div>

            {/* Heading */}
            <h1
              className={`text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight mb-6 text-slate-950 transition-all duration-700 delay-100 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
            >
              Toma decisiones{' '}
              <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent">
                más inteligentes
              </span>{' '}
              con datos del entorno
            </h1>

            {/* Subtitle */}
            <p
              className={`text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed transition-all duration-700 delay-150 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
            >
              SmurfDecisions analiza el entorno PESTEL en tiempo real, clasifica riesgos con IA
              y genera recomendaciones estratégicas adaptadas al sector y contexto de tu organización.
            </p>

            {/* CTAs */}
            <div
              className={`flex flex-col sm:flex-row items-center justify-center gap-3 transition-all duration-700 delay-200 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
            >
              <Link
                to="/login"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-900/40 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                Acceder al Dashboard
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/registro"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 font-semibold rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                Registrar mi empresa
              </Link>
            </div>
          </div>

          {/* Stats strip */}
          <div className={`mt-16 grid grid-cols-2 sm:grid-cols-4 gap-px bg-slate-200 rounded-2xl overflow-hidden border border-slate-200 max-w-3xl mx-auto transition-all duration-700 delay-300 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            {[
              { value: '6', label: 'Factores PESTEL' },
              { value: '3', label: 'Roles de acceso' },
              { value: '2', label: 'Empresas habilitadas' },
              { value: 'RLS', label: 'Aislamiento en base de datos' },
            ].map((s) => (
              <div key={s.label} className="bg-white px-4 py-5 text-center">
                <div className="text-2xl font-extrabold text-slate-900">{s.value}</div>
                <div className="text-xs text-slate-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FUNCIONALIDADES ── */}
      <section id="funcionalidades" className="py-20 sm:py-24 bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-xs font-semibold mb-4">
              <BarChart3 className="w-3.5 h-3.5" />
              Módulos del sistema
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900">
              Todo lo que necesitas, en un solo lugar
            </h2>
            <p className="text-slate-600 mt-3 max-w-xl mx-auto">
              Seis módulos integrados que cubren el ciclo completo: desde la detección de eventos del entorno hasta la aprobación de decisiones estratégicas.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="group bg-white border border-slate-200 rounded-2xl p-6 hover:border-blue-300 hover:bg-slate-50 transition-all duration-300 shadow-sm"
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  <div className={`w-10 h-10 rounded-xl border flex items-center justify-center mb-4 ${f.bg}`}>
                    <Icon className={`w-5 h-5 ${f.color}`} />
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm mb-2">{f.title}</h3>
                  <p className="text-slate-600 text-sm leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── BENEFICIOS ── */}
      <section id="beneficios" className="py-20 sm:py-24 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Texto */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold mb-5">
                <ShieldCheck className="w-3.5 h-3.5" />
                Seguridad y gobierno corporativo
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-5">
                Diseñado para organizaciones exigentes
              </h2>
              <p className="text-slate-600 mb-8 leading-relaxed">
                SmurfDecisions implementa aislamiento de datos a nivel de base de datos, segregación estricta de funciones por rol y control de acceso basado en identidad corporativa verificada.
              </p>

              <div className="space-y-3">
                {BENEFITS.map((b) => (
                  <div key={b} className="flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span className="text-sm text-slate-700">{b}</span>
                  </div>
                ))}
              </div>

              <div className="mt-8">
                <Link
                  to="/registro"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm rounded-xl transition-colors"
                >
                  Comenzar ahora <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Visual card */}
            <div className="hidden lg:block">
              <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm font-semibold text-slate-900">Control de Acceso por Rol</span>
                </div>
                {[
                  { rol: 'Consultor', color: 'bg-slate-600', perms: ['Ver paneles', 'Consultar alertas', 'Exportar reportes'] },
                  { rol: 'Analista', color: 'bg-blue-600', perms: ['Todo lo anterior', 'Calibrar riesgos (P×I)', 'Validar hallazgos de IA'] },
                  { rol: 'Gerente', color: 'bg-emerald-600', perms: ['Todo lo anterior', 'Aprobar decisiones', 'Gestionar reglas y flujos'] },
                ].map((r) => (
                  <div key={r.rol} className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                    <div className="flex items-center gap-2 mb-2.5">
                      <span className={`px-2 py-0.5 text-[10px] font-black uppercase rounded text-white ${r.color}`}>{r.rol}</span>
                    </div>
                    <ul className="space-y-1">
                      {r.perms.map((p) => (
                        <li key={p} className="flex items-center gap-2 text-xs text-slate-600">
                          <span className="w-1 h-1 rounded-full bg-slate-400 shrink-0" />
                          {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="empresas" className="py-20 sm:py-24 bg-blue-50/60 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-50 border border-violet-200 text-violet-800 text-xs font-semibold mb-5">
            <Globe className="w-3.5 h-3.5" />
            Plataforma multiempresa
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-4">
            Dos organizaciones, datos independientes
          </h2>
          <p className="text-slate-600 max-w-xl mx-auto mb-12">
            La empresa y el rol se asignan en la base de datos. Cada cuenta consulta exclusivamente la información de su organización.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-3xl mx-auto">
            {EMPRESAS.map((e) => (
              <div key={e.nombre} className="bg-white border border-slate-200 rounded-2xl p-6 text-center hover:border-blue-300 transition-all shadow-sm">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${e.color} flex items-center justify-center text-white font-black text-lg mx-auto mb-4 shadow-lg`}>
                  {e.sigla}
                </div>
                <div className="font-bold text-slate-900 text-sm mb-1">{e.nombre}</div>
                <div className="text-xs text-slate-600">{e.sector}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="py-20 sm:py-24 border-t border-slate-200 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-blue-900/50">
            <TrendingUp className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-4">
            Comienza a decidir mejor hoy
          </h2>
          <p className="text-slate-600 mb-8 text-lg">
            Inicia sesión con una cuenta activa de Smurfit o AMUCC para consultar sus datos autorizados.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-900/40 transition-all hover:scale-[1.02]"
            >
              Acceder ahora
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/registro"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 border border-slate-300 text-slate-800 font-semibold rounded-xl hover:bg-slate-50 transition-all"
            >
              Crear cuenta gratuita
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-slate-200 py-8 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-black text-[9px]">SD</div>
            <span>SmurfDecisions &copy; 2026</span>
          </div>
          <span>Risk &amp; Strategy Intelligence · Colombia</span>
        </div>
      </footer>
    </div>
  );
}
