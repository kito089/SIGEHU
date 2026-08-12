import service from '../services/Compras.service.js';
import auth from '../middlewares/auth.middleware.js';

// Valida que la fecha de compra no sea anterior al día de hoy (RNF Compras).
// Acepta "YYYY-MM-DD HH:MM[:SS]" (backend) o ISO 8601; devuelve null si es válida.
const validarFechaCompra = (valor) => {
    if (valor == null || String(valor).trim() === '') return null;

    const texto = String(valor).trim().replace('T', ' ');
    const m = /^(\d{4})-(\d{2})-(\d{2})[ ](\d{2}):(\d{2})(?::(\d{2}))?/.exec(texto);
    if (!m) return 'Formato de fecha de compra inválido';

    const [, anio, mes, dia] = m;
    const hoy = new Date();
    const hoyUTC = Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
    const fechaCompraUTC = Date.UTC(+anio, +mes - 1, +dia);

    if (fechaCompraUTC < hoyUTC) {
        return 'La fecha de compra no puede ser anterior a hoy';
    }

    return null;
};

const getAll = async (req, res) => {
    try {
        if (req.user?.rol === 'Trabajador') {
            const compras = await service.getComprasChoferList(req.user?.idTrabajador);
            return res.json(compras);
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

        const errorFecha = validarFechaCompra(req.body?.FechaCompra);
        if (errorFecha) {
            return res.status(400).json({ error: errorFecha });
        }

        await service.createCompra({
            idTrabajador,
            FechaCompra: req.body?.FechaCompra ?? null,
            Notas: Notas ?? null,
            detalles: detalles ?? null,
            idTrabajadorCtx: req.user?.idTrabajador
        });

        res.status(201).json({ message: 'Compra creada' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

const update = async (req, res) => {
    try {
        if (!req.body || Object.keys(req.body).length === 0) {
            return res.status(400).json({ error: 'El cuerpo de la solicitud esta vacio' });
        }

        // Flujo móvil (chofer): la app manda PUT /Compras/:id { estado: 'Surtida' }
        // para marcar la orden como surtida en proveedor. Se valida que el chofer
        // autenticado sea el asignado (misma lógica que marcarRecibida).
        if (req.user?.rol === 'Trabajador' && req.body?.estado) {
            const resultado = await service.marcarRecibida(
                req.params.id,
                req.user?.idTrabajador,
                req.user?.rol
            );

            if (resultado.error === 'not_found') {
                return res.status(404).json({ error: 'Compra no encontrada' });
            }
            if (resultado.error === 'forbidden') {
                return res.status(403).json({ error: 'Solo el chofer asignado puede actualizar esta compra' });
            }
            if (resultado.error === 'already') {
                return res.status(400).json({ error: 'La compra ya fue marcada como surtida' });
            }

            return res.json({ message: 'Compra marcada como surtida en proveedor' });
        }

        const { idTrabajador, Notas, detalles } = req.body;

        if (!idTrabajador) {
            return res.status(400).json({ error: 'El campo idTrabajador es requerido' });
        }

        const errorFecha = validarFechaCompra(req.body?.FechaCompra);
        if (errorFecha) {
            return res.status(400).json({ error: errorFecha });
        }

        const actualizado = await service.updateCompra({
            id: req.params.id,
            idTrabajador,
            FechaCompra: req.body?.FechaCompra ?? null,
            Notas: Notas ?? null,
            detalles: detalles ?? null,
            idTrabajadorCtx: req.user?.idTrabajador
        });

        if (actualizado === null) {
            return res.status(404).json({ error: 'Compra no encontrada' });
        }

        res.json({ message: 'Compra actualizada' });
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
            if (resultado.error === 'empty') {
                return res.status(400).json({ error: resultado.error });
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

const getPendientes = async (req, res) => {
    try {
        if (req.user?.rol === 'Trabajador') {
            return res.status(403).json({ error: 'Solo Propietario puede ver las compras pendientes' });
        }
        const pendientes = await service.getComprasPendientes();
        res.json(pendientes);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

export default { getAll, getById, getPendientes, create, update, getChofer, marcarRecibida, remove };