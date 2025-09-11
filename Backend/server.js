    // backend/server.js
    require('dotenv').config(); // Cargar variables de entorno
    const express = require('express');
    const mysql = require('mysql2/promise'); // Usar promesas para async/await
    const cors = require('cors');

    const app = express();
    const port = process.env.PORT || 3000;

    // Middleware
    app.use(cors()); // Habilitar CORS para todas las rutas
    app.use(express.json()); // Para parsear el cuerpo de las solicitudes JSON

    // Configuración de la base de datos
    const dbConfig = {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    };

    // Ruta de prueba
    app.get('/', (req, res) => {
        res.send('Servidor Express funcionando!');
    });

    // Iniciar el servidor
    app.listen(port, () => {
        console.log(`Servidor escuchando en http://localhost:${port}`);
    });