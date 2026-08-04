import { Router } from "express";
import controller from "../controllers/Kits.controller.js";
import auth from "../middlewares/auth.middleware.js";

const router = Router();

router.use(auth.verifyToken);

router.get("/", controller.getAll);
router.get("/:id", controller.getById);
router.post("/", controller.create);
router.post("/:id/materiales", controller.addMaterial);
router.patch("/:id/materiales/:idMaterial", controller.updateMaterial);
router.delete("/:id/materiales/:idMaterial", controller.removeMaterial);
router.put("/:id", controller.update);
router.delete("/:id", controller.remove);

export default router;