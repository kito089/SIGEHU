import { Router } from "express";
import controller from "../controllers/ObrasTrabajadores.controller.js";

const router = Router();

// rutas => /Obras/
router.post("/:idObra/trabajadores", controller.asignar);
router.get("/:idObra/trabajadores", controller.getByObra);
router.delete("/trabajadores/:idDetalleAsignacion", controller.quitar);

router.post("/:idObra/trabajadores/:idTrabajador/permisos", controller.asignarPermisos);
router.get("/:idObra/trabajadores/:idTrabajador/permisos", controller.getPermisos);
router.delete("/:idObra/trabajadores/:idTrabajador/permisos", controller.revocarPermisos);

router.post("/:idObra/pagos", controller.registrarPago);
router.get("/:idObra/pagos", controller.getPagos);

export default router;