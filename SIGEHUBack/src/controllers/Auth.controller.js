import jwt from 'jsonwebtoken';
import config from '../../config.json' with { type: 'json' };
import { generateToken } from '../middlewares/auth.middleware.js';

const JWT_SECRET = config.jwtSecret;

// Renovación del access token a partir de un refresh token de larga duración.
// El refresh token es un JWT firmado con el mismo secret pero expiración 30d.
// No requiere verificación contra BD: si la firma es válida y no expiró, se
// confía en él. El access token nunca se acepta aquí (aunque sea válido, no
// permite renovar; solo el refresh token tiene ese propósito).
const refresh = async (req, res) => {
    try {
        const { refreshToken } = req.body ?? {};

        if (!refreshToken) {
            return res.status(400).json({ error: 'Refresh token requerido' });
        }

        let decoded;
        try {
            decoded = jwt.verify(refreshToken, JWT_SECRET);
        } catch (err) {
            // Token expirado o firma inválida: el cliente debe reautenticar.
            const mensaje = err?.name === 'TokenExpiredError'
                ? 'Refresh token expirado'
                : 'Refresh token inválido';
            return res.status(401).json({ error: mensaje });
        }

        // Se emite un nuevo access token con los mismos claims. No se rota el
        // refresh token (sigue siendo válido hasta sus 30d) para no forzar al
        // cliente a reenviarlo: la rotación queda del lado del cliente cuando
        // lo juzgue oportuno (logout / reemplazo).
        const nuevoToken = generateToken({
            idTrabajador: decoded.idTrabajador,
            usuario: decoded.usuario,
            nombre: decoded.nombre,
            rol: decoded.rol
        });

        res.json({ token: nuevoToken });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

export default {
    refresh
};
