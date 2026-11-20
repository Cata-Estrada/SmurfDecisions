// ==============================================================================
// Edge Function: ejecutar-flujo
// Dispara los flujos de n8n desde el botón "Ejecutar flujos" del Centro de
// actualizaciones. Solo un Gerente con sesión activa puede usarlo.
//
// Cuerpo: { flujos?: ['noticias', 'precios'] }   (por defecto, ambos)
//
// Secretos (Supabase → Edge Functions → Secrets, o `supabase secrets set`):
//   N8N_WEBHOOK_NOTICIAS_URL  Production URL del webhook "Botón de la app" del flujo de noticias
//   N8N_WEBHOOK_PRECIOS_URL   Production URL del webhook del flujo de precio diario
//   N8N_WEBHOOK_KEY           Valor del encabezado X-API-Key (el mismo de la credencial Header Auth en n8n)
//
// SUPABASE_URL y SUPABASE_ANON_KEY los pone Supabase automáticamente.
// Despliegue:  npx supabase functions deploy ejecutar-flujo
// ==============================================================================
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const FLUJOS: Record<string, string> = {
  noticias: 'N8N_WEBHOOK_NOTICIAS_URL',
  precios: 'N8N_WEBHOOK_PRECIOS_URL'
};
const ESPERA_MINIMA_MS = 10 * 60 * 1000; // evita gastar cuota de Gemini con clics repetidos

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ message: 'Método no permitido' }, 405);

  const authorization = req.headers.get('Authorization') ?? '';
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authorization } } }
  );

  // 1) Usuario y rol: se leen con su propia sesión, así RLS aplica.
  const { data: usuario, error: errorUsuario } = await supabase.auth.getUser();
  if (errorUsuario || !usuario.user) return json({ message: 'Inicia sesión para ejecutar los flujos.' }, 401);

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('empresa_id, rol, activo')
    .eq('id', usuario.user.id)
    .maybeSingle();
  if (!perfil?.activo) return json({ message: 'La cuenta no tiene una empresa activa.' }, 403);
  if (perfil.rol !== 'gerente') return json({ message: 'Solo el rol Gerente puede ejecutar los flujos.' }, 403);

  // 2) Flujos pedidos
  let pedidos = Object.keys(FLUJOS);
  try {
    const body = await req.json();
    if (Array.isArray(body?.flujos) && body.flujos.length) pedidos = body.flujos;
  } catch {
    // sin cuerpo: ambos
  }
  if (pedidos.some((f) => !(f in FLUJOS))) {
    return json({ message: `Flujo no válido. Usa: ${Object.keys(FLUJOS).join(', ')}.` }, 400);
  }

  const clave = Deno.env.get('N8N_WEBHOOK_KEY');
  if (!clave) return json({ message: 'Falta el secreto N8N_WEBHOOK_KEY en Supabase.' }, 500);

  // 3) Evita ejecuciones repetidas de noticias en menos de 10 minutos.
  if (pedidos.includes('noticias')) {
    const desde = new Date(Date.now() - ESPERA_MINIMA_MS).toISOString();
    const { data: recientes } = await supabase
      .from('ejecuciones')
      .select('id')
      .eq('empresa_id', perfil.empresa_id)
      .eq('flujo', 'noticias')
      .gte('inicio', desde)
      .limit(1);
    if (recientes?.length) {
      return json({ message: 'El flujo de noticias ya se ejecutó hace menos de 10 minutos. Espera un poco.' }, 429);
    }
  }

  // 4) Llamar a n8n
  const results = await Promise.all(pedidos.map(async (flujo) => {
    const url = Deno.env.get(FLUJOS[flujo]);
    if (!url) return { flujo, ok: false, message: `Falta el secreto ${FLUJOS[flujo]}.` };
    try {
      const respuesta = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': clave },
        body: JSON.stringify({ flujo, empresa_id: perfil.empresa_id, requestedAt: new Date().toISOString() }),
        signal: AbortSignal.timeout(15_000)
      });
      return respuesta.ok
        ? { flujo, ok: true }
        : { flujo, ok: false, message: `n8n respondió HTTP ${respuesta.status}. ¿El flujo está activo y la URL es la de producción?` };
    } catch (error) {
      return { flujo, ok: false, message: `No se pudo contactar a n8n: ${(error as Error).message}` };
    }
  }));

  const fallidos = results.filter((r) => !r.ok);
  if (fallidos.length === results.length) {
    return json({ message: fallidos.map((r) => `${r.flujo}: ${r.message}`).join(' · '), results }, 502);
  }
  return json({ ok: true, iniciados: results.filter((r) => r.ok).map((r) => r.flujo), results });
});
