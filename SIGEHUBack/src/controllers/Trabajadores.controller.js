import bcrypt from 'bcrypt';
import jwt from '../middlewares/auth.middleware.js';
import service from '../services/Trabajadores.service.js';

const SALT_ROUNDS = 10;

// ─── Saneamiento de teléfono ─────────────────────────────────────────────────
// Elimina espacios, guiones y paréntesis; conserva únicamente "+" seguido de
// dígitos, con un máximo de 15 caracteres (formato E.164 del campo Telefono).
// Devuelve null cuando el valor no es un teléfono válido.
const sanitizeTelefono = (telefono) => {
    if (telefono == null || telefono === '') return null;

    const comprimido = String(telefono).replace(/[\s\-()]/g, '');

    if (!/^\+?\d{1,15}$/.test(comprimido)) {
        return null;
    }

    return comprimido;
};

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
// Obtiene todos los trabajadores. Con ?asignables=true excluye al Propietario
// (TiposUsuarios_idTipoUsuario = 1) para listas de trabajadores asignables.
const findTrabajadores = async (req, res) => {
    try {
        const asignables = req.query?.asignables === 'true';
        const trabajadores = await service.getTrabajadores({ asignables });
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
            return res.status(400).json({ error: 'El cuerpo de la solicitud est vaco' });
        }

        const { Usuario, Contra, Nombre, Telefono, Tipo, Correo, Observaciones, RutaDocumentoIMSS } = req.body;

        const datos = { Usuario, Contra, Nombre, Tipo };
        const opcionales = ['Telefono', 'RutaDocumentoIMSS', 'Correo', 'Observaciones'];

        const faltantes = Object.entries(datos)
            .filter(([clave, valor]) => !opcionales.includes(clave) && (valor == null || valor === ''))
            .map(([clave]) => clave);

        if (faltantes.length > 0) {
            return res.status(400).json({
                error: `Faltan campos requeridos: ${faltantes.join(', ')}`
            });
        }

        const telefono = sanitizeTelefono(Telefono);
        if (Telefono != null && Telefono !== '' && telefono === null) {
            return res.status(400).json({
                error: 'Teléfono inválido: usa solo "+" y números, máximo 15 dígitos'
            });
        }

        const hash = await bcrypt.hash(Contra, SALT_ROUNDS);
        const nuevoId = await service.createTrabajador({
            Usuario, Contra: hash, Nombre, Telefono: telefono, Tipo,
            Correo: Correo ?? null, Observaciones: Observaciones ?? null,
            RutaDocumentoIMSS: RutaDocumentoIMSS ?? null,
            idTrabajadorCtx: req.user?.idTrabajador ?? 1
        });

        res.status(201).json({ message: 'Trabajador creado', idTrabajador: nuevoId });

    } catch (e) {
        console.error('[POST /Trabajadores] Error al crear trabajador:', e);
        res.status(500).json({ error: 'Error en la transacción de datos al intentar guardar el trabajador' });
    }
};

// PUT /Trabajadores/:id
// Actualiza la información del trabajador y opcionalmente la contraseña.
const update = async (req, res) => {
    try {
        if (!req.body || Object.keys(req.body).length === 0) {
            return res.status(400).json({ error: 'El cuerpo de la solicitud est vaco' });
        }

        const { Usuario, Contra, Nombre, Telefono, Tipo, Correo, Observaciones, RutaDocumentoIMSS, deleteImss } = req.body;

        const datos = { Usuario, Nombre, Tipo };
        const opcionales = ['Telefono', 'Contra', 'RutaDocumentoIMSS', 'deleteImss', 'Correo', 'Observaciones'];

        const faltantes = Object.entries(datos)
            .filter(([clave, valor]) => !opcionales.includes(clave) && (valor == null || valor === ''))
            .map(([clave]) => clave);

        if (faltantes.length > 0) {
            return res.status(400).json({
                error: `Faltan campos requeridos: ${faltantes.join(', ')}`
            });
        }

        const telefono = sanitizeTelefono(Telefono);
        if (Telefono != null && Telefono !== '' && telefono === null) {
            return res.status(400).json({
                error: 'Teléfono inválido: usa solo "+" y números, máximo 15 dígitos'
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
                Telefono: telefono,
                Tipo,
                Correo: Correo ?? null,
                Observaciones: Observaciones ?? null,
                RutaDocumentoIMSS: RutaDocumentoIMSS ?? null,
                deleteImss: deleteImss === true,
                idTrabajadorCtx: req.user?.idTrabajador ?? 1
            }
        );

        if (!affected) {
            return res.status(404).json({ error: 'Trabajador no encontrado' });
        }

        res.json({ message: 'Trabajador actualizado' });

    } catch (e) {
        console.error('[PUT /Trabajadores/:id] Error al actualizar trabajador:', e);
        res.status(500).json({ error: 'Error en la transacción de datos al intentar guardar el trabajador' });
    }
};

// DELETE /Trabajadores/:id (soft delete)
// Desactiva el trabajador sin eliminar su registro.
const remove = async (req, res) => {
    try {
        const affected = await service.deleteTrabajador(req.params.id, req.user?.idTrabajador);

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

// GET /Trabajadores/check-username?usuario=...
// Verifica si un nombre de usuario ya está en uso (para validación async del form).
const checkUsername = async (req, res) => {
    try {
        const { usuario, id } = req.query;
        if (!usuario) {
            return res.status(400).json({ error: 'El parámetro usuario es requerido' });
        }
        const existe = await service.checkUsername(usuario, id || null);
        res.json({ disponible: !existe });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// POST /Trabajadores/:id/imss
// Sube el documento IMSS (PDF/JPG/PNG) y guarda su ruta relativa en BD.
const uploadImss = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No se recibió ningún archivo' });
        }

        const rutaRelativa = `uploads/imss/${req.file.filename}`;

        await service.updateRutaImss(
            req.params.id,
            rutaRelativa,
            req.user?.idTrabajador ?? 1
        );

        res.status(201).json({ message: 'Documento IMSS guardado', ruta: rutaRelativa });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// PATCH /Trabajadores/:id/activo
// Activa o desactiva un trabajador (toggle switch).
const cambiarActivo = async (req, res) => {
    try {
        const { activo } = req.body;
        if (typeof activo !== 'boolean') {
            return res.status(400).json({ error: 'El campo activo (boolean) es requerido' });
        }

        const affected = await service.cambiarActivo(
            req.params.id,
            activo,
            req.user?.idTrabajador ?? 1
        );

        if (!affected) {
            return res.status(404).json({ error: 'Trabajador no encontrado' });
        }

        res.json({ message: activo ? 'Trabajador activado' : 'Trabajador desactivado' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// POST /Trabajadores/login
const login = async (req, res) => {
    try {
        const { Usuario, Contra } = req.body;

        if (!Usuario || !Contra) {
            return res.status(400).json({ error: 'Usuario y contrasea requeridos' });
        }

        const trabajador = await service.getTrabajadorByUsuario(Usuario);

        if (!trabajador) {
            return res.status(401).json({ error: 'Credenciales invalidas' });
        }

        const valido = await bcrypt.compare(Contra, trabajador.CONTRA);

        if (!valido) {
            return res.status(401).json({ error: 'Credenciales invalidas' });
        }

        const token = jwt.generateToken({
            idTrabajador: trabajador.IDTRABAJADOR,
            usuario: trabajador.NOMBREUSUARIO,
            nombre: trabajador.NOMBRECOMPLETO,
            rol: trabajador.TIPOUSUARIO ?? trabajador.TipoUsuario ?? 'Trabajador'
        });

        res.json({
            token,
            trabajador: {
                idTrabajador: trabajador.IDTRABAJADOR,
                usuario: trabajador.NOMBREUSUARIO,
                nombre: trabajador.NOMBRECOMPLETO,
                rol: trabajador.TIPOUSUARIO ?? trabajador.TipoUsuario ?? 'Trabajador'
            }
        });

    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// GET /Trabajadores/:id/obras
// Obtiene las obras asignadas a un trabajador específico.
const findObras = async (req, res) => {
    try {
        const obras = await service.getObrasByTrabajador(req.params.id);
        res.json(obras);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

export default {
    findTrabajadores,
    findTiposUsuarios,
    findById,
    findObras,
    checkUsername,
    create,
    update,
    remove,
    cambiarActivo,
    uploadImss,
    login
};