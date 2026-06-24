import { getConnection, sql } from '../config/connection.js';

// GET todos los platillos
const getPlatillos = async () => {
    const pool = await getConnection();
    const result = await pool.request()
        .query(`SELECT * FROM vw_MenuDetallado`);
    return result.recordset;
};

// GET todos los platillos activos con informacion completa
const getPlatillosCompletos = async () => {
    const pool = await getConnection();
    const result = await pool.request()
        .execute(`sp_GetAllPlatillos`);

    const raw = result.recordset[0][Object.keys(result.recordset[0])[0]];
    const data = JSON.parse(raw);

    const parsedData = data.map(item => ({
        ...item,
        Categoria: item.Categoria ? JSON.parse(item.Categoria) : null
    }));

    return parsedData;
}

// GET platillo por ID
const getPlatilloById = async (id) => {
    const pool = await getConnection();
    const result = await pool.request()
        .input('id', sql.Int, id)
        .query(`SELECT * FROM vw_MenuDetallado WHERE idPlatillo = @id`);
    return result.recordset[0] || null;
};

// GET estructura
const getStructure = async () => {
    const pool = await getConnection();
    const result = await pool.request()
        .execute('sp_GetPlatillosEstructura');

    const raw = result.recordset[0][Object.keys(result.recordset[0])[0]];
    return JSON.parse(raw);
};

// INSERT
const createPlatillo = async ({ Nombre, Descripcion, Precio, idCategoria }) => {
    const pool = await getConnection();

    const result = await pool.request()
        .input('Nombre', Nombre)
        .input('Descripcion', Descripcion)
        .input('Precio', Precio)
        .input('Categoria', idCategoria)
        .query(`
            INSERT INTO Platillos (Nombre, Descripcion, Precio, CategoriasPlatillos_idCategoriasPlatillos)
            VALUES (@Nombre, @Descripcion, @Precio, @Categoria);

            SELECT SCOPE_IDENTITY() AS idPlatillo;
        `);

    return result.recordset[0].idPlatillo;
};


// UPDATE
const updatePlatillo = async (id, { Nombre, Descripcion, Precio, idCategoria }) => {
    const pool = await getConnection();
    const result = await pool.request()
        .input('id', sql.Int, id)
        .input('Nombre', sql.VarChar(45), Nombre)
        .input('Descripcion', sql.VarChar(45), Descripcion || null)
        .input('Precio', sql.Decimal(10, 2), Precio)
        .input('idCategoria', sql.Int, idCategoria)
        .query(`
            UPDATE Platillos
            SET Nombre = @Nombre,
                Descripcion = @Descripcion,
                Precio = @Precio,
                CategoriasPlatillos_idCategoriasPlatillos = @idCategoria
            WHERE idPlatillo = @id
        `);

    return result.rowsAffected[0] > 0;
};

// Actualiza solo la columna Imagen — llamado después de guardar el archivo con multer
const updateImagen = async (id, filename) => {
    const pool = await getConnection();
    const result = await pool.request()
        .input('id', sql.Int, id)
        .input('Imagen', sql.VarChar(100), filename)
        .query(`
            UPDATE Platillos
            SET Imagen = @Imagen
            WHERE idPlatillo = @id
        `);

    return result.rowsAffected[0] > 0;
};


// DELETE (soft)
const deletePlatillo = async (id) => {
    const pool = await getConnection();
    const result = await pool.request()
        .input('id', sql.Int, id)
        .query(`UPDATE Platillos SET Activo = 0 WHERE idPlatillo = @id`);

    return result.rowsAffected[0] > 0;
};

// Menú digital
const getMenuDigital = async () => {
    const platillos = await getPlatillos();

    return platillos.reduce((menu, p) => {
        const cat = p.Categoria;

        if (!menu[cat]) menu[cat] = [];

        menu[cat].push({
            id: p.idPlatillo,
            nombre: p.Platillo,
            precio: p.Precio
        });

        return menu;
    }, {});
};

export default {
    getPlatillos,
    getPlatillosCompletos,
    getPlatilloById,
    getStructure,
    createPlatillo,
    updatePlatillo,
    updateImagen,
    deletePlatillo,
    getMenuDigital
};