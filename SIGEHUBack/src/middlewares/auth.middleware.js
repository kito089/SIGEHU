import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'sigehu-dev-secret';
const JWT_EXPIRES_IN = '8h';

const FINANCIAL_ENDPOINTS = [
    'precio', 'monto', 'anticipo', 'pago', 'finanza', 'fiscal',
    'presupuesto', 'costo', 'factura', 'cfdi', 'detallepago',
    'regimen', 'compra', 'detallecompra'
];

export function generateToken(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
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
    const isFinancial = FINANCIAL_ENDPOINTS.some(ep => path.includes(ep));

    if (isFinancial && req.user?.tipo === 'Trabajador') {
        return res.status(403).json({
            error: 'Los trabajadores no pueden acceder a información financiera o fiscal'
        });
    }

    next();
}

export default {
    generateToken,
    verifyToken,
    requireRole,
    requireAdmin: () => requireRole('Propietario'),
    blockFinancialForWorker
};