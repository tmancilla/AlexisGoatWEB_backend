# AlexisGoatWEB - Backend

## Cómo levantar el backend

### Requisitos previos

- **Node.js** v22 o superior
- **PostgreSQL** 16 corriendo localmente

### Instalación

```bash
git clone https://github.com/IIC2513/AlexisGoatWEB-Backend-S2-26-2.git
cd AlexisGoatWEB-Backend-S2-26-2
npm install
```

### Variables de entorno

```bash
cp .env.example .env
```

Completar `DB_USER` y `DB_PASSWORD` en `.env`. El archivo `.env` no se sube al repositorio.

### Base de datos

Crear un usuario de Postgres con permiso para crear bases de datos, con las mismas credenciales del `.env`:

```bash
sudo -u postgres psql -c "CREATE USER <usuario> WITH PASSWORD '<contraseña>' CREATEDB;"
```

Crear la base de datos, ejecutar las migraciones y poblarla con datos de prueba:

```bash
npm run db:create
npm run db:migrate
npm run db:seed
```

Para borrar todo y recrearlo desde cero: `npm run db:reset`.

### Levantar el servidor

```bash
npm run dev
```

El servidor queda en `http://localhost:3000`. Para verificar que funciona y que está conectado a la base de datos:

```bash
curl http://localhost:3000/health
```

## Usuarios y autenticación básica — Entrega 3

Los usuarios se almacenan en PostgreSQL mediante el modelo Usuario.
Se implementaron las siguientes rutas:

| Método | Ruta | Función |
|---|---|---|
| POST | /users | Crear usuario |
| GET | /users | Listar usuarios |
| GET | /users/:id | Consultar usuario |
| PATCH | /users/:id | Actualizar usuario |
| DELETE | /users/:id | Eliminar usuario |
| POST | /auth/register | Registrar usuario |
| POST | /auth/login | Iniciar sesión |

Para registrar un administrador, se debe enviar `role: "Administrador"`
y `codigoAdmin`. El servidor compara el código recibido con la variable
`CODIGO_ADMIN`, que cada integrante debe configurar en su `.env`.

### Ajustes al protocolo de E2

Para E3 se implementó autenticación básica. Registro y login devuelven
el usuario, sin token:

```json
{
  "usuario": {
    "id": 2,
    "username": "jugador_auth",
    "email": "auth@uc.cl",
    "role": "Jugador"
  }
}
```

El hashing de contraseñas y la autenticación con JWT quedan para E4.
Las respuestas no incluyen la contraseña.

Los errores de validación y duplicados usan el middleware general:
`VALIDACION_FALLIDA` (400) y `REGISTRO_DUPLICADO` (409).
El login con credenciales incorrectas devuelve
`CREDENCIALES_INVALIDAS` (401).

### Verificación realizada

Se probaron mediante curl la creación, consulta individual, listado,
actualización y eliminación de usuarios; los errores por usuario
inexistente, correo inválido e ID inválido; y el registro y login con
credenciales correctas e incorrectas.

### Identificación del usuario (ajuste temporal al protocolo)

En esta entrega no hay JWT, así que los endpoints de `/games` identifican al usuario con el header `X-Usuario-Id`, en lugar de `Authorization: Bearer <token>`. El valor es el `id` que devuelven `POST /auth/register` y `POST /auth/login`.

Si el header falta, no es un número entero positivo o corresponde a un usuario inexistente, el servidor responde `401 USUARIO_NO_IDENTIFICADO`. En la Entrega 4 se reemplazará por el token JWT, cambiando solo el middleware `usuarioActual`.

## Partidas y lobby — Entrega 3

Modelos `Partida` y `JugadorPartida` (relación muchos a muchos entre `Usuario` y `Partida`, con rol `DUENO`/`INVITADO`, `numeroJugador` y recursos iniciales). El jugador 1 es el dueño, o el primero en la cola de matchmaking, y despliega en las filas 1 a 4; el 2 en las filas 7 a 10. Todos los endpoints requieren el header `X-Usuario-Id`.

| Método | Ruta | Función | Éxito |
|---|---|---|---|
| POST | /games | Crear lobby privado | 201 |
| GET | /games | Listar partidas (`?estado=`, `?modo=`) | 200 |
| GET | /games/:id | Consultar partida | 200 |
| POST | /games/:codigo/join | Unirse por código | 200 |
| POST | /games/matchmaking | Buscar rival | 200 / 202 |
| PATCH | /games/:id | Avanzar el estado | 200 |
| DELETE | /games/:id | Cancelar partida o salir de la cola | 204 |

**Reglas:** un usuario solo puede estar en una partida activa a la vez (`409`); el lobby expira a los 5 minutos sin invitado (`410`); la cola de matchmaking es una partida `MATCHMAKING` en espera.

**Ajustes al protocolo de E2:** `partidaId` es un entero; la respuesta `202` de matchmaking incluye `partidaId`; se agregaron `GET /games`, `PATCH` y `DELETE` para completar el CRUD.

**Datos de prueba:** `npm run db:seed` crea usuarios `demo_*` (contraseña `123456`) y partidas en distintos estados. El lobby `PRAT22` permite probar unirse por código con `demo_libre1`.
Las partidas en curso y terminada incluyen un tablero fijo (100 casillas, con las 12 especiales de la regla 7) y la flota de cada jugador, así que se pueden consultar con `GET /games/:id` y, en la partida en curso, `demo_karla` puede jugar su turno.

**Flujo de prueba:** `POST /games` → `POST /games/<codigo>/join` → `GET /games/<id>` → `PATCH /games/<id>` → `DELETE /games/<id>`.

**Postman:** [docs/postman/partidas.postman_collection.json](docs/postman/partidas.postman_collection.json). Poner en `jugadorA` y `jugadorB` los ids de `demo_libre1` y `demo_libre2` y ejecutar en orden.

### Postman: usuarios y autenticación

La colección está en
[docs/postman/usuarios.postman_collection.json](docs/postman/usuarios.postman_collection.json).

Con el backend funcionando, importar la colección en Postman y ejecutar
las peticiones del 1 al 7 en orden. La primera guarda automáticamente
el ID y nombre del usuario de prueba. Se prueban creación, listado,
consulta, actualización, login, registro y eliminación.

Las siete peticiones fueron ejecutadas y devolvieron los códigos HTTP
esperados.

## Integración con el frontend

El registro, el inicio de sesión y el menú del frontend utilizan `fetch` para
comunicarse con el backend: `/auth/register`, `/auth/login` y los endpoints de
`/games` (crear partida, unirse por código, buscar rival y cancelar). Las cuentas
y partidas se guardan en PostgreSQL y permanecen disponibles después de recargar la página.

### Configuración del frontend

El frontend está en el repositorio
[AlexisGoatWEB-Frontend-S2-26-2](https://github.com/IIC2513/AlexisGoatWEB-Frontend-S2-26-2).

Desde la carpeta del frontend, instalar las dependencias y crear el
archivo de configuración local:

```bash
npm install
cp .env.example .env.local
```

El archivo `.env.local` debe contener:

```env
VITE_API_URL=http://localhost:3000
```

Si se modifica esta variable mientras el frontend está funcionando,
reiniciar su servidor para que tome el cambio.

### Ejecutar ambos proyectos

PostgreSQL debe estar funcionando y la base de datos debe estar creada
con sus migraciones aplicadas, siguiendo las instrucciones anteriores.

En una terminal, desde la carpeta del backend:

```bash
npm run dev
```

En otra terminal, desde la carpeta del frontend:

```bash
npm run dev
```

Mantener ambas terminales abiertas y entrar a `http://localhost:5173`.

La variable `FRONTEND_URL` del `.env` del backend debe coincidir con
la dirección del frontend:

```env
FRONTEND_URL=http://localhost:5173
```

Si el frontend utiliza otro puerto, actualizar esta variable y reiniciar
el backend.

### Flujo de prueba de usuarios

1. Abrir el frontend y entrar a la página de registro.
2. Crear una cuenta con un nombre y correo nuevos, seleccionando el rol `Jugador`.
3. Comprobar que se abre el menú y aparece el nombre de usuario en la barra superior.
4. Recargar la página y comprobar que el nombre sigue apareciendo.
5. Cerrar sesión.
6. Iniciar sesión con la cuenta creada.
7. Volver a cerrar sesión e intentar entrar directamente a `/menu`, `/preparacion` o `/tablero`: se debe redirigir a `/login`.

Para registrar un administrador, ingresar el código configurado en
`CODIGO_ADMIN` en el `.env` del backend.

Si se ejecutaron los seeders, también se puede probar el login con
`demo_libre1` y la contraseña `123456`.

### Manejo de sesión

El frontend guarda los datos públicos del usuario en `sessionStorage`,
sin incluir su contraseña. La sesión se mantiene al recargar la misma
pestaña y se elimina al cerrar sesión o cerrar la pestaña.

Las rutas `/menu`, `/preparacion` y `/tablero` requieren que exista
una sesión en el frontend. Esta comprobación controla la navegación;
la autenticación del servidor mediante JWT queda para la Entrega 4.

Las cuentas permanecen guardadas en PostgreSQL aunque se cierre sesión.
Para identificar al usuario en las peticiones a `/games`, se utiliza
el header `X-Usuario-Id` explicado anteriormente.

## Turnos, abandono y eventos de partida

| Método | Ruta | Función | Éxito |
|---|---|---|---|
| POST | /games/:id/terminar-turno | Termina el turno del jugador activo | 200 |
| POST | /games/:id/abandonar | Abandona una partida en despliegue o en curso; gana el rival | 200 |
| GET | /games/:id/eventos | Lista las cartas de evento reveladas, por ronda | 200 |
| GET | /games/:id/eventos/:eventoId | Consulta una carta | 200 |
| POST | /games/:id/eventos | Crea una carta (solo administrador) | 201 |
| PATCH | /games/:id/eventos/:eventoId | Modifica una carta (solo administrador) | 200 |
| DELETE | /games/:id/eventos/:eventoId | Elimina una carta (solo administrador) | 204 |

**Turnos:** al terminar el turno, el rival recolecta los recursos de las casillas que ocupa (regla 8), recupera sus 3 acciones (regla 14) y recibe 1 de combustible de reserva si quedó sin combustible ni casillas de recurso (regla 18). La ronda cambia cuando el turno vuelve al jugador que inició la partida, y en ese momento el servidor revela una carta al azar (regla 33). Si el turno vence (3 minutos), el servidor lo cierra al consultar la partida (regla 15). Al terminar la ronda 20 se calcula el puntaje de la regla 36 con los desempates de la regla 37.

**Abandono:** termina la partida con victoria del rival (regla 38). En el lobby se sigue usando `DELETE /games/:id`.

**Estado de la partida:** `GET /games/:id` ahora incluye `eventoRonda` (`{ carta, efecto }`) y, cuando la partida termina, `resultadoFinal` con `motivo` (`FLOTA_DESTRUIDA`, `LIMITE_RONDAS`, `ABANDONO` o `EMPATE`), `ganador` y `puntajes` por jugador.

**Ajustes al protocolo de E2:** `terminar-turno` y `abandonar` responden con un resumen JSON en vez de cuerpo vacío, porque aún no hay WebSocket. Los errores de juego usan `422`, igual que las acciones. Las cartas se revelan y se muestran, pero sus efectos todavía no se aplican.

**Flujo de prueba:** `demo_karla` (turno suyo, ronda 4) → `POST /games/3/terminar-turno` → `demo_diego` → `POST /games/3/terminar-turno` → empieza la ronda 5 con una carta nueva (`GET /games/3/eventos`).