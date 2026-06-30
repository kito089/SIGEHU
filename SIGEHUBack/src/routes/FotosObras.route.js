import { Router } from "express";
import controller from "../controllers/FotosObras.controller.js";
import { uploadFotoObra } from "../middlewares/upload.middleware.js";

const router = Router();

// ruta => /Obras/
router.post("/:idObra/fotos", uploadFotoObra.single("foto"), controller.upload);
router.get("/:idObra/fotos", controller.getByObra);
router.delete("/Fotos/:id", controller.remove);

export default router;