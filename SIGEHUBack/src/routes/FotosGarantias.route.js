import { Router } from "express";
import controller from "../controllers/FotosGarantias.controller.js";
import { uploadFotoGarantia } from "../middlewares/upload.middleware.js";

const router = Router();

// ruta => /Garantias/
router.post("/:idGarantia/fotos", uploadFotoGarantia.single("foto"), controller.upload);
router.get("/:idGarantia/fotos", controller.getByGarantia);
router.delete("/Fotos/:id", controller.remove);

export default router;