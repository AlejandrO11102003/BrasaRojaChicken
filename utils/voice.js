// utils/voice.js
export let sintetizadorVoz = window.speechSynthesis;
export let enunciadoActual = null; // Asegúrate de que esta línea esté presente y tenga 'export'
export let reconocimientoVoz = null;
export let escuchando = false;

export function hablar(texto, callback = () => { }) {
    // Asegúrate de que callback tenga un valor por defecto
    if (sintetizadorVoz.speaking) {
        sintetizadorVoz.cancel();
    }
    enunciadoActual = new SpeechSynthesisUtterance(texto);

    // --- Lógica para seleccionar voz masculina ---
    const voces = sintetizadorVoz.getVoices();
    let vozMasculina = voces.find(
        (voice) =>
            voice.lang.startsWith('es') &&
            (voice.name.includes('Google') ||
                voice.name.includes('male') ||
                voice.name.includes('masculino') ||
                voice.name.includes('Jorge') ||
                voice.name.includes('Juan') ||
                voice.name.includes('Pablo')) &&
            !voice.name.includes('femenino') &&
            !voice.name.includes('female')
    );

    if (vozMasculina) {
        enunciadoActual.voice = vozMasculina;
        console.log('Usando voz:', vozMasculina.name);
    } else {
        console.warn(
            'No se encontró una voz masculina en español. Usando la voz por defecto.'
        );
        let vozEspanol = voces.find((voice) => voice.lang.startsWith('es'));
        if (vozEspanol) {
            enunciadoActual.voice = vozEspanol;
            console.log('Usando voz por defecto en español:', vozEspanol.name);
        }
    }
    // --- Fin de la lógica de selección de voz ---

    enunciadoActual.rate = 1.3; // Velocidad de habla (1 es normal)
    enunciadoActual.pitch = 0.8; // Tono de voz (1 es normal)

    enunciadoActual.onend = () => {
        console.log('Lectura finalizada.');
        enunciadoActual = null;
        callback(); // <--- ¡Añadir esta línea!
    };
    enunciadoActual.onerror = (event) => {
        console.error('Error en la síntesis de voz:', event.error);
        enunciadoActual = null;
        callback(); // <--- ¡Añadir esta línea!
    };

    sintetizadorVoz.speak(enunciadoActual);
}

// Función para iniciar el reconocimiento de voz
export function iniciarReconocimientoVoz(
    onResultCallback,
    onErrorCallback = () => { }
) {
    // Añadir onErrorCallback
    if (escuchando) {
        console.log('Ya estoy escuchando.');
        return;
    }

    if (!('webkitSpeechRecognition' in window)) {
        hablar(
            'Lo siento, tu navegador no soporta el reconocimiento de voz. Por favor, usa Google Chrome.'
        );
        return;
    }

    reconocimientoVoz = new webkitSpeechRecognition();
    reconocimientoVoz.lang = 'es-ES'; // Configurar el idioma a español
    reconocimientoVoz.interimResults = false; // No mostrar resultados intermedios
    reconocimientoVoz.maxAlternatives = 1; // Solo la alternativa más probable

    reconocimientoVoz.onstart = () => {
        escuchando = true;
        console.log('Escuchando...');
    };

    reconocimientoVoz.onresult = (event) => {
        const ultimo = event.results.length - 1;
        const comando = event.results[ultimo][0].transcript;
        console.log('Comando de voz recibido:', comando);
        escuchando = false; // Detener la escucha después de un resultado
        onResultCallback(comando); // Usar onResultCallback
    };

    reconocimientoVoz.onerror = (event) => {
        console.error('Error en el reconocimiento de voz:', event.error);
        escuchando = false;
        if (event.error === 'no-speech') {
            hablar('No te escuché. Por favor, repite.', () => {
                onErrorCallback('no-speech'); // Llamar al callback de error específico
            });
        } else if (event.error === 'audio-capture') {
            hablar(
                'No pude acceder al micrófono. Asegúrate de que esté conectado y permitido.',
                () => {
                    onErrorCallback('audio-capture');
                }
            );
        } else if (event.error === 'not-allowed') {
            hablar(
                'El acceso al micrófono no está permitido. Por favor, habilítalo en la configuración de tu navegador.',
                () => {
                    onErrorCallback('not-allowed');
                }
            );
        } else {
            onErrorCallback(event.error); // Para otros errores
        }
    };

    reconocimientoVoz.onend = () => {
        escuchando = false;
        console.log('Reconocimiento de voz finalizado.');
    };

    sintetizadorVoz.cancel(); // Asegurarse de que no esté hablando antes de escuchar
    reconocimientoVoz.start();
}

export function detenerReconocimientoVoz() {
    if (reconocimientoVoz && escuchando) {
        reconocimientoVoz.stop();
        escuchando = false;
        console.log('Reconocimiento de voz detenido.');
    }
}
