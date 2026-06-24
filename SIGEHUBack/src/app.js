const dotenv = require('dotenv');
const express = require('express');
const cors = require('cors');
const backup = require('./database/Backup');

const PORT = process.env.PORT || 3000;
const app = express();


dotenv.config();
app.use(cors());
app.use(express.json());

app.listen(PORT, () => {
    console.log(`Servidor escuchando en http://localhost:${PORT}`);
    backup.verificarYRespaldarAlArrancar();
});