import svc from '../services/Clientes.service.js';

const getAll = async (_req, res) => {
    try {
        const data = await svc.getClientes();
        res.json(data);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

const getStructure = async (_req, res) => {
    try {
        const data = await svc.getStructure();
        res.json(data);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

const getById = async (req, res) => {
    try {
        const cliente = await svc.getClienteById(req.params.id);
        if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado' });
        res.json(cliente);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

const create = async (req, res) => {
    try {
        const { Nombre, Descripcion, Precio, idCategoria } = req.body;
        if (!Nombre || !Precio || !idCategoria)
            return res.status(400).json({ error: 'Nombre, Precio e idCategoria son requeridos' });

        const id = await svc.createPlatillo({ Nombre, Descripcion, Precio, idCategoria });

        sendEventToAll('nuevo_platillo', { Nombre, Descripcion, Precio, idCategoria, idPlatillo: id });

        res.status(201).json({ message: 'Platillo creado', idPlatillo: id });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// PUT /platillos/:id
// Actualiza los datos de un platillo existente.
const update = async (req, res) => {
    try {
        const { Nombre, Descripcion, Precio, idCategoria } = req.body;
        if (!Nombre || !Precio || !idCategoria)
            return res.status(400).json({ error: 'Nombre, Precio e idCategoria son requeridos' });

        const ok = await svc.updatePlatillo(req.params.id, { Nombre, Descripcion, Precio, idCategoria });
        if (!ok) return res.status(404).json({ error: 'Platillo no encontrado' });

        sendEventToAll('platillo_actualizado', { id: req.params.id, Nombre, Descripcion, Precio, idCategoria });

        res.json({ message: 'Platillo actualizado' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// DELETE /platillos/:id
// Desactiva un platillo del catálogo.
const remove = async (req, res) => {
    try {
        const ok = await svc.deletePlatillo(req.params.id);
        if (!ok) return res.status(404).json({ error: 'Platillo no encontrado' });

        sendEventToAll('platillo_eliminado', { id: req.params.id });

        res.json({ message: 'Platillo desactivado' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// POST /Platillos/:id/imagen
// Recibe el archivo ya guardado por multer y actualiza la columna Imagen en BD.
// El nombre del archivo es {id}.{ext} — definido en el storage de multer.
const uploadImagen = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No se recibió ningún archivo' });
        }

        const { id } = req.params;
        const filename = req.file.filename; // ej. "5.jpg"

        await svc.updateImagen(id, filename);

        sendEventToAll('platillo_actualizado', { id, imagen: filename });

        res.json({ message: 'Imagen guardada', imagen: filename });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

export default {
    getAll,
    getCompleto,
    getStructure,
    getMenu,
    getById,
    create,
    update,
    remove,
    uploadImagen
};