CREATE PROCEDURE SP_ACTUALIZAR_CLIENTE (
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
    EXECUTE STATEMENT 'SELECT RDB$SET_CONTEXT(''USER_SESSION'', ''CURRENT_USER_ID'', ''' || :pIdTrabajador || ''') FROM RDB$DATABASE';
    UPDATE Clientes SET
        NombreCompleto = :pNombreCompleto,
        Direccion = :pDireccion,
        RFC = :pRFC,
        RegimenesFiscales_idRegimenFiscal = :pRegimenFiscalId,
        CodigoPostal = :pCodigoPostal,
        UsosCFDI_idUsoCFDI = :pUsoCFDIId,
        Observaciones = :pObservaciones,
        Tipo = :pTipo
    WHERE idCliente = :pIdCliente;
END