// Configuración - CAMBIA ESTA URL por tu webhook de n8n
const N8N_WEBHOOK_URL = 'https://alejandro1110.app.n8n.cloud/webhook-test/audio-menu';
// O si usas n8n local: 'http://localhost:5678/webhook/audio-menu'

const BACKEND_URL = 'http://localhost:3000';

// Elementos del DOM
const recordBtn = document.getElementById('record-btn');
const recordingIndicator = document.getElementById('recording-indicator');
const transcriptionDiv = document.getElementById('transcription');
const transcriptionText = document.getElementById('transcription-text');
const responseDiv = document.getElementById('response');
const responseText = document.getElementById('response-text');
const responseDetails = document.getElementById('response-details');
const cartDiv = document.getElementById('cart');
const cartItems = document.getElementById('cart-items');
const cartTotal = document.getElementById('cart-total');
const confirmOrderBtn = document.getElementById('confirm-order-btn');
const connectionStatus = document.getElementById('connection-status');

// Estado de la aplicación
let mediaRecorder;
let audioChunks = [];
let isRecording = false;
let sessionId = `session_${Date.now()}`;
let currentCart = [];

// Inicializar
async function init() {
    try {
        // Verificar soporte de audio
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            alert('Tu navegador no soporta grabación de audio');
            return;
        }

        // Solicitar permiso de micrófono
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // Configurar MediaRecorder
        mediaRecorder = new MediaRecorder(stream, {
            mimeType: 'audio/webm;codecs=opus'
        });

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                audioChunks.push(event.data);
            }
        };

        mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            audioChunks = [];
            await enviarAudioAN8N(audioBlob);
        };

        // Habilitar botón
        recordBtn.disabled = false;
        updateConnectionStatus(true);

        // Eventos del botón
        recordBtn.addEventListener('mousedown', startRecording);
        recordBtn.addEventListener('mouseup', stopRecording);
        recordBtn.addEventListener('touchstart', startRecording);
        recordBtn.addEventListener('touchend', stopRecording);

        // Confirmar pedido
        confirmOrderBtn.addEventListener('click', confirmarPedido);

    } catch (error) {
        console.error('Error al inicializar:', error);
        alert('No se pudo acceder al micrófono. Por favor, permite el acceso.');
    }
}

function startRecording(e) {
    e.preventDefault();
    if (mediaRecorder && mediaRecorder.state === 'inactive') {
        audioChunks = [];
        mediaRecorder.start();
        isRecording = true;
        recordingIndicator.classList.remove('hidden');
        recordBtn.style.background = 'linear-gradient(135deg, #f44336 0%, #d32f2f 100%)';
    }
}

function stopRecording(e) {
    e.preventDefault();
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
        isRecording = false;
        recordingIndicator.classList.add('hidden');
        recordBtn.style.background = 'linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%)';
    }
}

async function enviarAudioAN8N(audioBlob) {
    // Usar Web Speech API del navegador directamente
    usarWebSpeechAPI();
}

function procesarRespuesta(data) {
    // Mostrar transcripción
    if (data.texto_reconocido) {
        transcriptionText.textContent = `"${data.texto_reconocido}"`;
    }

    // Mostrar respuesta
    responseDiv.classList.remove('hidden');
    responseText.textContent = data.respuesta_habla || data.respuesta_tts;

    // Reproducir audio de respuesta si está disponible
    if (data.audio_respuesta) {
        reproducirAudio(data.audio_respuesta);
    } else {
        // Fallback: usar TTS del navegador
        hablar(data.respuesta_habla || data.respuesta_tts);
    }

    // Mostrar detalles
    if (data.platos && data.platos.length > 0) {
        mostrarPlatos(data.platos);
        actualizarCarrito(data.platos);
    }

    // Si hay metadata
    if (data.metadata) {
        responseDetails.innerHTML = `
            <small>
                <strong>Intención:</strong> ${data.intencion || 'N/A'}<br>
                <strong>Confianza:</strong> ${((data.confianza || 0) * 100).toFixed(0)}%
            </small>
        `;
    }
}

function mostrarPlatos(platos) {
    const platosHTML = platos.map(p => `
        <div style="margin: 0.5rem 0; padding: 0.5rem; background: rgba(255,255,255,0.05); border-radius: 8px;">
            <strong>${p.nombre}</strong><br>
            <small>Cantidad: ${p.cantidad || 1} | Precio: S/ ${p.precio}</small>
        </div>
    `).join('');
    
    responseDetails.innerHTML += `<div style="margin-top: 1rem;">${platosHTML}</div>`;
}

function actualizarCarrito(platos) {
    // Agregar platos al carrito
    platos.forEach(plato => {
        const existente = currentCart.find(p => p.id === plato.id);
        if (existente) {
            existente.cantidad += (plato.cantidad || 1);
        } else {
            currentCart.push({ ...plato, cantidad: plato.cantidad || 1 });
        }
    });

    // Renderizar carrito
    cartItems.innerHTML = currentCart.map(item => `
        <li>
            <span>${item.cantidad}x ${item.nombre}</span>
            <span>S/ ${(item.precio * item.cantidad).toFixed(2)}</span>
        </li>
    `).join('');

    const total = currentCart.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
    cartTotal.textContent = `S/ ${total.toFixed(2)}`;

    cartDiv.classList.remove('hidden');
}

async function confirmarPedido() {
    if (currentCart.length === 0) {
        alert('El carrito está vacío');
        return;
    }

    try {
        const total = currentCart.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);

        const response = await fetch(`${BACKEND_URL}/api/pedidos`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                cliente_nombre: 'Cliente Voz',
                detalle_pedido: currentCart,
                total: total,
                notas: `Pedido por voz - Sesión: ${sessionId}`
            })
        });

        if (response.ok) {
            const pedido = await response.json();
            hablar(`Pedido confirmado. Número de orden: ${pedido.id}`);
            
            // Limpiar carrito
            currentCart = [];
            cartDiv.classList.add('hidden');
            
            alert(`✅ Pedido #${pedido.id} confirmado exitosamente!`);
        } else {
            throw new Error('Error al confirmar pedido');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error al confirmar el pedido');
    }
}

function reproducirAudio(base64Audio) {
    const audio = new Audio(`data:audio/mp3;base64,${base64Audio}`);
    audio.play();
}

function hablar(texto) {
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(texto);
        utterance.lang = 'es-ES';
        utterance.rate = 0.9;
        speechSynthesis.speak(utterance);
    }
}

// Fallback: Web Speech API del navegador
function usarWebSpeechAPI() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        alert('Tu navegador no soporta reconocimiento de voz. Usa Chrome o Edge.');
        return;
    }

    // Mostrar loading
    transcriptionDiv.classList.remove('hidden');
    transcriptionText.textContent = 'Escuchando...';

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'es-PE';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event) => {
        const texto = event.results[0][0].transcript;
        transcriptionText.textContent = `"${texto}"`;
        
        // Enviar texto a n8n
        enviarTextoAN8N(texto);
    };

    recognition.onerror = (event) => {
        console.error('Error en reconocimiento:', event.error);
        transcriptionText.textContent = 'Error al reconocer voz. Intenta de nuevo.';
    };

    recognition.start();
}

async function enviarTextoAN8N(texto) {
    try {
        // Usar el backend local en lugar de n8n directamente
        const response = await fetch(`${BACKEND_URL}/api/voz/procesar`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                texto: texto,
                session_id: sessionId,
                user_id: 'usuario_web'
            })
        });

        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }

        const data = await response.json();
        procesarRespuesta(data);
    } catch (error) {
        console.error('Error:', error);
        responseDiv.classList.remove('hidden');
        responseText.textContent = 'Error al procesar la solicitud. Verifica que el backend esté corriendo.';
    }
}

function updateConnectionStatus(connected) {
    if (connected) {
        connectionStatus.classList.remove('offline');
        connectionStatus.classList.add('online');
        connectionStatus.innerHTML = '<i class="fas fa-circle"></i> Conectado';
    } else {
        connectionStatus.classList.remove('online');
        connectionStatus.classList.add('offline');
        connectionStatus.innerHTML = '<i class="fas fa-circle"></i> Desconectado';
    }
}

// Iniciar cuando cargue la página
window.addEventListener('load', init);
