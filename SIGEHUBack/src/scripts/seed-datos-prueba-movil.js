// =============================================================================
// SEED: Datos de prueba para vistas móviles (SIGEHU)
// -----------------------------------------------------------------------------
// Única finalidad: INSERTAR datos de prueba en Firebird (SIGEHU.FDB).
// NO modifica frontend ni esquema. Usa los SP oficiales cuando existen.
//
// Uso: node src/scripts/seed-datos-prueba-movil.js
// =============================================================================
import { getConnection, disconnectDB } from "../config/db.js";
import bcrypt from "bcrypt";

const SALT_ROUNDS = 10;
const CTX = "1"; // idTrabajador propietario que ejecuta (auditoría)

// ─── Helpers ────────────────────────────────────────────────────────────────
const asBlob = (v) => (v != null ? Buffer.from(String(v), "utf8") : null);

function extractReturningValue(rows, alias) {
    let raw = Array.isArray(rows) && rows.length > 0 ? rows[0] : rows;
    if (raw != null && typeof raw === "object") {
        return raw[alias] ?? raw[alias.toLowerCase()];
    }
    return raw;
}

async function setContext(tx) {
    await tx.execute(
        "SELECT RDB$SET_CONTEXT('USER_SESSION', 'CURRENT_USER_ID', ?) FROM RDB$DATABASE",
        [CTX]
    );
}

async function callSp(tx, sql, params) {
    const rows = await tx.query(sql, params);
    return rows;
}

// SPs sin parámetros de salida: Firebird exige invocarlas con EXECUTE PROCEDURE.
async function callSpNoReturn(tx, sql, params) {
    await tx.procedure(sql, params);
}

// ─── Validación de no contaminación ─────────────────────────────────────────
// Marcadores únicos de esta tarea: nombres de usuario de los trabajadores.
async function existeSeedPrevio(db) {
    const rows = await db.query(
        `SELECT NombreUsuario FROM Trabajadores
         WHERE NombreUsuario IN ('jramirez.taller', 'msanchez.taller', 'lhernandez.taller')`,
        []
    );
    return rows && rows.length > 0;
}

async function main() {
    const db = await getConnection();

    if (await existeSeedPrevio(db)) {
        console.error("ABORTADO: ya existen trabajadores de prueba de esta tarea (seed previo detectado).");
        await disconnectDB();
        process.exit(1);
    }

    const tx = await db.transaction();
    try {
        await setContext(tx);

        // =====================================================================
        // 0) Catálogos dinámicos
        // =====================================================================
        const estados = await callSp(tx, `SELECT idEstadoObra, Nombre FROM EstadosObra ORDER BY Orden`, []);
        const estadosNoFinal = estados.filter((e) => String(e.NOMBRE ?? e.Nombre).toLowerCase() !== "finalizado");
        if (estadosNoFinal.length === 0) {
            throw new Error("No hay estados de obra válidos (distintos de Finalizado).");
        }
        console.log(`Estados de obra disponibles (sin Finalizado): ${estadosNoFinal.length}`);

        const camposPermiso = await callSp(tx, `SELECT idCampoPermiso FROM CamposPermiso ORDER BY idCampoPermiso`, []);
        const todosCampos = camposPermiso.map((c) => Number(c.IDCAMPOPERMISO ?? c.idCampoPermiso));
        if (todosCampos.length === 0) {
            throw new Error("No hay campos de permiso en el catálogo.");
        }

        // =====================================================================
        // 1) CLIENTES (2)
        // =====================================================================
        const rfcPersona = "LOGC920315MZ7";
        const rfcEmpresa = "COM9201014K8";

        // Cliente 1 — Persona
        const c1Rows = await tx.executeReturning(
            `INSERT INTO Clientes (NombreCompleto, RazonSocial, Direccion, DireccionFiscal, RFC,
                                   RegimenesFiscales_idRegimenFiscal, CodigoPostal, UsosCFDI_idUsoCFDI,
                                   Observaciones, Tipo)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'persona')
             RETURNING idCliente`,
            [
                "Claudia Fernanda López García",
                null,
                asBlob("Calle Jacarandas #31, Col. Jardines de la Ermita, Aguascalientes, Ags."),
                asBlob("Calle Jacarandas #31, Col. Jardines de la Ermita, Aguascalientes, Ags."),
                rfcPersona,
                5, // Régimen sueldos y salarios (código 605 → idRegimenFiscal 5)
                "20130",
                3, // G03 Gastos en general
                asBlob("Datos de prueba para vistas móviles (seed 2026)."),
            ]
        );
        const idCliente1 = extractReturningValue(c1Rows, "IDCLIENTE");

        await tx.execute(
            `INSERT INTO ContactosClientes (Clientes_idCliente, NombreCompleto, Telefono, Correo, Observaciones)
             VALUES (?, ?, ?, ?, ?)`,
            [idCliente1, "Claudia Fernanda López García", "4491002233", "claudia.lopez.prueba@gmail.com",
             asBlob("Contacto principal (prueba móvil).")]
        );

        // Cliente 2 — Empresa
        const c2Rows = await tx.executeReturning(
            `INSERT INTO Clientes (NombreCompleto, RazonSocial, Direccion, DireccionFiscal, RFC,
                                   RegimenesFiscales_idRegimenFiscal, CodigoPostal, UsosCFDI_idUsoCFDI,
                                   Observaciones, Tipo)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'empresa')
             RETURNING idCliente`,
            [
                "Constructora Metalfer del Bajío S.A. de C.V.",
                "Constructora Metalfer del Bajío S.A. de C.V.",
                asBlob("Av. Tecnológico #905, Parque Industrial Siglo XXI, Aguascalientes, Ags."),
                asBlob("Av. Independencia #501, Col. Centro, Aguascalientes, Ags."),
                rfcEmpresa,
                1, // Régimen general de ley personas morales (código 601 → idRegimenFiscal 1)
                "20250",
                3, // G03 Gastos en general
                asBlob("Datos de prueba para vistas móviles (seed 2026)."),
            ]
        );
        const idCliente2 = extractReturningValue(c2Rows, "IDCLIENTE");

        await tx.execute(
            `INSERT INTO ContactosClientes (Clientes_idCliente, NombreCompleto, Telefono, Correo, Observaciones)
             VALUES (?, ?, ?, ?, ?)`,
            [idCliente2, "Ing. Ricardo Mendoza Aguilar", "4493004455", "compras.metalfer.prueba@gmail.com",
             asBlob("Contacto de compras (prueba móvil).")]
        );

        // =====================================================================
        // 2) TRABAJOS (grupos de obras) — 2
        // =====================================================================
        const t1Rows = await tx.executeReturning(
            `INSERT INTO TRABAJO (Clientes_idCliente, Nombre, Descripcion, Direccion)
             VALUES (?, ?, ?, ?) RETURNING idTrabajo`,
            [idCliente1, "Herrería residencial - Casa López",
             asBlob("Trabajo de herrería residencial (grupo de obras de prueba)."),
             asBlob("Calle Pino #89, Col. Lomas de Santa Fe, Ciudad de México")]
        );
        const idTrabajo1 = extractReturningValue(t1Rows, "IDTRABAJO");

        const t2Rows = await tx.executeReturning(
            `INSERT INTO TRABAJO (Clientes_idCliente, Nombre, Descripcion, Direccion)
             VALUES (?, ?, ?, ?) RETURNING idTrabajo`,
            [idCliente2, "Herrería comercial - Constructora Metalfer",
             asBlob("Trabajo de herrería comercial (grupo de obras de prueba)."),
             asBlob("Av. Tecnológico #905, Parque Industrial Siglo XXI, Aguascalientes, Ags.")]
        );
        const idTrabajo2 = extractReturningValue(t2Rows, "IDTRABAJO");

        // =====================================================================
        // 3) OBRAS — 1 por cada estado != Finalizado (id orden 1..6)
        //    Estado 1: Solicitud recibida | 2: Levantamiento pendiente
        //    3: En fabricacion | 4: Instalacion programada | 5: Instalado
        //    6: Garantia
        // =====================================================================
        const obrasSeed = [
            { estado: 1, nombre: "Portón corredizo residencial", direccion: "Calle Pino #89, Col. Lomas de Santa Fe, Ciudad de México", cliente: idCliente1, trabajo: idTrabajo1 },
            { estado: 2, nombre: "Barandal para escalera", direccion: "Av. Hidalgo #1204, Centro Histórico, Querétaro, Querétaro", cliente: idCliente1, trabajo: idTrabajo1 },
            { estado: 3, nombre: "Reja perimetral comercial", direccion: "Fracc. Villas del Sol, Calle Bugambilias #45, Aguascalientes, Ags.", cliente: idCliente1, trabajo: null },
            { estado: 4, nombre: "Puerta de acceso industrial", direccion: "Blvd. Luis Donaldo Colosio #310, Col. Industrial Bravo, Tijuana, B.C.", cliente: idCliente2, trabajo: idTrabajo2 },
            { estado: 5, nombre: "Protecciones de ventanas", direccion: "Privada de los Sauces #77, Col. Jardines del Sur, Guadalajara, Jalisco", cliente: idCliente2, trabajo: idTrabajo2 },
            { estado: 6, nombre: "Estructura metálica para techumbre", direccion: "Calle 5 de Mayo #233, Col. La Fuente, León, Guanajuato", cliente: idCliente2, trabajo: null },
        ];

        const medidas = {
            1: { Ancho: 4.0, Alto: 2.2, Profundidad: null },
            2: { Ancho: 3.5, Alto: 1.1, Profundidad: null },
            3: { Ancho: 12.0, Alto: 2.4, Profundidad: null },
            4: { Ancho: 2.0, Alto: 2.4, Profundidad: null },
            5: { Ancho: 1.5, Alto: 1.8, Profundidad: null },
            6: { Ancho: 18.0, Alto: 6.0, Profundidad: 12.0 },
        };

        const idObras = {};
        for (const ob of obrasSeed) {
            const rows = await tx.executeReturning(
                `INSERT INTO Obras (TRABAJOS_IDTRABAJO, Clientes_idCliente, Nombre, Direccion,
                                    Ancho, Alto, Profundidad, EstadosObra_idEstadoObra, FechaInicio)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                 RETURNING idObra`,
                [
                    ob.trabajo, ob.cliente, ob.nombre, asBlob(ob.direccion),
                    medidas[ob.estado].Ancho, medidas[ob.estado].Alto, medidas[ob.estado].Profundidad,
                    ob.estado,
                ]
            );
            const idObra = extractReturningValue(rows, "IDOBRA");
            idObras[ob.estado] = idObra;
        }

        // =====================================================================
        // 4) TRABAJADORES (3) — con bcrypt
        // =====================================================================
        const trabajadoresSeed = [
            { usuario: "jramirez.taller", nombre: "José Luis Ramírez Torres", telefono: "4492103344",
              correo: "jose.ramirez.prueba@gmail.com", pass: "Sigehu.Test.2026.Ram" },
            { usuario: "msanchez.taller", nombre: "María Fernanda Sánchez Ruiz", telefono: "4493204455",
              correo: "maria.sanchez.prueba@gmail.com", pass: "Sigehu.Test.2026.San" },
            { usuario: "lhernandez.taller", nombre: "Luis Alberto Hernández Cruz", telefono: "4494305566",
              correo: "luis.hernandez.prueba@gmail.com", pass: "Sigehu.Test.2026.Her" },
        ];

        const idTrabajadores = [];
        for (const t of trabajadoresSeed) {
            const hash = await bcrypt.hash(t.pass, SALT_ROUNDS);
            const rows = await callSp(
                tx,
                `SELECT * FROM SP_INSERTAR_TRABAJADOR (?, ?, ?, ?, ?, ?, ?, ?)`,
                [t.usuario, hash, t.nombre, t.telefono, 2, null, t.correo, asBlob("Datos de prueba para vistas móviles (seed 2026).")]
            );
            const idT = rows[0]?.OIDTRABAJADOR;
            idTrabajadores.push(idT);
        }
        const [w1, w2, w3] = idTrabajadores;

        // =====================================================================
        // 5) ASIGNACIONES trabajador-obra + PERMISOS granulares
        //    VW_OBRAS_TRABAJADOR (app móvil) filtra por Obras_has_Trabajadores.
        // =====================================================================
        // Trabajador 1: acceso a TODAS las obras + TODOS los permisos
        for (const ob of obrasSeed) {
            await callSp(
                tx,
                `SELECT * FROM SP_ASIGNAR_TRABAJADOR_OBRA (?, ?, ?)`,
                [idObras[ob.estado], w1, ob.estado]
            );
            for (const idCampo of todosCampos) {
                await callSpNoReturn(
                    tx,
                    `EXECUTE PROCEDURE SP_OTORGAR_PERMISO_OBRA (?, ?, ?)`,
                    [idObras[ob.estado], w1, idCampo]
                );
            }
        }

        // Trabajador 2: obras del cliente 1 (estados 1,2,3) con permisos parciales
        const permsW2 = [1, 2, 7, 8]; // direccion, telefono, subir_fotos, confirmar_actividad
        for (const est of [1, 2, 3]) {
            await callSp(tx, `SELECT * FROM SP_ASIGNAR_TRABAJADOR_OBRA (?, ?, ?)`, [idObras[est], w2, est]);
            for (const idCampo of permsW2) {
                await callSpNoReturn(tx, `EXECUTE PROCEDURE SP_OTORGAR_PERMISO_OBRA (?, ?, ?)`, [idObras[est], w2, idCampo]);
            }
        }

        // Trabajador 3: obras del cliente 2 (estados 4,5,6) con permisos diferentes
        const permsW3 = [1, 3, 5, 7]; // direccion, notas_obra, medidas, subir_fotos
        for (const est of [4, 5, 6]) {
            await callSp(tx, `SELECT * FROM SP_ASIGNAR_TRABAJADOR_OBRA (?, ?, ?)`, [idObras[est], w3, est]);
            for (const idCampo of permsW3) {
                await callSpNoReturn(tx, `EXECUTE PROCEDURE SP_OTORGAR_PERMISO_OBRA (?, ?, ?)`, [idObras[est], w3, idCampo]);
            }
        }

        // =====================================================================
        // 6) MATERIALES (10)
        // =====================================================================
        const materialesSeed = [
            ["Tubo cuadrado de acero 1\" x 1\"", "ml", "Perfil estructural de acero para marcos y estructuras."],
            ["Ángulo de acero de 2\"", "ml", "Perfil angular para refuerzos y uniones."],
            ["Placa de acero 1/4\"", "m2", "Placa base para bases y anclajes."],
            ["Solera de acero 1/2\"", "ml", "Solera para contramarcos y refuerzos."],
            ["Polín C de 6\"", "ml", "Polín estructural tipo C para techumbre."],
            ["Tornillería galvanizada 3/8\"", "kg", "Tornillería y taquetes para fijaciones."],
            ["Electrodo 6013", "kg", "Electrodo para soldadura de acero."],
            ["Pintura esmalte negro", "lt", "Pintura de acabado anticorrosiva."],
            ["Disco de corte 9\"", "pza", "Disco abrasivo para corte de metal."],
            ["Bisagra pesada de acero 4\"", "pza", "Bisagra industrial para portones y puertas."],
        ];

        const idMateriales = [];
        for (const [nombre, unidad, desc] of materialesSeed) {
            const rows = await callSp(
                tx,
                `SELECT * FROM SP_INSERTAR_MATERIAL (?, ?, ?)`,
                [nombre, unidad, asBlob(desc)]
            );
            idMateriales.push(rows[0]?.OIDMATERIAL);
        }

        // =====================================================================
        // 7) PROVEEDORES (2) + vínculo con materiales (5 y 5)
        // =====================================================================
        const p1Rows = await callSp(
            tx,
            `SELECT * FROM SP_INSERTAR_PROVEEDOR (?, ?, ?, ?, ?, ?, ?)`,
            ["Aceros del Centro S.A. de C.V.",
             asBlob("Av. de los Aceros #410, Parque Industrial Valle de Aguascalientes, Aguascalientes, Ags."),
             "4495112233", "ventas@aceroscentro.prueba.mx", "Venta de acero y perfiles",
             "Carlos Medina", asBlob("Proveedor de perfiles y placas (prueba móvil).")]
        );
        const idProveedor1 = p1Rows[0]?.OIDPROVEEDOR;

        const p2Rows = await callSp(
            tx,
            `SELECT * FROM SP_INSERTAR_PROVEEDOR (?, ?, ?, ?, ?, ?, ?)`,
            ["Ferretería El Tornillo Dorado",
             asBlob("Calle 28 de Agosto #77, Col. Gremial, Aguascalientes, Ags."),
             "4496223344", "contacto@tornillodorado.prueba.mx", "Ferretería y consumibles",
             "Ana Villalobos", asBlob("Proveedor de consumibles y herrajes (prueba móvil).")]
        );
        const idProveedor2 = p2Rows[0]?.OIDPROVEEDOR;

        // Precios unitarios (proveedor 1 → materiales 1..5)
        const preciosP1 = [185.0, 92.5, 410.0, 35.0, 270.0];
        for (let i = 0; i < 5; i++) {
            await callSpNoReturn(
                tx,
                `EXECUTE PROCEDURE SP_VINCULAR_MATERIAL_PROVEEDOR (?, ?, ?, ?)`,
                [idProveedor1, idMateriales[i], preciosP1[i], asBlob("Precio de prueba para vistas móviles.")]
            );
        }

        // Precios unitarios (proveedor 2 → materiales 6..10)
        const preciosP2 = [12.5, 68.0, 145.0, 24.0, 89.0];
        for (let i = 5; i < 10; i++) {
            await callSpNoReturn(
                tx,
                `EXECUTE PROCEDURE SP_VINCULAR_MATERIAL_PROVEEDOR (?, ?, ?, ?)`,
                [idProveedor2, idMateriales[i], preciosP2[i - 5], asBlob("Precio de prueba para vistas móviles.")]
            );
        }

        // =====================================================================
        // 8) KITS (2) con materiales existentes
        // =====================================================================
        const kit1Rows = await callSp(
            tx,
            `SELECT * FROM SP_INSERTAR_KIT (?, ?)`,
            ["Kit Puerta Estándar", asBlob("Conjunto de herrería para puerta de acceso (prueba móvil).")]
        );
        const idKit1 = kit1Rows[0]?.OIDKIT;
        const kit1Materiales = [
            [idMateriales[0], 3.0],  // Tubo cuadrado
            [idMateriales[1], 4.0],  // Ángulo
            [idMateriales[3], 2.0],  // Solera
            [idMateriales[5], 1.0],  // Tornillería
            [idMateriales[6], 0.5],  // Electrodo
        ];
        for (const [idM, cant] of kit1Materiales) {
            await callSpNoReturn(tx, `EXECUTE PROCEDURE SP_VINCULAR_MATERIAL_KIT (?, ?, ?, ?)`, [idKit1, idM, cant, null]);
        }

        const kit2Rows = await callSp(
            tx,
            `SELECT * FROM SP_INSERTAR_KIT (?, ?)`,
            ["Kit Reja y Portón", asBlob("Conjunto para rejas perimetrales y portones (prueba móvil).")]
        );
        const idKit2 = kit2Rows[0]?.OIDKIT;
        const kit2Materiales = [
            [idMateriales[2], 1.0],  // Placa
            [idMateriales[4], 6.0],  // Polín C
            [idMateriales[7], 1.0],  // Pintura
            [idMateriales[8], 2.0],  // Disco de corte
            [idMateriales[9], 4.0],  // Bisagra
        ];
        for (const [idM, cant] of kit2Materiales) {
            await callSpNoReturn(tx, `EXECUTE PROCEDURE SP_VINCULAR_MATERIAL_KIT (?, ?, ?, ?)`, [idKit2, idM, cant, null]);
        }

        // =====================================================================
        // 9) ÓRDENES DE COMPRA (2)
        //    El modelo permite multi-proveedor: DetallesCompras referencia el
        //    par (proveedor, material) de Proveedores_has_Materiales por línea.
        // =====================================================================
        // Orden 1: proveedor 1 (materiales 1,2) + proveedor 2 (materiales 6,7,9)
        const ord1 = await callSp(
            tx,
            `SELECT * FROM SP_REGISTRAR_COMPRA_COMPLETA (?, ?, ?, ?, ?, ?)`,
            [w1, asBlob("Orden de prueba multi-proveedor (seed 2026)."),
             idProveedor1, idMateriales[0], 3.0, "ml"]
        );
        const idCompra1 = ord1[0]?.OIDCOMPRA;
        await callSp(tx, `SELECT * FROM SP_AGREGAR_DETALLE_COMPRA (?, ?, ?, ?, ?)`, [idCompra1, idProveedor1, idMateriales[1], 6.0, "ml"]);
        await callSp(tx, `SELECT * FROM SP_AGREGAR_DETALLE_COMPRA (?, ?, ?, ?, ?)`, [idCompra1, idProveedor2, idMateriales[5], 2.0, "kg"]);
        await callSp(tx, `SELECT * FROM SP_AGREGAR_DETALLE_COMPRA (?, ?, ?, ?, ?)`, [idCompra1, idProveedor2, idMateriales[6], 1.0, "kg"]);
        await callSp(tx, `SELECT * FROM SP_AGREGAR_DETALLE_COMPRA (?, ?, ?, ?, ?)`, [idCompra1, idProveedor2, idMateriales[8], 2.0, "pza"]);

        // Orden 2: un solo proveedor (proveedor 1 → materiales 3,4,5)
        const ord2 = await callSp(
            tx,
            `SELECT * FROM SP_REGISTRAR_COMPRA_COMPLETA (?, ?, ?, ?, ?, ?)`,
            [w1, asBlob("Orden de prueba proveedor único (seed 2026)."),
             idProveedor1, idMateriales[2], 2.0, "m2"]
        );
        const idCompra2 = ord2[0]?.OIDCOMPRA;
        await callSp(tx, `SELECT * FROM SP_AGREGAR_DETALLE_COMPRA (?, ?, ?, ?, ?)`, [idCompra2, idProveedor1, idMateriales[3], 10.0, "ml"]);
        await callSp(tx, `SELECT * FROM SP_AGREGAR_DETALLE_COMPRA (?, ?, ?, ?, ?)`, [idCompra2, idProveedor1, idMateriales[4], 6.0, "ml"]);

        await tx.commit();

        // =====================================================================
        // 10) VERIFICACIÓN
        // =====================================================================
        const vClientes = await db.query(`SELECT idCliente, NombreCompleto, Tipo, RFC FROM Clientes WHERE idCliente IN (?, ?) ORDER BY idCliente`, [idCliente1, idCliente2]);
        const vObras = await db.query(
            `SELECT o.idObra, o.Nombre, e.Nombre AS Estado, o.Clientes_idCliente, o.TRABAJOS_IDTRABAJO
             FROM Obras o JOIN EstadosObra e ON e.idEstadoObra = o.EstadosObra_idEstadoObra
             WHERE o.idObra IN (?, ?, ?, ?, ?, ?) ORDER BY o.EstadosObra_idEstadoObra`,
            [idObras[1], idObras[2], idObras[3], idObras[4], idObras[5], idObras[6]]
        );
        const vTrabajadores = await db.query(
            `SELECT idTrabajador, NombreUsuario, NombreCompleto, Activo FROM Trabajadores WHERE idTrabajador IN (?, ?, ?) ORDER BY idTrabajador`,
            [w1, w2, w3]
        );
        const vAsignW1 = await db.query(`SELECT COUNT(*) AS N FROM Obras_has_Trabajadores WHERE Trabajadores_idTrabajador = ?`, [w1]);
        const vAsignW2 = await db.query(`SELECT COUNT(*) AS N FROM Obras_has_Trabajadores WHERE Trabajadores_idTrabajador = ?`, [w2]);
        const vAsignW3 = await db.query(`SELECT COUNT(*) AS N FROM Obras_has_Trabajadores WHERE Trabajadores_idTrabajador = ?`, [w3]);
        const vPermW1 = await db.query(`SELECT COUNT(*) AS N FROM PermisosGranularesObras WHERE Trabajadores_idTrabajador = ?`, [w1]);
        const vPermW2 = await db.query(`SELECT COUNT(*) AS N FROM PermisosGranularesObras WHERE Trabajadores_idTrabajador = ?`, [w2]);
        const vPermW3 = await db.query(`SELECT COUNT(*) AS N FROM PermisosGranularesObras WHERE Trabajadores_idTrabajador = ?`, [w3]);
        const vMateriales = await db.query(`SELECT COUNT(*) AS N FROM Materiales WHERE idMaterial IN (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, idMateriales);
        const vProveedores = await db.query(`SELECT idProveedor, Nombre FROM Proveedores WHERE idProveedor IN (?, ?) ORDER BY idProveedor`, [idProveedor1, idProveedor2]);
        const vKits = await db.query(`SELECT k.idKit, k.Nombre, COUNT(km.Materiales_idMaterial) AS M
            FROM Kits_Instalacion k LEFT JOIN Kits_has_Materiales km ON km.Kits_Instalacion_idKit = k.idKit
            WHERE k.idKit IN (?, ?) GROUP BY k.idKit, k.Nombre ORDER BY k.idKit`, [idKit1, idKit2]);
        const vCompras = await db.query(
            `SELECT c.idCompra,
                    LIST(DISTINCT p.Nombre, ' | ') AS PROVEEDORES,
                    COUNT(dc.idDetalleCompra) AS LINEAS
             FROM Compras c
             JOIN DetallesCompras dc ON dc.Compras_idCompra = c.idCompra
             JOIN Proveedores_has_Materiales phm
                  ON phm.Proveedores_idProveedor = dc.Proveedores_has_Materiales_Proveedores_idProveedor
                 AND phm.Materiales_idMaterial = dc.Proveedores_has_Materiales_Materiales_idMaterial
             JOIN Proveedores p ON p.idProveedor = phm.Proveedores_idProveedor
             WHERE c.idCompra IN (?, ?)
             GROUP BY c.idCompra ORDER BY c.idCompra`,
            [idCompra1, idCompra2]
        );

        console.log("\n===================== REPORTE SEED (DATOS REALES) =====================");
        console.log("\n=== CLIENTES ===");
        for (const c of vClientes) {
            console.log(`  ${c.NOMBRECOMPLETO ?? c.NombreCompleto} (${c.TIPO})  ID: ${c.IDCLIENTE ?? c.idCliente}  RFC: ${c.RFC}`);
        }
        console.log("\n=== OBRAS (1 por estado != Finalizado) ===");
        for (const o of vObras) {
            console.log(`  Estado: ${o.ESTADO ?? o.Estado}  ID: ${o.IDOBRA ?? o.idObra}  Cliente: ${o.CLIENTES_IDCLIENTE ?? o.Clientes_idCliente}  Trabajo: ${o.TRABAJOS_IDTRABAJO ?? o.Trabajos_idTrabajo ?? 'independiente'}  Nombre: ${o.NOMBRE ?? o.Nombre}`);
        }
        console.log("\n=== TRABAJADORES ===");
        for (let i = 0; i < vTrabajadores.length; i++) {
            const t = vTrabajadores[i];
            const id = t.IDTRABAJADOR ?? t.idTrabajador;
            console.log(`  ${i + 1}. Usuario: ${t.NOMBREUSUARIO ?? t.NombreUsuario}  ID: ${id}  Contraseña: ${trabajadoresSeed[i].pass}`);
        }
        console.log("\n=== PERMISOS / ASIGNACIONES ===");
        console.log(`  Trabajador 1 (${trabajadoresSeed[0].usuario}): ${vAsignW1[0]?.N ?? 0} obras asignadas | ${vPermW1[0]?.N ?? 0} permisos`);
        console.log(`  Trabajador 2 (${trabajadoresSeed[1].usuario}): ${vAsignW2[0]?.N ?? 0} obras asignadas | ${vPermW2[0]?.N ?? 0} permisos`);
        console.log(`  Trabajador 3 (${trabajadoresSeed[2].usuario}): ${vAsignW3[0]?.N ?? 0} obras asignadas | ${vPermW3[0]?.N ?? 0} permisos`);
        console.log("\n=== MATERIALES ===");
        const vMat = await db.query(
            `SELECT idMaterial, Nombre, UnidadMedida FROM Materiales WHERE idMaterial IN (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ORDER BY idMaterial`, idMateriales);
        vMat.forEach((m, i) => console.log(`  ${i + 1}. ${m.NOMBRE ?? m.Nombre} (${m.UNIDADMEDIDA ?? m.UnidadMedida})  ID: ${m.IDMATERIAL ?? m.idMaterial}`));
        console.log("\n=== PROVEEDORES ===");
        for (const p of vProveedores) {
            console.log(`  ${p.NOMBRE ?? p.Nombre}  ID: ${p.IDPROVEEDOR ?? p.idProveedor}`);
        }
        console.log("\n=== KITS ===");
        for (const k of vKits) {
            console.log(`  ${k.NOMBRE ?? k.Nombre}  ID: ${k.IDKIT ?? k.idKit}  Materiales: ${k.M ?? k.MATERIALES}`);
        }
        console.log("\n=== ÓRDENES DE COMPRA ===");
        for (const c of vCompras) {
            console.log(`  ID: ${c.IDCOMPRA ?? c.idCompra}  Proveedores: ${String(c.PROVEEDORES ?? c.proveedores ?? '').trim()}  Líneas: ${c.LINEAS ?? c.lineas}`);
        }

        console.log("\n=== VALIDACIÓN ===");
        console.log(`  Clientes: ${vClientes.length === 2 ? 'OK (1 persona, 1 empresa)' : 'FAIL'}`);
        console.log(`  Obras: ${vObras.length === 6 ? 'OK (6 estados)' : 'FAIL'}`);
        console.log(`  Trabajadores: ${vTrabajadores.length === 3 ? 'OK' : 'FAIL'}`);
        console.log(`  Permisos (T1=48, T2=12, T3=12): ${Number(vPermW1[0]?.N) === 48 && Number(vPermW2[0]?.N) === 12 && Number(vPermW3[0]?.N) === 12 ? 'OK' : 'CHECK'}`);
        console.log(`  Materiales: ${Number(vMateriales[0]?.N) === 10 ? 'OK (10)' : 'FAIL'}`);
        console.log(`  Proveedores: ${vProveedores.length === 2 ? 'OK' : 'FAIL'}`);
        console.log(`  Kits: ${vKits.length === 2 ? 'OK' : 'FAIL'}`);
        console.log(`  Orden multi-proveedor: ${String(vCompras[0]?.PROVEEDORES ?? '').includes('|') ? 'OK' : 'CHECK'}`);
        console.log(`  Orden proveedor único: ${String(vCompras[1]?.PROVEEDORES ?? '').includes('|') ? 'CHECK' : 'OK'}`);
        console.log("\n========================================================================");

        await disconnectDB();
        process.exit(0);
    } catch (err) {
        await tx.rollback();
        console.error("ERROR: se realizó ROLLBACK. No se insertó nada.", err?.message || err);
        await disconnectDB();
        process.exit(1);
    }
}

main().catch(async (err) => {
    console.error("FATAL:", err?.message || err);
    await disconnectDB();
    process.exit(1);
});
