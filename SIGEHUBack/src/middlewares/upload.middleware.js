import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import { getObrasUploadDir, getGarantiasUploadDir, getImssUploadDir } from "../config/paths.js";

const uploadDir = getObrasUploadDir();
const uploadGarantiaDir = getGarantiasUploadDir();
const uploadImssDir = getImssUploadDir();

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}
if (!fs.existsSync(uploadGarantiaDir)) {
    fs.mkdirSync(uploadGarantiaDir, { recursive: true });
}
if (!fs.existsSync(uploadImssDir)) {
    fs.mkdirSync(uploadImssDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const nombreUnico = `obra_${Date.now()}_${Math.round(Math.random() * 1e9)}${ext}`;
        cb(null, nombreUnico);
    }
});

const garantiaStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadGarantiaDir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const nombreUnico = `garantia_${Date.now()}_${Math.round(Math.random() * 1e9)}${ext}`;
        cb(null, nombreUnico);
    }
});

const imssStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadImssDir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const nombreUnico = `imss_${Date.now()}_${Math.round(Math.random() * 1e9)}${ext}`;
        cb(null, nombreUnico);
    }
});

const fileFilter = (req, file, cb) => {
    const tiposPermitidos = /jpeg|jpg|png|webp/;
    const extValida = tiposPermitidos.test(path.extname(file.originalname).toLowerCase());
    const mimeValido = tiposPermitidos.test(file.mimetype);

    if (extValida && mimeValido) {
        cb(null, true);
    } else {
        cb(new Error("Solo se permiten imágenes JPEG, JPG, PNG o WEBP"));
    }
};

const imssFileFilter = (req, file, cb) => {
    const tiposPermitidos = /jpeg|jpg|png|pdf/;
    const extValida = tiposPermitidos.test(path.extname(file.originalname).toLowerCase());
    const mimeValido = /jpeg|jpg|png|pdf/.test(file.mimetype);

    if (extValida && mimeValido) {
        cb(null, true);
    } else {
        cb(new Error("Solo se permiten PDF, JPG o PNG para el documento IMSS"));
    }
};

export const uploadFotoObra = multer({
    storage,
    fileFilter,
    limits: { fileSize: 10 * 1024 * 1024 }
});

export const uploadFotoGarantia = multer({
    storage: garantiaStorage,
    fileFilter,
    limits: { fileSize: 10 * 1024 * 1024 }
});

export const uploadDocumentoImss = multer({
    storage: imssStorage,
    fileFilter: imssFileFilter,
    limits: { fileSize: 10 * 1024 * 1024 }
});

export { uploadDir, uploadGarantiaDir, uploadImssDir };