import { Router } from "express";
import controller from "../controllers/FotosObras.controller.js";
import { uploadFotoObra } from "../middlewares/upload.middleware.js";

const router = Router();

// ruta => /Obras/
// La ruta específica de archivo se declara ANTES de la de fotos por estado para
// que "/Fotos/:id/archivo" no colisione con un id como "archivo".
router.post("/:idObra/fotos", uploadFotoObra.single("foto"), controller.upload);
router.get("/:idObra/fotos", controller.getByObra);
router.get("/Fotos/:id/archivo", controller.getArchivo);
router.delete("/Fotos/:id", controller.remove);

export default router;