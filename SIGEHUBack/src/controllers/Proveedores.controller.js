import service from '../services/Materiales.service.js';

// GET /Proveedores/
// Obtiene todos los Proveedores
const findProveedores = async (_req, res) => {
    try {
        const Proveedores = await service.getProveedores();
        res.json(Proveedores);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// GET /Proveedores/:id
// No necesario, findProveedores devuelve los datos necesarios, procesar en front

// POST /Proveedores
// Crea un Proveedor
const create = async (req, res) => {
    try {
        if (!req.body || Object.keys(req.body).length === 0) {
            return res.status(400).json({ error: 'El cuerpo de la solicitud está vacío' });
        }

        const { Nombre, Direccion, Telefono, Correo, Notas } = req.body;

        const datos = { Nombre };
        const opcionales = [ 'Direccion', 'Telefono', 'Correo', 'Notas'];

        const faltantes = Object.entries(datos)
            .filter(([clave, valor]) => !opcionales.includes(clave) && (valor == null || valor === ''))
            .map(([clave]) => clave);

        if (faltantes.length > 0) {
            return res.status(400).json({
                error: `Faltan campos requeridos: ${faltantes.join(', ')}`
            });
        }
        
        await service.createProveedor({ Nombre, Direccion: Direccion ?? null, Telefono: Telefono ?? null, Correo: Correo ?? null, Notas: Notas ?? null });

        res.status(201).json({ message: 'Proveedor creado' });

    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// PUT /Proveedores/:id
// Actualiza la información del Proveedor y opcionalmente la contraseña.
const update = async (req, res) => {
    try {
        if (!req.body || Object.keys(req.body).length === 0) {
            return res.status(400).json({ error: 'El cuerpo de la solicitud está vacío' });
        }

        const { Nombre, Direccion, Telefono, Correo, Notas } = req.body;

        const datos = { Nombre };
        const opcionales = [ 'Direccion', 'Telefono', 'Correo', 'Notas'];

        const faltantes = Object.entries(datos)
            .filter(([clave, valor]) => !opcionales.includes(clave) && (valor == null || valor === ''))
            .map(([clave]) => clave);

        if (faltantes.length > 0) {
            return res.status(400).json({
                error: `Faltan campos requeridos: ${faltantes.join(', ')}`
            });
        }
        
        const affected = await service.updateProveedor(
            req.params.id,
            {
                Nombre, Direccion: Direccion ?? null, Telefono: Telefono ?? null, Correo: Correo ?? null, Notas: Notas ?? null
            }
        );

        if (!affected) {
            return res.status(404).json({ error: 'Proveedor no encontrado' });
        }

        res.json({ message: 'Proveedor actualizado' });

    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// DELETE /Proveedores/:id (soft delete)
// Desactiva el Proveedor sin eliminar su registro.
const remove = async (req, res) => {
    try {
        const affected = await service.deleteProveedor(req.params.id);

        if (!affected) {
            return res.status(404).json({
                error: 'Proveedor no encontrado'
            });
        }

        res.json({ message: 'Proveedor desactivado' });

    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// INSERT /Proveedores/:idP/:idM
// Asigna un material a un proveedor.
const asignMaterial = async (req, res) => {
    try {
        const { idP, idM } = req.params;
        const { precio, notas } = req.body;

        const affected = await service.vincularMaterial(idP, idM, precio, notas );

        if (!affected){
            res.json({ message: 'Material no asignado' });
        }
        res.status(201).json({ message: 'Material asignado' });

    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// UPDATE /Proveedores/:idP/:idM
// Actualiza un material de un proveedor.
const updateMaterial = async (req, res) => {
    try {  
        const { idP, idM } = req.params;
        const { precio, notas } = req.body;

        const affected = await service.updateMaterial(idP, idM, { precio, notas })

        if (!affected){
            res.json({ message: 'Material no asignado' });
        }
        res.json({ message: 'Proveedor actualizado' });

    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// DELETE /Proveedores/:idP/:idM
// Desactiva un Material de su Proveedor.
const deleteMaterial = async (req, res) => {
    try {
        const { idP, idM } = req.params;

        const affected = await service.desvincularMaterial(idP, idM)

        if (!affected){
            res.json({ message: 'Material no asignado' });
        }
        res.json({ message: 'Proveedor actualizado' });

    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

export default {
    findProveedores,
    create,
    update,
    remove,
    asignMaterial,
    updateMaterial,
    deleteMaterial
};