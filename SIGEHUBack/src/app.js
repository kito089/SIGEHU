import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
//import backup from './database/Backup';
import { getConnection } from './config/db.js';

import TrabajadoresRoutes from './routes/Trabajadores.route.js';

const PORT = process.env.PORT || 3000;
const app = express();

dotenv.config();
app.use(cors());
app.use(express.json());

// Rutas
app.use('/Trabajadores', TrabajadoresRoutes);

await getConnection();
console.log("BD conectada")

app.listen(PORT, () => {
    console.log(`Servidor escuchando en http://localhost:${PORT}`);
    //backup.verificarYRespaldarAlArrancar();
});