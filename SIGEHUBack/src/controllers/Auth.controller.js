import jwt from 'jsonwebtoken';
import config from '../../config.json' with { type: 'json' };
import { generateToken } from '../middlewares/auth.middleware.js';

const JWT_SECRET = config.jwtSecret;

const refresh = async (req, res) => {
    try {
        const { token } = req.body ?? {};

        if (!token) {
            return res.status(400).json({ error: 'Token requerido' });
        }

        let decoded;
        try {
            decoded = jwt.verify(token, JWT_SECRET);
        } catch (err) {
            return res.status(401).json({ error: 'Token inválido o expirado' });
        }

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
