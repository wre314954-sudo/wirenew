import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// Firebase Admin requires Node runtime; provide lightweight dev-only API endpoints via Vite middleware
import type { Connect } from 'vite';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    // Dev-only plugin to expose /api endpoints using firebase-admin
    {
      name: 'dev-firebase-admin-api',
      configureServer(server) {
        // Lazy import to avoid loading in non-dev contexts
        const middlewares = server.middlewares as unknown as Connect.Server;

        let admin: any;
        let firestore: any;

        const initAdmin = async () => {
          if (admin) return;
          try {
            // read service account from env var
            const cred = process.env.FIREBASE_SERVICE_ACCOUNT;
            if (!cred) {
              console.warn('FIREBASE_SERVICE_ACCOUNT not set; admin APIs will not work');
              return;
            }
            // Use dynamic import for firebase-admin in ESM context
            admin = await import('firebase-admin').then(m => m.default);
            if (!admin.apps || admin.apps.length === 0) {
              const parsed = typeof cred === 'string' ? JSON.parse(cred) : cred;
              admin.initializeApp({
                credential: admin.credential.cert(parsed),
              });
              console.info('Firebase Admin initialized');
            }
            firestore = admin.firestore();
          } catch (e) {
            console.error('Failed to init firebase-admin in dev middleware', e);
            admin = null;
            firestore = null;
          }
        };

        middlewares.use(async (req: any, res: any, next: any) => {
          if (!req.url || !req.method) return next();
          if (!req.url.startsWith('/api/')) return next();

          await initAdmin();

          // Helper to send JSON
          const sendJson = (status: number, data: any) => {
            res.statusCode = status;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(data));
          };

          try {
            // verify token helper
            const authHeader = req.headers.authorization || req.headers.Authorization || '';
            let idToken = null;
            if (authHeader && authHeader.startsWith('Bearer ')) {
              idToken = authHeader.split(' ')[1];
            }

            // parse url
            const url = new URL(req.url, `http://${req.headers.host}`);
            const pathname = url.pathname;

            // Admin not configured
            if (!admin || !firestore) {
              // Return 503
              return sendJson(503, { error: 'Firebase Admin not configured on server. Set FIREBASE_SERVICE_ACCOUNT env.' });
            }

            // Verify token if present
            let decoded: any = null;
            if (idToken) {
              try {
                decoded = await admin.auth().verifyIdToken(idToken);
              } catch (e) {
                return sendJson(401, { error: 'Invalid ID token' });
              }
            }

            // Helper to determine if user is admin
            const isAdmin = async () => {
              if (!decoded) return false;
              if (decoded.admin === true) return true;
              // Check user_profiles collection for admin role
              const doc = await firestore.collection('user_profiles').doc(decoded.uid).get();
              if (doc.exists) {
                const data = doc.data();
                return data.role === 'admin' || data.isAdmin === true;
              }
              return false;
            };

            // ROUTES
            // GET /api/orders (user route)
            if (pathname === '/api/orders' && req.method === 'GET') {
              if (!decoded?.uid) return sendJson(401, { error: 'Missing auth token' });
              const uid = decoded.uid;

              const q = firestore.collection('orders').where('userId', '==', uid);
              const snap = await q.get();
              const orders: any[] = [];
              snap.forEach((d: any) => orders.push({ id: d.id, ...d.data() }));
              orders.sort((a, b) => {
                const ta = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt || 0).getTime();
                const tb = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt || 0).getTime();
                return tb - ta;
              });
              return sendJson(200, orders);
            }

            // GET /api/enquiries
            if (pathname === '/api/enquiries' && req.method === 'GET') {
              if (!decoded?.uid) return sendJson(401, { error: 'Missing auth token' });
              const uid = decoded.uid;

              const q = firestore.collection('inquiries').where('userId', '==', uid);
              const snap = await q.get();
              const items: any[] = [];
              snap.forEach((d: any) => items.push({ id: d.id, ...d.data() }));
              items.sort((a, b) => {
                const ta = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt || 0).getTime();
                const tb = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt || 0).getTime();
                return tb - ta;
              });
              return sendJson(200, items);
            }

            // ADMIN routes
            if (pathname === '/api/admin/orders' && req.method === 'GET') {
              // must be admin
              const ok = await isAdmin();
              if (!ok) return sendJson(403, { error: 'Admin access required' });
              const snap = await firestore.collection('orders').orderBy('createdAt', 'desc').get();
              const list: any[] = [];
              snap.forEach((d: any) => list.push({ id: d.id, ...d.data() }));
              return sendJson(200, list);
            }

            if (pathname.startsWith('/api/admin/orders') && (req.method === 'PATCH' || req.method === 'POST')) {
              const ok = await isAdmin();
              if (!ok) return sendJson(403, { error: 'Admin access required' });
              // id in path or body
              const parts = pathname.split('/');
              const id = parts[3] || url.searchParams.get('id');
              if (!id) return sendJson(400, { error: 'order id required' });

              // read body
              let body = '';
              for await (const chunk of req) body += chunk;
              const data = body ? JSON.parse(body) : {};

              await firestore.collection('orders').doc(id).update({ ...data, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
              return sendJson(200, { success: true });
            }

            if (pathname === '/api/admin/enquiries' && req.method === 'GET') {
              const ok = await isAdmin();
              if (!ok) return sendJson(403, { error: 'Admin access required' });
              const snap = await firestore.collection('inquiries').orderBy('createdAt', 'desc').get();
              const list: any[] = [];
              snap.forEach((d: any) => list.push({ id: d.id, ...d.data() }));
              return sendJson(200, list);
            }

            if (pathname.startsWith('/api/admin/enquiries') && (req.method === 'PATCH' || req.method === 'POST')) {
              const ok = await isAdmin();
              if (!ok) return sendJson(403, { error: 'Admin access required' });
              const parts = pathname.split('/');
              const id = parts[3] || url.searchParams.get('id');
              if (!id) return sendJson(400, { error: 'enquiry id required' });

              let body = '';
              for await (const chunk of req) body += chunk;
              const data = body ? JSON.parse(body) : {};

              await firestore.collection('inquiries').doc(id).update({ ...data, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
              return sendJson(200, { success: true });
            }

            // SSE streams
            if (pathname === '/api/orders/stream' && req.method === 'GET') {
              const token = (url.searchParams.get('token') || '').toString();
              let sseDecoded: any = null;
              try {
                const tok = token || idToken;
                if (!tok) return sendJson(401, { error: 'Missing auth token' });
                sseDecoded = await admin.auth().verifyIdToken(tok);
              } catch {
                return sendJson(401, { error: 'Invalid ID token' });
              }
              const uid = sseDecoded.uid;
              res.writeHead(200, {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                Connection: 'keep-alive',
              });
              const q = firestore.collection('orders').where('userId', '==', uid);
              const unsubscribe = q.onSnapshot((snap: any) => {
                const orders: any[] = [];
                snap.forEach((d: any) => orders.push({ id: d.id, ...d.data() }));
                orders.sort((a, b) => {
                  const ta = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt || 0).getTime();
                  const tb = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt || 0).getTime();
                  return tb - ta;
                });
                res.write(`data: ${JSON.stringify(orders)}\n\n`);
              }, (err: any) => {
                res.write(`event: error\ndata: ${JSON.stringify({ message: String(err?.message || err) })}\n\n`);
              });
              req.on('close', () => {
                unsubscribe();
                res.end();
              });
              return;
            }

            if (pathname === '/api/enquiries/stream' && req.method === 'GET') {
              const token = (url.searchParams.get('token') || '').toString();
              let sseDecoded: any = null;
              try {
                const tok = token || idToken;
                if (!tok) return sendJson(401, { error: 'Missing auth token' });
                sseDecoded = await admin.auth().verifyIdToken(tok);
              } catch {
                return sendJson(401, { error: 'Invalid ID token' });
              }
              const uid = sseDecoded.uid;
              res.writeHead(200, {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                Connection: 'keep-alive',
              });
              const q = firestore.collection('inquiries').where('userId', '==', uid);
              const unsubscribe = q.onSnapshot((snap: any) => {
                const items: any[] = [];
                snap.forEach((d: any) => items.push({ id: d.id, ...d.data() }));
                items.sort((a, b) => {
                  const ta = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt || 0).getTime();
                  const tb = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt || 0).getTime();
                  return tb - ta;
                });
                res.write(`data: ${JSON.stringify(items)}\n\n`);
              }, (err: any) => {
                res.write(`event: error\ndata: ${JSON.stringify({ message: String(err?.message || err) })}\n\n`);
              });
              req.on('close', () => {
                unsubscribe();
                res.end();
              });
              return;
            }

            if (pathname === '/api/admin/orders/stream' && req.method === 'GET') {
              const token = (url.searchParams.get('token') || '').toString();
              let sseDecoded: any = null;
              try {
                const tok = token || idToken;
                if (!tok) return sendJson(401, { error: 'Missing auth token' });
                sseDecoded = await admin.auth().verifyIdToken(tok);
              } catch {
                return sendJson(401, { error: 'Invalid ID token' });
              }
              // admin check
              let isAdminUser = sseDecoded.admin === true;
              if (!isAdminUser) {
                const profileDoc = await firestore.collection('user_profiles').doc(sseDecoded.uid).get();
                if (profileDoc.exists) {
                  const data = profileDoc.data();
                  isAdminUser = data.role === 'admin' || data.isAdmin === true;
                }
              }
              if (!isAdminUser) return sendJson(403, { error: 'Admin access required' });
              res.writeHead(200, {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                Connection: 'keep-alive',
              });
              const q = firestore.collection('orders').orderBy('createdAt', 'desc');
              const unsubscribe = q.onSnapshot((snap: any) => {
                const list: any[] = [];
                snap.forEach((d: any) => list.push({ id: d.id, ...d.data() }));
                res.write(`data: ${JSON.stringify(list)}\n\n`);
              }, (err: any) => {
                res.write(`event: error\ndata: ${JSON.stringify({ message: String(err?.message || err) })}\n\n`);
              });
              req.on('close', () => {
                unsubscribe();
                res.end();
              });
              return;
            }

            if (pathname === '/api/admin/enquiries/stream' && req.method === 'GET') {
              const token = (url.searchParams.get('token') || '').toString();
              let sseDecoded: any = null;
              try {
                const tok = token || idToken;
                if (!tok) return sendJson(401, { error: 'Missing auth token' });
                sseDecoded = await admin.auth().verifyIdToken(tok);
              } catch {
                return sendJson(401, { error: 'Invalid ID token' });
              }
              // admin check
              let isAdminUser = sseDecoded.admin === true;
              if (!isAdminUser) {
                const profileDoc = await firestore.collection('user_profiles').doc(sseDecoded.uid).get();
                if (profileDoc.exists) {
                  const data = profileDoc.data();
                  isAdminUser = data.role === 'admin' || data.isAdmin === true;
                }
              }
              if (!isAdminUser) return sendJson(403, { error: 'Admin access required' });
              res.writeHead(200, {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                Connection: 'keep-alive',
              });
              const q = firestore.collection('inquiries').orderBy('createdAt', 'desc');
              const unsubscribe = q.onSnapshot((snap: any) => {
                const list: any[] = [];
                snap.forEach((d: any) => list.push({ id: d.id, ...d.data() }));
                res.write(`data: ${JSON.stringify(list)}\n\n`);
              }, (err: any) => {
                res.write(`event: error\ndata: ${JSON.stringify({ message: String(err?.message || err) })}\n\n`);
              });
              req.on('close', () => {
                unsubscribe();
                res.end();
              });
              return;
            }

            // unknown route
            return sendJson(404, { error: 'Not found' });
          } catch (e) {
            console.error('API error', e);
            return sendJson(500, { error: 'Internal server error' });
          }
        });
      }
    }
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
