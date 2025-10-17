# Brasa Roja Chicken - Asistente de Pedidos por Voz

Este proyecto es un asistente virtual interactivo diseñado para el restaurante "Brasa Roja Chicken". Permite a los usuarios navegar por el menú y realizar pedidos completos utilizando únicamente comandos de voz. Es una solución de accesibilidad pensada para mejorar la experiencia del cliente, permitiendo una interacción manos libres.

## 📜 Tabla de Contenidos

- [Características Principales](#-características-principales)
- [🚀 Tecnologías Utilizadas](#-tecnologías-utilizadas)
- [📁 Estructura del Proyecto](#-estructura-del-proyecto)
- [⚙️ Configuración e Instalación](#️-configuración-e-instalación)
- [🎤 Cómo Usar](#-cómo-usar)
- [🔑 Variables de Entorno](#-variables-de-entorno)

## ✨ Características Principales

- **Navegación por Voz:** Explora las diferentes secciones del menú (Brasa, Broaster, Parrillas, etc.) de forma intuitiva.
- **Toma de Pedidos Inteligente:** Añade, consulta y elimina platos de tu pedido de forma conversacional.
- **Confirmación y Envío:** Confirma tu pedido final y envíalo a un sistema backend para su procesamiento.
- **Integración con Backend:** Los pedidos se guardan en una base de datos Supabase (PostgreSQL) a través de una API RESTful.
- **Síntesis de Voz Dinámica:** El asistente responde con una voz natural, seleccionando la mejor opción disponible en el navegador del usuario (priorizando voces de Google o masculinas).
- **Interfaz Web Clara:** Muestra el menú completo de forma visual y atractiva.

## 🚀 Tecnologías Utilizadas

### Frontend

- HTML5
- CSS3
- JavaScript (ES6 Modules)
- **Web Speech API** (SpeechSynthesis & SpeechRecognition) para la interacción por voz.

### Backend

- Node.js
- Express.js

### Base de Datos

- Supabase (PostgreSQL)

## 📁 Estructura del Proyecto

El proyecto está organizado de forma modular para facilitar su mantenimiento y escalabilidad.

```
.
├── Backend/
│   ├── .env                # Variables de entorno (Supabase, puerto)
│   └── server.js           # Servidor Express con la API
├── utils/
│   └── voice.js            # Módulo centralizado para síntesis y reconocimiento de voz
├── index.html              # Estructura de la página y el menú
├── style.css               # Estilos visuales de la carta
├── script.js               # Punto de entrada principal del frontend, maneja el flujo inicial
├── menu-logic.js           # Lógica para cargar, leer y navegar por el menú
├── order-processing.js     # Lógica para gestionar el "carrito de compras"
└── backend-integration.js  # Módulo para comunicarse con la API del backend
```

## ⚙️ Configuración e Instalación

Sigue estos pasos para ejecutar el proyecto en tu entorno local.

### 1. Prerrequisitos

- Tener instalado [Node.js](https://nodejs.org/) y npm.
- Una cuenta gratuita en [Supabase](https://supabase.com/).
- Un navegador compatible con la Web Speech API (se recomienda **Google Chrome**).

### 2. Configurar la Base de Datos (Supabase)

1.  Crea un nuevo proyecto en Supabase.
2.  Ve a `SQL Editor` y ejecuta la siguiente consulta para crear la tabla de `pedidos`:
    ```sql
    CREATE TABLE pedidos (
      id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
      created_at TIMESTAMPTZ DEFAULT now(),
      cliente_nombre TEXT,
      detalle_pedido JSONB,
      total NUMERIC
    );
    ```
3.  Ve a `Project Settings` > `API` y copia tu **Project URL** y tu **anon public key**. Las necesitarás para el backend.

### 3. Configurar el Backend

1.  Navega a la carpeta del backend:
    ```bash
    cd Backend
    ```
2.  Instala las dependencias:
    ```bash
    npm install
    ```
3.  Crea un archivo `.env` en la raíz de la carpeta `Backend` y añade tus credenciales de Supabase:
    ```
    PORT=3000
    SUPABASE_URL=URL_DE_TU_PROYECTO_SUPABASE
    SUPABASE_ANON_KEY=TU_ANON_PUBLIC_KEY
    ```
4.  Inicia el servidor:
    ```bash
    node server.js
    ```
    Deberías ver el mensaje `Servidor escuchando en http://localhost:3000`.

### 4. Lanzar el Frontend

1.  Abre el archivo `index.html` en Google Chrome.
2.  **Importante:** Para que los módulos de JavaScript (`import`/`export`) funcionen correctamente, se recomienda usar una extensión como **"Live Server"** en Visual Studio Code.

## 🎤 Cómo Usar

1.  Abre la página `index.html`.
2.  Presiona la **barra espaciadora** para activar el asistente.
3.  El asistente te saludará y te preguntará tu nombre. Responde claramente (ej. "Mi nombre es Alejandro").
4.  Navega por el menú diciendo el nombre de una sección (ej. "Brasa").
5.  Pide un plato (ej. "Quiero un pollo a la brasa").
6.  Puedes seguir pidiendo, ver tu pedido ("ver pedido"), o finalizar ("finalizar pedido").
7.  Confirma con "sí" para enviar tu orden. El sistema te devolverá un número de pedido.

## 🔑 Variables de Entorno

El archivo `.env` en la carpeta `Backend` requiere las siguientes variables:

- `PORT`: Puerto en el que se ejecutará el servidor backend (ej. `3000`).
- `SUPABASE_URL`: La URL de tu proyecto de Supabase.
- `SUPABASE_ANON_KEY`: La clave anónima (pública) de tu proyecto de Supabase.
