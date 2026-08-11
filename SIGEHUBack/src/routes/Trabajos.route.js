import { Router } from "express";
import controller from "../controllers/Trabajos.controller.js";

const router = Router();

// Trabajos (grupo de obras) — montados bajo /Obras para mantener el molde
// "Trabajos/Obras" de la pestaña del detalle de Cliente.
router.post("/trabajos", controller.create);
router.get("/trabajos/:id", controller.getById);
router.get("/trabajos/:id/obras", controller.getObras);
router.put("/trabajos/:id", controller.update);
router.post("/trabajos/:id/obras", controller.agrupar);

export default router;