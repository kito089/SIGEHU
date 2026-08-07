import service from '../services/Clientes.service.js';

// GET /RegimenesFiscales/
// Obtiene todos los Regimentes Fiscales
const findRegimenesFiscales = async (_req, res) => {
    try {
        const Regimenes = await service.getRegimenesFiscales();
        res.json(Regimenes);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// GET /UsosCFDI/
// Obtiene todos los Usos del CFDI
const findUsosCFDI = async (_req, res) => {
    try {
        const Usos = await service.getUsosCFDI();
        res.json(Usos);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// GET /Clientes/
// Obtiene todos los Clientes (opcional: ?search=)
const findClientes = async (req, res) => {
    try {
        const Clientes = await service.getClientes({
            search: req.query.search,
            activo: req.query.activo,
            fiscal: req.query.fiscal
        });
        res.json(Clientes);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// GET /Clientes/:id
// Obtiene los datos de un Cliente específico.
const findById = async (req, res) => {
    try {
        const Cliente = await service.getClienteById(req.params.id);
        if (!Cliente) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }
        res.json(Cliente);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// POST /Clientes
// Crea un Cliente
const create = async (req, res) => {
    try {
        if (!req.body || Object.keys(req.body).length === 0) {
            return res.status(400).json({ error: 'El cuerpo de la solicitud esta vacio' });
        }

        const { Nombre, RazonSocial, Direccion, RFC, Telefono, Correo, idRegimenFiscal, CodigoPostal,
                idUsoCFDI, Observaciones, contactos } = req.body;

        await service.createCliente({
            Nombre: Nombre ?? null, RazonSocial: RazonSocial ?? null,
            Direccion: Direccion ?? null, RFC: RFC ?? null,
            Telefono: Telefono ?? null, Correo: Correo ?? null,
            idRegimenFiscal: idRegimenFiscal ?? null,
            CodigoPostal: CodigoPostal ?? null, idUsoCFDI: idUsoCFDI ?? null,
            Observaciones: Observaciones ?? null,
            contactos: contactos ?? null,
            tipo: req.body.tipo ?? null,
            idTrabajadorCtx: req.user?.idTrabajador
        });

        res.status(201).json({ message: 'Cliente creado' });

    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// PUT /Clientes/:id
// Actualiza la información del Cliente y opcionalmente la contraseña.
const update = async (req, res) => {
    try {
        if (!req.body || Object.keys(req.body).length === 0) {
            return res.status(400).json({ error: 'El cuerpo de la solicitud esta vacio' });
        }

        const { Nombre, RazonSocial, Direccion, RFC, Telefono, Correo, idRegimenFiscal, CodigoPostal,
                idUsoCFDI, Observaciones } = req.body;

        const affected = await service.updateCliente(
            req.params.id,
            {
                Nombre: Nombre ?? null, RazonSocial: RazonSocial ?? null,
                Direccion: Direccion ?? null, RFC: RFC ?? null, Telefono: Telefono ?? null,
                Correo: Correo ?? null, idRegimenFiscal: idRegimenFiscal ?? null,
                CodigoPostal: CodigoPostal ?? null, idUsoCFDI: idUsoCFDI ?? null,
                Observaciones: Observaciones ?? null,
                contactos: req.body.contactos ?? null,
                tipo: req.body.tipo ?? null,
                idTrabajadorCtx: req.user?.idTrabajador
            }
        );

        if (!affected) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }

        res.json({ message: 'Cliente actualizado' });

    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// GET /Clientes/:id/obras
// Obtiene todas las obras activas de un Cliente.
const findObras = async (req, res) => {
    try {
        const Obras = await service.getObrasByCliente(req.params.id);
        res.json(Obras);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// PATCH /Clientes/:id/estado
// Activa o desactiva (soft delete) un Cliente.
const cambiarEstado = async (req, res) => {
    try {
        const { activo } = req.body ?? {};

        if (typeof activo !== 'boolean') {
            return res.status(400).json({ error: 'El campo activo (boolean) es requerido' });
        }

        const affected = activo
            ? await service.reactivarCliente(req.params.id, req.user?.idTrabajador)
            : await service.deleteCliente(req.params.id, req.user?.idTrabajador);

        if (!affected) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }

        res.json({ message: activo ? 'Cliente restablecido' : 'Cliente eliminado' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// DELETE /Clientes/:id (soft delete)
// Desactiva el Cliente sin eliminar su registro.
const remove = async (req, res) => {
    try {
        const affected = await service.deleteCliente(req.params.id, req.user?.idTrabajador);

        if (!affected) {
            return res.status(404).json({
                error: 'Cliente no encontrado'
            });
        }

        res.json({ message: 'Cliente eliminado correctamente' });

    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

export default {
    findRegimenesFiscales,
    findUsosCFDI,
    findClientes,
    findById,
    findObras,
    create,
    update,
    remove,
    cambiarEstado
};