const API_URL = 'http://localhost:3000/api/pedidos';

function updateClock() {
    const now = new Date();
    document.getElementById('clock').innerText = now.toLocaleTimeString();
}

setInterval(updateClock, 1000);
updateClock();

async function fetchOrders() {
    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error('Error al obtener pedidos');
        const orders = await response.json();
        renderOrders(orders);
    } catch (error) {
        console.error('Error:', error);
    }
}

function renderOrders(orders) {
    const container = document.getElementById('orders-container');
    container.innerHTML = '';

    if (orders.length === 0) {
        container.innerHTML = '<p style="text-align: center; width: 100%;">No hay pedidos pendientes.</p>';
        return;
    }

    const pendingOrders = orders.filter(o => o.estado !== 'completado');

    if (pendingOrders.length === 0) {
        container.innerHTML = '<p style="text-align: center; width: 100%;">No hay pedidos pendientes.</p>';
        return;
    }

    pendingOrders.forEach(order => {
        const card = document.createElement('div');
        card.className = `order-card ${order.estado}`;
        
        const date = new Date(order.fecha);
        const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        let itemsHtml = '';
        if (Array.isArray(order.detalle_pedido)) {
            order.detalle_pedido.forEach(item => {
                itemsHtml += `
                    <li>
                        <span>${item.cantidad}x ${item.item}</span>
                    </li>
                `;
            });
        }

        card.innerHTML = `
            <div class="order-header">
                <span>#${order.id} - ${order.cliente_nombre}</span>
                <span>${timeString}</span>
            </div>
            <div class="order-body">
                <ul class="order-items">
                    ${itemsHtml}
                </ul>
            </div>
            <div class="order-footer">
                <span class="timestamp">Total: S/${order.total.toFixed(2)}</span>
                <button class="btn-complete" onclick="markAsCompleted(${order.id})">
                    <i class="fas fa-check"></i> Listo
                </button>
            </div>
        `;
        container.appendChild(card);
    });
}

async function markAsCompleted(id) {
    try {
        const response = await fetch(`${API_URL}/${id}/estado`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ estado: 'completado' })
        });
        
        if (response.ok) {
            fetchOrders();
        } else {
            console.error('Error al completar pedido');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

fetchOrders();
setInterval(fetchOrders, 5000);
window.markAsCompleted = markAsCompleted;
