/*
 * =============================================================================
 * MIGRACIÓN: Phase 2 - Módulo Clientes
 * =============================================================================
 * Objetivo: Actualizar el esquema de Clientes al nuevo modelo:
 *   - Agregar columna TIPO a CLIENTES
 *   - Crear SPs CRUD para Clientes
 *   - Actualizar vistas (VW_CLIENTES_CON_OBRAS, VW_CLIENTES_COMPLETO)
 *
 * Idempotente: Usa EXECUTE BLOCK con detección de existencia.
 * Reversible: Script rollback al final del archivo.
 *
 * Fecha: 2026-08-06
 * =============================================================================
 */

-- =============================================================================
-- PASO 1: DDL - Agregar columna TIPO a CLIENTES
-- =============================================================================

EXECUTE BLOCK
AS
BEGIN
    IF (NOT EXISTS (
        SELECT 1 FROM RDB$RELATION_FIELDS
        WHERE RDB$RELATION_NAME = 'CLIENTES'
          AND RDB$FIELD_NAME = 'TIPO'
    )) THEN
        EXECUTE STATEMENT '
            ALTER TABLE CLIENTES
            ADD TIPO VARCHAR(10) DEFAULT ''persona'' NOT NULL
            CHECK (Tipo IN (''persona'', ''empresa''))
        ';
END

-- =============================================================================
-- PASO 2: DDL - Índice para TIPO
-- =============================================================================

EXECUTE BLOCK
AS
BEGIN
    IF (NOT EXISTS (
        SELECT 1 FROM RDB$INDICES
        WHERE RDB$INDEX_NAME = 'IDX_CLIENTES_TIPO'
    )) THEN
        EXECUTE STATEMENT '
            CREATE INDEX IDX_CLIENTES_TIPO ON CLIENTES (TIPO)
        ';
END

-- =============================================================================
-- PASO 3: STORED PROCEDURES - CLIENTES
-- =============================================================================

SET TERM ^ ;

CREATE OR ALTER PROCEDURE SP_CREAR_CLIENTE (
    pNombreCompleto       VARCHAR(100),
    pDireccion            BLOB SUB_TYPE TEXT,
    pRFC                  VARCHAR(13),
    pRegimenFiscalId      INTEGER,
    pCodigoPostal         VARCHAR(5),
    pUsoCFDIId            INTEGER,
    pObservaciones        BLOB SUB_TYPE TEXT,
    pTipo                 VARCHAR(10),
    pContactosJson        BLOB SUB_TYPE TEXT,
    pIdTrabajador         INTEGER
)
RETURNS (
    oIdCliente INTEGER
)
AS
DECLARE VARIABLE vIdCliente INTEGER;
DECLARE VARIABLE vContactos BLOB SUB_TYPE TEXT;
BEGIN
    IF (:pTipo NOT IN ('persona', 'empresa')) THEN
        EXCEPTION;

    SELECT RDB$SET_CONTEXT('USER_SESSION', 'CURRENT_USER_ID', CAST(:pIdTrabajador AS VARCHAR(20)))
    FROM RDB$DATABASE;

    INSERT INTO Clientes (
        NombreCompleto, Direccion, RFC, RegimenesFiscales_idRegimenFiscal,
        CodigoPostal, UsosCFDI_idUsoCFDI, Observaciones, Tipo
    ) VALUES (
        :pNombreCompleto, :pDireccion, :pRFC, :pRegimenFiscalId,
        :pCodigoPostal, :pUsoCFDIId, :pObservaciones, :pTipo
    ) RETURNING idCliente INTO :vIdCliente;

    oIdCliente = vIdCliente;

    SUSPEND;
END^

CREATE OR ALTER PROCEDURE SP_ACTUALIZAR_CLIENTE (
    pIdCliente            INTEGER,
    pNombreCompleto       VARCHAR(100),
    pDireccion            BLOB SUB_TYPE TEXT,
    pRFC                  VARCHAR(13),
    pRegimenFiscalId      INTEGER,
    pCodigoPostal         VARCHAR(5),
    pUsoCFDIId            INTEGER,
    pObservaciones        BLOB SUB_TYPE TEXT,
    pTipo                 VARCHAR(10),
    pIdTrabajador         INTEGER
)
AS
BEGIN
    IF (:pTipo NOT IN ('persona', 'empresa')) THEN
        EXCEPTION;

    SELECT RDB$SET_CONTEXT('USER_SESSION', 'CURRENT_USER_ID', CAST(:pIdTrabajador AS VARCHAR(20)))
    FROM RDB$DATABASE;

    UPDATE Clientes
    SET NombreCompleto = :pNombreCompleto,
        Direccion = :pDireccion,
        RFC = :pRFC,
        RegimenesFiscales_idRegimenFiscal = :pRegimenFiscalId,
        CodigoPostal = :pCodigoPostal,
        UsosCFDI_idUsoCFDI = :pUsoCFDIId,
        Observaciones = :pObservaciones,
        Tipo = :pTipo
    WHERE idCliente = :pIdCliente;
END^

CREATE OR ALTER PROCEDURE SP_OBTENER_CLIENTE (
    pIdCliente INTEGER
)
RETURNS (
    oIdCliente INTEGER,
    oNombreCompleto VARCHAR(100),
    oDireccion BLOB SUB_TYPE TEXT,
    oRFC VARCHAR(13),
    oRegimenFiscalId INTEGER,
    oCodigoPostal VARCHAR(5),
    oUsoCFDIId INTEGER,
    oObservaciones BLOB SUB_TYPE TEXT,
    oActivo BOOLEAN,
    oTipo VARCHAR(10)
)
AS
BEGIN
    SELECT
        idCliente, NombreCompleto, Direccion, RFC,
        RegimenesFiscales_idRegimenFiscal, CodigoPostal, UsosCFDI_idUsoCFDI,
        Observaciones, Activo, Tipo
    FROM Clientes
    WHERE idCliente = :pIdCliente
    INTO :oIdCliente, :oNombreCompleto, :oDireccion, :oRFC,
         :oRegimenFiscalId, :oCodigoPostal, :oUsoCFDIId,
         :oObservaciones, :oActivo, :oTipo;

    SUSPEND;
END^

CREATE OR ALTER PROCEDURE SP_LISTAR_CLIENTES (
    pSearch       VARCHAR(200),
    pTipo         VARCHAR(10),
    pConFiscales  VARCHAR(10),
    pActivo       VARCHAR(10),
    pPage         INTEGER,
    pPageSize     INTEGER
)
RETURNS (
    oIdCliente INTEGER,
    oNombreCompleto VARCHAR(100),
    oTelefonoPrincipal VARCHAR(15),
    oCorreoPrincipal VARCHAR(254),
    oRFC VARCHAR(13),
    oActivo BOOLEAN,
    oTieneDatosFiscales BOOLEAN,
    oTotalObrasActivas INTEGER,
    oTipo VARCHAR(10)
)
AS
DECLARE VARIABLE vOffset INTEGER;
BEGIN
    vOffset = (:pPage - 1) * :pPageSize;

    FOR SELECT
            c.idCliente,
            c.NombreCompleto,
            (SELECT FIRST 1 cc.Telefono FROM ContactosClientes cc WHERE cc.Clientes_idCliente = c.idCliente ORDER BY cc.idContactoCliente) AS TelefonoPrincipal,
            (SELECT FIRST 1 cc.Correo FROM ContactosClientes cc WHERE cc.Clientes_idCliente = c.idCliente ORDER BY cc.idContactoCliente) AS CorreoPrincipal,
            c.RFC,
            c.Activo,
            CASE WHEN c.RFC IS NOT NULL THEN TRUE ELSE FALSE END AS TieneDatosFiscales,
            COUNT(o.idObra) AS TotalObrasActivas,
            c.Tipo
        FROM Clientes c
        LEFT JOIN Obras o ON o.Clientes_idCliente = c.idCliente AND o.Activo = TRUE AND o.EstadosObra_idEstadoObra < 7
        WHERE 1=1
          AND (:pSearch IS NULL OR TRIM(:pSearch) = '' OR UPPER(c.NombreCompleto) LIKE UPPER('%' || :pSearch || '%'))
          AND (:pTipo IS NULL OR :pTipo NOT IN ('persona', 'empresa') OR c.Tipo = :pTipo)
          AND (:pConFiscales <> 'with' OR c.RFC IS NOT NULL)
          AND (:pConFiscales <> 'without' OR c.RFC IS NULL)
          AND (:pActivo <> 'true' OR c.Activo = TRUE)
          AND (:pActivo <> 'false' OR c.Activo = FALSE)
        GROUP BY c.idCliente, c.NombreCompleto, c.RFC, c.Activo, c.Tipo
        ORDER BY c.NombreCompleto
        ROWS :pPageSize TO :vOffset + :pPageSize - 1
    INTO :oIdCliente, :oNombreCompleto, :oTelefonoPrincipal, :oCorreoPrincipal,
         :oRFC, :oActivo, :oTieneDatosFiscales, :oTotalObrasActivas, :oTipo
    DO
        SUSPEND;
END^

SET TERM ;^

-- =============================================================================
-- PASO 4: VISTAS
-- =============================================================================

CREATE OR ALTER VIEW VW_CLIENTES_CON_OBRAS AS
SELECT
    c.idCliente,
    c.NombreCompleto,
    c.Tipo,
    (SELECT FIRST 1 cc.Telefono
     FROM ContactosClientes cc
     WHERE cc.Clientes_idCliente = c.idCliente
     ORDER BY cc.idContactoCliente) AS TelefonoPrincipal,
    (SELECT FIRST 1 cc.Correo
     FROM ContactosClientes cc
     WHERE cc.Clientes_idCliente = c.idCliente
     ORDER BY cc.idContactoCliente) AS CorreoPrincipal,
    c.RFC,
    c.Activo,
    CASE WHEN c.RFC IS NOT NULL THEN TRUE ELSE FALSE END  AS TieneDatosFiscales,
    COUNT(o.idObra)                                        AS TotalObrasActivas
FROM Clientes c
LEFT JOIN Obras o ON o.Clientes_idCliente = c.idCliente
                 AND o.Activo = TRUE
                 AND o.EstadosObra_idEstadoObra < 7
GROUP BY c.idCliente, c.NombreCompleto, c.Tipo, c.RFC, c.Activo;

CREATE OR ALTER VIEW VW_CLIENTES_COMPLETO AS
SELECT
    c.idCliente,
    c.NombreCompleto,
    c.Direccion,
    c.RFC,
    c.CodigoPostal,
    c.RegimenesFiscales_idRegimenFiscal AS idRegimenFiscal,
    c.UsosCFDI_idUsoCFDI AS idUsoCFDI,
    c.Observaciones,
    c.Activo,
    c.Tipo,
    rf.Nombre AS RegimenFiscal,
    ucfdi.Nombre AS UsoCFDI
FROM Clientes c
LEFT JOIN RegimenesFiscales rf ON rf.idRegimenFiscal = c.RegimenesFiscales_idRegimenFiscal
LEFT JOIN UsosCFDI ucfdi ON ucfdi.idUsoCFDI = c.UsosCFDI_idUsoCFDI;

-- =============================================================================
-- ROLLBACK
-- =============================================================================
/*
-- Deshacer migración (ejecutar en orden inverso):
DROP VIEW VW_CLIENTES_COMPLETO;
DROP VIEW VW_CLIENTES_CON_OBRAS;
DROP PROCEDURE SP_LISTAR_CLIENTES;
DROP PROCEDURE SP_OBTENER_CLIENTE;
DROP PROCEDURE SP_ACTUALIZAR_CLIENTE;
DROP PROCEDURE SP_CREAR_CLIENTE;
DROP INDEX IDX_CLIENTES_TIPO;
ALTER TABLE CLIENTES DROP TIPO;
*/