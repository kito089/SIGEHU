import { Router } from "express";
import controller from "../controllers/Obras.controller.js";

const router = Router();

// rutas => /Obras/
router.get("/", controller.getAll);
router.get("/estados", controller.getEstados);
router.get("/detalle/:id", controller.getDetalle);
router.get("/:id", controller.getById);
router.post("/", controller.create);
router.put("/:id", controller.update);
router.delete("/:id", controller.remove);
router.patch("/:id/estado", controller.cambiarEstado);

export default router;