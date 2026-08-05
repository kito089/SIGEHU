const fs = require('fs');

// Leer las variables que build.bat cargo
const envConfig = {
    apiPort: process.env.API_PORT || 3000,
    zrokName: process.env.ZROK_DOMAIN,
    apiUrl: process.env.FRONTEND_URL,
    dbUsername: process.env.DB_USERNAME,
    dbPassword: process.env.DB_PASSWORD,
    jwtSecret: process.env.JWT_SECRET
};

// Crear un config.json que el backend puede leer con require('./config.json')
fs.writeFileSync(
    './SIGEHUBack/config.json', 
    JSON.stringify(envConfig, null, 2)
);

// Sobreescribir el environment.ts de Angular antes de que ng build se ejecute
const angularEnv = `export const environment = {
  production: true,
  apiUrl: '${envConfig.apiUrl}'
};`;

fs.writeFileSync('./SIGEHUFront/src/environments/environment.prod.ts', angularEnv);
fs.writeFileSync('./SIGEHUFront/src/environments/environment.ts', angularEnv);

console.log('Archivos de configuracion de Angular y Backend generados correctamente.');
