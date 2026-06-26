import bcrypt from 'bcrypt';
import service from '../services/Trabajadores.service.js';

const SALT_ROUNDS = 10;

// GET Trabajadores/TiposUsuarios
// Obtiene todos los tipos de usuario
const findTiposUsuarios = async (_req, res) => {
    try {
        const tiposusuarios = await service.getTiposUsuarios();
        res.json(tiposusuarios);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// GET /Trabajadores/
// Obtiene todos los trabajadores
const findTrabajadores = async (_req, res) => {
    try {
        const trabajadores = await service.getTrabajadores();
        res.json(trabajadores);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// GET /Trabajadores/:id
// Obtiene los datos de un trabajador específico.
const findById = async (req, res) => {
    try {
        const trabajador = await service.getTrabajadorById(req.params.id);
        if (!trabajador) {
            return res.status(404).json({ error: 'Trabajador no encontrado' });
        }
        res.json(trabajador);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// POST /Trabajadores
// Crea un trabajador con contraseña cifrada.
const create = async (req, res) => {
    try {
        if (!req.body || Object.keys(req.body).length === 0) {
            return res.status(400).json({ error: 'El cuerpo de la solicitud está vacío' });
        }

        const { Usuario, Contra, Nombre, Telefono, Tipo } = req.body;

        const datos = { Usuario, Contra, Nombre, Tipo };
        const opcionales = ['Telefono'];

        const faltantes = Object.entries(datos)
            .filter(([clave, valor]) => !opcionales.includes(clave) && (valor == null || valor === ''))
            .map(([clave]) => clave);

        if (faltantes.length > 0) {
            return res.status(400).json({
                error: `Faltan campos requeridos: ${faltantes.join(', ')}`
            });
        }
        console.log("Datos recibidos: ",{Usuario, Contra, Nombre, Telefono, Tipo});

        const hash = await bcrypt.hash(Contra, SALT_ROUNDS);
        console.log("Hash generado: ", hash)
        await service.createTrabajador({ Usuario, Contra: hash, Nombre, Telefono: Telefono ?? null, Tipo });

        res.status(201).json({ message: 'Trabajador creado' });

    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// PUT /Trabajadores/:id
// Actualiza la información del trabajador y opcionalmente la contraseña.
const update = async (req, res) => {
    try {
        if (!req.body || Object.keys(req.body).length === 0) {
            return res.status(400).json({ error: 'El cuerpo de la solicitud está vacío' });
        }

        const { Usuario, Contra, Nombre, Telefono, Tipo } = req.body;

        const datos = { Usuario, Nombre, Tipo }; // Contra y Telefono son opcionales
        const opcionales = ['Telefono', 'Contra'];

        const faltantes = Object.entries(datos)
            .filter(([clave, valor]) => !opcionales.includes(clave) && (valor == null || valor === ''))
            .map(([clave]) => clave);

        if (faltantes.length > 0) {
            return res.status(400).json({
                error: `Faltan campos requeridos: ${faltantes.join(', ')}`
            });
        }

        const hash = Contra
            ? await bcrypt.hash(Contra, SALT_ROUNDS)
            : null;

        const affected = await service.updateTrabajador(
            req.params.id,
            {
                Usuario,
                Contra: hash,
                Nombre,
                Telefono: Telefono ?? null,
                Tipo
            }
        );

        if (!affected) {
            return res.status(404).json({ error: 'Trabajador no encontrado' });
        }

        res.json({ message: 'Trabajador actualizado' });

    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// DELETE /Trabajadores/:id (soft delete)
// Desactiva el trabajador sin eliminar su registro.
const remove = async (req, res) => {
    try {
        const affected = await service.deleteTrabajador(req.params.id);

        if (!affected) {
            return res.status(404).json({
                error: 'Trabajador no encontrado'
            });
        }

        res.json({ message: 'Trabajador desactivado' });

    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

export default {
    findTrabajadores,
    findTiposUsuarios,
    findById,
    create,
    update,
    remove
};