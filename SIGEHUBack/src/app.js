import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
//import backup from './database/Backup';
import { getConnection } from './config/db.js';

import TrabajadoresRoutes from './routes/Trabajadores.route.js';
import ClientesRoutes from './routes/Clientes.route.js';
import MaterialesRoutes from './routes/Materiales.route.js';
import ProveedoresRoutes from './routes/Proveedores.route.js';
import ObrasRoutes from './routes/Obras.route.js';
import FotosObras from './routes/FotosObras.route.js';
import NotasObras from './routes/NotasObras.route.js';
import ObrasMateriales from './routes/ObrasMateriales.route.js'
import ObrasTrabajadores from './routes/ObrasTrabajadores.route.js'

const PORT = process.env.PORT || 3000;
const app = express();

dotenv.config();
app.use(cors());
app.use(express.json());

// Rutas
app.use('/Trabajadores', TrabajadoresRoutes);
app.use('/Clientes', ClientesRoutes);
app.use('/Materiales', MaterialesRoutes);
app.use('/Proveedores', ProveedoresRoutes);
app.use('/Obras', ObrasRoutes);
app.use('/Obras', FotosObras)
app.use('/Obras', NotasObras)
app.use('/Obras', ObrasMateriales)
app.use('/Obras', ObrasTrabajadores)

await getConnection();
console.log("BD conectada")

app.listen(PORT, () => {
    console.log(`Servidor escuchando en http://localhost:${PORT}`);
    //backup.verificarYRespaldarAlArrancar();
});