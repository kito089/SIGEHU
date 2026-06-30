import service from "../services/ObrasTrabajadores.service.js";

// POST /obras/:idObra/trabajadores
const asignar = async (req, res) => {
    try {
        const { idTrabajador, idEstadoObra } = req.body;

        if (!idTrabajador || !idEstadoObra) {
            return res.status(400).json({ error: "idTrabajador e idEstadoObra son requeridos" });
        }

        const idDetalleAsignacion = await service.asignarTrabajador({
            idObra: req.params.idObra,
            idTrabajador,
            idEstadoObra
        });

        res.status(201).json({ message: "Trabajador asignado a la obra", idDetalleAsignacion });

    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// GET /obras/:idObra/trabajadores
const getByObra = async (req, res) => {
    try {
        const trabajadores = await service.getTrabajadoresByObra(req.params.idObra);
        res.json(trabajadores);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// DELETE /obras/trabajadores/:idDetalleAsignacion
const quitar = async (req, res) => {
    try {
        const eliminado = await service.quitarTrabajador(req.params.idDetalleAsignacion);

        if (!eliminado) {
            return res.status(404).json({ error: "Asignación no encontrada" });
        }

        res.json({ message: "Trabajador removido de la obra" });

    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// POST /obras/:idObra/trabajadores/:idTrabajador/permisos
const asignarPermisos = async (req, res) => {
    try {
        const { camposPermiso } = req.body; // array de IDs

        if (!Array.isArray(camposPermiso) || camposPermiso.length === 0) {
            return res.status(400).json({ error: "camposPermiso debe ser un array con al menos un elemento" });
        }

        const resultados = await service.asignarPermisos({
            idObra: req.params.idObra,
            idTrabajador: req.params.idTrabajador,
            camposPermiso
        });

        res.status(201).json({ message: "Permisos procesados", resultados });

    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// GET /obras/:idObra/trabajadores/:idTrabajador/permisos
const getPermisos = async (req, res) => {
    try {
        const permisos = await service.getPermisos(req.params.idObra, req.params.idTrabajador);
        res.json(permisos);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// DELETE /obras/:idObra/trabajadores/:idTrabajador/permisos
const revocarPermisos = async (req, res) => {
    try {
        const { camposPermiso } = req.body;

        if (!Array.isArray(camposPermiso) || camposPermiso.length === 0) {
            return res.status(400).json({ error: "camposPermiso debe ser un array con al menos un elemento" });
        }

        await service.revocarPermisos({
            idObra: req.params.idObra,
            idTrabajador: req.params.idTrabajador,
            camposPermiso
        });

        res.json({ message: "Permisos revocados" });

    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// POST /obras/:idObra/pagos
const registrarPago = async (req, res) => {
    try {
        const { idTipoPago, idTrabajador, idEstadoObra, monto, idFormaPago } = req.body;

        const datos = { idTipoPago, idTrabajador, idEstadoObra, monto, idFormaPago };
        const faltantes = Object.entries(datos)
            .filter(([_, valor]) => valor == null || valor === "")
            .map(([clave]) => clave);

        if (faltantes.length > 0) {
            return res.status(400).json({
                error: `Faltan campos requeridos: ${faltantes.join(", ")}`
            });
        }

        const idDetallePago = await service.registrarPago({
            idObra: req.params.idObra,
            idTipoPago,
            idTrabajador,
            idEstadoObra,
            monto,
            idFormaPago
        });

        res.status(201).json({ message: "Pago registrado", idDetallePago });

    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// GET /obras/:idObra/pagos
const getPagos = async (req, res) => {
    try {
        const pagos = await service.getPagosByObra(req.params.idObra);
        res.json(pagos);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

export default {
    asignar,
    getByObra,
    quitar,
    asignarPermisos,
    getPermisos,
    revocarPermisos,
    registrarPago,
    getPagos
};