// backend/server.js
require('dotenv').config(); // Cargar variables de entorno
const express = require('express');
const { Pool } = require('pg'); // Importar Pool de pg
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors()); // Habilitar CORS para todas las rutas
app.use(express.json()); // Para parsear el cuerpo de las solicitudes JSON

// Configuración de PostgreSQL
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
});

// Verificar conexión
pool.connect((err, client, release) => {
    if (err) {
        return console.error('Error al conectar con la base de datos PostgreSQL:', err.stack);
    }
    console.log('Conectado a la base de datos PostgreSQL.');
    crearTablaPedidos();
    release();
});

// Función para crear la tabla si no existe
function crearTablaPedidos() {
    const sql = `
        CREATE TABLE IF NOT EXISTS pedidos (
            id SERIAL PRIMARY KEY,
            cliente_nombre TEXT NOT NULL,
            detalle_pedido JSONB NOT NULL,
            total REAL NOT NULL,
            estado TEXT DEFAULT 'pendiente',
            fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `;
    pool.query(sql, (err, res) => {
        if (err) {
            console.error('Error al crear la tabla pedidos:', err.stack);
        } else {
            console.log('Tabla "pedidos" verificada/creada.');
        }
    });
}

// Ruta de prueba
app.get('/', (req, res) => {
    res.send('Backend Brasa Roja (PostgreSQL) Funcionando');
});

// Ruta para obtener todos los pedidos (para la cocina)
app.get('/api/pedidos', (req, res) => {
    const sql = 'SELECT * FROM pedidos ORDER BY fecha DESC';
    pool.query(sql, (err, result) => {
        if (err) {
            console.error('Error al obtener pedidos:', err.stack);
            return res.status(500).json({ message: 'Error al obtener los pedidos.' });
        }
        // En Postgres, si usamos JSONB, el driver de pg ya lo devuelve como objeto, no string.
        // Pero verifiquemos si necesitamos parsear o no. 
        // pg parsea JSON/JSONB automáticamente.
        res.status(200).json(result.rows);
    });
});

// Ruta para recibir y guardar pedidos
app.post('/api/pedidos', (req, res) => {
    const { cliente_nombre, detalle_pedido, total } = req.body;

    if (!cliente_nombre || !detalle_pedido || !total) {
        return res.status(400).json({ message: 'Faltan datos requeridos para el pedido.' });
    }

    const sql = 'INSERT INTO pedidos (cliente_nombre, detalle_pedido, total) VALUES ($1, $2, $3) RETURNING id';
    const params = [cliente_nombre, JSON.stringify(detalle_pedido), total];

    pool.query(sql, params, (err, result) => {
        if (err) {
            console.error('Error al insertar pedido:', err.stack);
            return res.status(500).json({ message: 'Error al guardar el pedido.' });
        }
        res.status(201).json({
            message: 'Pedido recibido y guardado con éxito.',
            pedidoId: result.rows[0].id,
        });
    });
});

// Ruta para actualizar el estado de un pedido (ej. de 'pendiente' a 'completado')
//lol
app.put('/api/pedidos/:id/estado', (req, res) => {
    const { id } = req.params;
    const { estado } = req.body;

    if (!estado) {
        return res.status(400).json({ message: 'Se requiere el nuevo estado.' });
    }

    const sql = 'UPDATE pedidos SET estado = $1 WHERE id = $2';
    pool.query(sql, [estado, id], (err, result) => {
        if (err) {
            console.error('Error al actualizar estado:', err.stack);
            return res.status(500).json({ message: 'Error al actualizar el pedido.' });
        }
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Pedido no encontrado.' });
        }
        res.status(200).json({ message: 'Estado del pedido actualizado.' });
    });
});

// Iniciar el servidor
app.listen(port, () => {
    console.log(`Servidor escuchando en http://localhost:${port}`);
});
