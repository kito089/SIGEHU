// =============================================================================
// HUB SSE — Notificaciones multidispositivo.
// -----------------------------------------------------------------------------
// Asocia cada conexión SSE al TRABAJADOR autenticado (idTrabajador), NO a
// dispositivo/IP/instancia. Un mismo usuario puede mantener varias conexiones
// simultáneas (PC, Android, Electron); al publicar un evento se escribe en TODAS
// las conexiones vivas de ese usuario.
//
//   publish(idTrabajador, 'notification.created', notificacion)
//                     → PC + Android + Electron del mismo usuario
// =============================================================================

// idTrabajador (number) -> Set<http.ServerResponse>
const connections = new Map();

const HEARTBEAT_MS = 25000;

function subscribe(idTrabajador, res) {
    res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no"
    });
    // Reintento por defecto del cliente (EventSource); el cliente propio lo ignora
    // porque gestiona su reconexión manualmente con backoff.
    res.write("retry: 5000\n\n");
    res.flushHeaders();

    let set = connections.get(idTrabajador);
    if (!set) {
        set = new Set();
        connections.set(idTrabajador, set);
    }
    set.add(res);

    // Heartbeat: mantiene viva la conexión a través de proxies/túneles.
    const heartbeat = setInterval(() => {
        if (!res.writableEnded) {
            try {
                res.write(": ping\n\n");
            } catch {
                cleanup();
            }
        }
    }, HEARTBEAT_MS);

    function cleanup() {
        clearInterval(heartbeat);
        const s = connections.get(idTrabajador);
        if (s) {
            s.delete(res);
            if (s.size === 0) {
                connections.delete(idTrabajador);
            }
        }
    }

    res.on("close", cleanup);
    res.on("error", cleanup);
    res.on("finish", cleanup);
}

function publish(idTrabajador, event, data) {
    const set = connections.get(idTrabajador);
    if (!set || set.size === 0) return;

    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

    for (const res of set) {
        if (!res.writableEnded) {
            try {
                res.write(payload);
            } catch {
                // Una conexión rota se limpia por su propio evento 'close'.
            }
        }
    }
}

export default { subscribe, publish };