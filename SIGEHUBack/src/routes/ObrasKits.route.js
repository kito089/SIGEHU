import { Router } from "express";
import controller from "../controllers/ObrasKits.controller.js";

const router = Router();

// rutas => /Obras/
router.post("/:idObra/kit", controller.asignar);
router.get("/:idObra/kit", controller.getByObra);
router.delete("/:idObra/kit", controller.quitar);
router.patch("/:idObra/kit/checklist/:idChecklistItem", controller.marcarChecklist);

export default router;
