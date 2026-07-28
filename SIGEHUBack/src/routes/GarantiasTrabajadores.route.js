import { Router } from "express";
import controller from "../controllers/GarantiasTrabajadores.controller.js";

const router = Router();

// rutas => /Garantias/
router.post("/:idGarantia/trabajadores", controller.asignar);
router.get("/:idGarantia/trabajadores", controller.getByGarantia);
router.delete("/trabajadores/:idDetalleAsignacion", controller.quitar);

export default router;