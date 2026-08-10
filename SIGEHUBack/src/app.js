import config from '../config.json' with { type: 'json' };
import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import backup from './jobs/backup.job.js';
import { getConnection } from './config/db.js';
import { getUploadsDir, getLogsDir } from './config/paths.js';

import TrabajadoresRoutes from './routes/Trabajadores.route.js';
import ClientesRoutes from './routes/Clientes.route.js';
import MaterialesRoutes from './routes/Materiales.route.js';
import ProveedoresRoutes from './routes/Proveedores.route.js';
import ObrasRoutes from './routes/Obras.route.js';
import FotosObras from './routes/FotosObras.route.js';
import NotasObras from './routes/NotasObras.route.js';
import ObrasMateriales from './routes/ObrasMateriales.route.js'
import ObrasTrabajadores from './routes/ObrasTrabajadores.route.js'
import ObrasKits from './routes/ObrasKits.route.js'
import GarantiasRoutes from './routes/Garantias.route.js';
import FotosGarantias from './routes/FotosGarantias.route.js';
import NotasGarantias from './routes/NotasGarantias.route.js';
import GarantiasTrabajadores from './routes/GarantiasTrabajadores.route.js';
import ClientesContactosRoutes from './routes/ClientesContactos.route.js';
import KitsRoutes from './routes/Kits.route.js';
import ComprasRoutes from './routes/Compras.route.js';
import DashboardRoutes from './routes/Dashboard.route.js';
import BackupRoutes from './routes/Backup.route.js';
import AuditoriaRoutes from './routes/Auditoria.route.js';
import AuthRoutes from './routes/Auth.route.js';
import ReportesRoutes from './routes/Reportes.route.js';
import NotificacionesRoutes from './routes/Notificaciones.route.js';
import auth from './middlewares/auth.middleware.js';

const PORT = config.apiPort || 3000;
const app = express();

// =============================================================================
// CORS seguro: solo se aceptan los orígenes explícitos de la aplicación.
//
//   - `http://localhost:*`      → Angular dev (ng serve) y Electron (Desktop).
//   - `https://localhost:*`     → Capacitor Android (WebView scheme por defecto).
//   - `capacitor://localhost`   → Capacitor iOS/otros esquemas del WebView.
//   - `file://`                 → Electron / WebView nativo (sin origen HTTP).
//   - `https://sigehu.dpdns.org`→ App móvil/Web vía túnel zrok/Cloudflare.
//   - Sin cabecera `Origin` (curl, backend-local) → permitida.
//
// Se niega cualquier otro origen (la política nunca usa `origin: '*'` porque la
// app autentica con JWT via cookies/headers). El rechazo se registra en la
// consola y en un archivo `logs/cors.log` para poder diagnosticar el origen
// real que envía cada cliente (Android, Electron, navegador, túnel).
// =============================================================================

const ALLOWED_ORIGINS = [
    'https://sigehu.dpdns.org'
];

function isOriginAllowed(origin) {
    if (!origin || origin === 'null') return true;          // petición sin Origin (curl, nativo)
    if (origin.startsWith('file://')) return true;           // Electron / WebView nativo
    if (origin === 'http://localhost' || origin.startsWith('http://localhost:')) return true;
    if (origin === 'https://localhost' || origin.startsWith('https://localhost:')) return true;
    if (origin.startsWith('capacitor://')) return true;      // esquema HTTP del WebView
    if (origin.startsWith('ionic://')) return true;
    return ALLOWED_ORIGINS.includes(origin);
}

let corsLogFile = null;

function initCorsLog() {
    if (corsLogFile) return;
    const dir = getLogsDir();
    try {
        fs.mkdirSync(dir, { recursive: true });
        corsLogFile = path.join(dir, 'cors.log');
    } catch {
        corsLogFile = null;
    }
}

function logCors(allowed, origin, method, url) {
    const line = `[CORS] ${new Date().toISOString()} origin=${origin || '(sin origin)'} method=${method} path=${url} allowed=${allowed ? 'true' : 'false'}`;
    if (allowed) {
        console.log(line);
    } else {
        console.warn(line);
    }
    try {
        initCorsLog();
        if (corsLogFile) {
            fs.appendFileSync(corsLogFile, line + '\n', 'utf8');
        }
    } catch {
        /* el logging CORS jamás debe tumbar el servidor */
    }
}

app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
        logCors(isOriginAllowed(origin), origin, req.method, req.originalUrl || req.url);
    }
    next();
});

app.use(cors({
    origin(origin, callback) {
        if (isOriginAllowed(origin)) {
            return callback(null, true);
        }
        const err = new Error('Origen no permitido por política CORS');
        err.status = 403;
        return callback(err);
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: false,
    maxAge: 86400,
    optionsSuccessStatus: 204
}));
app.use(express.json());

// Archivos estáticos: rutas relativas guardadas en BD como uploads/...
app.use('/uploads', express.static(getUploadsDir()));

// Autenticación global: todo requiere JWT salvo login, refresh y la
// verificación de salud del servidor. El aislamiento financiero se aplica
// después para que `req.user` ya esté disponible.
const PUBLIC_PATHS = [
    '/',
    '/Trabajadores/login',
    '/Auth/refresh'
];

app.use((req, res, next) => {
    const esPublico = PUBLIC_PATHS.some(p => req.path === p);
    if (esPublico) return next();
    return auth.verifyToken(req, res, next);
});
app.use(auth.blockFinancialForWorker);

// Rutas
app.use('/Trabajadores', TrabajadoresRoutes);
app.use('/Clientes', ClientesRoutes);
app.use('/Materiales', MaterialesRoutes);
app.use('/Proveedores', ProveedoresRoutes);
app.use('/Obras', ObrasRoutes);
app.use('/Obras', FotosObras)
app.use('/Obras', NotasObras)
app.use('/Obras', ObrasMateriales)
app.use('/Garantias', GarantiasRoutes);
app.use('/Garantias', FotosGarantias);
app.use('/Garantias', NotasGarantias);
app.use('/Garantias', GarantiasTrabajadores);
app.use('/Obras', ObrasTrabajadores);
app.use('/Obras', ObrasKits);
app.use('/Clientes', ClientesContactosRoutes);

app.use('/Dashboard', DashboardRoutes);
app.use('/Backup', BackupRoutes);
app.use('/Auditoria', AuditoriaRoutes);
app.use('/Auth', AuthRoutes);
app.use('/Kits', KitsRoutes);
app.use('/Compras', ComprasRoutes);
app.use('/Reportes', ReportesRoutes);
app.use('/Notificaciones', NotificacionesRoutes);

// prueba de conexion
app.get('/', (req, res) => {
  res.json({ "Servidor": "Activo" });
});

// Manejador central de errores. Los rechazos CORS se devuelven como 403 con un
// mensaje JSON legible (en lugar del 500 HTML por defecto), y quedan registrados
// en consola + logs/cors.log por el middleware anterior.
app.use((err, req, res, next) => {
  const esRechazoCors = err && /CORS/i.test(String(err && err.message));
  if (esRechazoCors) {
    return res.status(403).json({
      error: 'Origen no permitido por política CORS',
      origin: req.headers.origin || null
    });
  }
  console.error('Error no controlado:', err && err.stack ? err.stack : err);
  const status = err && (err.status || err.statusCode);
  if (!res.headersSent) {
    res.status(status || 500).json({ error: err && err.message ? err.message : 'Error interno del servidor' });
  } else {
    return next(err);
  }
});

// La conexión a Firebird es asíncrona. Se arranca el servidor únicamente cuando
// la BD responde. (Evita top-level await para poder empaquetar a CommonJS/SEA.)
getConnection()
  .then(() => {
    console.log("BD conectada")
    app.listen(PORT, () => {
      console.log(`Servidor escuchando en http://localhost:${PORT}`);
      backup.verificarYRespaldarAlArrancar();
      backup.iniciarProgramacion();
    });
  })
  .catch((err) => {
    console.error("Error al conectar con la base de datos:", err?.message || err);
    process.exit(1);
  });