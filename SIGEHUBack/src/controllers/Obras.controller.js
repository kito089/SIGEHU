import service from "../services/Obras.service.js";
import notificaciones from "../services/Notificaciones.service.js";

// GET /obras
const getAll = async (req, res) => {
    try {
        const obras = await service.getObras(
            req.user?.rol,
            req.user?.idTrabajador,
            req.query.search
        );
        res.json(obras);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// GET /obras/:id
const getById = async (req, res) => {
    try {
        const obra = await service.getObraById(req.params.id);
        if (!obra) {
            return res.status(404).json({ error: "Obra no encontrada" });
        }
        res.json(obra);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// GET /obras/detalle/:id (ruta especifica antes de /:id)
const getDetalle = async (req, res) => {
    try {
        const obra = await service.getDetalleObra(req.params.id);
        if (!obra) {
            return res.status(404).json({ error: "Obra no encontrada" });
        }
        res.json(obra);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// GET /obras/movil/:id (ruta especifica antes de /:id)
// Detalle seguro para las vistas móviles de trabajador. Reutiliza la whitelist
// de permisos granulares existente y jamás expone RFC/fiscales (P0.2).
const getDetalleMovil = async (req, res) => {
    try {
        const obra = await service.getDetalleTrabajador(
            req.params.id,
            req.user?.idTrabajador,
            req.user?.rol
        );

        if (!obra) {
            return res.status(404).json({ error: "Obra no encontrada" });
        }
        if (obra.forbidden) {
            return res.status(403).json({ error: "No tienes acceso a esta obra" });
        }

        res.json(obra);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// POST /obras
const create = async (req, res) => {
    try {
        if (!req.body || Object.keys(req.body).length === 0) {
            return res.status(400).json({ error: "El cuerpo de la solicitud está vacío" });
        }

        const { idCliente, Nombre, Direccion, idTrabajo, FechaInicio, Ancho, Alto, Profundidad } = req.body;

        const datos = { idCliente, Nombre };
        const faltantes = Object.entries(datos)
            .filter(([_, valor]) => valor == null || valor === '')
            .map(([clave]) => clave);

        if (faltantes.length > 0) {
            return res.status(400).json({
                error: `Faltan campos requeridos: ${faltantes.join(', ')}`
            });
        }

        const nuevoId = await service.createObra({
            idCliente,
            Nombre,
            Direccion,
            idTrabajo: idTrabajo ?? null,
            FechaInicio: FechaInicio ?? null,
            Ancho: Ancho ?? null,
            Alto: Alto ?? null,
            Profundidad: Profundidad ?? null,
            idTrabajadorCtx: req.user?.idTrabajador
        });

        res.status(201).json({ message: "Obra creada", idObra: nuevoId });

    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// PUT /obras/:id
const update = async (req, res) => {
    try {
        if (!req.body || Object.keys(req.body).length === 0) {
            return res.status(400).json({ error: "El cuerpo de la solicitud está vacío" });
        }

        const { Nombre, Direccion, Ancho, Alto, Profundidad, estado, nota, observaciones } = req.body;

        // El formulario de levantamientos envía medidas en minúscula y la nota
        // como `observaciones`; fabricación/instalación envían `nota`.
        const ancho = Ancho ?? req.body.ancho ?? null;
        const alto = Alto ?? req.body.alto ?? null;
        const profundidad = Profundidad ?? req.body.profundidad ?? null;
        const notaAvance = nota ?? observaciones ?? null;

        // Flujo móvil (doble validación): el trabajador marca una etapa como
        // "Pendiente de Validación" o la finaliza ("X Finalizado" → queda en
        // "Pendiente de aceptación") y opcionalmente aporta medidas + nota.
        // Nombre es opcional en ese flujo (el backend no debe exigirlo).
        if (estado) {
            const resultado = await service.completarEtapa(req.params.id, {
                estado,
                Nombre: Nombre ?? null,
                Direccion: Direccion ?? null,
                Ancho: ancho,
                Alto: alto,
                Profundidad: profundidad,
                nota: notaAvance,
                idTrabajadorCtx: req.user?.idTrabajador,
                nombreTrabajador: req.user?.nombre ?? 'asignado'
            });

            if (resultado === null) {
                return res.status(404).json({ error: "Obra no encontrada" });
            }

            if (resultado.error) {
                return res.status(400).json({ error: resultado.error });
            }

            // Finalización de etapa: avisa por SSE a todos los propietarios.
            if (resultado.notificacion) {
                await notificaciones.notifyOwners(
                    resultado.notificacion.mensaje,
                    resultado.notificacion.tipo
                ).catch((e) => console.error('No se pudo notificar la finalización:', e.message));
            }

            return res.json({ message: "Obra actualizada" });
        }

        const datos = { Nombre };
        const faltantes = Object.entries(datos)
            .filter(([_, valor]) => valor == null || valor === '')
            .map(([clave]) => clave);

        if (faltantes.length > 0) {
            return res.status(400).json({
                error: `Faltan campos requeridos: ${faltantes.join(', ')}`
            });
        }

        const actualizado = await service.updateObra(req.params.id, {
            Nombre,
            Direccion,
            Ancho: ancho,
            Alto: alto,
            Profundidad: profundidad,
            idTrabajadorCtx: req.user?.idTrabajador
        });

        if (!actualizado) {
            return res.status(404).json({ error: "Obra no encontrada" });
        }

        res.json({ message: "Obra actualizada" });

    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// DELETE /obras/:id
const remove = async (req, res) => {
    try {
        const eliminado = await service.deleteObra(req.params.id, req.user?.idTrabajador);

        if (!eliminado) {
            return res.status(404).json({ error: "Obra no encontrada o ya estaba inactiva" });
        }

        res.json({ message: "Obra eliminada" });

    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// PATCH /obras/:id/estado
const cambiarEstado = async (req, res) => {
    try {
        const { idEstado, estado } = req.body;

        let destino = idEstado;
        if (!destino && estado) {
            destino = service.resolverEstadoObra(estado);
        }

        if (!destino) {
            return res.status(400).json({ error: "idEstado (o estado por nombre) es requerido" });
        }

        const resultado = await service.cambiarEstado(
            req.params.id,
            destino,
            req.user?.idTrabajador
        );

        if (!resultado) {
            return res.status(404).json({ error: "Obra no encontrada" });
        }

        if (resultado.error) {
            return res.status(400).json({ error: resultado.error });
        }

        if (Number(resultado.OEXITO) === 0) {
            return res.status(400).json({ error: resultado.OMENSAJE || "Transición no permitida" });
        }

        res.json({ message: "Estado actualizado", resultado });

    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// GET /obras/estados
const getEstados = async (_req, res) => {
    try {
        const estados = await service.getEstados();
        res.json(estados);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// PATCH /obras/:id/fechas-etapas
// Actualiza solo las fechas por etapa enviadas (Levantamiento / Fabricación /
// Instalación). Solo Propietario (la ruta está protegida en Obras.route.js).
const cambiarFechasEtapas = async (req, res) => {
    try {
        const { FechaLevantamiento, FechaFabricacion, FechaInstalacion } = req.body ?? {};

        const alguno =
            FechaLevantamiento !== undefined ||
            FechaFabricacion !== undefined ||
            FechaInstalacion !== undefined;

        if (!alguno) {
            return res.status(400).json({
                error: "Se requiere al menos una fecha (FechaLevantamiento, FechaFabricacion o FechaInstalacion)"
            });
        }

        const actualizado = await service.actualizarFechasEtapas(req.params.id, {
            FechaLevantamiento,
            FechaFabricacion,
            FechaInstalacion,
            idTrabajadorCtx: req.user?.idTrabajador
        });

        if (actualizado === null) {
            return res.status(404).json({ error: "Obra no encontrada o inactiva" });
        }

        res.json({ message: "Fechas de etapa actualizadas" });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

export default { getAll, getDetalle, getDetalleMovil, create, update, remove, cambiarEstado, getById, getEstados, cambiarFechasEtapas };