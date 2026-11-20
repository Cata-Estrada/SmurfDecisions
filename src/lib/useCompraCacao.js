import { useCallback, useEffect, useMemo, useState } from 'react';
import { getAlertas, getDatosCompraCacao, getPrecioCacaoMercado } from './dataService';
import { UMBRALES_PREDETERMINADOS, calcularCompraCacao, resumirMercado } from './compraCacao';

const REFRESCO_MERCADO_MS = 5 * 60 * 1000;

/**
 * Carga todo lo que necesita el panel de compra: parámetros, calidades, reglas,
 * cotización de bolsa y alertas; y devuelve el cálculo ya hecho.
 */
export function usePanelCompra(empresaId) {
  const [datos, setDatos] = useState(null);
  const [alertas, setAlertas] = useState([]);
  const [cotizacion, setCotizacion] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [errorMercado, setErrorMercado] = useState('');

  const cargarMercado = useCallback(async () => {
    try {
      const respuesta = await getPrecioCacaoMercado({ includeTrm: true });
      setCotizacion(respuesta);
      setErrorMercado('');
    } catch (errorCarga) {
      setErrorMercado(errorCarga.message || 'No se pudo consultar la cotización del cacao.');
    }
  }, []);

  const cargarTodo = useCallback(async () => {
    if (!empresaId) return;
    setCargando(true);
    setError('');
    try {
      const [datosCompra, resAlertas] = await Promise.all([
        getDatosCompraCacao(empresaId),
        getAlertas(empresaId),
        cargarMercado()
      ]);
      setDatos(datosCompra);
      setAlertas(resAlertas.data);
    } catch (errorCarga) {
      setError(errorCarga.message || 'No se pudieron cargar los datos de compra.');
    } finally {
      setCargando(false);
    }
  }, [empresaId, cargarMercado]);

  useEffect(() => {
    cargarTodo();
    const timer = window.setInterval(cargarMercado, REFRESCO_MERCADO_MS);
    return () => window.clearInterval(timer);
  }, [cargarTodo, cargarMercado]);

  const configuracion = useMemo(
    () => ({ ...UMBRALES_PREDETERMINADOS, ...(datos?.configuracion || {}) }),
    [datos]
  );
  const calidades = datos?.calidades || [];
  const reglas = datos?.reglasCompra || [];
  const precioActual = cotizacion?.quote?.price ?? null;

  const mercado = useMemo(
    () => resumirMercado(cotizacion?.points || [], configuracion),
    [cotizacion, configuracion]
  );
  const calculo = useMemo(
    () => calcularCompraCacao(configuracion, calidades, precioActual, mercado, { reglas }),
    [configuracion, calidades, precioActual, mercado, reglas]
  );

  return {
    cargando,
    error,
    errorMercado,
    configuracion,
    calidades,
    alertas,
    cotizacion,
    precioActual,
    mercado,
    calculo,
    recargar: cargarTodo
  };
}
