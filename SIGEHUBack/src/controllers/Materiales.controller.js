import service from '../services/Materiales.service.js';

// GET /Materiales/
// Obtiene todos los Materiales
const findMateriales = async (_req, res) => {
    try {
        const Materiales = await service.getMateriales();
        res.json(Materiales);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// GET /Materiales/:id
// Obtiene los datos de un Material específico.
const findById = async (req, res) => {
    try {
        const Material = await service.getMaterialById(req.params.id);
        if (!Material) {
            return res.status(404).json({ error: 'Material no encontrado' });
        }
        res.json(Material);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// POST /Materiales
// Crea un Material
const create = async (req, res) => {
    try {
        if (!req.body || Object.keys(req.body).length === 0) {
            return res.status(400).json({ error: 'El cuerpo de la solicitud está vacío' });
        }

        const { Nombre, UnidadMedida, Descripcion } = req.body;

        const datos = { Nombre, UnidadMedida };
        const opcionales = ['Descripcion'];

        const faltantes = Object.entries(datos)
            .filter(([clave, valor]) => !opcionales.includes(clave) && (valor == null || valor === ''))
            .map(([clave]) => clave);

        if (faltantes.length > 0) {
            return res.status(400).json({
                error: `Faltan campos requeridos: ${faltantes.join(', ')}`
            });
        }
        
        await service.createMaterial({ Nombre, UnidadMedida, Descripcion: Descripcion ?? null });

        res.status(201).json({ message: 'Material creado' });

    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// PUT /Materiales/:id
// Actualiza la información del Material y opcionalmente la contraseña.
const update = async (req, res) => {
    try {
        if (!req.body || Object.keys(req.body).length === 0) {
            return res.status(400).json({ error: 'El cuerpo de la solicitud está vacío' });
        }

        const { Nombre, UnidadMedida, Descripcion } = req.body;

        const datos = { Nombre, UnidadMedida };
        const opcionales = ['Descripcion'];

        const faltantes = Object.entries(datos)
            .filter(([clave, valor]) => !opcionales.includes(clave) && (valor == null || valor === ''))
            .map(([clave]) => clave);

        if (faltantes.length > 0) {
            return res.status(400).json({
                error: `Faltan campos requeridos: ${faltantes.join(', ')}`
            });
        }
        
        const affected = await service.updateMaterial(
            req.params.id,
            {
                Nombre, 
                UnidadMedida, 
                Descripcion : Descripcion ?? null
            }
        );

        if (!affected) {
            return res.status(404).json({ error: 'Material no encontrado' });
        }

        res.json({ message: 'Material actualizado' });

    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// DELETE /Materiales/:id (soft delete)
// Desactiva el Material sin eliminar su registro.
const remove = async (req, res) => {
    try {
        const affected = await service.deleteMaterial(req.params.id);

        if (!affected) {
            return res.status(404).json({
                error: 'Material no encontrado'
            });
        }

        res.json({ message: 'Material desactivado' });

    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

export default {
    findMateriales,
    findById,
    create,
    update,
    remove
};