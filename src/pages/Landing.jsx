// ==============================================================================
// AgroDecisions · Compra de cacao para Coagropacífico
// ==============================================================================
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  ShieldCheck,
  Zap,
  BarChart3,
  Globe,
  ArrowRight,
  CheckCircle2,
  Calculator,
  RefreshCw,
  ChevronRight
} from 'lucide-react';

const FEATURES = [
  {
    icon: TrendingUp,
    color: 'text-blue-600',
    bg: 'bg-blue-50 border-blue-200',
    title: 'Referencia de precio del cacao',
    desc: 'Consulta el futuro internacional de cacao ICE y revisa su cotización e historial diario como referencia para el plan de compras.'
  },
  {
    icon: Globe,
    color: 'text-indigo-600',
    bg: 'bg-indigo-50 border-indigo-200',
    title: 'TRM oficial sugerida',
    desc: 'Consulta la tasa certificada por la Superintendencia Financiera, con su periodo de vigencia. La cooperativa decide si la aplica.'
  },
  {
    icon: Calculator,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50 border-emerald-200',
    title: 'Compra por calidad',
    desc: 'Define diferenciales, volúmenes y costos de acopio para visualizar el precio estimado por kilogramo.'
  },
  {
    icon: ShieldCheck,
    color: 'text-amber-600',
    bg: 'bg-amber-50 border-amber-200',
    title: 'Acceso por roles',
    desc: 'Los datos de compra se aíslan por empresa y cada usuario consulta o modifica información según sus permisos.'
  },
  {
    icon: RefreshCw,
    color: 'text-cyan-700',
    bg: 'bg-cyan-50 border-cyan-200',
    title: 'Parámetros bajo control',
    desc: 'Las referencias externas son orientativas: los parámetros de operación y la decisión final permanecen en manos de la cooperativa.'
  },
  {
    icon: BarChart3,
    color: 'text-violet-600',
    bg: 'bg-violet-50 border-violet-200',
    title: 'Capital y cobertura',
    desc: 'Estima el capital requerido, la cobertura de caja y la brecha con los parámetros que establezca Coagropacífico.'
  }
];

const BENEFITS = [
  'Datos de la cooperativa protegidos con RLS en Supabase',
  'Roles diferenciados: Consultor, Analista y Gerente',
  'Cálculos y parámetros ajustables al contexto cacaotero',
  'Decisiones de compra basadas en referencias transparentes',
  'Control de la cooperativa sobre los parámetros y resultados'
];

const COOPERATIVA = {
  sigla: 'CP',
  nombre: 'Coagropacífico',
  sector: 'Cooperativa de productores de cacao',
  color: 'from-emerald-600 to-teal-700'
};

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
              AD
            </div>
            <span className="font-bold text-slate-900 text-sm tracking-tight">
              Agro<span className="text-blue-600">Decisions</span>
            </span>
          </div>

          {/* Nav links desktop */}
          <div className="hidden md:flex items-center gap-6 text-sm text-slate-600">
            <a href="#funcionalidades" className="hover:text-slate-900 transition-colors">Herramientas</a>
            <a href="#beneficios" className="hover:text-slate-900 transition-colors">Beneficios</a>
            <a href="#cooperativa" className="hover:text-slate-900 transition-colors">Cooperativa</a>
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
              Solicitar acceso
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
              Herramienta de compra de cacao · Coagropacífico
            </div>

            {/* Heading */}
            <h1
              className={`text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight mb-6 text-slate-950 transition-all duration-700 delay-100 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
            >
              Planea la compra de cacao{' '}
              <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent">
                con mejores referencias
              </span>{' '}
            </h1>

            {/* Subtitle */}
            <p
              className={`text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed transition-all duration-700 delay-150 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
            >
              AgroDecisions reúne referencias de precio, TRM oficial sugerida y parámetros de compra para ayudar a Coagropacífico a estimar costos, capital y cobertura por calidad.
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
                Solicitar acceso
              </Link>
            </div>
          </div>

          <div className={`mt-16 grid grid-cols-2 sm:grid-cols-4 gap-px bg-slate-200 rounded-2xl overflow-hidden border border-slate-200 max-w-3xl mx-auto transition-all duration-700 delay-300 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            {[
              { value: '1', label: 'Cooperativa: Coagropacífico' },
              { value: '5 años', label: 'Historial diario de cacao' },
              { value: 'TRM', label: 'Tasa oficial sugerida' },
              { value: 'RLS', label: 'Aislamiento en base de datos' }
            ].map((item) => (
              <div key={item.label} className="bg-white px-4 py-5 text-center">
                <div className="text-2xl font-extrabold text-slate-900">{item.value}</div>
                <div className="text-xs text-slate-500 mt-1">{item.label}</div>
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
              Herramientas para la compra
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900">
              Del precio de referencia al plan de compra
            </h2>
            <p className="text-slate-600 mt-3 max-w-xl mx-auto">
              Consulta referencias internacionales y combina sus valores con los parámetros de calidad, volumen y caja definidos por la cooperativa.
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

      <section id="beneficios" className="py-20 sm:py-24 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold mb-5">
                <ShieldCheck className="w-3.5 h-3.5" />
                Seguridad y control de la cooperativa
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-5">
                Diseñada para las decisiones de compra de cacao
              </h2>
              <p className="text-slate-600 mb-8 leading-relaxed">
                AgroDecisions organiza la información de compra de Coagropacífico con acceso por roles. Las referencias externas orientan el análisis; la cooperativa conserva el control de sus parámetros y decisiones.
              </p>
              <div className="space-y-3">
                {BENEFITS.map((benefit) => (
                  <div key={benefit} className="flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span className="text-sm text-slate-700">{benefit}</span>
                  </div>
                ))}
              </div>
              <div className="mt-8">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm rounded-xl transition-colors"
                >
                  Iniciar sesión <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
            <div className="hidden lg:block">
              <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span className="text-sm font-semibold text-slate-900">Acceso según el rol</span>
                </div>
                {[
                  { rol: 'Consultor', color: 'bg-slate-600', permisos: 'Consulta precios y resultados' },
                  { rol: 'Analista', color: 'bg-blue-600', permisos: 'Edita parámetros y calidades' },
                  { rol: 'Gerente', color: 'bg-emerald-600', permisos: 'Administra el plan de compra' }
                ].map((item) => (
                  <div key={item.rol} className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                    <span className={`px-2 py-0.5 text-[10px] font-black uppercase rounded text-white ${item.color}`}>{item.rol}</span>
                    <p className="mt-2 text-xs text-slate-600">{item.permisos}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="cooperativa" className="py-16 bg-blue-50/60 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-50 border border-violet-200 text-violet-800 text-xs font-semibold mb-5">
            <Globe className="w-3.5 h-3.5" />
            Cooperativa participante
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900 mb-4">Diseñada para Coagropacífico</h2>
          <p className="text-slate-600 max-w-xl mx-auto mb-8">
            Cada cuenta recibe un rol y consulta los datos autorizados de la cooperativa.
          </p>
          <div className="max-w-md mx-auto bg-white border border-slate-200 rounded-2xl p-6 text-center shadow-sm">
            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${COOPERATIVA.color} flex items-center justify-center text-white font-black text-lg mx-auto mb-4 shadow-lg`}>
              {COOPERATIVA.sigla}
            </div>
            <div className="font-bold text-slate-900 text-sm mb-1">{COOPERATIVA.nombre}</div>
            <div className="text-xs text-slate-600">{COOPERATIVA.sector}</div>
          </div>
        </div>
      </section>

      <section className="py-16 border-t border-slate-200 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-900/20">
            <TrendingUp className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-4">
            Planea mejor la compra de cacao
          </h2>
          <p className="text-slate-600 mb-8 text-lg">
            Ingresa con tu cuenta activa de Coagropacífico para consultar los datos autorizados.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-colors"
          >
            Acceder al panel <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-slate-200 py-8 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-black text-[9px]">AD</div>
            <span>AgroDecisions &copy; 2026</span>
          </div>
          <span>Compra de cacao · Coagropacífico</span>
        </div>
      </footer>
    </div>
  );
}
