import service from '../services/Kits.service.js';

const getAll = async (_req, res) => {
    try {
        const kits = await service.getKits();
        res.json(kits);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

const getById = async (req, res) => {
    try {
        const kit = await service.getKitById(req.params.id);
        if (!kit) {
            return res.status(404).json({ error: 'Kit no encontrado' });
        }
        res.json(kit);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

const create = async (req, res) => {
    try {
        if (!req.body || Object.keys(req.body).length === 0) {
            return res.status(400).json({ error: 'El cuerpo de la solicitud esta vacio' });
        }

        const { Nombre, Descripcion, materiales } = req.body;

        if (!Nombre) {
            return res.status(400).json({ error: 'El campo Nombre es requerido' });
        }

        await service.createKit({
            Nombre,
            Descripcion: Descripcion ?? null,
            materiales: materiales ?? null,
            idTrabajadorCtx: req.user?.idTrabajador
        });

        res.status(201).json({ message: 'Kit creado' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

const update = async (req, res) => {
    try {
        if (!req.body || Object.keys(req.body).length === 0) {
            return res.status(400).json({ error: 'El cuerpo de la solicitud esta vacio' });
        }

        const { Nombre, Descripcion, materiales } = req.body;

        if (!Nombre) {
            return res.status(400).json({ error: 'El campo Nombre es requerido' });
        }

        await service.updateKit(req.params.id, {
            Nombre,
            Descripcion: Descripcion ?? null,
            materiales,
            idTrabajadorCtx: req.user?.idTrabajador
        });

        res.json({ message: 'Kit actualizado' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

const remove = async (req, res) => {
    try {
        await service.deleteKit(req.params.id, req.user?.idTrabajador);
        res.json({ message: 'Kit eliminado' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

const addMaterial = async (req, res) => {
    try {
        const { idMaterial, Cantidad, Notas } = req.body ?? {};
        if (!idMaterial) {
            return res.status(400).json({ error: 'El campo idMaterial es requerido' });
        }
        await service.addMaterialToKit(req.params.id, {
            idMaterial,
            Cantidad: Cantidad ?? null,
            Notas: Notas ?? null,
            idTrabajadorCtx: req.user?.idTrabajador
        });
        res.json({ message: 'Material agregado al kit' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

const updateMaterial = async (req, res) => {
    try {
        const { Cantidad, Notas } = req.body ?? {};
        await service.updateMaterialInKit(req.params.id, req.params.idMaterial, {
            Cantidad: Cantidad ?? null,
            Notas: Notas ?? null,
            idTrabajadorCtx: req.user?.idTrabajador
        });
        res.json({ message: 'Material actualizado en el kit' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

const removeMaterial = async (req, res) => {
    try {
        await service.removeMaterialFromKit(req.params.id, req.params.idMaterial, req.user?.idTrabajador);
        res.json({ message: 'Material desvinculado del kit' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

export default { getAll, getById, create, update, remove, addMaterial, updateMaterial, removeMaterial };