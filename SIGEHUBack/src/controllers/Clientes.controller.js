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
// Obtiene todos los Clientes
const findClientes = async (_req, res) => {
    try {
        const Clientes = await service.getClientes();
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
            return res.status(400).json({ error: 'El cuerpo de la solicitud está vacío' });
        }

        const { NombreCompleto, Telefono, Correo, 
                Direccion, RFC, idRegimenFiscal, CodigoPostal, 
                idUsoCFDI, Observaciones } = req.body;

        const datos = { NombreCompleto, Telefono };
        const opcionales = [ 'Correo', 'Direccion', 'RFC', 'idRegimenFiscal', 
                            'CodigoPostal', 'idUsoCFDI', 'Observaciones'];

        const faltantes = Object.entries(datos)
            .filter(([clave, valor]) => !opcionales.includes(clave) && (valor == null || valor === ''))
            .map(([clave]) => clave);

        if (faltantes.length > 0) {
            return res.status(400).json({
                error: `Faltan campos requeridos: ${faltantes.join(', ')}`
            });
        }
        
        await service.createCliente({ NombreCompleto, Telefono, Correo: Correo ?? null, Direccion: Direccion ?? null, 
                                    RFC: RFC ?? null, idRegimenFiscal: idRegimenFiscal ?? null, CodigoPostal: CodigoPostal ?? null, 
                                    idUsoCFDI: idUsoCFDI ?? null, Observaciones: Observaciones ?? null });

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
            return res.status(400).json({ error: 'El cuerpo de la solicitud está vacío' });
        }

        const { NombreCompleto, Telefono, Correo, 
                Direccion, RFC, idRegimenFiscal, CodigoPostal, 
                idUsoCFDI, Observaciones } = req.body;

        const datos = { NombreCompleto, Telefono };
        const opcionales = [ 'Correo', 'Direccion', 'RFC', 'idRegimenFiscal', 
                            'CodigoPostal', 'idUsoCFDI', 'Observaciones'];

        const faltantes = Object.entries(datos)
            .filter(([clave, valor]) => !opcionales.includes(clave) && (valor == null || valor === ''))
            .map(([clave]) => clave);

        if (faltantes.length > 0) {
            return res.status(400).json({
                error: `Faltan campos requeridos: ${faltantes.join(', ')}`
            });
        }
        
        const affected = await service.updateCliente(
            req.params.id,
            {
                NombreCompleto, Telefono, Correo: Correo ?? null, Direccion: Direccion ?? null, 
                RFC: RFC ?? null, idRegimenFiscal: idRegimenFiscal ?? null, CodigoPostal: CodigoPostal ?? null, 
                idUsoCFDI: idUsoCFDI ?? null, Observaciones: Observaciones ?? null
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

// DELETE /Clientes/:id (soft delete)
// Desactiva el Cliente sin eliminar su registro.
const remove = async (req, res) => {
    try {
        const affected = await service.deleteCliente(req.params.id);

        if (!affected) {
            return res.status(404).json({
                error: 'Cliente no encontrado'
            });
        }

        res.json({ message: 'Cliente desactivado' });

    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

export default {
    findRegimenesFiscales,
    findUsosCFDI,
    findClientes,
    findById,
    create,
    update,
    remove
};