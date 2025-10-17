// este archivo contiene la única función responsable de comunicarse con el servidor (backend).

// --- importaciones ---
import { hablar } from './utils/voice.js'; // se importa la función `hablar` para poder dar retroalimentación por voz al usuario sobre el estado del envío del pedido.

/**
 * envía los datos finales del pedido al servidor backend para ser procesados y guardados.
 * @param {Array} itemsPedido - un array de objetos, donde cada objeto representa un ítem en el pedido (ej. { item: '1 POLLO A LA BRASA', cantidad: 1, precio: 53.90 }).
 * @param {number} montoTotal - el costo total calculado del pedido.
 * @param {string} cliente_nombre - el nombre del cliente que fue capturado al inicio de la interacción.
 */
export async function enviarPedidoAlBackend(
    itemsPedido,
    montoTotal,
    cliente_nombre
) {
    // se construye el objeto `datosPedido` con la estructura exacta que el backend espera recibir.
    const datosPedido = {
        cliente_nombre: cliente_nombre,
        detalle_pedido: itemsPedido,
        total: parseFloat(montoTotal.toFixed(2)), // se asegura de que el total sea un número con solo dos decimales.
    };

    // se muestra en la consola el objeto que se va a enviar. esto es muy útil para depurar problemas.
    console.log('Datos del pedido a enviar:', datosPedido);

    // se utiliza un bloque `try...catch` para manejar posibles errores de red o del servidor.
    try {
        // se usa la api `fetch` del navegador para hacer una solicitud http al backend.
        const respuesta = await fetch('http://localhost:3000/api/pedidos', {
            method: 'POST', // se especifica que es una solicitud de tipo post, ya que estamos creando un nuevo recurso (un pedido).
            headers: {
                'Content-Type': 'application/json', // se le informa al servidor que el cuerpo de la solicitud está en formato json.
            },
            body: JSON.stringify(datosPedido), // se convierte el objeto javascript `datosPedido` a una cadena de texto en formato json.
        });

        // se espera a que la respuesta del servidor llegue y se convierte de json a un objeto javascript.
        const datos = await respuesta.json();

        // se comprueba si la solicitud fue exitosa (códigos de estado http 200-299).
        if (respuesta.ok) {
            // si el pedido se procesó correctamente, se le informa al usuario con el número de pedido recibido desde el backend.
            hablar(
                'Tu pedido ha sido recibido con éxito. Número de pedido: ' +
                datos.pedidoId +
                '. Gracias por tu compra.'
            );
            console.log('Pedido enviado con éxito:', datos);
        } else {
            // si el servidor respondió con un error (ej. datos faltantes), se lee el mensaje de error y se le informa al usuario.
            hablar(
                'Lo siento, hubo un problema al enviar tu pedido: ' + datos.message
            );
            console.error('Error al enviar el pedido:', datos.message);
        }
    } catch (error) {
        // este bloque se ejecuta si hay un problema de red, como que el servidor no esté funcionando o no haya conexión a internet.
        hablar(
            'Lo siento, no pude conectar con el servidor. Por favor, inténtalo de nuevo más tarde.'
        );
        console.error('Error de red o del servidor:', error);
    }
}
