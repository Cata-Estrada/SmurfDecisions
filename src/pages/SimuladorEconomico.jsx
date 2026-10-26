import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Calculator,
  ArrowRight,
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Info,
  RotateCcw
} from 'lucide-react';
import { getUltimoValorIndicador } from '../lib/dataService';
import { useAuth } from '../lib/authContext';

export default function SimuladorEconomico() {
  const { empresaId } = useAuth();
  const [trmBase, setTrmBase] = useState(null);
  const [fechaTrm, setFechaTrm] = useState('');
  const [fuenteTrm, setFuenteTrm] = useState('');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  // Parámetros de simulación
  const [montoUsd, setMontoUsd] = useState(100000); // USD 100.000 por defecto (Ejemplo 2)
  const [modoEscenario, setModoEscenario] = useState('porcentaje'); // 'porcentaje' | 'valor_directo'
  const [variacionPct, setVariacionPct] = useState(5); // +5%
  const [trmSimuladaManual, setTrmSimuladaManual] = useState(0);

  useEffect(() => {
    async function cargarTrm() {
      setCargando(true);
      setError('');
      try {
        const dato = await getUltimoValorIndicador('TRM', empresaId);
        if (!dato) {
          throw new Error('No hay un indicador TRM registrado para esta empresa en la base de datos.');
        }
        const val = Number(dato.valor);
        setTrmBase(val);
        setFechaTrm(dato.fecha);
        setFuenteTrm(dato.fuente);
        setTrmSimuladaManual(Number((val * 1.05).toFixed(2)));
      } catch (loadError) {
        setError(loadError.message);
      } finally {
        setCargando(false);
      }
    }
    cargarTrm();
  }, [empresaId]);

  if (cargando) {
    return <div className="p-12 text-center text-sm text-slate-500">Cargando TRM de la empresa…</div>;
  }

  if (error) {
    return <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</div>;
  }

  // Calcular TRM del escenario
  const trmEscenario = modoEscenario === 'porcentaje'
    ? Number((trmBase * (1 + (parseFloat(variacionPct) || 0) / 100)).toFixed(2))
    : (parseFloat(trmSimuladaManual) || trmBase);

  // Fórmulas oficiales
  const costoBaseCop = (parseFloat(montoUsd) || 0) * trmBase;
  const costoEscenarioCop = (parseFloat(montoUsd) || 0) * trmEscenario;
  const diferenciaAbsoluta = costoEscenarioCop - costoBaseCop;
  const diferenciaPorcentual = costoBaseCop > 0
    ? ((diferenciaAbsoluta / costoBaseCop) * 100)
    : 0;

  const formatearPesos = (val) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    }).format(val);

  const formatearTrm = (val) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(val);

  const handleCargarEjemplo = () => {
    setMontoUsd(100000);
    setModoEscenario('porcentaje');
    setVariacionPct(5);
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Simulador Económico de Exposición Cambiaria
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Cuantifica el impacto en pesos colombianos ante variaciones de la TRM para compras internacionales de insumos y maquinaria.
          </p>
        </div>

        <button
          onClick={handleCargarEjemplo}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 text-slate-700 text-xs font-medium rounded hover:bg-slate-50 transition-colors shadow-sm self-start"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Restablecer Ejemplo Oficial (USD 100k, +5%)
        </button>
      </div>

      {/* Aviso Obligatorio de Supuestos */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-xs text-amber-900 flex items-start gap-3">
        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <strong className="font-semibold">Declaración de supuestos del modelo:</strong>
          <p className="text-amber-800 leading-relaxed">
            Este cálculo supone que el precio en dólares, el volumen de compra y los demás costos operativos no varían durante el período. El resultado es estrictamente orientativo para el comité de compras y finanzas.
          </p>
        </div>
      </div>

      {/* Formulario de Entrada y Panel de Resultados (2 Columnas) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Parámetros de Entrada (5 cols) */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Calculator className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Variables de Entrada de la Compra
            </h3>
          </div>

          {/* Monto en USD */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Monto de la compra (USD):
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">USD</span>
              <input
                type="number"
                min="0"
                step="1000"
                value={montoUsd}
                onChange={(e) => setMontoUsd(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full pl-12 pr-3 py-2 text-sm font-semibold border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              Ingresa el valor total de la orden de compra o contrato.
            </span>
          </div>

          {/* TRM Base (Lectura desde BD) */}
          <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-xs space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-slate-600">TRM Base registrada:</span>
              <strong className="text-slate-900 text-sm font-bold">
                {formatearTrm(trmBase)}
              </strong>
            </div>
            <div className="flex justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200">
              <span>Fecha: <strong>{fechaTrm}</strong></span>
              <span>Fuente: <strong>{fuenteTrm}</strong></span>
            </div>
          </div>

          {/* Selector de Modo de Escenario */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Definir Escenario de Simulación:
            </label>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <button
                type="button"
                onClick={() => setModoEscenario('porcentaje')}
                className={`py-1.5 px-3 text-xs font-medium rounded border transition-colors ${
                  modoEscenario === 'porcentaje'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                Variación en %
              </button>
              <button
                type="button"
                onClick={() => setModoEscenario('valor_directo')}
                className={`py-1.5 px-3 text-xs font-medium rounded border transition-colors ${
                  modoEscenario === 'valor_directo'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                TRM Proyectada Directa
              </button>
            </div>

            {modoEscenario === 'porcentaje' ? (
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-600">Variación proyectada:</span>
                  <span className="font-bold text-slate-900">
                    {variacionPct > 0 ? `+${variacionPct}%` : `${variacionPct}%`}
                  </span>
                </div>
                <input
                  type="range"
                  min="-20"
                  max="30"
                  step="0.5"
                  value={variacionPct}
                  onChange={(e) => setVariacionPct(parseFloat(e.target.value) || 0)}
                  className="w-full accent-blue-600"
                />
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>-20% (Apreciación)</span>
                  <span>0%</span>
                  <span>+30% (Devaluación)</span>
                </div>
              </div>
            ) : (
              <div>
                <input
                  type="number"
                  step="1"
                  value={trmSimuladaManual}
                  onChange={(e) => setTrmSimuladaManual(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  placeholder="Ej. 3400.00"
                />
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100">
            <Link
              to="/dashboard/recomendador"
              className="text-xs text-blue-600 hover:text-blue-800 font-semibold inline-flex items-center gap-1"
            >
              Consultar recomendaciones de abastecimiento
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Panel de Resultados Cuantificados (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-lg p-6 shadow-sm flex flex-col justify-between space-y-6">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                Resultado Cuantificado de la Simulación
              </h3>
              <span className="text-xs font-semibold text-slate-500">
                Moneda: Pesos Colombianos (COP)
              </span>
            </div>

            {/* Comparativo de Costos */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-xs text-slate-500 font-medium">Costo Base (TRM {formatearTrm(trmBase)}):</span>
                <div className="text-xl font-bold text-slate-900 mt-1">
                  {formatearPesos(costoBaseCop)}
                </div>
              </div>

              <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                <span className="text-xs text-blue-800 font-medium">Costo Escenario (TRM {formatearTrm(trmEscenario)}):</span>
                <div className="text-xl font-bold text-blue-950 mt-1">
                  {formatearPesos(costoEscenarioCop)}
                </div>
              </div>
            </div>

            {/* Cuadro de Diferencia */}
            <div className={`mt-5 p-5 rounded-lg border ${
              diferenciaAbsoluta > 0
                ? 'bg-red-50/70 border-red-200'
                : diferenciaAbsoluta < 0
                ? 'bg-emerald-50/70 border-emerald-200'
                : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Impacto Neto sobre el Presupuesto:
                  </span>
                  <div className="text-2xl font-extrabold mt-1 tracking-tight">
                    {diferenciaAbsoluta > 0 ? (
                      <span className="text-red-700 flex items-center gap-1.5">
                        <TrendingUp className="w-6 h-6" />
                        +{formatearPesos(diferenciaAbsoluta)}
                      </span>
                    ) : diferenciaAbsoluta < 0 ? (
                      <span className="text-emerald-700 flex items-center gap-1.5">
                        <TrendingDown className="w-6 h-6" />
                        {formatearPesos(diferenciaAbsoluta)}
                      </span>
                    ) : (
                      <span className="text-slate-700">$0 COP</span>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs text-slate-500">Variación:</span>
                  <div className={`text-lg font-bold ${
                    diferenciaPorcentual > 0
                      ? 'text-red-700'
                      : diferenciaPorcentual < 0
                      ? 'text-emerald-700'
                      : 'text-slate-700'
                  }`}>
                    {diferenciaPorcentual > 0 ? `+${diferenciaPorcentual.toFixed(2)}%` : `${diferenciaPorcentual.toFixed(2)}%`}
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-200/60 text-xs text-slate-600">
                {diferenciaAbsoluta > 0 ? (
                  <p>
                    El sobrecosto proyectado es de <strong>{formatearPesos(diferenciaAbsoluta)}</strong>. Se sugiere consultar con finanzas la conveniencia de instrumentos de cobertura cambiaría (forwards/opciones) o anticipar pagos.
                  </p>
                ) : diferenciaAbsoluta < 0 ? (
                  <p>
                    Se proyecta un ahorro de <strong>{formatearPesos(Math.abs(diferenciaAbsoluta))}</strong> frente al presupuesto base debido a la apreciación del peso.
                  </p>
                ) : (
                  <p>La cotización coincide exactamente con la TRM base.</p>
                )}
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 bg-slate-50 p-3 rounded border border-slate-100 flex items-center justify-between">
            <span>Fórmula aplicada: <code>Diferencia = Monto_USD &times; (TRM_escenario - TRM_base)</code></span>
            <span>M = USD {Number(montoUsd).toLocaleString('es-CO')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
