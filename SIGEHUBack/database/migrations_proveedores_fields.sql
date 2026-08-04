-- =============================================================================
-- MIGRACIÓN: Proveedores - expansión de campos + sub-CRUD de materiales
-- Base de datos: Firebird 5 (SIGEHU.FDB)
-- Ejecutar con ISQL o tu cliente Firebird preferido usando el delimitador "^"
--   Ej.: isql -u SYSDBA -p masterkey SIGEHU.FDB -i migrations_proveedores_fields.sql
-- =============================================================================

SET TERM ^ ;

-- -----------------------------------------------------------------------------
-- 1) Agregar los dos campos opcionales a Proveedores.
--    "GiroPrincipal" = Giro Principal, "ContactoCompras" = Nombre de contacto
--    de compras. Ambos opcionales (no NULL).
-- -----------------------------------------------------------------------------
ALTER TABLE Proveedores ADD GiroPrincipal VARCHAR(100);
ALTER TABLE Proveedores ADD ContactoCompras VARCHAR(150);

-- -----------------------------------------------------------------------------
-- 2) Reemplazar SP_INSERTAR_PROVEEDOR para recibir los nuevos campos.
-- -----------------------------------------------------------------------------
CREATE OR ALTER PROCEDURE SP_INSERTAR_PROVEEDOR (
    pNombre           VARCHAR(100),
    pDireccion        BLOB SUB_TYPE TEXT,
    pTelefono         VARCHAR(15),
    pCorreo           VARCHAR(254),
    pGiroPrincipal    VARCHAR(100),
    pContactoCompras  VARCHAR(150),
    pNotas            BLOB SUB_TYPE TEXT
)
RETURNS (
    oIdProveedor INTEGER
)
AS
BEGIN
    INSERT INTO Proveedores (Nombre, Direccion, Telefono, Correo, GiroPrincipal, ContactoCompras, Notas)
    VALUES (:pNombre, :pDireccion, :pTelefono, :pCorreo, :pGiroPrincipal, :pContactoCompras, :pNotas)
    RETURNING idProveedor INTO :oIdProveedor;

    SUSPEND;
END^

-- -----------------------------------------------------------------------------
-- 3) Reemplazar SP_ACTUALIZAR_PROVEEDOR para recibir los nuevos campos.
-- -----------------------------------------------------------------------------
CREATE OR ALTER PROCEDURE SP_ACTUALIZAR_PROVEEDOR (
    pIdProveedor      INTEGER,
    pNombre           VARCHAR(100),
    pDireccion        BLOB SUB_TYPE TEXT,
    pTelefono         VARCHAR(15),
    pCorreo           VARCHAR(254),
    pGiroPrincipal    VARCHAR(100),
    pContactoCompras  VARCHAR(150),
    pNotas            BLOB SUB_TYPE TEXT
)
AS
BEGIN
    UPDATE Proveedores
    SET Nombre          = :pNombre,
        Direccion       = :pDireccion,
        Telefono        = :pTelefono,
        Correo          = :pCorreo,
        GiroPrincipal   = :pGiroPrincipal,
        ContactoCompras = :pContactoCompras,
        Notas           = :pNotas
    WHERE idProveedor = :pIdProveedor;
END^

-- -----------------------------------------------------------------------------
-- 4) La tabla intermedia Proveedores_has_Materiales YA existe en el esquema con
--    esta estructura (ver SIGEHU.sql línea 583):
--      Proveedores_idProveedor INTEGER NOT NULL,
--      Materiales_idMaterial INTEGER NOT NULL,
--      PrecioUnitario DECIMAL(10,2),
--      Notas BLOB SUB_TYPE TEXT,
--      PRIMARY KEY (Proveedores_idProveedor, Materiales_idMaterial)
--    Si por cualquier motivo no existiera, descomenta:
-- -----------------------------------------------------------------------------
/*
CREATE TABLE Proveedores_has_Materiales (
    Proveedores_idProveedor INTEGER NOT NULL,
    Materiales_idMaterial INTEGER NOT NULL,
    PrecioUnitario DECIMAL(10,2),
    Notas BLOB SUB_TYPE TEXT,
    PRIMARY KEY (Proveedores_idProveedor, Materiales_idMaterial),
    CONSTRAINT fk_PHM_Proveedores1 FOREIGN KEY (Proveedores_idProveedor)
        REFERENCES Proveedores (idProveedor) ON DELETE NO ACTION,
    CONSTRAINT fk_PHM_Materiales1 FOREIGN KEY (Materiales_idMaterial)
        REFERENCES Materiales (idMaterial) ON DELETE NO ACTION
);
CREATE INDEX fk_PHM_Materiales1_idx ON Proveedores_has_Materiales(Materiales_idMaterial);
CREATE INDEX fk_PHM_Proveedores1_idx ON Proveedores_has_Materiales(Proveedores_idProveedor);
*/

-- -----------------------------------------------------------------------------
-- 5) SP de vinculación (ya existen; se re-declaran por idempotencia y para
--    garantizar consistencia con la columna PrecioUnitario).
-- -----------------------------------------------------------------------------
CREATE OR ALTER PROCEDURE SP_VINCULAR_MATERIAL_PROVEEDOR (
    pIdProveedor    INTEGER,
    pIdMaterial     INTEGER,
    pPrecioUnitario DECIMAL(10,2),
    pNotas          BLOB SUB_TYPE TEXT
)
AS
BEGIN
    UPDATE OR INSERT INTO Proveedores_has_Materiales
        (Proveedores_idProveedor, Materiales_idMaterial, PrecioUnitario, Notas)
    VALUES
        (:pIdProveedor, :pIdMaterial, :pPrecioUnitario, :pNotas)
    MATCHING (Proveedores_idProveedor, Materiales_idMaterial);
END^

CREATE OR ALTER PROCEDURE SP_DESVINCULAR_MATERIAL_PROVEEDOR (
    pIdProveedor INTEGER,
    pIdMaterial  INTEGER
)
AS
BEGIN
    DELETE FROM Proveedores_has_Materiales
    WHERE Proveedores_idProveedor = :pIdProveedor
      AND Materiales_idMaterial   = :pIdMaterial;
END^

SET TERM ; ^