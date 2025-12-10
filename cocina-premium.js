const socket = io('http://localhost:3000');
const ordersGrid = document.getElementById('orders-grid');
const notificationSound = document.getElementById('notification-sound');

// Reloj
function updateClock() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('es-PE', { hour12: false });
    document.getElementById('clock').textContent = timeString;
}
setInterval(updateClock, 1000);
updateClock();

// Cargar pedidos iniciales
socket.emit('solicitar_pedidos');

// Escuchar nuevos pedidos
socket.on('nuevo_pedido', (pedido) => {
    agregarPedido(pedido);
    notificationSound.play();
    actualizarEstadisticas();
});

// Escuchar actualizaciones
socket.on('pedido_actualizado', (pedido) => {
    actualizarPedido(pedido);
    actualizarEstadisticas();
});

// Recibir lista de pedidos
socket.on('lista_pedidos', (pedidos) => {
    ordersGrid.innerHTML = '';
    if (pedidos.length === 0) {
        ordersGrid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-utensils"></i>
                <p>No hay pedidos pendientes</p>
            </div>
        `;
    } else {
        pedidos.forEach(agregarPedido);
    }
    actualizarEstadisticas();
});

function agregarPedido(pedido) {
    const emptyState = ordersGrid.querySelector('.empty-state');
    if (emptyState) emptyState.remove();

    const card = crearTarjetaPedido(pedido);
    ordersGrid.insertBefore(card, ordersGrid.firstChild);
}

function crearTarjetaPedido(pedido) {
    const card = document.createElement('div');
    card.className = `order-card ${pedido.estado}`;
    card.dataset.id = pedido.id;

    const fecha = new Date(pedido.fecha);
    const tiempo = fecha.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });

    const items = Array.isArray(pedido.detalle_pedido) 
        ? pedido.detalle_pedido 
        : JSON.parse(pedido.detalle_pedido);

    card.innerHTML = `
        <div class="order-header">
            <div class="order-number">#${pedido.id}</div>
            <div class="order-time">${tiempo}</div>
        </div>
        <div class="order-body">
            <div class="order-cliente">
                <i class="fas fa-user"></i> ${pedido.cliente_nombre}
            </div>
            <ul class="order-items">
                ${items.map(item => `
                    <li>
                        <span class="item-name">
                            <span class="item-qty">${item.cantidad || 1}x</span>
                            ${item.nombre}
                        </span>
                        <span>S/ ${(item.precio * (item.cantidad || 1)).toFixed(2)}</span>
                    </li>
                `).join('')}
            </ul>
            <div class="order-total">Total: S/ ${pedido.total.toFixed(2)}</div>
        </div>
        <div class="order-footer">
            ${pedido.estado === 'pendiente' ? `
                <button class="btn btn-proceso" onclick="cambiarEstado(${pedido.id}, 'en-proceso')">
                    <i class="fas fa-play"></i> Iniciar
                </button>
            ` : ''}
            ${pedido.estado === 'en-proceso' ? `
                <button class="btn btn-completar" onclick="cambiarEstado(${pedido.id}, 'completado')">
                    <i class="fas fa-check"></i> Completar
                </button>
            ` : ''}
        </div>
    `;

    return card;
}

function actualizarPedido(pedido) {
    const card = ordersGrid.querySelector(`[data-id="${pedido.id}"]`);
    if (card) {
        const nuevaCard = crearTarjetaPedido(pedido);
        card.replaceWith(nuevaCard);
    }
}

function cambiarEstado(id, nuevoEstado) {
    fetch(`http://localhost:3000/api/pedidos/${id}/estado`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: nuevoEstado })
    })
    .then(res => res.json())
    .then(data => console.log('Estado actualizado:', data))
    .catch(err => console.error('Error:', err));
}

function actualizarEstadisticas() {
    const cards = ordersGrid.querySelectorAll('.order-card');
    let pendientes = 0;
    let proceso = 0;

    cards.forEach(card => {
        if (card.classList.contains('pendiente')) pendientes++;
        if (card.classList.contains('en-proceso')) proceso++;
    });

    document.getElementById('pendientes').textContent = pendientes;
    document.getElementById('proceso').textContent = proceso;
}
