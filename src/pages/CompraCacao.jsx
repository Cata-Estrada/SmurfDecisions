import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  Clock3,
  Plus,
  RefreshCw,
  Save,
  Trash2
} from 'lucide-react';
import PrecioCacaoChart from '../components/PrecioCacaoChart';
import EscenariosCapital from '../components/EscenariosCapital';
import Semaforo from '../components/Semaforo';
import LecturaLondres from '../components/LecturaLondres';
import { useAuth } from '../lib/authContext';
import {
  eliminarCalidadCacao,
  getDatosCompraCacao,
  guardarCalidadCacao,
  guardarConfiguracionCompraCacao
} from '../lib/dataService';
import {
  ETIQUETA_COBERTURA,
  ETIQUETA_NIVEL,
  UMBRALES_PREDETERMINADOS,
  calcularCompraCacao,
  resumirMercado,
  valorNumerico
} from '../lib/compraCacao';
import { mostrarNumero, mostrarPesos, mostrarPorcentaje } from '../lib/formato';

const CONFIGURACION_VACIA = {
  trm_cop: '',
  margen_pct: '',
  caja_disponible_cop: '',
  colchon_pct: '',
  ...Object.fromEntries(Object.keys(UMBRALES_PREDETERMINADOS).map((campo) => [campo, '']))
};

const CAMPOS_UMBRAL = [
  ['ventana_percentil_dias', 'Ventana de percentiles (días)', '1'],
  ['dias_variacion', 'Días hábiles para la variación', '1'],
  ['umbral_variacion_pct', 'Alerta de variación (%)', '0.1'],
  ['cobertura_ajustada_pct', 'Cobertura mínima (%)', '1'],
  ['cobertura_holgada_pct', 'Cobertura holgada desde (%)', '1']
];

function desdeBaseDeDatos(configuracion) {
  return Object.fromEntries(
    Object.keys(CONFIGURACION_VACIA).map((field) => [
      field,
      configuracion?.[field] ?? ''
    ])
  );
}

function nuevaCalidad() {
  return {
    id: null,
    nombre: '',
    diferencial_usd_t: '',
    volumen_kg: '',
    acopio_pct: '',
    costo_produccion_cop_kg: ''
  };
}

function aValorGuardable(value) {
  return value === '' || value === null || value === undefined ? null : Number(value);
}

function validarConfiguracion(configuracion) {
  const trm = valorNumerico(configuracion.trm_cop);
  const margen = valorNumerico(configuracion.margen_pct);
  const caja = valorNumerico(configuracion.caja_disponible_cop);
  const colchon = valorNumerico(configuracion.colchon_pct);

  if (trm !== null && trm <= 0) return 'La TRM debe ser mayor que cero.';
  if (margen !== null && (margen < 0 || margen >= 100)) {
    return 'El margen debe ser igual o mayor que 0 y menor que 100 %.';
  }
  if (caja !== null && caja < 0) return 'La caja disponible no puede ser negativa.';
  if (colchon !== null && colchon < 0) return 'El colchón no puede ser negativo.';

  for (const [campo, etiqueta] of CAMPOS_UMBRAL) {
    const valor = valorNumerico(configuracion[campo]);
    if (valor === null || valor <= 0) return `${etiqueta}: escribe un valor mayor que cero.`;
  }
  if (Number(configuracion.cobertura_holgada_pct) <= Number(configuracion.cobertura_ajustada_pct)) {
    return 'La cobertura holgada debe ser mayor que la cobertura mínima.';
  }
  return '';
}

export default function CompraCacao() {
  const { empresaId, permisos, user } = useAuth();
  const puedeEditar = permisos.puedeEditarRiesgos;
  const [configuracion, setConfiguracion] = useState(CONFIGURACION_VACIA);
  const [calidades, setCalidades] = useState([]);
  const [reglasCompra, setReglasCompra] = useState([]);
  const [cotizacionMercado, setCotizacionMercado] = useState(null);
  const [trmOficial, setTrmOficial] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  async function cargarDatos() {
    setCargando(true);
    setError('');
    try {
      const datos = await getDatosCompraCacao(empresaId);
      setConfiguracion(desdeBaseDeDatos({ ...UMBRALES_PREDETERMINADOS, ...(datos.configuracion || {}) }));
      setReglasCompra(datos.reglasCompra);
      setCalidades(datos.calidades.map((calidad) => ({
        ...calidad,
        diferencial_usd_t: calidad.diferencial_usd_t ?? '',
        volumen_kg: calidad.volumen_kg ?? '',
        acopio_pct: calidad.acopio_pct ?? '',
        costo_produccion_cop_kg: calidad.costo_produccion_cop_kg ?? ''
      })));
    } catch (loadError) {
      setError(loadError.message || 'No se pudieron cargar los datos de compra de cacao.');
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargarDatos();
  }, [empresaId]);

  const mercado = useMemo(
    () => resumirMercado(cotizacionMercado?.points || [], configuracion),
    [cotizacionMercado, configuracion]
  );
  const recibirCotizacion = useCallback((cotizacion) => {
    setCotizacionMercado(cotizacion);
    if (cotizacion?.trm) setTrmOficial(cotizacion.trm);
    else if (!cotizacion) setTrmOficial(null);
  }, []);
  const precioActual = cotizacionMercado?.quote?.price ?? null;
  const cambioDiarioPct = cotizacionMercado?.quote?.changePercent ?? null;
  const calculo = useMemo(
    () => calcularCompraCacao(configuracion, calidades, precioActual, mercado, { reglas: reglasCompra }),
    [configuracion, calidades, precioActual, mercado, reglasCompra]
  );

  async function guardarParametros() {
    const errorConfiguracion = validarConfiguracion(configuracion);
    if (errorConfiguracion) {
      setError(errorConfiguracion);
      setMensaje('');
      return;
    }

    const calidadesParaGuardar = calidades.filter((calidad) =>
      calidad.nombre.trim() ||
      calidad.diferencial_usd_t !== '' ||
      calidad.volumen_kg !== '' ||
      calidad.acopio_pct !== '' ||
      calidad.costo_produccion_cop_kg !== ''
    );
    const calidadIncompleta = calidadesParaGuardar.find((calidad) =>
      !calidad.nombre.trim() ||
      (calidad.diferencial_usd_t !== '' && valorNumerico(calidad.diferencial_usd_t) === null) ||
      (calidad.volumen_kg !== '' &&
        (valorNumerico(calidad.volumen_kg) === null || Number(calidad.volumen_kg) <= 0)) ||
      (calidad.acopio_pct !== '' &&
        (valorNumerico(calidad.acopio_pct) === null || Number(calidad.acopio_pct) < 0)) ||
      (calidad.costo_produccion_cop_kg !== '' &&
        (valorNumerico(calidad.costo_produccion_cop_kg) === null ||
          Number(calidad.costo_produccion_cop_kg) < 0))
    );
    if (calidadIncompleta) {
      setError('Completa el nombre y corrige los valores ingresados en cada calidad antes de guardar.');
      setMensaje('');
      return;
    }

    setGuardando(true);
    setError('');
    setMensaje('');
    try {
      await guardarConfiguracionCompraCacao(
        empresaId,
        user.id,
        Object.fromEntries(
          Object.entries(configuracion).map(([field, value]) => [field, aValorGuardable(value)])
        )
      );
      const calidadesGuardadas = await Promise.all(
        calidadesParaGuardar.map((calidad) => guardarCalidadCacao(empresaId, user.id, {
          ...(calidad.id ? { id: calidad.id } : {}),
          nombre: calidad.nombre.trim(),
          diferencial_usd_t: aValorGuardable(calidad.diferencial_usd_t),
          volumen_kg: aValorGuardable(calidad.volumen_kg),
          acopio_pct: aValorGuardable(calidad.acopio_pct),
          costo_produccion_cop_kg: aValorGuardable(calidad.costo_produccion_cop_kg)
        }))
      );
      setCalidades(calidadesGuardadas.map((calidad) => ({
        ...calidad,
        diferencial_usd_t: calidad.diferencial_usd_t ?? '',
        volumen_kg: calidad.volumen_kg ?? '',
        acopio_pct: calidad.acopio_pct ?? '',
        costo_produccion_cop_kg: calidad.costo_produccion_cop_kg ?? ''
      })));
      setMensaje('Parámetros guardados en Supabase.');
    } catch (saveError) {
      setError(saveError.message || 'No se pudieron guardar los parámetros.');
    } finally {
      setGuardando(false);
    }
  }

  async function borrarCalidad(calidad) {
    if (calidad.id && !window.confirm(`¿Eliminar la calidad "${calidad.nombre}"?`)) return;
    setError('');
    setMensaje('');
    try {
      if (calidad.id) await eliminarCalidadCacao(calidad.id, empresaId);
      setCalidades((prev) => prev.filter((item) => item !== calidad));
      setMensaje(calidad.id ? 'Calidad eliminada.' : 'Borrador eliminado.');
    } catch (deleteError) {
      setError(deleteError.message || 'No se pudo eliminar la calidad.');
    }
  }

  function actualizarConfiguracion(field, value) {
    setConfiguracion((prev) => ({ ...prev, [field]: value }));
  }

  function actualizarCalidad(index, field, value) {
    setCalidades((prev) => prev.map((calidad, itemIndex) =>
      itemIndex === index ? { ...calidad, [field]: value } : calidad
    ));
  }

  const inputClass = 'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:bg-slate-100 disabled:text-slate-500';
  const labelClass = 'mb-1 block text-xs font-medium text-slate-600';
  const alertaMovimiento = mercado.alertaVariacion;

  if (cargando) {
    return <div className="p-12 text-center text-sm text-slate-500">Cargando parámetros de compra de cacao…</div>;
  }

  return (
    <div className="space-y-6">
      <header className="border-b border-slate-200 pb-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Coagropacífico · Cacao</p>
        <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-900">Simulador de capital</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">
          Con el precio de bolsa, la TRM y el volumen calcula el precio por kilo, el capital requerido, la cobertura de caja y la brecha. Prueba escenarios de precio y dólar.
          Las recomendaciones aplican reglas transparentes; no son un pronóstico del precio.
        </p>
      </header>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-emerald-700" />
            <h2 className="text-sm font-bold text-slate-900">Precio internacional del cacao</h2>
          </div>
        </div>

        <div className="rounded border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
          La referencia es el futuro de cacao ICE (CC=F) consultado en Yahoo Finance; el precio más reciente alimenta los cálculos. Es una fuente no oficial para prototipo y puede tener retraso o cambiar sin aviso.
        </div>
        <div className="mt-4">
          <PrecioCacaoChart onDataChange={recibirCotizacion} />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-slate-500">
          <span>
            Precio usado en el cálculo: <strong className="text-slate-800">
              {precioActual === null
                ? 'Sin cotización disponible'
                : `US$ ${mostrarNumero(precioActual)} / t · futuro ICE`}
            </strong>
          </span>
          {cotizacionMercado?.quote?.timestamp && (
            <span className="inline-flex items-center gap-1">
              <Clock3 className="h-3.5 w-3.5" />
              Última cotización: {new Intl.DateTimeFormat('es-CO', {
                dateStyle: 'medium',
                timeStyle: 'short',
                timeZone: 'America/Bogota'
              }).format(new Date(cotizacionMercado.quote.timestamp))}
            </span>
          )}
          {cambioDiarioPct !== null && (
            <span>
              Variación diaria: <strong className="text-slate-800">
                {mostrarPorcentaje(cambioDiarioPct, { signo: true })}
              </strong>
            </span>
          )}
          {mercado.variacionPct !== null && (
            <span>
              Variación en {mercado.diasVariacion} días hábiles: <strong className={alertaMovimiento ? 'text-rose-700' : 'text-slate-800'}>
                {mostrarPorcentaje(mercado.variacionPct, { signo: true })}
              </strong>
            </span>
          )}
        </div>
      </section>

      {cotizacionMercado?.londres && <LecturaLondres londres={cotizacionMercado.londres} />}

      {alertaMovimiento && (
        <div role="status" className="flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          La bolsa se movió {mostrarPorcentaje(mercado.variacionPct, { signo: true })} en {mercado.diasVariacion} días hábiles, más que el umbral de {mostrarNumero(mercado.umbralVariacion)} %. Revisa el precio y sus efectos en el plan de compra.
        </div>
      )}

      {error && (
        <div role="alert" className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          {error}
          {error.includes('configuracion_compra_cacao') ||
          error.includes('calidades_cacao') ? (
            <span> Aplica la migración actualizada de <code>supabase/schema.sql</code> en el SQL Editor de Supabase y vuelve a cargar.</span>
          ) : null}
        </div>
      )}
      {mensaje && (
        <div role="status" className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          {mensaje}
        </div>
      )}

      {!puedeEditar && (
        <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900">
          Tu rol permite consultar el panel. Un Analista o Gerente puede editar y guardar los parámetros de compra.
        </div>
      )}

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Parámetros definidos por la cooperativa</h2>
            <p className="mt-1 text-xs text-slate-500">El precio de referencia es el futuro de cacao ICE consultado en Yahoo; los demás valores los define la cooperativa.</p>
          </div>
          <button
            type="button"
            onClick={cargarDatos}
            disabled={cargando || guardando}
            className="inline-flex items-center gap-1.5 rounded border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Recargar
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['trm_cop', 'TRM (COP por USD)', '0.01'],
            ['margen_pct', 'Margen (%)', '0.01'],
            ['caja_disponible_cop', 'Caja disponible (COP)', '1'],
            ['colchon_pct', 'Colchón de seguridad (%)', '0.01']
          ].map(([field, label, step]) => (
            <div key={field}>
              <label className={labelClass} htmlFor={field}>{label}</label>
              <input
                id={field}
                className={inputClass}
                type="number"
                min="0"
                step={step}
                value={configuracion[field]}
                onChange={(event) => actualizarConfiguracion(field, event.target.value)}
                disabled={!puedeEditar}
              />
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-col gap-3 rounded-md border border-blue-200 bg-blue-50 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-blue-950">
            <p className="font-semibold">TRM oficial sugerida</p>
            {trmOficial?.value ? (
              <>
                <p className="mt-1">
                  {mostrarPesos(trmOficial.value, 2)} por USD · vigente del{' '}
                  {new Intl.DateTimeFormat('es-CO', {
                    dateStyle: 'medium',
                    timeZone: 'UTC'
                  }).format(new Date(`${trmOficial.validFrom.slice(0, 10)}T00:00:00Z`))}
                  {' '}al{' '}
                  {new Intl.DateTimeFormat('es-CO', {
                    dateStyle: 'medium',
                    timeZone: 'UTC'
                  }).format(new Date(`${trmOficial.validTo.slice(0, 10)}T00:00:00Z`))}
                </p>
                <p className="mt-1 text-[11px] text-blue-800">
                  Fuente: Superintendencia Financiera · Datos Abiertos. La TRM se consulta una vez al día y al actualizar manualmente.
                </p>
              </>
            ) : (
              <p className="mt-1 text-blue-800">
                {trmOficial?.error || (cotizacionMercado
                  ? 'La TRM oficial no está disponible en este momento.'
                  : 'Consultando la tasa oficial…')}{' '}
                <a
                  href="https://www.datos.gov.co/Econom-a-y-Finanzas/Tasa-de-Cambio-Representativa-del-Mercado-TRM/32sa-8pi3"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold underline"
                >
                  Consultar fuente oficial
                </a>
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              if (trmOficial?.value) {
                actualizarConfiguracion('trm_cop', String(trmOficial.value));
                setMensaje('TRM oficial copiada al parámetro. Guarda los cambios para aplicarla.');
                setError('');
              }
            }}
            disabled={!puedeEditar || !trmOficial?.value}
            className="shrink-0 rounded border border-blue-300 bg-white px-3 py-2 text-xs font-semibold text-blue-900 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Usar TRM oficial
          </button>
        </div>
        <p className="mt-2 text-[11px] text-slate-500">
          La TRM guardada no cambia automáticamente. Al seleccionar “Usar TRM oficial”, se propone en el campo; debes guardar los parámetros para persistirla.
        </p>

        <div className="mt-6">
          <h3 className="text-xs font-bold text-slate-800">Umbrales del recomendador</h3>
          <p className="mt-1 text-[11px] text-slate-500">
            Reglas de partida de la contrapropuesta. La cooperativa debe validarlas antes de usarlas para decidir.
          </p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {CAMPOS_UMBRAL.map(([field, label, step]) => (
              <div key={field}>
                <label className={labelClass} htmlFor={field}>{label}</label>
                <input
                  id={field}
                  className={inputClass}
                  type="number"
                  min="0"
                  step={step}
                  value={configuracion[field]}
                  onChange={(event) => actualizarConfiguracion(field, event.target.value)}
                  disabled={!puedeEditar}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-bold text-slate-800">Calidades y plan de compra</h3>
              <p className="mt-1 text-[11px] text-slate-500">
                Diferencial frente a la bolsa, volumen, costo de acopio y costo de producción por kilogramo.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCalidades((prev) => [...prev, nuevaCalidad()])}
              disabled={!puedeEditar}
              className="inline-flex shrink-0 items-center gap-1 rounded border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <Plus className="h-3.5 w-3.5" />
              Agregar calidad
            </button>
          </div>

          {calidades.length === 0 ? (
            <p className="rounded border border-dashed border-slate-300 p-5 text-center text-xs text-slate-500">
              Aún no hay calidades registradas. Agrégalas con los nombres y parámetros que informe la cooperativa.
            </p>
          ) : (
            <div className="space-y-3">
              {calidades.map((calidad, index) => (
                <div key={calidad.id || `calidad-borrador-${index}`} className="grid gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 sm:grid-cols-2 lg:grid-cols-6">
                  {[
                    ['nombre', 'Calidad', 'text', 'Ej. Criollo'],
                    ['diferencial_usd_t', 'Diferencial (USD/t)', 'number', '0.01'],
                    ['volumen_kg', 'Volumen (kg)', 'number', '0.001'],
                    ['acopio_pct', 'Acopio (%)', 'number', '0.01'],
                    ['costo_produccion_cop_kg', 'Costo producción (COP/kg)', 'number', '0.01']
                  ].map(([field, label, type, placeholderOrStep]) => (
                    <div key={field}>
                      <label className={labelClass} htmlFor={`calidad-${index}-${field}`}>{label}</label>
                      <input
                        id={`calidad-${index}-${field}`}
                        className={inputClass}
                        type={type}
                        step={type === 'number' ? placeholderOrStep : undefined}
                        value={calidad[field]}
                        placeholder={type === 'text' ? placeholderOrStep : ''}
                        onChange={(event) => actualizarCalidad(index, field, event.target.value)}
                        disabled={!puedeEditar}
                      />
                    </div>
                  ))}
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={() => borrarCalidad(calidad)}
                      disabled={!puedeEditar}
                      className="inline-flex w-full items-center justify-center gap-1 rounded border border-rose-200 px-2 py-2 text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                      aria-label={`Eliminar ${calidad.nombre || 'borrador de calidad'}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Quitar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {puedeEditar && (
          <div className="mt-5 flex justify-end">
            <button
              type="button"
              onClick={guardarParametros}
              disabled={guardando}
              className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {guardando ? 'Guardando…' : 'Guardar parámetros'}
            </button>
          </div>
        )}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4 border-b border-slate-100 pb-3">
          <h2 className="text-sm font-bold text-slate-900">Capital requerido y recomendación</h2>
          <p className="mt-1 text-xs text-slate-500">
            Los resultados aparecen cuando haya un precio registrado y la configuración y calidades tengan los datos necesarios.
          </p>
        </div>

        {calculo.listo ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                ['Capital requerido (incluye colchón)', mostrarPesos(calculo.capitalRequerido)],
                ['Caja disponible', mostrarPesos(valorNumerico(configuracion.caja_disponible_cop))],
                ['Cobertura', `${mostrarNumero(calculo.coberturaPct)} %`],
                ['Brecha (capital menos caja)', mostrarPesos(calculo.brechaCop)]
              ].map(([label, value]) => (
                <div key={label} className="rounded-md border border-slate-200 bg-slate-50 p-3">
                  <p className="text-[11px] text-slate-500">{label}</p>
                  <p className="mt-1 text-base font-bold text-slate-900">{value}</p>
                </div>
              ))}
            </div>

            <div className="mt-3 rounded-md border border-slate-200 p-3 text-xs text-slate-700">
              <strong>Precio máximo de bolsa soportado por la caja:</strong>{' '}
              {calculo.bolsaMaximaUsdT <= 0
                ? 'La caja no cubre la compra ni con un precio de bolsa de cero.'
                : `${mostrarNumero(calculo.bolsaMaximaUsdT)} USD/t`}
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[1000px] text-left text-xs">
                <thead className="border-b border-slate-200 text-[10px] uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-2 py-2">Calidad</th>
                    <th className="px-2 py-2">Precio compra (COP/kg)</th>
                    <th className="px-2 py-2">Volumen (kg)</th>
                    <th className="px-2 py-2">Capital con acopio</th>
                    <th className="px-2 py-2">Alcanza la caja</th>
                    <th className="px-2 py-2">Margen cooperativa</th>
                    <th className="px-2 py-2">Costo producción</th>
                    <th className="px-2 py-2">Semáforo y acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {calculo.calidades.map((calidad) => (
                    <tr key={calidad.id || calidad.nombre}>
                      <td className="px-2 py-2 font-semibold text-slate-800">
                        {calidad.nombre}
                        {calidad.esMayorMargen && (
                        <span className="ml-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800">Mayor margen</span>
                      )}
                      </td>
                      <td className="px-2 py-2">{mostrarPesos(calidad.precioCompraCopKg, 2)}</td>
                      <td className="px-2 py-2">{mostrarNumero(calidad.volumen_kg)}</td>
                      <td className="px-2 py-2">{mostrarPesos(calidad.capitalConAcopio)}</td>
                      <td className="px-2 py-2">
                        {mostrarNumero(calidad.kgAlcanzables, { maximumFractionDigits: 0 })} kg
                        <span className="block text-[10px] text-slate-500">
                          solo esta: {mostrarNumero(calidad.kgMaximosSoloEstaCalidad, { maximumFractionDigits: 0 })} kg
                        </span>
                      </td>
                      <td className="px-2 py-2">
                        {mostrarPesos(calidad.margenCooperativaCopKg)}/kg
                        <span className="block text-[10px] text-slate-500">{mostrarPorcentaje(calidad.margenPorPesoPct)} por peso</span>
                      </td>
                      <td className="px-2 py-2">
                        {calidad.costo_produccion_cop_kg === '' || calidad.costo_produccion_cop_kg === null
                          ? 'No informado'
                          : <span className={calidad.debajoCostoProduccion ? 'font-semibold text-rose-700' : ''}>
                            {mostrarPesos(calidad.costo_produccion_cop_kg, 2)}
                            {calidad.debajoCostoProduccion ? ' · Precio menor al costo' : ''}
                          </span>}
                      </td>
                      <td className="px-2 py-2">
                        {calidad.recomendacion ? (
                          <div className="space-y-1">
                            <Semaforo color={calidad.semaforo} etiqueta={calidad.recomendacion.titulo} />
                            <p className="max-w-xs text-[11px] leading-snug text-slate-600">{calidad.recomendacion.recomendacion}</p>
                          </div>
                        ) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {calculo.recomendacion ? (
              <div className={`mt-4 rounded-md border p-3 text-sm ${
                calculo.recomendacion.semaforo === 'rojo'
                  ? 'border-rose-300 bg-rose-50 text-rose-900'
                  : calculo.recomendacion.semaforo === 'amarillo'
                  ? 'border-amber-200 bg-amber-50 text-amber-900'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-900'
              }`}>
                <strong>
                  Precio {ETIQUETA_NIVEL[calculo.nivelPrecio]?.toLowerCase()} frente a los últimos {mercado.ventanaDias} días · Caja {ETIQUETA_COBERTURA[calculo.cobertura]?.toLowerCase()} ({mostrarPorcentaje(calculo.coberturaPct)}).
                </strong>
                <p className="mt-1">{calculo.recomendacion.titulo}. {calculo.recomendacion.recomendacion}</p>
              </div>
            ) : (
              <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                Se necesitan al menos 10 cierres de bolsa en la ventana de {mercado.ventanaDias} días para ubicar el precio y habilitar la recomendación.
              </div>
            )}

            {calculo.calidades.some((calidad) => calidad.debajoCostoProduccion) && (
              <div role="alert" className="mt-3 flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                El precio estimado queda por debajo del costo de producción informado para una o más calidades.
              </div>
            )}
          </>
        ) : (
          <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
            Aún faltan datos para calcular. Se necesitan la cotización de bolsa, la TRM, el margen, la caja, el colchón y al menos una calidad con
            diferencial, volumen y costo de acopio. No se utilizan valores inventados como datos de la cooperativa.
          </div>
        )}

        {mercado.ultimo && (
          <p className="mt-4 text-[11px] text-slate-500">
            Percentiles de los últimos {mercado.ventanaDias} días: P25 US$ {mostrarNumero(mercado.percentil25)} / t ·
            {' '}P75 US$ {mostrarNumero(mercado.percentil75)} / t ·
            {' '}{mercado.datosVentana} cierres con dato.
          </p>
        )}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4 border-b border-slate-100 pb-3">
          <h2 className="text-sm font-bold text-slate-900">Escenarios</h2>
          <p className="mt-1 text-xs text-slate-500">
            ¿Qué pasa con el capital si la bolsa, el dólar o el volumen cambian? Los escenarios no se guardan.
          </p>
        </div>
        <EscenariosCapital
          configuracion={configuracion}
          calidades={calidades}
          precioActual={precioActual}
          mercado={mercado}
          reglas={reglasCompra}
        />
      </section>
    </div>
  );
}
