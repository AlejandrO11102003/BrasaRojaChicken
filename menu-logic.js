// este archivo se encarga de la lógica relacionada con el menú: cargarlo, leerlo y procesar la selección del usuario.

// --- importaciones ---
import {
    hablar,
    iniciarReconocimientoVoz,
    detenerReconocimientoVoz,
} from './utils/voice.js'; // funciones para la interacción por voz.
import { procesarComandoPedido } from './order-processing.js'; // se importa para pasarle el control una vez que el usuario ha escuchado una sección del menú.

// --- variable global del módulo ---
// este objeto almacenará toda la estructura del menú una vez que se cargue desde el html.
export let datosMenu = {};

// --- funciones exportadas ---

/**
 * busca la mejor coincidencia de un ítem del menú basándose en un comando de voz.
 * es una función "inteligente" que intenta entender lo que el usuario quiere pedir.
 * @param {string} comandoTexto - el comando de voz del usuario (ej. "quiero medio pollo a la brasa").
 * @returns {object|null} - devuelve el objeto completo del ítem del menú si encuentra una coincidencia, o null si no encuentra nada.
 */
export function encontrarCoincidenciaDeItem(comandoTexto) {
    let mejorCoincidencia = null;
    let longitudMejorCoincidencia = 0;

    // se normaliza el comando de voz para facilitar la búsqueda.
    let comandoNormalizado = comandoTexto.toLowerCase();

    // se reemplazan palabras de cantidad por sus equivalentes numéricos/fraccionarios.
    // esto ayuda a que "medio pollo" coincida con "1/2 pollo" en el menú.
    comandoNormalizado = comandoNormalizado
        .replace(/un\s+|una\s+/g, '1 ')
        .replace(/medio\s+/g, '1/2 ')
        .replace(/cuarto\s+/g, '1/4 ');

    // se eliminan palabras de acción para aislar el nombre del plato.
    comandoNormalizado = comandoNormalizado
        .replace(/(quiero|agregar|dame|añadir|deseo|quisiera)\s*/g, '')
        .trim();

    // se recorren todas las categorías y todos los ítems del menú.
    for (const categoria in datosMenu) {
        for (const itemMenu of datosMenu[categoria]) {
            const nombreItemMenuLimpio = itemMenu.item.toLowerCase().trim();

            // se comprueba si el comando del usuario contiene el nombre de un ítem del menú.
            if (
                comandoNormalizado.includes(nombreItemMenuLimpio) &&
                nombreItemMenuLimpio.length > 3 // se priorizan coincidencias más largas para evitar falsos positivos (ej. "a" en "brasa").
            ) {
                // si se encuentra una coincidencia, se guarda como la "mejor" si es más larga que la anterior.
                // esto ayuda a que "1 pollo a la brasa" tenga prioridad sobre "pollo".
                if (nombreItemMenuLimpio.length > longitudMejorCoincidencia) {
                    mejorCoincidencia = itemMenu;
                    longitudMejorCoincidencia = nombreItemMenuLimpio.length;
                }
            }
        }
    }
    return mejorCoincidencia;
}

// esta función se ejecuta una sola vez al cargar la página para leer el menú desde el archivo html.
export function cargarMenuDesdeHTML() {
    const categorias = {};

    // función auxiliar para no repetir el código de extracción de ítems.
    const extraerItemsDeSeccion = (seccionElement) => {
        const items = [];
        if (seccionElement) {
            // se buscan todos los elementos `<li>` dentro de la sección.
            seccionElement.querySelectorAll('li').forEach((li) => {
                const strongElement = li.querySelector('.item-info strong');
                const spanElement = li.querySelector('span');

                if (strongElement && spanElement) {
                    const texto = strongElement.textContent.trim();
                    const precioTexto = spanElement.textContent;
                    // se usa una expresión regular para extraer solo el número del precio (ej. de "S/53.90" extrae "53.90").
                    const coincidenciaPrecio = precioTexto.match(/S\/(\d+\.?\d*)/);

                    if (coincidenciaPrecio) {
                        items.push({
                            item: texto,
                            precio: parseFloat(coincidenciaPrecio[1]), // se convierte el precio a un número.
                        });
                    }
                }
            });
        }
        return items;
    };

    // se procesa cada sección del menú una por una.
    const seccionBrasa = document.querySelector('.menu-section.brasa');
    categorias['brasa'] = extraerItemsDeSeccion(seccionBrasa);

    const seccionBroaster = document.querySelector('.menu-section.broaster');
    categorias['broaster'] = extraerItemsDeSeccion(seccionBroaster);

    const seccionParrillas = document.querySelector('.menu-section.parrillas');
    categorias['parrillas'] = extraerItemsDeSeccion(seccionParrillas);

    const seccionCarnesPiqueos = document.querySelector(
        '.menu-section.carnes-piqueos'
    );
    categorias['carnes y piqueos'] = extraerItemsDeSeccion(seccionCarnesPiqueos);

    const seccionGuarniciones = document.querySelector(
        '.menu-section.guarniciones'
    );
    categorias['guarniciones'] = extraerItemsDeSeccion(seccionGuarniciones);

    // finalmente, se asigna el objeto construido a la variable global del módulo.
    datosMenu = categorias;
    console.log('Menú cargado:', datosMenu); // log para confirmar que el menú se cargó correctamente.
}

// esta función inicia la interacción del menú, preguntando al usuario qué categoría quiere escuchar.
export function iniciarMenuInteractivo(nombreCliente) {
    hablar(
        '¿Sobre qué sección del menú deseas escuchar? Puedes decir "Brasa", "Broaster", "Parrillas", "Carnes y Piqueos" o "Guarniciones".',
        () => {
            // después de hablar, se activa el reconocimiento de voz para esperar la respuesta del usuario.
            iniciarReconocimientoVoz((cmd) =>
                procesarSeleccionMenu(cmd, nombreCliente)
            );
        }
    );
}

// esta función procesa la respuesta del usuario a la pregunta de la categoría.
export function procesarSeleccionMenu(comando, nombreCliente) {
    const comandoNormalizado = comando.toLowerCase();
    let categoriaSeleccionada = null;

    // se busca qué categoría mencionó el usuario con más flexibilidad.
    if (comandoNormalizado.includes('brasa') || comandoNormalizado.includes('asado')) {
        categoriaSeleccionada = 'brasa';
    } else if (comandoNormalizado.includes('broaster') || comandoNormalizado.includes('frito') || comandoNormalizado.includes('crujiente')) {
        categoriaSeleccionada = 'broaster';
    } else if (comandoNormalizado.includes('parrillas') || comandoNormalizado.includes('parrillada') || comandoNormalizado.includes('churrasco')) {
        categoriaSeleccionada = 'parrillas';
    } else if (
        comandoNormalizado.includes('carnes') ||
        comandoNormalizado.includes('piqueos') ||
        comandoNormalizado.includes('anticuchos') ||
        comandoNormalizado.includes('mollejitas') ||
        comandoNormalizado.includes('entradas')
    ) {
        categoriaSeleccionada = 'carnes y piqueos';
    } else if (
        comandoNormalizado.includes('guarniciones') ||
        comandoNormalizado.includes('papas') ||
        comandoNormalizado.includes('ensalada') ||
        comandoNormalizado.includes('arroz') ||
        comandoNormalizado.includes('acompañamientos')
    ) {
        categoriaSeleccionada = 'guarniciones';
    }

    // se comprueba si la categoría seleccionada es válida y tiene ítems.
    if (
        categoriaSeleccionada &&
        datosMenu[categoriaSeleccionada] &&
        datosMenu[categoriaSeleccionada].length > 0
    ) {
        // si es válida, se construye una frase con todos los ítems y precios de esa categoría.
        let textoCategoria = `Aquí está nuestra sección de ${categoriaSeleccionada}: `;
        datosMenu[categoriaSeleccionada].forEach((item) => {
            textoCategoria += `${item.item} a ${item.precio
                .toFixed(2)
                .replace('.', ' con ')} soles. `; // se formatea el precio para que suene natural.
        });
        hablar(
            textoCategoria +
            '¿Deseas añadir algo de esta sección a tu pedido, o prefieres escuchar otra sección? También puedes decir "finalizar pedido".',
            () => {
                // después de leer la sección, se pasa el control a `procesarComandoPedido` para que el usuario pueda empezar a ordenar.
                iniciarReconocimientoVoz((cmd) =>
                    procesarComandoPedido(cmd, nombreCliente)
                );
            }
        );
    } else {
        // si no se entendió la categoría, se le pide al usuario que repita una de las opciones válidas.
        hablar(
            'Lo siento, no entendí esa sección o no está disponible. Por favor, di una de las opciones: Brasa, Broaster, Parrillas, Carnes y Piqueos o Guarniciones.',
            () => {
                // se vuelve a llamar a esta misma función para volver a intentar procesar la selección.
                iniciarReconocimientoVoz((cmd) =>
                    procesarSeleccionMenu(cmd, nombreCliente)
                );
            }
        );
    }
}
