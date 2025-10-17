// order-processing.js
// este archivo maneja toda la lógica relacionada con la creación y gestión del pedido del cliente.

// --- importaciones ---
// se importan las funciones necesarias de otros módulos para que este archivo pueda funcionar.
import {
    hablar,
    iniciarReconocimientoVoz,
    detenerReconocimientoVoz,
} from './utils/voice.js'; // funciones para la interacción por voz.
import {
    encontrarCoincidenciaDeItem,
    iniciarMenuInteractivo,
    procesarSeleccionMenu,
} from './menu-logic.js'; // funciones para la lógica del menú.
import { enviarPedidoAlBackend } from './backend-integration.js'; // función para enviar el pedido final al servidor.

// --- variable global del módulo ---
// esta variable actúa como el "carrito de compras" de la aplicación.
export let pedidoActual = []; // almacena los ítems que el cliente va añadiendo.

// --- funciones exportadas ---

// esta es la función principal que actúa como un "router" para los comandos de voz relacionados con el pedido.
export function procesarComandoPedido(comando, nombreCliente) {
    // se convierte el comando a minúsculas para que la detección no dependa de mayúsculas (ej. "Finalizar" vs "finalizar").
    const comandoNormalizado = comando.toLowerCase();

    // se evalúan diferentes palabras clave en el comando para decidir qué acción tomar.
    if (
        comandoNormalizado.includes('finalizar pedido') ||
        comandoNormalizado.includes('confirmar pedido') ||
        comandoNormalizado.includes('terminar pedido')
    ) {
        confirmarPedido(nombreCliente); // si el usuario quiere terminar, se inicia el proceso de confirmación.
    } else if (
        comandoNormalizado.includes('ver pedido') ||
        comandoNormalizado.includes('qué tengo pedido')
    ) {
        leerPedidoActual(nombreCliente); // si el usuario quiere saber qué ha pedido, se lee el contenido del carrito.
    } else if (
        comandoNormalizado.includes('cuánto es') ||
        comandoNormalizado.includes('total del pedido')
    ) {
        calcularYHablarTotal(nombreCliente); // si el usuario pregunta por el precio, se calcula y se dice el total.
    } else if (
        comandoNormalizado.includes('quitar') ||
        comandoNormalizado.includes('eliminar')
    ) {
        quitarItemDePedido(comandoNormalizado, nombreCliente); // si el usuario quiere remover un ítem.
    } else if (
        comandoNormalizado.includes('qué opciones hay') ||
        comandoNormalizado.includes('ayuda')
    ) {
        // si el usuario pide ayuda, se leen las instrucciones básicas.
        hablar(
            'Puedes decir: "quiero [plato]", "quitar [plato]", "ver pedido", "cuánto es", o "finalizar pedido".',
            () => {
                // después de hablar, se vuelve a escuchar para el siguiente comando.
                iniciarReconocimientoVoz((cmd) =>
                    procesarComandoPedido(cmd, nombreCliente)
                );
            }
        );
    } else if (
        comandoNormalizado.includes('otra sección') ||
        comandoNormalizado.includes('menú principal')
    ) {
        // permite al usuario volver a la selección de categorías del menú.
        iniciarMenuInteractivo(nombreCliente);
    } else {
        // si el comando no coincide con ninguna de las acciones anteriores, se asume que el usuario está intentando añadir un plato.
        agregarItemAPedido(comando, nombreCliente);
    }
}

// esta función se encarga de añadir un ítem al carrito de compras (`pedidoActual`).
export function agregarItemAPedido(comandoOriginal, nombreCliente) {
    // se busca el plato en la estructura del menú para ver si existe y obtener su precio.
    const itemEncontrado = encontrarCoincidenciaDeItem(comandoOriginal);

    if (itemEncontrado) {
        // si el plato existe en el menú...
        // se comprueba si el plato ya había sido añadido antes al pedido.
        let itemExistente = pedidoActual.find(
            (itemPedido) => itemPedido.item === itemEncontrado.item
        );
        if (itemExistente) {
            // si ya existe, simplemente se incrementa la cantidad en 1.
            itemExistente.cantidad += 1;
            hablar(
                `Agregado otro ${itemEncontrado.item}. Ahora tienes ${itemExistente.cantidad}.`
            );
        } else {
            // si es la primera vez que se añade, se crea un nuevo objeto en el array del pedido.
            pedidoActual.push({
                item: itemEncontrado.item,
                cantidad: 1,
                precio: itemEncontrado.precio,
            });
            hablar(`Agregado ${itemEncontrado.item} a tu pedido.`);
        }
        console.log('Pedido actual:', pedidoActual); // log para depuración.
        // se pregunta al usuario qué desea hacer a continuación.
        hablar(
            '¿Algo más de esta sección, "otra sección", o "finalizar pedido"?',
            () => {
                iniciarReconocimientoVoz((cmd) =>
                    procesarComandoPedido(cmd, nombreCliente)
                );
            }
        );
    } else {
        // si el plato dicho por el usuario no se encuentra en el menú.
        hablar(
            'Lo siento, no pude encontrar ese plato. Por favor, repítelo.',
            () => {
                iniciarReconocimientoVoz((cmd) =>
                    procesarComandoPedido(cmd, nombreCliente)
                );
            }
        );
    }
}

// esta función elimina un ítem del pedido.
export function quitarItemDePedido(comando, nombreCliente) {
    const itemEncontrado = encontrarCoincidenciaDeItem(comando);

    if (itemEncontrado) {
        // se busca si el ítem a quitar realmente está en el pedido.
        let itemExistente = pedidoActual.find(
            (itemPedido) => itemPedido.item === itemEncontrado.item
        );
        if (itemExistente) {
            // se usa `filter` para crear un nuevo array que excluye el ítem a eliminar.
            pedidoActual = pedidoActual.filter(
                (item) => item.item !== itemEncontrado.item
            );
            hablar(`Quitado ${itemEncontrado.item} de tu pedido.`);
        } else {
            hablar('Ese plato no está en tu pedido.');
        }
    } else {
        hablar('No entendí qué plato deseas quitar.');
    }

    // se pregunta qué hacer a continuación.
    hablar('¿Algo más, o "finalizar pedido"?', () => {
        iniciarReconocimientoVoz((cmd) =>
            procesarComandoPedido(cmd, nombreCliente)
        );
    });
}

// esta función lee en voz alta todos los ítems del pedido actual.
export function leerPedidoActual(nombreCliente) {
    if (pedidoActual.length === 0) {
        hablar('Tu pedido está vacío.', () => {
            iniciarReconocimientoVoz((cmd) =>
                procesarComandoPedido(cmd, nombreCliente)
            );
        });
        return; // se usa return para salir de la función si no hay nada que leer.
    }
    let resumenPedido = 'Tu pedido actual es: ';
    // se recorre el array del pedido y se construye una frase con todos los ítems y cantidades.
    pedidoActual.forEach((item) => {
        resumenPedido += `${item.cantidad} de ${item.item}, `;
    });
    hablar(resumenPedido + '¿Deseas modificarlo o "finalizar pedido"?', () => {
        iniciarReconocimientoVoz((cmd) =>
            procesarComandoPedido(cmd, nombreCliente)
        );
    });
}

// esta función calcula el costo total del pedido y lo dice en voz alta.
export function calcularYHablarTotal(nombreCliente) {
    // se usa `reduce` para sumar el costo de todos los ítems (precio * cantidad).
    let total = pedidoActual.reduce(
        (suma, item) => suma + item.precio * item.cantidad,
        0
    );
    if (total > 0) {
        hablar(
            `El total de tu pedido es ${total
                .toFixed(2)
                .replace('.', ' con ')} soles.`, // se formatea el precio para que suene natural (ej. "53 con 90").
            () => {
                iniciarReconocimientoVoz((cmd) =>
                    procesarComandoPedido(cmd, nombreCliente)
                );
            }
        );
    } else {
        hablar('Tu pedido está vacío.', () => {
            iniciarReconocimientoVoz((cmd) =>
                procesarComandoPedido(cmd, nombreCliente)
            );
        });
    }
}

// esta función inicia el paso final: confirmar el pedido antes de enviarlo.
export async function confirmarPedido(nombreCliente) {
    if (pedidoActual.length === 0) {
        hablar('Tu pedido está vacío. No hay nada que confirmar.', () => {
            iniciarReconocimientoVoz((cmd) =>
                procesarComandoPedido(cmd, nombreCliente)
            );
        });
        return;
    }

    let total = pedidoActual.reduce(
        (suma, item) => suma + item.precio * item.cantidad,
        0
    );
    // se lee el total y se pide una confirmación explícita ("sí" o "no").
    hablar(
        `El total de tu pedido es ${total
            .toFixed(2)
            .replace(
                '.',
                ' con '
            )} soles. ¿Deseas confirmar este pedido? Di "sí" o "no".`,
        () => {
            // se inicia el reconocimiento de voz esperando la respuesta a la confirmación.
            iniciarReconocimientoVoz((cmd) =>
                procesarRespuestaConfirmacion(cmd, nombreCliente)
            );
        }
    );
}

// esta función procesa la respuesta final del usuario ("sí" o "no").
export async function procesarRespuestaConfirmacion(comando, nombreCliente) {
    const comandoNormalizado = comando.toLowerCase();

    if (comandoNormalizado.includes('sí') || comandoNormalizado.includes('si')) {
        // si la respuesta es afirmativa...
        hablar('Confirmando tu pedido...');
        let total = pedidoActual.reduce(
            (suma, item) => suma + item.precio * item.cantidad,
            0
        );
        // se llama a la función que envía los datos al backend.
        await enviarPedidoAlBackend(pedidoActual, total, nombreCliente);
        // una vez enviado, se vacía el carrito para un posible nuevo pedido.
        pedidoActual = [];
    } else if (comandoNormalizado.includes('no')) {
        // si la respuesta es negativa, se cancela la confirmación y se vuelve al modo de pedido.
        hablar(
            'Pedido no confirmado. Puedes continuar añadiendo o quitando ítems.',
            () => {
                iniciarReconocimientoVoz((cmd) =>
                    procesarComandoPedido(cmd, nombreCliente)
                );
            }
        );
    } else {
        // si la respuesta no es ni "sí" ni "no", se pide al usuario que aclare.
        hablar('No entendí tu respuesta. Por favor, di "sí" o "no".', () => {
            iniciarReconocimientoVoz((cmd) =>
                procesarRespuestaConfirmacion(cmd, nombreCliente)
            );
        });
    }
}
