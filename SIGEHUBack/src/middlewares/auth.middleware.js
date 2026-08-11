import jwt from 'jsonwebtoken';
import config from '../../config.json' with { type: 'json' };

const JWT_SECRET = config.jwtSecret;
const JWT_EXPIRES_IN = '8h';
const REFRESH_EXPIRES_IN = '30d';

const FINANCIAL_ENDPOINTS = [
    'precio', 'monto', 'anticipo', 'pago', 'finanza', 'fiscal',
    'presupuesto', 'costo', 'factura', 'cfdi', 'detallepago',
    'regimen', 'compra', 'detallecompra'
];

// Rutas de Compras que el rol Trabajador (chofer) SÍ puede usar. NO exponen
// información financiera: la tabla Compras no tiene columnas de precio/monto,
// y estos endpoints devuelven solo proveedor, materiales y estado de surtido.
// Método + regex sobre req.path (sin querystring).
const WORKER_SAFE_FINANCIAL = [
    { method: 'GET', re: /^\/compras$/i },
    { method: 'GET', re: /^\/compras\/chofer(\/\d+)?$/i },
    { method: 'PUT', re: /^\/compras\/\d+$/i },
    { method: 'PATCH', re: /^\/compras\/\d+\/recibido$/i }
];

export function generateToken(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// Refresh token de larga duración (30d). Mismo secret pero expiración distinta:
// permite renovar el access token sin reenviar credenciales. Se invalida únicamente
// cuando el usuario hace logout (borrado en cliente) o cuando expira naturalmente.
export function generateRefreshToken(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: REFRESH_EXPIRES_IN });
}

export function verifyToken(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Token de acceso requerido' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expirado' });
        }
        return res.status(401).json({ error: 'Token inválido' });
    }
}

export function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'No autenticado' });
        }

        if (!roles.includes(req.user.rol)) {
            return res.status(403).json({
                error: 'No tiene permisos para acceder a este recurso'
            });
        }

        next();
    };
}

export function blockFinancialForWorker(req, res, next) {
    const path = req.originalUrl.toLowerCase();

    // Excepciones worker-safe de Compras (chofer): no exponen precios ni
    // montos, solo proveedor/materiales/estado de surtido. El controlador de
    // Compras además restringe por rol y por asignación del chofer.
    const esWorkerSafe = req.user?.rol === 'Trabajador' &&
        WORKER_SAFE_FINANCIAL.some(({ method, re }) =>
            method === req.method && re.test(path)
        );

    if (esWorkerSafe) {
        return next();
    }

    const isFinancial = FINANCIAL_ENDPOINTS.some(ep => path.includes(ep));

    if (isFinancial && req.user?.rol === 'Trabajador') {
        return res.status(403).json({
            error: 'Los trabajadores no pueden acceder a información financiera o fiscal'
        });
    }

    next();
}

export default {
    generateToken,
    generateRefreshToken,
    verifyToken,
    requireRole,
    requireAdmin: () => requireRole('Propietario'),
    blockFinancialForWorker
};