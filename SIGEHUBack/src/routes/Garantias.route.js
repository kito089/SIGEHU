import { Router } from "express";
import controller from "../controllers/Garantias.controller.js";

const router = Router();

// rutas => /Garantias/
router.get("/", controller.getAll);
router.get("/:id", controller.getById);
router.post("/", controller.create);
router.put("/:id", controller.update);
router.delete("/:id", controller.remove);

export default router;