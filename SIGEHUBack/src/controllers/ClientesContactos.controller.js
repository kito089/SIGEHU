import service from "../services/ClientesContactos.service.js";

// POST /Clientes/:idCliente/contactos
const create = async (req, res) => {
    try {
        const { idCliente, nombre, telefono, correo, observaciones } = req.body;

        if (!idCliente || !nombre) {
            return res.status(400).json({
                error: "idCliente y nombre son requeridos"
            });
        }

        const idContacto = await service.createContacto({
            idCliente,
            nombre,
            telefono: telefono ?? null,
            correo: correo ?? null,
            observaciones: req.body.observaciones ?? null
        });

        res.status(201).json({ message: "Contacto creado", idContacto });

    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// GET /Clientes/:idCliente/contactos
const getByCliente = async (req, res) => {
    try {
        const contactos = await service.getContactosByCliente(req.params.idCliente);
        res.json(contactos);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// PUT /contactos/:id
const update = async (req, res) => {
    try {
        const { nombre, telefono, correo, observaciones } = req.body;

        if (!nombre) {
            return res.status(400).json({ error: "El campo nombre es requerido" });
        }

        const actualizado = await service.updateContacto(req.params.id, { nombre, telefono: telefono ?? null, correo: correo ?? null, observaciones: observaciones ?? null });

        if (!actualizado) {
            return res.status(404).json({ error: "Contacto no encontrado" });
        }

        res.json({ message: "Contacto actualizado" });

    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// DELETE /contactos/:id
const remove = async (req, res) => {
    try {
        const eliminado = await service.deleteContacto(req.params.id);

        if (!eliminado) {
            return res.status(404).json({ error: "Contacto no encontrado" });
        }

        res.json({ message: "Contacto eliminado" });

    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

export default { create, getByCliente, update, remove };