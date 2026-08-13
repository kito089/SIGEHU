import { Router } from "express";
import controller from "../controllers/ObrasTrabajadores.controller.js";
import auth from "../middlewares/auth.middleware.js";

const router = Router();

// rutas => /Obras/
// Asignación de trabajadores, permisos granulares y pagos: SOLO Propietario
// (RF-33). Los trabajadores solo leen su detalle vía /Obras/movil/:id y
// finalizan etapas vía PUT /Obras/:id.
router.post("/:idObra/trabajadores", auth.requireRole('Propietario'), controller.asignar);
router.get("/:idObra/trabajadores", controller.getByObra);
router.delete("/trabajadores/:idDetalleAsignacion", auth.requireRole('Propietario'), controller.quitar);

router.post("/:idObra/trabajadores/:idTrabajador/permisos", auth.requireRole('Propietario'), controller.asignarPermisos);
router.get("/:idObra/trabajadores/:idTrabajador/permisos", controller.getPermisos);
router.delete("/:idObra/trabajadores/:idTrabajador/permisos", auth.requireRole('Propietario'), controller.revocarPermisos);

router.post("/:idObra/pagos", auth.requireRole('Propietario'), controller.registrarPago);
router.get("/:idObra/pagos", auth.requireRole('Propietario'), controller.getPagos);

export default router;