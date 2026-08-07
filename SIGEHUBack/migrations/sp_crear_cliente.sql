CREATE PROCEDURE SP_CREAR_CLIENTE (
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
RETURNS (oIdCliente INTEGER)
AS
BEGIN
    EXECUTE STATEMENT 'SELECT RDB$SET_CONTEXT(''USER_SESSION'', ''CURRENT_USER_ID'', ''' || :pIdTrabajador || ''') FROM RDB$DATABASE';
    INSERT INTO Clientes (NombreCompleto, Direccion, RFC, RegimenesFiscales_idRegimenFiscal, CodigoPostal, UsosCFDI_idUsoCFDI, Observaciones, Tipo)
    VALUES (:pNombreCompleto, :pDireccion, :pRFC, :pRegimenFiscalId, :pCodigoPostal, :pUsoCFDIId, :pObservaciones, :pTipo)
    RETURNING idCliente INTO :oIdCliente;
    SUSPEND;
END