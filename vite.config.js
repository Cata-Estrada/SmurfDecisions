import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

function isLocalBrowserRequest(req) {
  const remoteAddress = req.socket.remoteAddress?.replace(/^::ffff:/, '');
  if (remoteAddress !== '127.0.0.1' && remoteAddress !== '::1') return false;

  try {
    const host = new URL(`http://${req.headers.host}`);
    const origin = new URL(req.headers.origin);
    return (
      LOCAL_HOSTS.has(host.hostname) &&
      LOCAL_HOSTS.has(origin.hostname) &&
      origin.protocol === 'http:' &&
      origin.host === host.host
    );
  } catch {
    return false;
  }
}

function n8nRefreshPlugin(env) {
  const webhookUrl = env.N8N_WEBHOOK_URL;
  const webhookToken = env.N8N_WEBHOOK_KEY;

  return {
    name: 'local-n8n-refresh',
    configureServer(server) {
      server.middlewares.use('/api/n8n/run', async (req, res) => {
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('Content-Type', 'application/json; charset=utf-8');

        const respond = (status, body) => {
          res.statusCode = status;
          res.end(JSON.stringify(body));
        };

        if (req.method !== 'POST') {
          res.setHeader('Allow', 'POST');
          respond(405, { message: 'Este endpoint solo acepta solicitudes POST.' });
          return;
        }

        if (!isLocalBrowserRequest(req)) {
          respond(403, { message: 'La ejecución solo se permite desde esta app en localhost.' });
          return;
        }

        if (!webhookUrl || !webhookToken) {
          respond(503, {
            message: 'Falta configurar N8N_WEBHOOK_URL y N8N_WEBHOOK_KEY en .env.'
          });
          return;
        }

        let webhook;
        try {
          webhook = new URL(webhookUrl);
        } catch {
          respond(503, { message: 'N8N_WEBHOOK_URL no es una URL válida.' });
          return;
        }

        if (webhook.protocol !== 'https:' || webhookToken.length < 32) {
          respond(503, {
            message: 'El webhook debe usar HTTPS y N8N_WEBHOOK_KEY debe tener al menos 32 caracteres.'
          });
          return;
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
            body: JSON.stringify({ requestedAt }),
            signal: controller.signal
          });

          if (!response.ok) {
            const message = response.status === 401 || response.status === 403
              ? 'n8n denegó el webhook. Verifica que esté configurado como Header Auth, que el nombre del encabezado sea X-API-Key y que la clave coincida exactamente con N8N_WEBHOOK_KEY.'
              : response.status === 404
              ? 'n8n no encontró el webhook. Verifica que N8N_WEBHOOK_URL sea la Production URL de un workflow activo.'
              : `n8n rechazó la solicitud (HTTP ${response.status}).`;
            respond(502, {
              message
            });
            return;
          }

          respond(200, {
            message: 'n8n aceptó la solicitud.',
            requestedAt
          });
        } catch {
          respond(502, {
            message: 'No se pudo contactar el webhook de n8n; verifica su URL y disponibilidad.'
          });
        } finally {
          clearTimeout(timeout);
        }
      });
    }
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react(), n8nRefreshPlugin(env)],
    server: {
      port: 5173,
      open: false
    }
  };
});
