// backend/server.js - Sistema completo con Google Cloud AI
require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Importar servicios de Google Cloud
const speech = require('@google-cloud/speech');
const textToSpeech = require('@google-cloud/text-to-speech');
// const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST", "PUT", "DELETE"]
    }
});

const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Configuración de multer para archivos de audio
const upload = multer({
    dest: 'uploads/',
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// Configuración de PostgreSQL
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
});

// Inicializar clientes de Google Cloud
const speechClient = new speech.SpeechClient();
const ttsClient = new textToSpeech.TextToSpeechClient();
// const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ============================================
// INICIALIZACIÓN DE BASE DE DATOS
// ============================================

async function inicializarDB() {
    try {
        // Tabla de pedidos
        await pool.query(`
            CREATE TABLE IF NOT EXISTS pedidos (
                id SERIAL PRIMARY KEY,
                cliente_nombre TEXT NOT NULL,
                detalle_pedido JSONB NOT NULL,
                total REAL NOT NULL,
                estado TEXT DEFAULT 'pendiente',
                fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                notas TEXT,
                session_id TEXT
            )
        `);

        // Tabla de menú
        await pool.query(`
            CREATE TABLE IF NOT EXISTS menu (
                id SERIAL PRIMARY KEY,
                nombre TEXT NOT NULL,
                categoria TEXT NOT NULL,
                precio REAL NOT NULL,
                descripcion TEXT,
                disponible BOOLEAN DEFAULT true,
                aliases JSONB DEFAULT '[]',
                tags JSONB DEFAULT '[]',
                imagen_url TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Tabla de sesiones de voz
        await pool.query(`
            CREATE TABLE IF NOT EXISTS sesiones_voz (
                id SERIAL PRIMARY KEY,
                session_id TEXT UNIQUE NOT NULL,
                user_id TEXT,
                estado TEXT DEFAULT 'activa',
                contexto JSONB DEFAULT '{}',
                ultimo_mensaje TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Tabla de logs de interacción
        await pool.query(`
            CREATE TABLE IF NOT EXISTS logs_interaccion (
                id SERIAL PRIMARY KEY,
                session_id TEXT,
                tipo TEXT,
                entrada TEXT,
                salida JSONB,
                confianza REAL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        console.log('✅ Tablas de base de datos verificadas/creadas.');
        
        // Insertar menú de ejemplo si está vacío
        const menuCount = await pool.query('SELECT COUNT(*) FROM menu');
        if (parseInt(menuCount.rows[0].count) === 0) {
            await insertarMenuInicial();
        }
    } catch (err) {
        console.error('❌ Error al inicializar DB:', err);
    }
}

async function insertarMenuInicial() {
    const menuItems = [
        // BRASA
        { nombre: '1 POLLO A LA BRASA', categoria: 'brasa', precio: 53.90, descripcion: 'Acompañado con papas fritas y ensalada mixta', aliases: ['pollo entero', 'un pollo', 'pollo completo'], tags: ['brasa', 'pollo'] },
        { nombre: '1/2 POLLO A LA BRASA', categoria: 'brasa', precio: 29.00, descripcion: 'Acompañado con papas fritas y ensalada mixta', aliases: ['medio pollo', 'mitad de pollo'], tags: ['brasa', 'pollo'] },
        { nombre: '1/4 POLLO A LA BRASA', categoria: 'brasa', precio: 15.50, descripcion: 'Acompañado con papas fritas y ensalada mixta', aliases: ['cuarto de pollo', 'un cuarto'], tags: ['brasa', 'pollo'] },
        
        // BROASTER
        { nombre: '1 POLLO BROASTER', categoria: 'broaster', precio: 53.90, descripcion: 'Acompañado con papas fritas y ensalada mixta', aliases: ['pollo broaster entero'], tags: ['broaster', 'pollo'] },
        { nombre: '1/2 POLLO BROASTER', categoria: 'broaster', precio: 29.00, descripcion: 'Acompañado con papas fritas y ensalada mixta', aliases: ['medio broaster'], tags: ['broaster', 'pollo'] },
        { nombre: '1/4 POLLO BROASTER', categoria: 'broaster', precio: 15.50, descripcion: 'Acompañado con papas fritas y ensalada mixta', aliases: ['cuarto broaster'], tags: ['broaster', 'pollo'] },
        
        // PARRILLAS
        { nombre: 'PARRILLA CHICA', categoria: 'parrillas', precio: 90.00, descripcion: 'Parrillada para 2-3 personas', aliases: ['parrilla pequeña'], tags: ['parrilla', 'carne'] },
        { nombre: 'PARRILLA FAMILIAR', categoria: 'parrillas', precio: 130.00, descripcion: 'Bife, costillas, chuleta, pechuga deshuesada, 2 anticuchos, 2 mollejitas y 1/4 brasa', aliases: ['parrilla grande'], tags: ['parrilla', 'carne'] },
        
        // CARNES Y PIQUEOS
        { nombre: 'BIFE', categoria: 'carnes', precio: 30.00, descripcion: 'Acompañado con papas fritas y ensalada mixta', aliases: ['bistec'], tags: ['carne', 'res'] },
        { nombre: 'COSTILLAS A LA BBQ', categoria: 'carnes', precio: 30.00, descripcion: 'Acompañado con papas fritas y ensalada mixta', aliases: ['costillas barbecue'], tags: ['carne', 'cerdo'] },
        { nombre: 'BROCHETA MIXTA', categoria: 'carnes', precio: 30.00, descripcion: 'Acompañado con papas fritas y ensalada mixta', aliases: ['brocheta'], tags: ['carne'] },
        { nombre: 'BROCHETA DE POLLO', categoria: 'carnes', precio: 25.00, descripcion: 'Acompañado con papas fritas y ensalada mixta', aliases: [], tags: ['pollo'] },
        { nombre: 'CHICHARRÓN', categoria: 'carnes', precio: 20.00, descripcion: 'Acompañado con papas fritas y ensalada mixta', aliases: ['chicharrón de cerdo'], tags: ['cerdo'] },
        { nombre: 'MARUCHA', categoria: 'carnes', precio: 25.00, descripcion: 'Acompañado con papas fritas y ensalada mixta', aliases: [], tags: ['carne'] },
        { nombre: 'CHULETA DE CERDO', categoria: 'carnes', precio: 20.00, descripcion: 'Acompañado con papas fritas y ensalada mixta', aliases: ['chuleta'], tags: ['cerdo'] },
        { nombre: 'PECHUGA DESHUESADA', categoria: 'carnes', precio: 22.00, descripcion: 'Acompañado con papas fritas y ensalada mixta', aliases: ['pechuga'], tags: ['pollo'] },
        { nombre: 'CHORIZO', categoria: 'carnes', precio: 20.00, descripcion: 'Acompañado con papas fritas y ensalada mixta', aliases: ['chorizo parrillero'], tags: ['cerdo'] },
        { nombre: 'MOLLEJITAS', categoria: 'carnes', precio: 17.00, descripcion: 'Acompañado con papas fritas y ensalada mixta', aliases: ['molleja'], tags: ['pollo'] },
        { nombre: 'ANTICUCHOS', categoria: 'carnes', precio: 17.00, descripcion: 'Acompañado con papas fritas y ensalada mixta', aliases: ['anticucho'], tags: ['carne'] },
        
        // GUARNICIONES
        { nombre: 'PAPAS FRITAS', categoria: 'guarniciones', precio: 9.00, descripcion: 'Porción de papas fritas', aliases: ['papas'], tags: ['acompañamiento'] },
        { nombre: 'ENSALADA MIXTA', categoria: 'guarniciones', precio: 12.00, descripcion: 'Ensalada fresca mixta', aliases: ['ensalada'], tags: ['acompañamiento'] },
        { nombre: 'ENSALADA PERSONAL', categoria: 'guarniciones', precio: 6.00, descripcion: 'Ensalada personal', aliases: [], tags: ['acompañamiento'] },
        { nombre: 'PORCIÓN DE ARROZ', categoria: 'guarniciones', precio: 6.00, descripcion: 'Porción de arroz blanco', aliases: ['arroz'], tags: ['acompañamiento'] }
    ];

    for (const item of menuItems) {
        await pool.query(
            'INSERT INTO menu (nombre, categoria, precio, descripcion, aliases, tags) VALUES ($1, $2, $3, $4, $5, $6)',
            [item.nombre, item.categoria, item.precio, item.descripcion, JSON.stringify(item.aliases), JSON.stringify(item.tags)]
        );
    }
    console.log('✅ Menú inicial insertado.');
}

// ============================================
// SERVICIOS DE GOOGLE CLOUD AI
// ============================================

// Speech-to-Text
async function transcribirAudio(audioBuffer, encoding = 'WEBM_OPUS') {
    try {
        const audio = {
            content: audioBuffer.toString('base64'),
        };

        const config = {
            encoding: encoding,
            sampleRateHertz: 48000,
            languageCode: process.env.DEFAULT_LANGUAGE || 'es-PE',
            enableAutomaticPunctuation: true,
            model: 'latest_long',
        };

        const request = {
            audio: audio,
            config: config,
        };

        const [response] = await speechClient.recognize(request);
        // Return the full response structure as requested
        return response;
    } catch (error) {
        console.error('Error en Speech-to-Text:', error);
        throw error;
    }
}

// Text-to-Speech
async function generarAudio(texto) {
    try {
        const request = {
            input: { text: texto },
            voice: {
                languageCode: 'es-US',
                name: process.env.TTS_VOICE_NAME || 'es-US-Neural2-A',
            },
            audioConfig: {
                audioEncoding: 'MP3',
                speakingRate: 0.95,
                pitch: 0,
            },
        };

        const [response] = await ttsClient.synthesizeSpeech(request);
        return response.audioContent;
    } catch (error) {
        console.error('Error en Text-to-Speech:', error);
        throw error;
    }
}

// Análisis de intención con n8n Webhook
async function analizarIntencion(texto, menuItems, contexto = {}) {
    try {
        const webhookUrl = process.env.N8N_WEBHOOK_URL;
        if (!webhookUrl) {
            console.error('N8N_WEBHOOK_URL no definida en .env');
            return {
                intencion: 'error',
                categoria: null,
                platos: [],
                accion: 'preguntar',
                confianza: 0,
                respuesta_habla: 'Error de configuración: falta la URL del webhook.',
                metadata: { error: 'N8N_WEBHOOK_URL missing' }
            };
        }

        console.log(`Enviando a n8n: ${texto}`);
        const response = await axios.post(webhookUrl, {
            texto: texto
        });

        console.log('Respuesta cruda de n8n:', JSON.stringify(response.data, null, 2));
        
        let data = response.data;
        // Si n8n devuelve un array (comportamiento por defecto), tomamos el primer elemento
        if (Array.isArray(data)) {
            data = data[0];
        }

        const { plato, cantidad, mensaje } = data;

        // Mapear respuesta de n8n al formato interno
        let platosEncontrados = [];
        
        if (plato) {
            // Normalizar strings para comparación
            const normalize = (str) => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const platoNormalized = normalize(plato);

            const foundItem = menuItems.find(item => {
                const nombreNormalized = normalize(item.nombre);
                if (nombreNormalized.includes(platoNormalized)) return true;
                if (item.aliases && Array.isArray(item.aliases)) {
                     return item.aliases.some(alias => normalize(alias).includes(platoNormalized));
                }
                return false;
            });

            if (foundItem) {
                platosEncontrados.push({
                    id: foundItem.id,
                    nombre: foundItem.nombre,
                    cantidad: cantidad || 1,
                    precio: foundItem.precio
                });
            } else {
                console.warn(`Plato '${plato}' retornado por n8n no encontrado en el menú local.`);
            }
        }

        return {
            intencion: plato ? 'confirmar_pedido' : 'preguntar',
            categoria: null,
            platos: platosEncontrados,
            accion: plato ? 'ejecutar' : 'preguntar',
            confianza: 1.0,
            respuesta_habla: mensaje || "Procesado.",
            metadata: { source: 'n8n', raw_response: data }
        };

    } catch (error) {
        console.error('Error en análisis de intención (n8n):', error.message);
        return {
            intencion: 'error',
            categoria: null,
            platos: [],
            accion: 'preguntar',
            confianza: 0,
            respuesta_habla: 'Lo siento, hubo un problema al procesar tu solicitud.',
            metadata: { error: error.message }
        };
    }
}

// ============================================
// RUTAS DE API
// ============================================

// Ruta de prueba
app.get('/', (req, res) => {
    res.json({
        message: 'Backend Brasa Roja con Google Cloud AI',
        version: '2.0.0',
        endpoints: [
            'POST /api/voz/transcribir',
            'POST /api/voz/procesar',
            'GET /api/menu',
            'GET /api/pedidos',
            'POST /api/pedidos',
            'PUT /api/pedidos/:id/estado'
        ]
    });
});

// Obtener menú completo
app.get('/api/menu', async (req, res) => {
    try {
        const { categoria, disponible } = req.query;
        let query = 'SELECT * FROM menu WHERE 1=1';
        const params = [];

        if (categoria) {
            params.push(categoria);
            query += ` AND categoria = $${params.length}`;
        }

        if (disponible !== undefined) {
            params.push(disponible === 'true');
            query += ` AND disponible = $${params.length}`;
        }

        query += ' ORDER BY categoria, precio';

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error al obtener menú:', error);
        res.status(500).json({ error: 'Error al obtener el menú' });
    }
});

// Transcribir audio (STT)
app.post('/api/voz/transcribir', upload.single('audio'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No se recibió archivo de audio' });
        }

        // Detectar encoding basado en mimetype
        let encoding = 'WEBM_OPUS'; // Default
        const mimeType = req.file.mimetype;

        if (mimeType.includes('wav')) {
            encoding = 'LINEAR16';
        } else if (mimeType.includes('m4a') || mimeType.includes('mp4')) {
            encoding = 'ENCODING_UNSPECIFIED';
        }

        const audioBuffer = fs.readFileSync(req.file.path);
        const resultado = await transcribirAudio(audioBuffer, encoding);

        // Eliminar archivo temporal
        fs.unlinkSync(req.file.path);

        // Devolver el JSON exacto que devuelve Google Cloud Speech API
        // { results: [ { alternatives: [ { transcript: "..." } ] } ] }
        res.json(resultado);
    } catch (error) {
        console.error('Error en transcripción:', error);
        res.status(500).json({ error: 'Error al transcribir audio' });
    }
});

// Procesar comando de voz completo (STT + IA + TTS)
app.post('/api/voz/procesar', upload.single('audio'), async (req, res) => {
    try {
        let texto = req.body.texto;
        const sessionId = req.body.session_id || `session_${Date.now()}`;
        const userId = req.body.user_id || 'anonimo';

        // Si viene audio, transcribir primero
        if (req.file) {
            const audioBuffer = fs.readFileSync(req.file.path);
            
            // Detectar encoding
            let encoding = 'WEBM_OPUS';
            const mimeType = req.file.mimetype;
            if (mimeType.includes('wav')) encoding = 'LINEAR16';
            else if (mimeType.includes('m4a') || mimeType.includes('mp4')) encoding = 'ENCODING_UNSPECIFIED';

            const sttResponse = await transcribirAudio(audioBuffer, encoding);
            
            // Extraer texto de la respuesta cruda de Google
            if (sttResponse.results && sttResponse.results.length > 0) {
                texto = sttResponse.results
                    .map(result => result.alternatives[0].transcript)
                    .join('\n');
            } else {
                texto = "";
            }
            
            fs.unlinkSync(req.file.path);
        }

        if (!texto) {
            return res.status(400).json({ error: 'No se recibió texto ni audio, o no se pudo transcribir' });
        }

        // Obtener menú
        const menuResult = await pool.query('SELECT * FROM menu WHERE disponible = true');
        const menuItems = menuResult.rows;

        // Obtener contexto de sesión
        let contexto = {};
        const sessionResult = await pool.query(
            'SELECT contexto FROM sesiones_voz WHERE session_id = $1',
            [sessionId]
        );

        if (sessionResult.rows.length > 0) {
            contexto = sessionResult.rows[0].contexto;
        } else {
            // Crear nueva sesión
            await pool.query(
                'INSERT INTO sesiones_voz (session_id, user_id, contexto) VALUES ($1, $2, $3)',
                [sessionId, userId, JSON.stringify({})]
            );
        }

        // Analizar intención con Gemini
        const analisis = await analizarIntencion(texto, menuItems, contexto);

        // Generar audio de respuesta
        const audioRespuesta = await generarAudio(analisis.respuesta_habla);

        // Actualizar contexto
        const nuevoContexto = {
            ...contexto,
            ultimo_estado: analisis.intencion,
            ultimos_platos: analisis.platos,
            timestamp: new Date().toISOString()
        };

        await pool.query(
            'UPDATE sesiones_voz SET contexto = $1, ultimo_mensaje = $2, updated_at = CURRENT_TIMESTAMP WHERE session_id = $3',
            [JSON.stringify(nuevoContexto), texto, sessionId]
        );

        // Guardar log
        await pool.query(
            'INSERT INTO logs_interaccion (session_id, tipo, entrada, salida, confianza) VALUES ($1, $2, $3, $4, $5)',
            [sessionId, 'voz', texto, JSON.stringify(analisis), analisis.confianza]
        );

        // Si la acción es ejecutar y la intención es confirmar pedido, crear el pedido
        if (analisis.accion === 'ejecutar' && analisis.intencion === 'confirmar_pedido' && analisis.platos.length > 0) {
            const total = analisis.platos.reduce((sum, p) => sum + (p.precio * p.cantidad), 0);
            const pedidoResult = await pool.query(
                'INSERT INTO pedidos (cliente_nombre, detalle_pedido, total, session_id) VALUES ($1, $2, $3, $4) RETURNING id',
                [userId, JSON.stringify(analisis.platos), total, sessionId]
            );

            // Notificar a cocina via WebSocket
            io.emit('nuevo_pedido', {
                id: pedidoResult.rows[0].id,
                cliente_nombre: userId,
                detalle_pedido: analisis.platos,
                total,
                estado: 'pendiente',
                fecha: new Date()
            });

            analisis.metadata.pedido_id = pedidoResult.rows[0].id;
        }

        res.json({
            ...analisis,
            texto_reconocido: texto,
            session_id: sessionId,
            audio_respuesta: audioRespuesta.toString('base64')
        });

    } catch (error) {
        console.error('Error al procesar voz:', error);
        res.status(500).json({ error: 'Error al procesar comando de voz' });
    }
});

// Obtener todos los pedidos
app.get('/api/pedidos', async (req, res) => {
    try {
        const { estado } = req.query;
        let query = 'SELECT * FROM pedidos';
        const params = [];

        if (estado) {
            params.push(estado);
            query += ' WHERE estado = $1';
        }

        query += ' ORDER BY fecha DESC';

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error al obtener pedidos:', error);
        res.status(500).json({ error: 'Error al obtener pedidos' });
    }
});

// Crear pedido
app.post('/api/pedidos', async (req, res) => {
    try {
        const { cliente_nombre, detalle_pedido, total, notas } = req.body;

        if (!cliente_nombre || !detalle_pedido || !total) {
            return res.status(400).json({ error: 'Faltan datos requeridos' });
        }

        const result = await pool.query(
            'INSERT INTO pedidos (cliente_nombre, detalle_pedido, total, notas) VALUES ($1, $2, $3, $4) RETURNING *',
            [cliente_nombre, JSON.stringify(detalle_pedido), total, notas]
        );

        const pedido = result.rows[0];

        // Notificar a cocina
        io.emit('nuevo_pedido', pedido);

        res.status(201).json(pedido);
    } catch (error) {
        console.error('Error al crear pedido:', error);
        res.status(500).json({ error: 'Error al crear pedido' });
    }
});

// Actualizar estado de pedido
app.put('/api/pedidos/:id/estado', async (req, res) => {
    try {
        const { id } = req.params;
        const { estado } = req.body;

        if (!estado) {
            return res.status(400).json({ error: 'Se requiere el estado' });
        }

        const result = await pool.query(
            'UPDATE pedidos SET estado = $1 WHERE id = $2 RETURNING *',
            [estado, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Pedido no encontrado' });
        }

        const pedido = result.rows[0];

        // Notificar cambio de estado
        io.emit('pedido_actualizado', pedido);

        res.json(pedido);
    } catch (error) {
        console.error('Error al actualizar pedido:', error);
        res.status(500).json({ error: 'Error al actualizar pedido' });
    }
});

// ============================================
// WEBSOCKETS PARA COCINA EN TIEMPO REAL
// ============================================

io.on('connection', (socket) => {
    console.log('🔌 Cliente conectado:', socket.id);

    socket.on('disconnect', () => {
        console.log('🔌 Cliente desconectado:', socket.id);
    });

    socket.on('solicitar_pedidos', async () => {
        try {
            const result = await pool.query(
                'SELECT * FROM pedidos WHERE estado != $1 ORDER BY fecha DESC',
                ['completado']
            );
            socket.emit('lista_pedidos', result.rows);
        } catch (error) {
            console.error('Error al enviar pedidos:', error);
        }
    });
});

// ============================================
// INICIAR SERVIDOR
// ============================================

pool.connect((err, client, release) => {
    if (err) {
        return console.error('❌ Error al conectar con PostgreSQL:', err.stack);
    }
    console.log('✅ Conectado a PostgreSQL');
    release();
    inicializarDB();
});

server.listen(port, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${port}`);
    console.log('📡 WebSocket habilitado para cocina en tiempo real');
    console.log('🎤 Google Cloud Speech-to-Text configurado');
    console.log('🔊 Google Cloud Text-to-Speech configurado');
    console.log('🤖 Google Gemini AI configurado');
});
