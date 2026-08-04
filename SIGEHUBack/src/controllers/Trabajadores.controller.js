import bcrypt from 'bcrypt';
import jwt from '../middlewares/auth.middleware.js';
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
            return res.status(400).json({ error: 'El cuerpo de la solicitud est vaco' });
        }

        const { Usuario, Contra, Nombre, Telefono, Tipo, RutaDocumentoIMSS } = req.body;

        const datos = { Usuario, Contra, Nombre, Tipo };
        const opcionales = ['Telefono', 'RutaDocumentoIMSS'];

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
        const nuevoId = await service.createTrabajador({
            Usuario, Contra: hash, Nombre, Telefono: Telefono ?? null, Tipo,
            RutaDocumentoIMSS: RutaDocumentoIMSS ?? null,
            idTrabajadorCtx: req.user?.idTrabajador
        });

        res.status(201).json({ message: 'Trabajador creado', idTrabajador: nuevoId });

    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// PUT /Trabajadores/:id
// Actualiza la información del trabajador y opcionalmente la contraseña.
const update = async (req, res) => {
    try {
        if (!req.body || Object.keys(req.body).length === 0) {
            return res.status(400).json({ error: 'El cuerpo de la solicitud est vaco' });
        }

        const { Usuario, Contra, Nombre, Telefono, Tipo, RutaDocumentoIMSS, deleteImss } = req.body;

        const datos = { Usuario, Nombre, Tipo };
        const opcionales = ['Telefono', 'Contra', 'RutaDocumentoIMSS', 'deleteImss'];

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
                Tipo,
                RutaDocumentoIMSS: RutaDocumentoIMSS ?? null,
                deleteImss: deleteImss === true,
                idTrabajadorCtx: req.user?.idTrabajador
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
            req.user?.idTrabajador
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
            req.user?.idTrabajador
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
            rol: trabajador.TIPOUSUARIO
        });

        res.json({
            token,
            trabajador: {
                idTrabajador: trabajador.IDTRABAJADOR,
                usuario: trabajador.NOMBREUSUARIO,
                nombre: trabajador.NOMBRECOMPLETO,
                rol: trabajador.TIPOUSUARIO
            }
        });

    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

export default {
    findTrabajadores,
    findTiposUsuarios,
    findById,
    checkUsername,
    create,
    update,
    remove,
    cambiarActivo,
    uploadImss,
    login
};