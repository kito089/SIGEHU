import { Router } from "express";
import controller from "../controllers/NotasGarantias.controller.js";

const router = Router();

// ruta => /Garantias/
router.post("/:idGarantia/notas", controller.create);
router.get("/:idGarantia/notas", controller.getByGarantia);
router.get("/notas/:id", controller.getById);
router.put("/notas/:id", controller.update);
router.delete("/notas/:id", controller.remove);

export default router;