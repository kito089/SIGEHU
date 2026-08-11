import service from "../services/Garantias.service.js";

// Mapa de estados de garantía por nombre amigable → idEstadoGarantia.
// El catálogo EstadosGarantia solo tiene: Reportada=1, En atencion=2, Resuelta=3.
const ESTADOS_GARANTIA = {
    'reportada': 1,
    'en atencion': 2,
    'en atención': 2,
    'resuelta': 3
};

const normalizar = (texto) => String(texto || '').toLowerCase().trim();

const resolverEstadoGarantia = (nombre) => ESTADOS_GARANTIA[normalizar(nombre)] ?? null;

// GET /Garantias
const getAll = async (req, res) => {
    try {
        const Garantias = await service.getGarantias();
        res.json(Garantias);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// GET /Garantias/:id
const getById = async (req, res) => {
    try {
        const Garantia = await service.getGarantiaById(req.params.id);
        if (!Garantia) {
            return res.status(404).json({ error: "Garantia no encontrada" });
        }
        res.json(Garantia);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// POST /Garantias
const create = async (req, res) => {
    try {
        if (!req.body || Object.keys(req.body).length === 0) {
            return res.status(400).json({ error: "El cuerpo de la solicitud está vacío" });
        }

        const { idObra, obra, descripcion, estado } = req.body;

        // La app móvil envía `obra` como texto ("OB-0014 · Portón..."); el
        // backend también acepta `idObra` directo (formulario Web).
        let idObraResuelto = idObra;
        if (!idObraResuelto && obra) {
            const m = /OB-(\d+)/i.exec(String(obra));
            if (m) {
                idObraResuelto = Number(m[1]);
            }
        }

        if (!idObraResuelto) {
            return res.status(400).json({
                error: "Faltan campos requeridos: idObra (u obra)"
            });
        }

        const nuevoId = await service.createGarantia({
            idObra: idObraResuelto,
            descripcion: descripcion ?? null,
            idTrabajador: req.body.idTrabajador ?? req.user?.idTrabajador ?? 1,
            estado: estado ?? null,
            idTrabajadorCtx: req.user?.idTrabajador
        });

        res.status(201).json({ message: "Garantia creada", idGarantia: nuevoId });

    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// PUT /Garantias/:id
const update = async (req, res) => {
    try {
        if (!req.body || Object.keys(req.body).length === 0) {
            return res.status(400).json({ error: "El cuerpo de la solicitud está vacío" });
        }

        const { descripcion, idEstado, resolucion, accion, estado } = req.body;

        // La app móvil envía `estado` por nombre ("En atencion", "Resuelta") y
        // la acción correctiva en `accion`. El formulario Web envía idEstado.
        let idEstadoFinal = idEstado;
        if (!idEstadoFinal && estado) {
            idEstadoFinal = resolverEstadoGarantia(estado);
        }
        const resolucionFinal = resolucion ?? accion ?? null;

        if (!idEstadoFinal) {
            return res.status(400).json({
                error: "idEstado (o estado por nombre) es requerido"
            });
        }

        const actualizado = await service.updateGarantia(req.params.id, {
            descripcion: descripcion ?? null,
            idEstado: idEstadoFinal,
            resolucion: resolucionFinal,
            idTrabajadorCtx: req.body.idTrabajadorCtx ?? req.user?.idTrabajador ?? 1
        });

        if (!actualizado) {
            return res.status(404).json({ error: "Garantia no encontrada" });
        }

        res.json({ message: "Garantia actualizada" });

    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// DELETE /Garantias/:id
const remove = async (req, res) => {
    try {
        const eliminado = await service.deleteGarantia(req.params.id);

        if (!eliminado) {
            return res.status(404).json({ error: "Garantia no encontrada o ya estaba inactiva" });
        }

        res.json({ message: "Garantia eliminada" });

    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

export default { getAll, create, update, remove, getById };