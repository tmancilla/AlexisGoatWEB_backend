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

## Tablero, despliegue y acciones — Entrega 3

Modelos del tablero y la flota, con sus migraciones (`004` a `009`), asociaciones y validaciones:

| Tabla | Para qué |
|---|---|
| `CatalogoMejoras` | Las 4 mejoras de la regla 30 (se cargan con el seeder `004`) |
| `Casillas` | Las 100 casillas de cada partida, una por coordenada |
| `Barcos` | Los 4 barcos de cada jugador, con sus stats y su posición |
| `CasillasReveladas` | Lo que cada jugador ya descubrió del mapa (relación "descubre" del ER) |
| `MejorasBarco` | Las mejoras que compró cada barco (relación "adquiere" del ER) |
| `Acciones` | Cada jugada con su ronda y su resultado (entidad Accion del ER) |

Las reglas fijas del juego (stats de los barcos, zonas de despliegue, casillas especiales y tiempos) están en `src/config/reglas.js`, y las funciones del tablero (generar el mapa, distancias, visión y rutas) en `src/utils/tablero.js`.

| Método | Ruta | Función | Éxito |
|---|---|---|---|
| POST | /games/:id/desplegar | Desplegar la flota | 200 |
| GET | /games/:id | Estado de la partida filtrado por jugador (en despliegue, en curso o terminada) | 200 |
| POST | /games/:id/acciones | Realizar una acción (por ahora `MOVER`) | 200 |
| GET | /games/:id/acciones | Listar mis acciones en la partida | 200 |
| GET / PATCH / DELETE | /games/:id/acciones/:accionId | Consultar, corregir o borrar una acción (corregir y borrar solo en partidas terminadas) | 200 / 204 |

**Lo que hace el servidor:**

- Cuando la partida pasa a `DESPLIEGUE`, genera su tablero (las 12 casillas especiales de la regla 7, sorteadas con `crypto`) y guarda en `expiraEn` el plazo de 2 minutos para desplegar.
- `desplegar` exige 4 barcos, uno de cada tipo, en casillas distintas y dentro de la zona del `numeroJugador` (filas 1 a 4 o 7 a 10). Cuando los dos están listos, la partida pasa a `EN_CURSO`, se sortea quién parte y el otro recibe 2 de combustible extra. Si se vence el plazo, la siguiente consulta a la partida despliega al azar al que faltaba.
- El estado solo incluye lo que ve cada jugador: las casillas dentro del radio de detección de sus barcos a flote (distancia Manhattan) y las que ya reveló. Las corrientes que no ha descubierto se ven como agua y, del rival, solo se mandan los barcos dentro de su radio y cuántos le quedan a flote.
- `MOVER` valida en el orden del protocolo, busca el camino más corto que esquive los barcos visibles y cobra el combustible de las casillas recorridas. En el camino recoge la chatarra de los naufragios, se frena en las corrientes (−1 de casco) o junto a un enemigo que no se veía, y controla el máximo de 2 acciones por barco.
- Las acciones de una misma partida se procesan de a una (bloqueo de la fila de la partida), así dos peticiones simultáneas no se pisan.

**Ajustes al protocolo de E2:**

- `desplegar` responde `{ partidaId, estado, jugadorActivo }` en vez de cuerpo vacío, ya que en esta entrega no hay WebSocket para avisar el cambio de estado.
- Nuevo error `409 YA_DESPLEGASTE`, cuando un jugador intenta desplegar dos veces.
- El estado agrega `yo.numeroJugador`, `yo.listo`, `rival.numeroJugador`, `rival.listo` y `despliegueExpiraEn`. `jugadorActivo` y `jugadorId` son ids de usuario, los `barcoId` son números y `accionesPorBarco` usa el id del barco como clave.
- Las jugadas que violan las reglas (fuera de turno, sin recursos, fuera de alcance, etc.) responden `422`, como pide la Entrega 4. Los datos mal formados responden `400`, lo que no es tuyo `403` y lo que no existe `404`. Códigos nuevos: `DESTINO_INVALIDO`, `ACCION_NO_DISPONIBLE` y `TIPO_ACCION_INVALIDO`.
- El resultado de `MOVER` puede incluir `chatarraRecogida` y `hundido`.

**Pendiente:** las acciones `DISPARAR`, `VIGIA` y `MEJORAR`, el combate cuerpo a cuerpo, la chatarra al hundirse y el "contacto perdido". `eventoRonda` y `resultadoFinal` quedan en `null` hasta que existan las cartas de evento y el fin de partida, y el cambio de turno corresponde al área de partidas.

**Datos de prueba:** el seeder `005-demo-tablero` completa la partida en curso de `demo_karla` contra `demo_diego` (partida 3, ronda 4, turno de Karla) con un tablero fijo, los 8 barcos, una mejora, una corriente revelada y algunas acciones de historial.

**Postman:** [docs/postman/tablero.postman_collection.json](docs/postman/tablero.postman_collection.json). Después de `npm run db:reset`, ejecutar las tres carpetas en orden con el Runner. Cada petición trae un ejemplo de respuesta y tests que revisan el código HTTP.

**Uso de IA:** declarado en [docs/uso-ia-tablero.md](docs/uso-ia-tablero.md).

### Cómo simular el ciclo de juego

Con el backend y el frontend corriendo (ver "Ejecutar ambos proyectos") y la base recién recreada con `npm run db:reset`:

**Partida en curso (seeder):**

1. Iniciar sesión en el frontend con `demo_karla` y la contraseña `123456`.
2. Entrar a `http://localhost:5173/tablero?partidaId=3`.
3. Hacer click en un barco propio y después en una casilla verde para moverlo. El tablero, los recursos, las acciones y la bitácora se actualizan con lo que responde el servidor, y si la jugada no es válida se muestra el mensaje de error.
4. En una ventana privada, iniciar sesión con `demo_diego` y abrir la misma partida: se ve su propia versión del mapa y el servidor le rechaza las jugadas porque no es su turno.

**Partida desde cero:**

1. Iniciar sesión con `demo_libre1` en una ventana y con `demo_libre2` en otra ventana privada.
2. Los dos eligen "Buscar partida" en el menú, o uno crea la partida y el otro se une con el código.
3. En Preparación, cada uno ubica sus 4 barcos en su zona y confirma antes de que se acaben los 2 minutos.
4. Cuando los dos confirman, el servidor sortea quién parte y ambos pasan al tablero.

El mismo ciclo por API es: `PATCH /games/2` (Ana inicia) → `POST /games/2/desplegar` (Ana) → `POST /games/2/desplegar` (Beto) → `GET /games/2` → `POST /games/2/acciones`, y está armado en la carpeta 2 de la colección de Postman.

## Integración con el frontend

El registro y el inicio de sesión del frontend utilizan `fetch` para
comunicarse con `/auth/register` y `/auth/login`. Las cuentas se guardan
en PostgreSQL y permanecen disponibles después de recargar la página.

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