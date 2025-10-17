import {
  hablar,
  iniciarReconocimientoVoz,
  sintetizadorVoz,
  escuchando,
  enunciadoActual,
} from './utils/voice.js';
import {
  cargarMenuDesdeHTML,
  iniciarMenuInteractivo,
  procesarSeleccionMenu,
} from './menu-logic.js';

// --- variables globales ---
// esta sección define las variables que se usarán en todo el script para mantener el estado de la aplicación.
let primerInicio = true; // bandera para saber si es la primera vez que el usuario interactúa.
let nombreCliente = ''; // variable que almacenará el nombre del cliente una vez que lo diga.

// --- funciones de inicio y gestión del cliente ---
// estas funciones manejan el saludo inicial y la captura del nombre del cliente.
function preguntarNombreCliente() {
  hablar('Hola. Bienvenido a Brasa Roja, ¿Cuál es tu nombre?', () => {
    iniciarReconocimientoVoz(procesarNombreCliente, (errorType) => {
      if (errorType === 'no-speech') {
        // si el reconocimiento de voz termina sin detectar audio, se vuelve a llamar a esta misma función para preguntar de nuevo.
        preguntarNombreCliente();
      }
      // para otros errores como 'audio-capture' o 'not-allowed', el sistema de voz ya informa al usuario.
      // la aplicación simplemente esperará a que el usuario presione la barra espaciadora de nuevo.
    });
  });
}

function procesarNombreCliente(comando) {
  let nombreExtraido = comando.trim();

  // se intenta extraer solo el nombre de frases comunes como "mi nombre es..." o "soy...".
  const patronesNombre = [
    /mi nombre es (.+)/i, // busca la frase "mi nombre es" seguida de cualquier texto.
    /soy (.+)/i, // busca la frase "soy" seguida de cualquier texto.
    /me llamo (.+)/i, // busca la frase "me llamo" seguida de cualquier texto.
  ];

  for (const patron of patronesNombre) {
    const match = nombreExtraido.match(patron);
    if (match && match[1]) {
      nombreExtraido = match[1].trim();
      break; // si se encuentra una coincidencia, se detiene el bucle para no seguir buscando.
    }
  }

  // si después de la extracción el nombre está vacío (por ejemplo, si el usuario solo dijo "hola"), se le asigna un valor por defecto.
  nombreCliente = nombreExtraido || 'Cliente Desconocido';
  console.log('script.js: nombreCliente establecido a:', nombreCliente); // log de depuración para verificar que el nombre se ha capturado correctamente.

  // si se logró capturar un nombre real, se procede al siguiente paso.
  if (nombreCliente !== 'Cliente Desconocido') {
    hablar(
      `Mucho gusto, ${nombreCliente}. ¿Sobre qué sección del menú deseas escuchar? Puedes decir "Brasa", "Broaster", "Parrillas", "Carnes y Piqueos" o "Guarniciones".`,
      () => {
        primerInicio = false; // se actualiza la bandera para indicar que la introducción ha terminado.
        // se inicia el reconocimiento de voz para escuchar la selección del menú, pasando el nombre del cliente.
        iniciarReconocimientoVoz((cmd) =>
          procesarSeleccionMenu(cmd, nombreCliente)
        );
      }
    );
  } else {
    // si no se pudo extraer un nombre válido, se le pide al usuario que lo intente de nuevo.
    hablar('No pude entender tu nombre. Por favor, repítelo.', () => {
      // se llama recursivamente a la función para reiniciar el proceso de pregunta.
      preguntarNombreCliente();
    });
  }
}

// --- inicialización (se ejecuta cuando la página ha cargado completamente) ---
window.onload = () => {
  // se extrae la estructura del menú desde el archivo html para que el sistema sepa qué platos y precios existen.
  cargarMenuDesdeHTML();

  // se configura un detector de eventos para que la barra espaciadora active la interacción por voz.
  document.addEventListener('keydown', (event) => {
    if (event.code === 'Space') {
      // previene el comportamiento por defecto de la barra espaciadora, que es hacer scroll en la página.
      event.preventDefault();

      // esta comprobación evita que el usuario pueda interrumpir al asistente mientras habla o escucha.
      if (!sintetizadorVoz.speaking && !escuchando && !enunciadoActual) {
        // la lógica principal: si aún no tenemos el nombre del cliente, la primera acción siempre será preguntarlo.
        if (!nombreCliente || nombreCliente === 'Cliente Desconocido') {
          preguntarNombreCliente();
        } else {
          // si ya tenemos el nombre, se salta la pregunta y se va directamente al menú interactivo.
          iniciarMenuInteractivo(nombreCliente);
        }
      } else {
        console.log(
          'Sistema de voz ocupado o ya escuchando. Ignorando pulsación de espacio.'
        );
      }
    }
  });
};
