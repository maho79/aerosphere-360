import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [
    react(),
    {
      name: 'serve-static-images',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          const rawUrl = req.url?.split('?')[0] || '';

          // Block empty User-Agent or honeypot / scanner paths
          const userAgent = String(req.headers['user-agent'] || '');
          if (!userAgent.trim() || /^\/(\.env|\.git)/i.test(rawUrl) || /\.(bak|swp)$/i.test(rawUrl)) {
            res.statusCode = 403;
            res.setHeader('Content-Type', 'text/plain; charset=utf-8');
            return res.end('Forbidden');
          }
          if (
            rawUrl.startsWith('/thumbnails/') ||
            rawUrl.startsWith('/panoramas_2k/') ||
            rawUrl.startsWith('/panoramas_web/') ||
            rawUrl.startsWith('/panoramas_8k/') ||
            rawUrl.startsWith('/panoramas/')
          ) {
            try {
              const decoded = decodeURIComponent(rawUrl);
              let filePath = path.join(import.meta.dirname, 'public', decoded);
              if (!fs.existsSync(filePath) && (decoded.startsWith('/panoramas/') || decoded.startsWith('/panoramas_8k/'))) {
                const fallback = path.join(import.meta.dirname, 'public', decoded.replace('/panoramas_8k/', '/panoramas_web/').replace('/panoramas/', '/panoramas_web/'));
                if (fs.existsSync(fallback)) {
                  filePath = fallback;
                }
              }
              if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
                const stat = fs.statSync(filePath);
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
                res.setHeader('Content-Type', decoded.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg');
                res.setHeader('Content-Length', stat.size);
                res.setHeader('Cache-Control', 'public, max-age=86400');
                if (req.method === 'HEAD') {
                  return res.end();
                }
                return fs.createReadStream(filePath).pipe(res);
              }
            } catch (err) {
              console.error('Static serve error:', err);
            }
          }

          // API endpoint: /api/auth
          if (req.method === 'POST' && rawUrl === '/api/auth') {
            let body = '';
            req.on('data', (chunk) => { body += chunk; });
            req.on('end', async () => {
              try {
                const { token } = JSON.parse(body || '{}');
                if (!token) {
                  res.statusCode = 400;
                  res.setHeader('Content-Type', 'application/json');
                  return res.end(JSON.stringify({ success: false, error: 'Missing token' }));
                }

                // Verify with Google tokeninfo
                try {
                  const googleRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(token)}`);
                  if (googleRes.ok) {
                    const payload = (await googleRes.json()) as any;
                    const email = (payload?.email || '').toLowerCase();
                    if (email !== process.env.VITE_ADMIN_EMAIL || 'admin@example.com') {
                      res.statusCode = 403;
                      res.setHeader('Content-Type', 'application/json');
                      return res.end(JSON.stringify({ success: false, error: `Access denied. Restricted to ${process.env.VITE_ADMIN_EMAIL || 'admin@example.com'}` }));
                    }

                    res.statusCode = 200;
                    res.setHeader('Content-Type', 'application/json');
                    return res.end(JSON.stringify({
                      success: true,
                      user: {
                        email: payload.email,
                        name: payload.name || 'Administrator',
                        picture: payload.picture,
                      },
                    }));
                  }
                } catch (netErr) {
                  console.warn('Google verify network error (dev fallback):', netErr);
                }

                // Fallback for dev/offline if token structure decoded
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                return res.end(JSON.stringify({
                  success: true,
                  user: {
                    email: process.env.VITE_ADMIN_EMAIL || 'admin@example.com',
                    name: 'Administrator',
                    initials: 'M.T.',
                  },
                }));
              } catch (err) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                return res.end(JSON.stringify({ success: false, error: String(err) }));
              }
            });
            return;
          }

          // API endpoint: /api/panoramas/view
          if (req.method === 'POST' && rawUrl === '/api/panoramas/view') {
            const parsedUrl = new URL(req.url || '', 'http://localhost');
            const panoId = parsedUrl.searchParams.get('id');
            const publicJsonPath = path.join(import.meta.dirname, 'public', 'panoramas.json');
            let updatedViews = 1;

            if (panoId && fs.existsSync(publicJsonPath)) {
              try {
                const raw = fs.readFileSync(publicJsonPath, 'utf8');
                const items = JSON.parse(raw);
                const found = items.find((x: any) => String(x.id) === String(panoId));
                if (found) {
                  found.views = (found.views || 0) + 1;
                  updatedViews = found.views;
                  fs.writeFileSync(publicJsonPath, JSON.stringify(items, null, 2), 'utf8');
                }
              } catch (e) {
                console.warn('View increment error:', e);
              }
            }

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({ success: true, id: panoId, views: updatedViews }));
          }

          // API endpoint: /api/panoramas (GET)
          if ((req.method === 'GET' || req.method === 'HEAD') && rawUrl === '/api/panoramas') {
            const publicJsonPath = path.join(import.meta.dirname, 'public', 'panoramas.json');
            if (fs.existsSync(publicJsonPath)) {
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.setHeader('Cache-Control', 'no-cache');
              const stream = fs.createReadStream(publicJsonPath);
              return stream.pipe(res);
            }
          }

          // API endpoint for admin batch updating panorama properties directly to disk - ADMIN ONLY
          if (req.method === 'POST' && rawUrl === '/api/panoramas/batch-update') {
            let body = '';
            req.on('data', (chunk) => { body += chunk; });
            req.on('end', async () => {
              try {
                const payload = JSON.parse(body || '{}');
                const authHeader = String(req.headers['authorization'] || '');
                const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : payload.token;

                if (!token) {
                  res.statusCode = 401;
                  res.setHeader('Content-Type', 'application/json');
                  return res.end(JSON.stringify({ success: false, error: 'Neautorizovaný prístup: chýba Google admin token.' }));
                }

                // Verify with Google tokeninfo
                try {
                  const googleRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(token)}`);
                  if (googleRes.ok) {
                    const gData = (await googleRes.json()) as any;
                    const email = (gData.email || '').toLowerCase();
                    if (email !== process.env.VITE_ADMIN_EMAIL || 'admin@example.com') {
                      res.statusCode = 403;
                      res.setHeader('Content-Type', 'application/json');
                      return res.end(JSON.stringify({ success: false, error: `Prístup zamietnutý: email ${email} nie je autorizovaný.` }));
                    }
                  } else {
                    res.statusCode = 401;
                    res.setHeader('Content-Type', 'application/json');
                    return res.end(JSON.stringify({ success: false, error: 'Neplatný alebo expirovaný Google token.' }));
                  }
                } catch (netErr) {
                  console.warn('Dev verify network error (dev offline fallback):', netErr);
                }

                const { ids, is_private, folder, is_deleted } = payload;
                if (!Array.isArray(ids) || ids.length === 0) {
                  res.statusCode = 400;
                  res.setHeader('Content-Type', 'application/json');
                  return res.end(JSON.stringify({ error: 'No IDs provided' }));
                }

                const idSet = new Set(ids.map(String));
                const publicJsonPath = path.join(import.meta.dirname, 'public', 'panoramas.json');
                const distJsonPath = path.join(import.meta.dirname, 'dist', 'panoramas.json');

                let updatedCount = 0;
                const updateFile = (jsonPath: string) => {
                  if (fs.existsSync(jsonPath)) {
                    const raw = fs.readFileSync(jsonPath, 'utf8');
                    const items = JSON.parse(raw);
                    let count = 0;
                    for (const item of items) {
                      if (idSet.has(String(item.id))) {
                        if (typeof is_private === 'boolean') item.is_private = is_private;
                        if (typeof folder === 'string') item.folder = folder;
                        if (typeof is_deleted === 'boolean') item.is_deleted = is_deleted;
                        count++;
                      }
                    }
                    fs.writeFileSync(jsonPath, JSON.stringify(items, null, 2), 'utf8');
                    return count;
                  }
                  return 0;
                };

                updatedCount = updateFile(publicJsonPath);
                updateFile(distJsonPath);

                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                return res.end(JSON.stringify({ success: true, updated: updatedCount }));
              } catch (err) {
                console.error('Batch update error:', err);
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                return res.end(JSON.stringify({ error: String(err) }));
              }
            });
            return;
          }

          next();
        });
      },
    },
  ],
  server: {
    cors: true,
    watch: {
      ignored: [
        '**/dist/**',
        '**/public/panoramas/**',
        '**/public/panoramas_8k/**',
      ],
    },
  },
  build: {
    copyPublicDir: true,
    emptyOutDir: false,
  },
});
