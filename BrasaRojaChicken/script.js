    // --- Variables Globales y Configuración de Voz ---
    let sintetizadorVoz = window.speechSynthesis;
    let enunciadoActual = null; // Para controlar la lectura actual
    let reconocimientoVoz = null;
    let escuchando = false;
    let pedidoActual = []; // Almacena los ítems del pedido
    let datosMenu = {}; // Objeto para almacenar la estructura del menú fácilmente

    // --- Funciones de Síntesis de Voz (TTS) ---
    function hablar(texto, callback) {
        if (sintetizadorVoz.speaking) {
            sintetizadorVoz.cancel();
        }
        enunciadoActual = new SpeechSynthesisUtterance(texto);
        enunciadoActual.lang = 'es-ES';
        enunciadoActual.rate = 1;
        enunciadoActual.pitch = 1;

        enunciadoActual.onend = () => {
            console.log('Lectura finalizada.');
            enunciadoActual = null;
            if (callback) callback();
        };
        enunciadoActual.onerror = (event) => {
            console.error('Error en la síntesis de voz:', event);
            enunciadoActual = null;
            if (callback) callback(); // Llamar callback incluso si hay error
        };

        sintetizadorVoz.speak(enunciadoActual);
    }

    // --- Funciones de Reconocimiento de Voz (STT) ---
    function iniciarReconocimientoVoz(callback) {
        if (!('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
            console.warn('El reconocimiento de voz no es compatible con este navegador.');
            hablar('Lo siento, tu navegador no soporta el reconocimiento de voz.');
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        reconocimientoVoz = new SpeechRecognition();

        reconocimientoVoz.lang = 'es-ES';
        reconocimientoVoz.interimResults = false;
        reconocimientoVoz.maxAlternatives = 1;

        reconocimientoVoz.onstart = () => {
            escuchando = true;
            console.log('Reconocimiento de voz iniciado. Habla ahora...');
            // Aquí puedes añadir un indicador visual o sonoro de que está escuchando
        };

        reconocimientoVoz.onresult = (event) => {
            const ultimo = event.results.length - 1;
            const transcripcion = event.results[ultimo][0].transcript.toLowerCase();
            console.log('Comando recibido:', transcripcion);
            escuchando = false; // Detener después de recibir un resultado
            if (callback) callback(transcripcion);
        };

        reconocimientoVoz.onerror = (event) => {
            console.error('Error en el reconocimiento de voz:', event.error);
            escuchando = false;
            hablar('Hubo un error en el reconocimiento de voz. Por favor, inténtalo de nuevo.', () => {
                // Podrías reiniciar el reconocimiento aquí si el error no es crítico
            });
        };

        reconocimientoVoz.onend = () => {
            console.log('Reconocimiento de voz finalizado.');
            escuchando = false;
        };

        if (!escuchando) {
            reconocimientoVoz.start();
        } else {
            console.log('Ya estoy escuchando.');
        }
    }

    function detenerReconocimientoVoz() {
        if (reconocimientoVoz && escuchando) {
            reconocimientoVoz.stop();
            escuchando = false;
            console.log('Reconocimiento de voz detenido.');
        }
    }

    // --- Lógica del Menú Interactivo ---

    // Función para extraer el menú del HTML
    function cargarMenuDesdeHTML() {
        const categorias = {};

        // Brasa
        const seccionBrasa = document.querySelector('.menu-section:nth-of-type(1)');
        if (seccionBrasa) {
            categorias['brasa'] = [];
            seccionBrasa.querySelectorAll('li').forEach(li => {
                const texto = li.textContent;
                const coincidencia = texto.match(/(.*?)\s*S\/(\d+\.?\d*)/);
                if (coincidencia) {
                    categorias['brasa'].push({ item: coincidencia[1].trim(), precio: parseFloat(coincidencia[2]) });
                }
            });
        }

        // Broaster
        const seccionBroaster = document.querySelector('.menu-section:nth-of-type(2)');
        if (seccionBroaster) {
            categorias['broaster'] = [];
            seccionBroaster.querySelectorAll('li').forEach(li => {
                const texto = li.textContent;
                const coincidencia = texto.match(/(.*?)\s*S\/(\d+\.?\d*)/);
                if (coincidencia) {
                    categorias['broaster'].push({ item: coincidencia[1].trim(), precio: parseFloat(coincidencia[2]) });
                }
            });
        }

        // Parrillas
        const seccionParrillas = document.querySelector('.menu-section:nth-of-type(3)');
        if (seccionParrillas) {
            categorias['parrillas'] = [];
            // Parrilla Chica
            const parrillaChicaEl = seccionParrillas.querySelector('.parrillas-grid h4');
            if (parrillaChicaEl) {
                const texto = parrillaChicaEl.textContent;
                const coincidencia = texto.match(/(.*?)\s*S\/(\d+\.?\d*)/);
                if (coincidencia) categorias['parrillas'].push({ item: coincidencia[1].trim(), precio: parseFloat(coincidencia[2]) });
            }
            // Parrilla Media
            const parrillaMediaEl = seccionParrillas.querySelector('.parrillas-grid > div:nth-child(2) h4');
            if (parrillaMediaEl) {
                const texto = parrillaMediaEl.textContent;
                const coincidencia = texto.match(/(.*?)\s*S\/(\d+\.?\d*)/);
                if (coincidencia) categorias['parrillas'].push({ item: coincidencia[1].trim(), precio: parseFloat(coincidencia[2]) });
            }
            // Parrilla Familiar
            const parrillaFamiliarEl = seccionParrillas.querySelector('.parrilla-familiar h4');
            if (parrillaFamiliarEl) {
                const texto = parrillaFamiliarEl.textContent;
                const coincidencia = texto.match(/(.*?)\s*S\/(\d+\.?\d*)/);
                if (coincidencia) categorias['parrillas'].push({ item: coincidencia[1].trim(), precio: parseFloat(coincidencia[2]) });
            }
        }

        // Carnes y Piqueos
        const seccionCarnesPiqueos = document.querySelector('.carnes-piqueos');
        if (seccionCarnesPiqueos) {
            categorias['carnes y piqueos'] = [];
            seccionCarnesPiqueos.querySelectorAll('li').forEach(li => {
                const texto = li.textContent;
                const coincidencia = texto.match(/(.*?)\s*S\/(\d+\.?\d*)/);
                if (coincidencia) {
                    categorias['carnes y piqueos'].push({ item: coincidencia[1].trim(), precio: parseFloat(coincidencia[2]) });
                }
            });
        }

        // Guarniciones
        const seccionGuarniciones = document.querySelector('.guarniciones');
        if (seccionGuarniciones) {
            categorias['guarniciones'] = [];
            seccionGuarniciones.querySelectorAll('li').forEach(li => {
                const texto = li.textContent;
                const coincidencia = texto.match(/(.*?)\s*S\/(\d+\.?\d*)/);
                if (coincidencia) {
                    categorias['guarniciones'].push({ item: coincidencia[1].trim(), precio: parseFloat(coincidencia[2]) });
                }
            });
        }

        datosMenu = categorias;
        console.log('Menú cargado:', datosMenu);
    }


    function iniciarMenuInteractivo() {
        hablar('¿Sobre qué sección del menú deseas escuchar? Puedes decir "Brasa", "Broaster", "Parrillas", "Carnes y Piqueos" o "Guarniciones".', () => {
            iniciarReconocimientoVoz(procesarSeleccionMenu);
        });
    }

    function procesarSeleccionMenu(comando) {
        const comandoNormalizado = comando.toLowerCase();
        let categoriaSeleccionada = null;

        if (comandoNormalizado.includes('brasa')) {
            categoriaSeleccionada = 'brasa';
        } else if (comandoNormalizado.includes('broaster')) {
            categoriaSeleccionada = 'broaster';
        } else if (comandoNormalizado.includes('parrillas')) {
            categoriaSeleccionada = 'parrillas';
        } else if (comandoNormalizado.includes('carnes y piqueos')) {
            categoriaSeleccionada = 'carnes y piqueos';
        } else if (comandoNormalizado.includes('guarniciones')) {
            categoriaSeleccionada = 'guarniciones';
        }

        if (categoriaSeleccionada && datosMenu[categoriaSeleccionada]) {
            let textoCategoria = `Aquí está nuestra sección de ${categoriaSeleccionada}: `;
            datosMenu[categoriaSeleccionada].forEach(item => {
                textoCategoria += `${item.item} a ${item.precio.toFixed(2).replace('.', ' con ')} soles. `;
            });
            hablar(textoCategoria + '¿Deseas añadir algo de esta sección a tu pedido, o prefieres escuchar otra sección? También puedes decir "finalizar pedido".', () => {
                iniciarReconocimientoVoz(procesarComandoPedido);
            });
        } else {
            hablar('Lo siento, no entendí esa sección o no está disponible. Por favor, di una de las opciones: Brasa, Broaster, Parrillas, Carnes y Piqueos o Guarniciones.', () => {
                iniciarReconocimientoVoz(procesarSeleccionMenu); // Volver a pedir la selección
            });
        }
    }

    function procesarComandoPedido(comando) {
        const comandoNormalizado = comando.toLowerCase();

        if (comandoNormalizado.includes('quiero') || comandoNormalizado.includes('agregar')) {
            // Lógica para añadir un ítem al pedido
            agregarItemAPedido(comandoNormalizado);
        } else if (comandoNormalizado.includes('otra sección') || comandoNormalizado.includes('escuchar otra')) {
            iniciarMenuInteractivo(); // Volver al inicio para seleccionar otra sección
        } else if (comandoNormalizado.includes('finalizar pedido') || comandoNormalizado.includes('confirmar pedido')) {
            confirmarPedido(); // Iniciar el proceso de confirmación de pedido
        } else if (comandoNormalizado.includes('ver pedido') || comandoNormalizado.includes('qué tengo pedido')) {
            leerPedidoActual();
        } else if (comandoNormalizado.includes('cuánto es') || comandoNormalizado.includes('total del pedido')) {
            calcularYHablarTotal();
        } else if (comandoNormalizado.includes('quitar') || comandoNormalizado.includes('eliminar')) {
            quitarItemDePedido(comandoNormalizado);
        }
        else {
            hablar('Lo siento, no entendí tu comando. Puedes decir "quiero [plato]", "otra sección", "ver pedido" o "finalizar pedido".', () => {
                 iniciarReconocimientoVoz(procesarComandoPedido); // Seguir escuchando comandos
            });
        }
    }

    function agregarItemAPedido(comando) {
        let itemEncontrado = null;
        let nombreItem = null;
        let precioItem = 0;

        // Buscar el ítem en todas las categorías
        for (const categoria in datosMenu) {
            for (const itemMenu of datosMenu[categoria]) {
                const nombreItemLimpio = itemMenu.item.toLowerCase().replace(/s\/\d+\.?\d*/, '').trim();
                if (comando.includes(nombreItemLimpio) && nombreItemLimpio.length > 5) {
                    itemEncontrado = itemMenu;
                    nombreItem = itemEncontrado.item;
                    precioItem = itemEncontrado.precio;
                    break;
                }
            }
            if (itemEncontrado) break;
        }

        if (itemEncontrado) {
            let itemExistente = pedidoActual.find(itemPedido => itemPedido.item === nombreItem);
            if (itemExistente) {
                itemExistente.cantidad++;
                hablar(`Agregado uno más de ${nombreItem}. Ahora tienes ${itemExistente.cantidad}.`);
            } else {
                pedidoActual.push({ item: nombreItem, cantidad: 1, precio: precioItem });
                hablar(`Agregado ${nombreItem} a tu pedido.`);
            }
            console.log('Pedido actual:', pedidoActual);
            hablar('¿Algo más de esta sección, otra sección, o "finalizar pedido"?', () => {
                iniciarReconocimientoVoz(procesarComandoPedido);
            });
        } else {
            hablar('Lo siento, no pude encontrar ese plato en el menú. Por favor, repítelo o sé más específico.', () => {
                iniciarReconocimientoVoz(procesarComandoPedido);
            });
        }
    }

    function quitarItemDePedido(comando) {
        let itemParaQuitar = null;

        for (const itemPedido of pedidoActual) {
            const nombreItemLimpio = itemPedido.item.toLowerCase();
            if (comando.includes(nombreItemLimpio)) {
                itemParaQuitar = itemPedido;
                break;
            }
        }

        if (itemParaQuitar) {
            if (itemParaQuitar.cantidad > 1) {
                itemParaQuitar.cantidad--;
                hablar(`Quitado uno de ${itemParaQuitar.item}. Ahora tienes ${itemParaQuitar.cantidad}.`);
            } else {
                pedidoActual = pedidoActual.filter(itemPedido => itemPedido.item !== itemParaQuitar.item);
                hablar(`Quitado ${itemParaQuitar.item} de tu pedido completamente.`);
            }
            console.log('Pedido actual:', pedidoActual);
            hablar('¿Algo más, o "finalizar pedido"?', () => {
                iniciarReconocimientoVoz(procesarComandoPedido);
            });
        } else {
            hablar('Ese plato no está en tu pedido. ¿Qué deseas quitar?', () => {
                iniciarReconocimientoVoz(procesarComandoPedido);
            });
        }
    }


    function leerPedidoActual() {
        if (pedidoActual.length === 0) {
            hablar('Tu pedido está vacío.');
            return;
        }
        let resumenPedido = "Tu pedido actual es: ";
        pedidoActual.forEach(item => {
            resumenPedido += `${item.cantidad} de ${item.item}, `;
        });
        hablar(resumenPedido + '¿Deseas modificarlo o "finalizar pedido"?', () => {
            iniciarReconocimientoVoz(procesarComandoPedido);
        });
    }

    function calcularYHablarTotal() {
        let total = pedidoActual.reduce((suma, item) => suma + (item.precio * item.cantidad), 0);
        if (total > 0) {
            hablar(`El total de tu pedido es ${total.toFixed(2).replace('.', ' con ')} soles.`, () => {
                 hablar('¿Deseas confirmar el pedido?', () => {
                     iniciarReconocimientoVoz(procesarComandoPedido);
                 });
            });
        } else {
            hablar('Tu pedido está vacío.');
        }
    }


    async function confirmarPedido() {
        if (pedidoActual.length === 0) {
            hablar('Tu pedido está vacío. No hay nada que confirmar.');
            return;
        }

        let total = pedidoActual.reduce((suma, item) => suma + (item.precio * item.cantidad), 0);
        hablar(`El total de tu pedido es ${total.toFixed(2).replace('.', ' con ')} soles. ¿Deseas confirmar este pedido? Di "sí" o "no".`, () => {
            iniciarReconocimientoVoz(procesarRespuestaConfirmacion);
        });
    }

    async function procesarRespuestaConfirmacion(comando) {
        const comandoNormalizado = comando.toLowerCase();

        if (comandoNormalizado.includes('sí') || comandoNormalizado.includes('si')) {
            hablar('Confirmando tu pedido...');
            let total = pedidoActual.reduce((suma, item) => suma + (item.precio * item.cantidad), 0);
            await enviarPedidoAlBackend(pedidoActual, total);
            pedidoActual = []; // Limpiar el pedido después de enviar
        } else if (comandoNormalizado.includes('no')) {
            hablar('Pedido no confirmado. Puedes continuar añadiendo o quitando ítems.', () => {
                iniciarReconocimientoVoz(procesarComandoPedido);
            });
        } else {
            hablar('No entendí tu respuesta. Por favor, di "sí" o "no".', () => {
                iniciarReconocimientoVoz(procesarRespuestaConfirmacion); // Vuelve a escuchar
            });
        }
    }

    // --- Integración con el Backend ---
    async function enviarPedidoAlBackend(itemsPedido, montoTotal) {
        const nombreCliente = "Cliente Invidente"; // O podrías preguntar por voz
        const datosPedido = {
            cliente_nombre: nombreCliente,
            detalle_pedido: itemsPedido,
            total: parseFloat(montoTotal.toFixed(2))
        };

        try {
            const respuesta = await fetch('http://localhost:3000/api/pedidos', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(datosPedido)
            });

            const datos = await respuesta.json();
            if (respuesta.ok) {
                hablar('Tu pedido ha sido recibido con éxito. Número de pedido: ' + datos.pedidoId + '. Gracias por tu compra.');
                console.log('Pedido enviado con éxito:', datos);
            } else {
                hablar('Lo siento, hubo un problema al enviar tu pedido: ' + datos.message);
                console.error('Error al enviar el pedido:', datos.message);
            }
        } catch (error) {
            hablar('Lo siento, no pude conectar con el servidor. Por favor, inténtalo de nuevo más tarde.');
            console.error('Error de red o del servidor:', error);
        }
    }

    // --- Inicialización (llamado cuando la página carga) ---
    window.onload = () => {
        // Cargar los datos del menú del HTML cuando la página esté lista
        cargarMenuDesdeHTML();

        // El mensaje de bienvenida ahora se hablará SÓLO después de la primera pulsación de 'espacio'
        let primerInicio = true;
        document.addEventListener('keydown', (event) => {
            if (event.code === 'Space' && !escuchando && !sintetizadorVoz.speaking) {
                event.preventDefault(); // Evita que la página haga scroll con espacio
                if (primerInicio) {
                    hablar("Bienvenido. Puedes decir 'Brasa', 'Broaster', 'Parrillas', 'Carnes y Piqueos' o 'Guarniciones'.", () => {
                         iniciarReconocimientoVoz(procesarSeleccionMenu);
                    });
                    primerInicio = false;
                } else {
                    // Si no es el primer inicio, solo reactiva el reconocimiento si no está activo
                    iniciarMenuInteractivo(); // Esta función ya llama a hablar y luego a iniciarReconocimientoVoz
                }
            }
        });

        // Opcional: Hablar un mensaje silencioso inicial para solicitar permiso de audio del navegador
        // Algunos navegadores requieren una interacción ANTES de que cualquier sonido se reproduzca.
        // Si el problema persiste, descomenta las siguientes líneas y el usuario tendrá que hacer un clic inicial
        // para habilitar el audio.
        /*
        document.addEventListener('click', () => {
            if (!sintetizadorVoz.speaking) {
                const dummyUtterance = new SpeechSynthesisUtterance('');
                sintetizadorVoz.speak(dummyUtterance);
            }
        }, { once: true });
        */
    };
