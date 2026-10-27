import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info, x-supabase-api-version, x-region',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Cache-Control': 'no-store',
  'Content-Type': 'application/json; charset=utf-8'
};
const DEBOUNCE_MS = 10 * 60 * 1000;
const FLUJOS_PERMITIDOS = new Set(['indicadores', 'noticias', 'recomendaciones']);

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: CORS_HEADERS
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }
  if (req.method !== 'POST') {
    return jsonResponse(405, { message: 'Este endpoint solo acepta solicitudes POST.' });
  }

  let solicitud: { flujo?: unknown };
  try {
    solicitud = await req.json();
  } catch {
    return jsonResponse(400, { message: 'El cuerpo de la solicitud debe ser JSON válido.' });
  }
  if (typeof solicitud.flujo !== 'string' || !FLUJOS_PERMITIDOS.has(solicitud.flujo)) {
    return jsonResponse(400, { message: 'Flujo no válido. Usa indicadores, noticias o recomendaciones.' });
  }
  const flujo = solicitud.flujo;

  const tokenMatch = (req.headers.get('Authorization') ?? '').match(/^Bearer\s+(.+)$/i);
  if (!tokenMatch) {
    return jsonResponse(401, { message: 'Debes iniciar sesión para ejecutar los flujos.' });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('[n8n] Faltan las variables de entorno de Supabase.');
    return jsonResponse(500, { message: 'La función no está configurada correctamente.' });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const { data: { user }, error: authError } = await supabase.auth.getUser(tokenMatch[1]);
  if (authError) {
    console.error('[n8n] No se pudo validar el JWT:', authError.message);
    const status = authError.status === 401 ? 401 : 502;
    const message = status === 401
      ? 'La sesión no es válida o ha expirado.'
      : 'No se pudo validar la sesión con Supabase.';
    return jsonResponse(status, { message });
  }
  if (!user) {
    return jsonResponse(401, { message: 'No autenticado.' });
  }

  const { data: perfil, error: perfilError } = await supabase
    .from('perfiles')
    .select('empresa_id, rol, activo')
    .eq('id', user.id)
    .maybeSingle();

  if (perfilError) {
    console.error('[n8n] No se pudo consultar el perfil:', perfilError.message);
    return jsonResponse(502, { message: 'No se pudo validar el perfil en Supabase.' });
  }
  if (!perfil?.activo || !perfil.empresa_id) {
    return jsonResponse(403, { message: 'La cuenta no tiene una membresía activa.' });
  }
  if (perfil.rol !== 'gerente') {
    return jsonResponse(403, { message: 'Solo una cuenta Gerente puede ejecutar los flujos.' });
  }

  const empresaId = perfil.empresa_id;
  if (flujo === 'noticias') {
    const desde = new Date(Date.now() - DEBOUNCE_MS).toISOString();
    const { data: recientes, error: ejecucionesError } = await supabase
      .from('ejecuciones')
      .select('id')
      .eq('flujo', flujo)
      .eq('empresa_id', empresaId)
      .gte('inicio', desde)
      .limit(1);

    if (ejecucionesError) {
      console.error('[n8n] No se pudo verificar el antirrebote:', ejecucionesError.message);
      return jsonResponse(502, { message: 'No se pudo validar el historial de ejecuciones.' });
    }
    if (recientes?.length) {
      return jsonResponse(429, {
        message: 'Esta empresa ya inició una ejecución de noticias en los últimos 10 minutos.'
      });
    }
  }

  const webhookUrl = Deno.env.get('N8N_WEBHOOK_URL');
  const webhookToken = Deno.env.get('N8N_WEBHOOK_KEY');
  if (!webhookUrl || !webhookToken) {
    return jsonResponse(503, {
      message: 'Falta configurar N8N_WEBHOOK_URL y N8N_WEBHOOK_KEY en Supabase.'
    });
  }

  let webhook: URL;
  try {
    webhook = new URL(webhookUrl);
  } catch {
    return jsonResponse(503, { message: 'N8N_WEBHOOK_URL no es una URL válida.' });
  }
  if (webhook.protocol !== 'https:' || webhookToken.length < 32) {
    return jsonResponse(503, {
      message: 'El webhook debe usar HTTPS y N8N_WEBHOOK_KEY debe tener al menos 32 caracteres.'
    });
  }

  const requestedAt = new Date().toISOString();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(webhook, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': webhookToken
      },
      body: JSON.stringify({
        flujo,
        empresa_id: empresaId,
        empresaId,
        requestedAt
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      const message = response.status === 401 || response.status === 403
        ? 'n8n denegó el webhook. Verifica Header Auth, el encabezado X-API-Key y la clave configurada.'
        : response.status === 404
        ? 'n8n no encontró el webhook. Verifica que N8N_WEBHOOK_URL sea la Production URL de un workflow activo.'
        : `n8n rechazó la solicitud (HTTP ${response.status}).`;
      return jsonResponse(502, { message });
    }

    return jsonResponse(200, {
      message: 'n8n aceptó la solicitud.',
      requestedAt
    });
  } catch (error) {
    console.error('[n8n] Falló la solicitud al webhook configurado:', error);
    return jsonResponse(502, {
      message: 'No se pudo contactar el webhook de n8n; verifica su URL y disponibilidad.'
    });
  } finally {
    clearTimeout(timeout);
  }
});
