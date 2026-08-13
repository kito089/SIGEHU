import { Router } from "express";
import controller from "../controllers/ObrasKits.controller.js";
import auth from "../middlewares/auth.middleware.js";

const router = Router();

// rutas => /Obras/
// Asignar/quitar kit de obra: SOLO Propietario. La app móvil del trabajador
// solo lee el kit (GET) y marca su checklist (PATCH), por eso esos dos se
// mantienen abiertos.
router.post("/:idObra/kit", auth.requireRole('Propietario'), controller.asignar);
router.get("/:idObra/kit", controller.getByObra);
router.delete("/:idObra/kit", auth.requireRole('Propietario'), controller.quitar);
router.patch("/:idObra/kit/checklist/:idChecklistItem", controller.marcarChecklist);

export default router;
