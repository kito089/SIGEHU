// =============================================================================
// PRUEBA DE INTEGRACIÓN — Notificaciones por cuenta + SSE multidispositivo.
// -----------------------------------------------------------------------------
// Requiere el backend arrancado:  node src/app.js  (http://localhost:3000)
// Uso (desde SIGEHUBack):          node test/sse-notificaciones.test.js
//
// Escenarios:
//   Usuario 1 (kito089)
//     ├── conexión SSE A   (simula PC)
//     └── conexión SSE B   (simula Android)
//   1. Crear notificación desde A  → A y B reciben notification.created.
//   2. Eliminar individual desde A → A y B reciben notification.deleted.
//   3. Crear varias + "eliminar todas" → A y B reciben notification.deleted_all.
//   4. GET /Notificaciones devuelve solo las del usuario autenticado.
//   5. Eliminar un id ajeno/inexistente → 404 (aislamiento por cuenta).
// =============================================================================

const BASE = "http://localhost:3000";

const ASSERT_FAIL = [];
let passCount = 0;

function assert(cond, msg) {
    if (cond) {
        passCount += 1;
        console.log(`  ✅ ${msg}`);
    } else {
        ASSERT_FAIL.push(msg);
        console.error(`  ❌ ${msg}`);
    }
}

async function login() {
    const res = await fetch(`${BASE}/Trabajadores/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Usuario: "kito089", Contra: "123456" })
    });
    if (res.status !== 200) throw new Error(`Login falló (${res.status})`);
    const body = await res.json();
    return body.token;
}

// Abre una conexión SSE con Authorization (fetch-stream, igual que el cliente real).
function openSse(token, label) {
    const controller = new AbortController();
    const events = [];
    const waiters = [];

    async function run() {
        const res = await fetch(`${BASE}/Notificaciones/stream`, {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: "text/event-stream",
                "Cache-Control": "no-cache"
            },
            signal: controller.signal
        });
        if (res.status !== 200) {
            assert(false, `[${label}] SSE HTTP ${res.status}`);
            return;
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            let idx;
            while ((idx = buffer.indexOf("\n\n")) !== -1) {
                const raw = buffer.slice(0, idx);
                buffer = buffer.slice(idx + 2);
                dispatch(raw);
            }
        }
    }

    function dispatch(raw) {
        let event = "message";
        let data = "";
        for (const line of raw.split("\n")) {
            if (line.startsWith("event:")) event = line.slice(6).trim();
            else if (line.startsWith("data:")) data = line.slice(5).trim();
        }
        if (!data) return;
        let payload;
        try { payload = JSON.parse(data); } catch { return; }
        events.push({ event, data: payload });
        for (const w of [...waiters]) {
            if (w.event === event && w.pred(payload)) {
                waiters.splice(waiters.indexOf(w), 1);
                w.resolve(payload);
            }
        }
    }

    function waitFor(event, pred = () => true, timeoutMs = 5000) {
        const existing = events.find(e => e.event === event && pred(e.data));
        if (existing) return Promise.resolve(existing.data);
        return new Promise((resolve, reject) => {
            const w = { event, pred, resolve };
            const t = setTimeout(() => {
                const i = waiters.indexOf(w);
                if (i !== -1) waiters.splice(i, 1);
                reject(new Error(`[${label}] timeout esperando ${event}`));
            }, timeoutMs);
            w.resolve = (v) => { clearTimeout(t); resolve(v); };
            waiters.push(w);
        });
    }

    run().catch(() => { /* conexión cerrada */ });

    return {
        label,
        events,
        waitFor,
        close() {
            controller.abort();
        },
        connected: true
    };
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function main() {
    console.log("── Notificaciones SSE multidispositivo ──\n");

    const token = await login();

    // Limpieza previa para un test determinista.
    await fetch(`${BASE}/Notificaciones`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
    });

    const A = openSse(token, "A-PC");
    const B = openSse(token, "B-Android");

    // Espera a que ambas conexiones estén registradas en el hub.
    await sleep(800);

    // ── 1) Crear desde A → ambos deben recibir ---------------------------------
    const c1 = await fetch(`${BASE}/Notificaciones`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ tipo: "info", mensaje: "Prueba SSE multidispositivo" })
    });
    assert(c1.status === 201, "POST /Notificaciones → 201");
    const creada = await c1.json();
    assert(creada && creada.id > 0 && creada.message === "Prueba SSE multidispositivo", "Respuesta con id/mensaje");

    const evA = await A.waitFor("notification.created", d => d.id === creada.id);
    const evB = await B.waitFor("notification.created", d => d.id === creada.id);
    assert(evA && evA.message === creada.message, "[A] recibió notification.created");
    assert(evB && evB.message === creada.message, "[B] recibió notification.created");

    // ── 2) Eliminar individual desde A → ambos ----------------------------------
    const d1 = await fetch(`${BASE}/Notificaciones/${creada.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
    });
    assert(d1.status === 200, "DELETE /Notificaciones/:id → 200");

    const delA = await A.waitFor("notification.deleted", d => d.id === creada.id);
    const delB = await B.waitFor("notification.deleted", d => d.id === creada.id);
    assert(delA && delA.id === creada.id, "[A] recibió notification.deleted");
    assert(delB && delB.id === creada.id, "[B] recibió notification.deleted");

    // ── 3) Varias + eliminar todas → ambos -------------------------------------
    await fetch(`${BASE}/Notificaciones`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ tipo: "warning", mensaje: "una" })
    });
    await fetch(`${BASE}/Notificaciones`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ tipo: "error", mensaje: "dos" })
    });
    // Deja que las dos publicaciones lleguen antes de vaciar.
    await sleep(500);

    const dAll = await fetch(`${BASE}/Notificaciones`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
    });
    assert(dAll.status === 200, "DELETE /Notificaciones (todas) → 200");

    const allA = await A.waitFor("notification.deleted_all");
    const allB = await B.waitFor("notification.deleted_all");
    assert(allA !== undefined, "[A] recibió notification.deleted_all");
    assert(allB !== undefined, "[B] recibió notification.deleted_all");

    // ── 4) GET lista (solo las de la cuenta autenticada) -------------------------
    const g1 = await fetch(`${BASE}/Notificaciones`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    assert(g1.status === 200, "GET /Notificaciones → 200");
    const lista = await g1.json();
    assert(Array.isArray(lista) && lista.length === 0, "Lista vacía tras 'eliminar todas'");

    // ── 5) Aislamiento por cuenta: eliminar id inexistente/ajeno → 404 -----------
    const d404 = await fetch(`${BASE}/Notificaciones/999999`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
    });
    assert(d404.status === 404, "DELETE id inexistente → 404 (aislamiento)");

    // ── 6) Sin token → 401 -------------------------------------------------------
    const noToken = await fetch(`${BASE}/Notificaciones`);
    assert(noToken.status === 401, "GET /Notificaciones sin token → 401");

    A.close();
    B.close();

    console.log("\n── Resultado ──");
    console.log(`  ✓ ${passCount} afirmaciones pasaron`);
    if (ASSERT_FAIL.length) {
        console.error(`  ✗ ${ASSERT_FAIL.length} afirmaciones fallaron`);
        process.exit(1);
    }
    console.log("  Todo verde ✅");
    process.exit(0);
}

main().catch((err) => {
    console.error("\nError en la prueba:", err.message);
    process.exit(1);
});