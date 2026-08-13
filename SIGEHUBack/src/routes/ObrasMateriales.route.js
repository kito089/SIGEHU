import { Router } from "express";
import controller from "../controllers/ObrasMateriales.controller.js";
import auth from "../middlewares/auth.middleware.js";

const router = Router();

// rutas => /Obras/
// Alta/edición/baja de materiales de obra: SOLO Propietario (la app móvil solo
// los lee durante la fabricación vía GET).
router.post("/:idObra/materiales", auth.requireRole('Propietario'), controller.asignar);
router.get("/:idObra/materiales", controller.getByObra);
router.put("/:idObra/materiales/:idMaterial", auth.requireRole('Propietario'), controller.actualizar);
router.delete("/:idObra/materiales/:idMaterial", auth.requireRole('Propietario'), controller.quitar);

export default router;