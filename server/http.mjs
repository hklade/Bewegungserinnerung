import http from 'node:http';
import fs from 'node:fs';

/**
 * HTTP-Entry-Point für die Server-API.
 * Definiert die Routen für Konfiguration, Dashboard und Buchungsoperationen.
 */
import { loadConfig, saveConfig, normalizeConfigPath, DEFAULT_CONFIG } from './config.mjs';
import { ensureStorageFile } from './storage.mjs';
import { buildDashboard, createHydrationBooking, replaceAllBookings } from './service.mjs';
import { normalizeTime } from './utils/time.mjs';
import { parseNumber } from './utils/parsing.mjs';

const PORT = 3001;

function logStep(step, details = {}) {
  console.info(`[bewegungserinnerung] ${step} ${JSON.stringify(details)}`);
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        reject(new Error('Payload too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!body) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

function parseTextBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 10_000_000) {
        reject(new Error('Payload too large'));
        req.destroy();
      }
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.end(JSON.stringify(payload));
}

function sendText(res, statusCode, text, contentType = 'text/plain; charset=utf-8') {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', contentType);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.end(text);
}

export function createServer() {
  return http.createServer((req, res) => {
    logStep('request', {
      method: req.method,
      url: req.url ?? null,
    });

    if (req.method === 'OPTIONS') {
      sendJson(res, 204, {});
      return;
    }

    if (!req.url) {
      sendJson(res, 404, { error: 'Not found' });
      return;
    }

    const url = new URL(req.url, 'http://127.0.0.1');

    if (url.pathname === '/api/config' && req.method === 'GET') {
      const config = loadConfig(logStep);
      sendJson(res, 200, {
        ...config,
        exportPath: normalizeConfigPath(config),
      });
      return;
    }

    if (url.pathname === '/api/config' && req.method === 'PUT') {
      parseJsonBody(req)
        .then((payload) => {
          const nextConfig = saveConfig({
            hourlyReminderEnabled: Boolean(payload?.hourlyReminderEnabled),
            showReminderDialog: Boolean(payload?.showReminderDialog),
            reminderStartTime: normalizeTime(payload?.reminderStartTime) ?? DEFAULT_CONFIG.reminderStartTime,
            reminderEndTime: normalizeTime(payload?.reminderEndTime) ?? DEFAULT_CONFIG.reminderEndTime,
            weekdaysOnly: Boolean(payload?.weekdaysOnly),
            exportPath: normalizeConfigPath(payload),
            reminderToneEnabled: Boolean(payload?.reminderToneEnabled),
            dailyDrinkLiters: Number.isFinite(parseNumber(payload?.dailyDrinkLiters))
              ? parseNumber(payload?.dailyDrinkLiters)
              : DEFAULT_CONFIG.dailyDrinkLiters,
          }, logStep);

          ensureStorageFile(normalizeConfigPath(nextConfig));
          logStep('config.saved', { exportPath: nextConfig.exportPath });
          sendJson(res, 200, nextConfig);
        })
        .catch((error) => {
          logStep('config.failed', {
            error: error instanceof Error ? error.message : 'Invalid payload',
          });
          sendJson(res, 400, {
            error: error instanceof Error ? error.message : 'Invalid payload',
          });
        });
      return;
    }

    if (url.pathname === '/api/dashboard' && req.method === 'GET') {
      const limit = Number.parseInt(url.searchParams.get('limit') ?? '5', 10);
      const payload = buildDashboard(Number.isNaN(limit) ? 5 : Math.min(200, Math.max(1, limit)));
      logStep('dashboard.loaded', {
        total: payload.total,
        today: payload.today.summary.total,
        latest: payload.latestBookings.length,
      });
      sendJson(res, 200, payload);
      return;
    }

    if (url.pathname === '/api/dashboard/today' && req.method === 'GET') {
      const payload = buildDashboard(5);
      sendJson(res, 200, payload.today);
      return;
    }

    if (url.pathname === '/api/bookings/latest' && req.method === 'GET') {
      const limit = Number.parseInt(url.searchParams.get('limit') ?? '5', 10);
      const payload = buildDashboard(Number.isNaN(limit) ? 5 : Math.min(200, Math.max(1, limit)));
      sendJson(res, 200, {
        items: payload.latestBookings,
        total: payload.total,
      });
      return;
    }

    if (url.pathname === '/api/bookings/export' && req.method === 'GET') {
      const config = loadConfig(logStep);
      const exportPath = normalizeConfigPath(config);
      ensureStorageFile(exportPath);
      sendText(res, 200, fs.readFileSync(exportPath, 'utf8'), 'text/csv; charset=utf-8');
      return;
    }

    if (url.pathname === '/api/bookings' && req.method === 'POST') {
      parseJsonBody(req)
        .then((payload) => {
          logStep('submit.body', {
            value: payload?.value ?? null,
            entryType: payload?.entryType ?? null,
            descriptionLength: String(payload?.description ?? '').trim().length,
          });
          const inserted = createHydrationBooking(payload);
          sendJson(res, 201, inserted);
        })
        .catch((error) => {
          logStep('submit.failed', {
            error: error instanceof Error ? error.message : 'Invalid payload',
          });
          sendJson(res, 400, {
            error: error instanceof Error ? error.message : 'Invalid payload',
          });
        });
      return;
    }

    if (url.pathname === '/api/bookings/import' && req.method === 'POST') {
      parseTextBody(req)
        .then((csvText) => {
          const imported = replaceAllBookings(csvText);
          sendJson(res, 200, imported);
        })
        .catch((error) => {
          logStep('import.failed', {
            error: error instanceof Error ? error.message : 'Invalid payload',
          });
          sendJson(res, 400, {
            error: error instanceof Error ? error.message : 'Invalid payload',
          });
        });
      return;
    }

    if (url.pathname === '/api/bookings/import-configured' && req.method === 'POST') {
      try {
        const config = loadConfig(logStep);
        const exportPath = normalizeConfigPath(config);
        ensureStorageFile(exportPath);
        const csvText = fs.readFileSync(exportPath, 'utf8');
        const imported = replaceAllBookings(csvText);
        sendJson(res, 200, imported);
      } catch (error) {
        logStep('import.configured.failed', {
          error: error instanceof Error ? error.message : 'Invalid payload',
        });
        sendJson(res, 400, {
          error: error instanceof Error ? error.message : 'Invalid payload',
        });
      }
      return;
    }

    if (req.method !== 'GET') {
      sendJson(res, 404, { error: 'Not found' });
      return;
    }

    logStep('request.not_found', {
      path: url.pathname,
      method: req.method,
    });
    sendJson(res, 404, { error: 'Not found' });
  });
}

export function startServer(port = PORT) {
  const server = createServer();
  server.listen(port, '127.0.0.1', () => {
    console.log(`Bewegungserinnerung API listening on http://127.0.0.1:${port}`);
  });
  return server;
}
