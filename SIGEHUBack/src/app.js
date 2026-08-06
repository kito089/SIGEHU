import config from '../config.json' with { type: 'json' };
import express from 'express';
import cors from 'cors';
import path from 'node:path';
import backup from './jobs/backup.job.js';
import { getConnection } from './config/db.js';

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
import auth from './middlewares/auth.middleware.js';

const PORT = config.apiPort || 3000;
const app = express();

app.use(cors());
app.use(express.json());

// Archivos estáticos: rutas relativas guardadas en BD como uploads/...
app.use('/uploads', express.static(
    path.join(
        process.env.NODE_ENV === 'production' ? path.dirname(process.execPath) : process.cwd(),
        'uploads'
    )
));

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

// prueba de conexion
app.get('/', (req, res) => {
  res.json({ "Servidor": "Activo" });
});

await getConnection();
console.log("BD conectada")

app.listen(PORT, () => {
    console.log(`Servidor escuchando en http://localhost:${PORT}`);
    backup.verificarYRespaldarAlArrancar();
    backup.iniciarProgramacion();
});