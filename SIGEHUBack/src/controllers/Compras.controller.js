import service from '../services/Compras.service.js';
import auth from '../middlewares/auth.middleware.js';

const getAll = async (req, res) => {
    try {
        if (req.user?.rol === 'Trabajador') {
            return res.status(403).json({ error: 'Solo Propietario puede ver listado de compras' });
        }
        const compras = await service.getCompras(req.user?.idTrabajador);
        res.json(compras);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

const getById = async (req, res) => {
    try {
        if (req.user?.rol === 'Trabajador') {
            return res.status(403).json({ error: 'Solo Propietario puede ver detalles de compras' });
        }
        const compra = await service.getCompraById(req.params.id);
        if (!compra) {
            return res.status(404).json({ error: 'Compra no encontrada' });
        }
        res.json(compra);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

const create = async (req, res) => {
    try {
        if (!req.body || Object.keys(req.body).length === 0) {
            return res.status(400).json({ error: 'El cuerpo de la solicitud esta vacio' });
        }

        const { idTrabajador, Notas, detalles } = req.body;

        if (!idTrabajador) {
            return res.status(400).json({ error: 'El campo idTrabajador es requerido' });
        }

        await service.createCompra({
            idTrabajador,
            Notas: Notas ?? null,
            detalles: detalles ?? null,
            idTrabajadorCtx: req.user?.idTrabajador
        });

        res.status(201).json({ message: 'Compra creada' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

const getChofer = async (req, res) => {
    try {
        if (req.user?.rol === 'Trabajador') {
            const asignada = await service.esChoferAsignado(req.params.id, req.user?.idTrabajador);
            if (!asignada) {
                return res.status(403).json({ error: 'Solo el chofer asignado puede ver esta compra' });
            }
        }

        const compra = await service.getCompraChofer(req.params.id);
        if (!compra) {
            return res.status(404).json({ error: 'Compra no encontrada' });
        }
        res.json(compra);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

const marcarRecibida = async (req, res) => {
    try {
        const resultado = await service.marcarRecibida(
            req.params.id,
            req.user?.idTrabajador,
            req.user?.rol
        );

        if (resultado.error === 'not_found') {
            return res.status(404).json({ error: 'Compra no encontrada' });
        }
        if (resultado.error === 'forbidden') {
            return res.status(403).json({ error: 'Solo el chofer asignado puede marcar la compra como recibida' });
        }
        if (resultado.error === 'already') {
            return res.status(400).json({ error: 'La compra ya fue marcada como recibida' });
        }

        res.json({ message: 'Compra marcada como recibida' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

const remove = async (req, res) => {
    try {
        await service.deleteCompra(req.params.id, req.user?.idTrabajador);
        res.json({ message: 'Compra desactivada' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

export default { getAll, getById, create, getChofer, marcarRecibida, remove };