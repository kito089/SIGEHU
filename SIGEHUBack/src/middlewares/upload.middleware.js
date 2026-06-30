import multer from "multer";
import path from "node:path";
import fs from "node:fs";

function getRootPath() {
    if (process.env.NODE_ENV === "production") {
        return path.dirname(process.execPath);
    }
    return process.cwd();
}

const uploadDir = path.join(getRootPath(), "uploads", "obras");

// Asegurar que la carpeta exista al arrancar el servidor
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
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

export const uploadFotoObra = multer({
    storage,
    fileFilter,
    limits: { fileSize: 10 * 1024 * 1024 } // 10 MB
});

export { uploadDir };