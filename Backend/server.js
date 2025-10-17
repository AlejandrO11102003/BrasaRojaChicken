// backend/server.js
require('dotenv').config(); // Cargar variables de entorno
const express = require('express');
const { createClient } = require('@supabase/supabase-js'); // Importar Supabase
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors()); // Habilitar CORS para todas las rutas
app.use(express.json()); // Para parsear el cuerpo de las solicitudes JSON

// Configuración de Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error(
        'Error: Las variables de entorno SUPABASE_URL o SUPABASE_ANON_KEY no están definidas.'
    );
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Ruta de prueba
app.get('/', (req, res) => {
    res.send('Servidor Express funcionando!');
});

// Ruta para obtener todos los pedidos
app.get('/api/pedidos', async (req, res) => {
    try {
        const { data, error } = await supabase.from('pedidos').select('*');

        if (error) {
            console.error('Error al obtener los pedidos de Supabase:', error);
            return res
                .status(500)
                .json({ message: 'Error al obtener los pedidos.', error: error.message });
        }

        res.status(200).json(data);
    } catch (err) {
        console.error('Error en la ruta /api/pedidos (GET):', err);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});

// Ruta para recibir y guardar pedidos
app.post('/api/pedidos', async (req, res) => {
    const { cliente_nombre, detalle_pedido, total } = req.body;

    if (!cliente_nombre || !detalle_pedido || !total) {
        return res
            .status(400)
            .json({ message: 'Faltan datos requeridos para el pedido.' });
    }

    try {
        const { data, error } = await supabase
            .from('pedidos')
            .insert([{ cliente_nombre, detalle_pedido, total }]);

        if (error) {
            console.error('Error al insertar el pedido en Supabase:', error);
            return res
                .status(500)
                .json({ message: 'Error al guardar el pedido.', error: error.message });
        }

        res.status(201).json({
            message: 'Pedido recibido y guardado con éxito.',
            pedidoId: data ? data[0].id : 'N/A',
        });
    } catch (err) {
        console.error('Error en la ruta /api/pedidos:', err);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});

// Iniciar el servidor
app.listen(port, () => {
    console.log(`Servidor escuchando en http://localhost:${port}`);
});
