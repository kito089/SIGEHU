import { Router } from 'express';
import controller from '../controllers/Reportes.controller.js';
import auth from '../middlewares/auth.middleware.js';

const router = Router();

// Reportes es un módulo de administración: solo lectura y solo Propietario.
router.use(auth.verifyToken);
router.use(auth.requireRole('Propietario'));

// ── Obras ─────────────────────────────────────────────────────────────────
router.get('/obras/estado', controller.getObrasPorEstado);
router.get('/obras/evolucion', controller.getEvolucionObras);
router.get('/obras/tiempos', controller.getTiemposPromedioEtapas);

// ── Clientes ──────────────────────────────────────────────────────────────
router.get('/clientes/por-obras', controller.getClientesPorObras);
router.get('/clientes/nuevos', controller.getClientesNuevos);

// ── Trabajadores ──────────────────────────────────────────────────────────
router.get('/trabajadores/obras-activas', controller.getObrasActivasPorTrabajador);
router.get('/trabajadores/garantias', controller.getGarantiasPorTrabajador);

// ── Garantías ─────────────────────────────────────────────────────────────
router.get('/garantias/resumen', controller.getGarantiasResumen);
router.get('/garantias/problemas', controller.getProblemasRecurrentes);
router.get('/garantias/multiples', controller.getGarantiasMultiples);

// ── Materiales ────────────────────────────────────────────────────────────
router.get('/materiales/uso', controller.getUsoMateriales);
router.get('/materiales/sin-proveedor', controller.getMaterialesSinProveedor);

// ── Proveedores ───────────────────────────────────────────────────────────
router.get('/proveedores/usados', controller.getProveedoresUsados);
router.get('/proveedores/variedad', controller.getProveedorMayorVariedad);
router.get('/proveedores/materiales', controller.getMaterialesPorProveedor);

// ── Kits ──────────────────────────────────────────────────────────────────
router.get('/kits/usados', controller.getKitsUsados);
router.get('/kits/materiales', controller.getMaterialesPorKit);

export default router;