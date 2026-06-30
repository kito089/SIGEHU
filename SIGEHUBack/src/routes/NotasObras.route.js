import { Router } from "express";
import controller from "../controllers/NotasObras.controller.js";

const router = Router();

// ruta => /Obras/
router.post("/:idObra/notas", controller.create);
router.get("/:idObra/notas", controller.getByObra);
router.put("/notas/:id", controller.update);
router.delete("/notas/:id", controller.remove);

export default router;