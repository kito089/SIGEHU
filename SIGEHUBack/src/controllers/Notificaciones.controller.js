// =============================================================================
// NOTIFICACIONES — Controlador.
// -----------------------------------------------------------------------------
// La identidad del usuario proviene SIEMPRE de req.user (JWT verificado por el
// middleware global), nunca de parámetros del cliente. Los eventos SSE se
// publican al hub junto con el idTrabajador autenticado.
// =============================================================================

import service from "../services/Notificaciones.service.js";
import sse from "../services/sse.hub.js";

const MSG_MAX = 500;

const list = async (req, res) => {
    try {
        const items = await service.list(Number(req.user.idTrabajador));
        res.json(items);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// GET /Notificaciones/stream — conexión SSE persistente.
const stream = (req, res) => {
    sse.subscribe(Number(req.user.idTrabajador), res);
};

const create = async (req, res) => {
    try {
        const { tipo = "info", mensaje } = req.body ?? {};
        const type = String(tipo).toLowerCase();
        const msg = typeof mensaje === "string" ? mensaje.trim() : "";

        if (!msg) return res.status(400).json({ error: "El mensaje es requerido" });
        if (!service.isValidType(type)) return res.status(400).json({ error: "Tipo de notificación inválido" });
        if (msg.length > MSG_MAX) return res.status(400).json({ error: `El mensaje supera ${MSG_MAX} caracteres` });

        const idTrabajador = Number(req.user.idTrabajador);

        // 1) Persistir (fuente de verdad) y 2) emitir a TODAS las conexiones del
        // usuario, incluida la sesión que originó la creación (sincronización PC ↔
        // Android ↔ Electron).
        const creada = await service.create(idTrabajador, { tipo: type, mensaje: msg });
        sse.publish(idTrabajador, "notification.created", creada);

        res.status(201).json(creada);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

const remove = async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isFinite(id)) return res.status(400).json({ error: "ID inválido" });

        const idTrabajador = Number(req.user.idTrabajador);

        const eliminada = await service.remove(idTrabajador, id);
        if (eliminada == null) {
            return res.status(404).json({ error: "Notificación no encontrada" });
        }

        sse.publish(idTrabajador, "notification.deleted", { id: eliminada });
        res.json({ ok: true, id: eliminada });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

const removeAll = async (req, res) => {
    try {
        const idTrabajador = Number(req.user.idTrabajador);

        await service.clearAll(idTrabajador);
        sse.publish(idTrabajador, "notification.deleted_all", {});

        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

export default { list, stream, create, remove, removeAll };