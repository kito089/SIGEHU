import { Router } from "express";
import controller from "../controllers/ObrasMateriales.controller.js";

const router = Router();

// rutas => /Obras/
router.post("/:idObra/materiales", controller.asignar);
router.get("/:idObra/materiales", controller.getByObra);
router.put("/:idObra/materiales/:idMaterial", controller.actualizar);
router.delete("/:idObra/materiales/:idMaterial", controller.quitar);

export default router;