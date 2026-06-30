import { Router } from "express";
import controller from "../controllers/Obras.controller.js";

const router = Router();

// rutas => /Obras/
router.get("/", controller.getAll);
router.post("/", controller.create);
router.put("/:id", controller.update);
router.delete("/:id", controller.remove);
router.patch("/:id/estado", controller.cambiarEstado);

export default router;