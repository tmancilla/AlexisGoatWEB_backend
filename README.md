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

Completar `DB_USER`, `DB_PASSWORD`, `CODIGO_ADMIN` y `JWT_SECRET` en `.env`. Mantener las demás variables según `.env.example`, incluyendo:

```env
JWT_EXPIRA=8h
```

Para generar `JWT_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copiar el resultado en `JWT_SECRET` del `.env` local.

El archivo `.env` no se sube al repositorio. En `.env.example`, `JWT_SECRET` y `CODIGO_ADMIN` quedan vacíos.

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

## Actualizar una instalación existente

Después de incorporar cambios de `develop`, ejecutar desde el backend:

```bash
git switch develop
git pull --ff-only
npm install
npm run db:migrate
```

Las dependencias y sus versiones se mantienen en `package.json` y `package-lock.json`. `npm install` instala lo necesario; no hay que instalar cada biblioteca por separado.

Si ya existe un `.env`, conservar sus valores y completar las variables nuevas según `.env.example`.

La migración `014-hash-usuarios-existentes` convierte las contraseñas antiguas a bcrypt y conserva las que ya estaban protegidas. Los usuarios siguen entrando con sus mismas contraseñas.

## Usuarios y autenticación — Entregas 3 y 4

Los usuarios se almacenan en PostgreSQL mediante el modelo Usuario.
Se implementaron las siguientes rutas:

| Método | Ruta | Función | Acceso |
|---|---|---|---|
| POST | /users | Crear usuario | Público; crear administradores exige `codigoAdmin` válido |
| GET | /users | Listar usuarios | Administrador autenticado |
| GET | /users/:id | Consultar usuario | El propio usuario autenticado o un administrador |
| PATCH | /users/:id | Actualizar usuario | El propio usuario autenticado o un administrador; modificar `role` exige ser administrador |
| DELETE | /users/:id | Eliminar usuario | Administrador autenticado |
| POST | /auth/register | Registrar usuario | Público; registrar administradores exige `codigoAdmin` válido |
| POST | /auth/login | Iniciar sesión | Público, con credenciales válidas |

Para registrar un administrador, se debe enviar `role: "Administrador"`
y `codigoAdmin`. El servidor compara el código recibido con la variable
`CODIGO_ADMIN` del `.env`.

La validación se aplica tanto a `/auth/register` como a `/users`.
Si el código falta o es incorrecto, responde `403 CODIGO_ADMIN_INVALIDO`.

Un jugador no puede enviar el campo `role` al editar su usuario.

### Contraseñas con bcrypt

Se utiliza bcrypt con un factor de trabajo de 10.

El modelo `Usuario` aplica el hash mediante `beforeCreate` y `beforeUpdate`.
Al crear usuarios mediante el modelo o modificar su contraseña, se entrega
la contraseña original: el modelo realiza el hash.

Los seeders usan `bulkInsert`, por lo que aplican bcrypt directamente.
Los usuarios demo siguen entrando con `123456`.

### Ajustes al protocolo de E2

Registro y login devuelven el token y los datos públicos del usuario:

```json
{
  "token": "<token_jwt>",
  "usuario": {
    "id": 2,
    "username": "jugador_auth",
    "email": "auth@uc.cl",
    "role": "Jugador"
  }
}
```

El registro responde `201` y el login correcto `200`.
Las respuestas no incluyen la contraseña ni su hash.

Los errores de validación y duplicados usan el middleware general:
`VALIDACION_FALLIDA` (400) y `REGISTRO_DUPLICADO` (409).
El login con credenciales incorrectas devuelve
`CREDENCIALES_INVALIDAS` (401).

### Verificación realizada

Se probaron mediante curl la creación, consulta individual, listado,
actualización y eliminación de usuarios; los errores por usuario
inexistente, correo inválido e ID inválido; y el registro y login con
credenciales correctas e incorrectas.

### Identificación del usuario con JWT

Las rutas protegidas reciben el token mediante:

```http
Authorization: Bearer <token>
```

Se mantienen los siguientes formatos compartidos:

- Registro y login responden `{ token, usuario }`.
- El payload del token utiliza `{ id, rol }`, además de las fechas agregadas por la biblioteca.
- El modelo `Usuario` y los datos públicos del usuario utilizan el campo `role`.
- `src/utils/token.js` exporta `firmarToken(usuario)` y `verificarToken(token)`.
- El middleware `autenticar` carga al usuario de la base en `ctx.state.user` y `ctx.state.usuario`.

`X-Usuario-Id` ya no autentica las peticiones.

Para obtener un token con un usuario demo de una base con seeders:

```bash
curl -i -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"demo_libre1","password":"123456"}'
```

Copiar el valor de `token` de la respuesta y usarlo en las peticiones protegidas:

```bash
TOKEN='<token_devuelto_por_el_login>'

curl -i http://localhost:3000/games \
  -H "Authorization: Bearer $TOKEN"
```

Los controles de acceso responden:

| Situación | Respuesta |
|---|---|
| Token ausente, inválido, vencido o usuario inexistente | 401 `TOKEN_INVALIDO` |
| Rol insuficiente | 403 `ROL_NO_AUTORIZADO` |
| Consultar o editar otro usuario sin ser administrador | 403 `USUARIO_NO_AUTORIZADO` |
| Un jugador envía un cambio de rol | 403 `CAMBIO_ROL_NO_AUTORIZADO` |

### Rutas administrativas

| Método | Ruta | Función | Acceso |
|---|---|---|---|
| GET | /admin/usuarios | Listar usuarios sin contraseñas ni hashes | Administrador autenticado |
| GET | /admin/partidas | Listar partidas | Administrador autenticado |

Estas rutas utilizan `autenticar` y `exigirRol('Administrador')`.

## Partidas y lobby — Entrega 3

Modelos `Partida` y `JugadorPartida` (relación muchos a muchos entre `Usuario` y `Partida`, con rol `DUENO`/`INVITADO`, `numeroJugador` y recursos iniciales). El jugador 1 es el dueño, o el primero en la cola de matchmaking, y despliega en las filas 1 a 4; el 2 en las filas 7 a 10. Todos los endpoints requieren `Authorization: Bearer <token>`.

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

**Postman:** [docs/postman/partidas.postman_collection.json](docs/postman/partidas.postman_collection.json). Las variables `jugadorA` y `jugadorB` ya traen los ids de `demo_libre1` y `demo_libre2` en una base recién reseteada; ejecutar las carpetas en orden con el Runner (`partidaId` y `codigo` se guardan solos).

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

Modelos del tablero y la flota, con sus migraciones (`004` a `009`, `012` y `013`), asociaciones y validaciones:

| Tabla | Para qué |
|---|---|
| `CatalogoMejoras` | Las 4 mejoras de la regla 30 (se cargan con el seeder `004`) |
| `Casillas` | Las 100 casillas de cada partida, una por coordenada, con la chatarra que dejan los barcos hundidos |
| `Barcos` | Los 4 barcos de cada jugador, con sus stats y su posición |
| `CasillasReveladas` | Lo que cada jugador ya descubrió del mapa (relación "descubre" del ER) |
| `MejorasBarco` | Las mejoras que compró cada barco (relación "adquiere" del ER) |
| `Acciones` | Cada jugada con su ronda y su resultado (entidad Accion del ER) |
| `Combates` | Cada enfrentamiento con su barco atacante, su barco defensor, los dados y si hubo impacto (entidad Combate del ER, relaciones "ataca" y "defiende") |

Las reglas fijas del juego (stats de los barcos, zonas de despliegue, casillas especiales y tiempos) están en `src/config/reglas.js`, y las funciones del tablero (generar el mapa, distancias, visión y rutas) en `src/utils/tablero.js`.

| Método | Ruta | Función | Éxito |
|---|---|---|---|
| POST | /games/:id/desplegar | Desplegar la flota | 200 |
| GET | /games/:id | Estado de la partida filtrado por jugador (en despliegue, en curso o terminada) | 200 |
| POST | /games/:id/acciones | Realizar una acción (`MOVER` o `DISPARAR`) | 200 |
| GET | /games/:id/acciones | Listar mis acciones en la partida | 200 |
| GET / PATCH / DELETE | /games/:id/acciones/:accionId | Consultar, corregir o borrar una acción (corregir y borrar solo en partidas terminadas) | 200 / 204 |
| GET | /games/:id/combates | Listar los combates de la partida | 200 |
| GET | /games/:id/combates/:combateId | Consultar un combate | 200 |
| POST | /games/:id/combates | Crear un combate (solo administrador) | 201 |
| PATCH | /games/:id/combates/:combateId | Modificar un combate (solo administrador) | 200 |
| DELETE | /games/:id/combates/:combateId | Eliminar un combate (solo administrador) | 204 |
| GET | /games/:id/barcos | Listar los barcos de la partida (solo administrador) | 200 |
| GET | /games/:id/barcos/:barcoId | Consultar un barco (solo administrador) | 200 |
| POST | /games/:id/barcos | Crear un barco con las stats de su tipo (solo administrador, durante el despliegue) | 201 |
| PATCH | /games/:id/barcos/:barcoId | Corregir la casilla, el casco o las stats de un barco (solo administrador, en despliegue o en curso) | 200 |
| DELETE | /games/:id/barcos/:barcoId | Eliminar un barco (solo administrador, durante el despliegue) | 204 |
| GET | /games/:id/casillas | Listar las 100 casillas del tablero (solo administrador) | 200 |
| GET | /games/:id/casillas/:casillaId | Consultar una casilla (solo administrador) | 200 |
| POST | /games/:id/casillas | Crear una casilla en una coordenada libre (solo administrador, durante el despliegue) | 201 |
| PATCH | /games/:id/casillas/:casillaId | Cambiar el tipo de una casilla o si está agotada (solo administrador, en despliegue o en curso) | 200 |
| DELETE | /games/:id/casillas/:casillaId | Eliminar una casilla (solo administrador, durante el despliegue) | 204 |

**Lo que hace el servidor:**

- Cuando la partida pasa a `DESPLIEGUE`, genera su tablero (las 12 casillas especiales de la regla 7, sorteadas con `crypto`) y guarda en `expiraEn` el plazo de 2 minutos para desplegar.
- `desplegar` exige 4 barcos, uno de cada tipo, en casillas distintas y dentro de la zona del `numeroJugador` (filas 1 a 4 o 7 a 10). Cuando los dos están listos, la partida pasa a `EN_CURSO`, se sortea quién parte y el otro recibe 2 de combustible extra. Si se vence el plazo, la siguiente consulta a la partida despliega al azar al que faltaba.
- El estado solo incluye lo que ve cada jugador: las casillas dentro del radio de detección de sus barcos a flote (distancia Manhattan) y las que ya reveló. Las corrientes que no ha descubierto se ven como agua y, del rival, solo se mandan los barcos dentro de su radio y cuántos le quedan a flote.
- `MOVER` valida en el orden del protocolo, busca el camino más corto que esquive los barcos visibles y cobra el combustible de las casillas recorridas. En el camino recoge la chatarra de los naufragios y de los barcos hundidos y los botines flotantes, se frena en las corrientes (−1 de casco) o junto a un enemigo que no se veía, y controla el máximo de 2 acciones por barco.
- `DISPARAR` cuesta 1 acción más la munición del barco y apunta a cualquier casilla dentro de su alcance, visible o en la niebla (reglas 23 a 25). Si hay un enemigo le quita 1 de casco, o 2 si dispara el Acorazado, y se guarda el combate a distancia. Al atacante solo se le informa si hubo impacto y si lo hundió, y el casco restante solo cuando el enemigo está dentro de su radio de detección; si el disparo cae al agua, la respuesta es `{ "impacto": false }` y nada más.
- Cuando un barco se hunde, por un disparo o por una corriente, deja 2 de chatarra en su casilla para el primer barco que pase por ahí (reglas 28 y 41). La chatarra se guarda en la casilla, por lo que una corriente o un pozo no pierden su efecto, y en el estado aparece como `chatarra` en las casillas visibles.
- Las acciones de una misma partida se procesan de a una (bloqueo de la fila de la partida), así dos peticiones simultáneas no se pisan.
- Un combate valida que el atacante y el defensor sean barcos de la partida y de jugadores distintos. En uno a distancia no se guardan dados, y en uno cuerpo a cuerpo van los dos dados, sin empate (se vuelve a lanzar, regla 26), y hay impacto solo si el atacante saca el más alto.
- El CRUD de barcos y casillas es solo para administradores, ya que si un jugador pudiera leerlos directamente se saltaría la niebla de guerra (regla 22); los jugadores siguen viendo su versión filtrada con `GET /games/:id`. Para no romper una partida en juego, los barcos y las casillas solo se crean o eliminan durante el despliegue, se pueden corregir durante el despliegue o en curso, y una partida terminada no se modifica para que su historial quede intacto. Al crear un barco se revisa que el jugador sea de la partida, que no tenga ya un barco de ese tipo, que la casilla esté en su zona y que no haya otro barco en ella.

**Ajustes al protocolo de E2:**

- `desplegar` responde `{ partidaId, estado, jugadorActivo }` en vez de cuerpo vacío, ya que en esta entrega no hay WebSocket para avisar el cambio de estado.
- Nuevo error `409 YA_DESPLEGASTE`, cuando un jugador intenta desplegar dos veces.
- El estado agrega `yo.numeroJugador`, `yo.listo`, `rival.numeroJugador`, `rival.listo` y `despliegueExpiraEn`. `jugadorActivo` y `jugadorId` son ids de usuario, los `barcoId` son números y `accionesPorBarco` usa el id del barco como clave.
- Las jugadas que violan las reglas (fuera de turno, sin recursos, fuera de alcance, etc.) responden `422`, como pide la Entrega 4. Los datos mal formados responden `400`, lo que no es tuyo `403` y lo que no existe `404`. Códigos nuevos: `DESTINO_INVALIDO`, `ACCION_NO_DISPONIBLE` y `TIPO_ACCION_INVALIDO`.
- El resultado de `MOVER` puede incluir `chatarraRecogida`, `combustibleRecogido`, `municionRecogida` y `hundido`.
- `MUNICION_INSUFICIENTE` y `FUERA_DE_ALCANCE` responden `422` como el resto de las jugadas inválidas (el protocolo de E2 tenía 409 y 400), y hay un código nuevo, `OBJETIVO_PROPIO`, para cuando se apunta a una casilla con un barco propio.
- Los errores de formato del cuerpo de una acción (campos que faltan o casillas fuera del tablero) responden `400` antes de revisar el turno o los recursos.
- Las casillas visibles pueden traer `chatarra` con la cantidad que quedó ahí; si la casilla es de agua, su `tipo` se muestra como `CHATARRA`.

**Pendiente:** las acciones `VIGIA` y `MEJORAR`, el combate cuerpo a cuerpo automático, el fin de la partida por flota destruida y el "contacto perdido". El cambio de turno, el abandono, las cartas de evento (`eventoRonda`) y el resultado final (`resultadoFinal`) están en la sección "Turnos, abandono y eventos de partida".

**Datos de prueba:** el seeder `005-demo-tablero` carga el tablero y los barcos de la partida en curso de `demo_karla` contra `demo_diego` (partida 3, ronda 4, turno de Karla), junto con una mejora, una corriente revelada y algunas acciones de historial. El seeder `006-demo-historial` agrega los combates y las acciones de la partida terminada de `demo_elena` contra `demo_fede` (partida 4), que explican cómo se hundió la flota de Fede, y un disparo de Karla en la partida en curso. Las cartas de evento vienen del seeder `002`.

**Postman:** [docs/postman/tablero.postman_collection.json](docs/postman/tablero.postman_collection.json). Después de `npm run db:reset`, ejecutar las cuatro carpetas en orden con el Runner (la última es la de combates). Cada petición trae un ejemplo de respuesta y tests que revisan el código HTTP.

### Cómo simular el ciclo de juego

Con el backend y el frontend corriendo (ver "Ejecutar ambos proyectos") y la base recién recreada con `npm run db:reset`:

**Partida en curso (seeder):**

1. Iniciar sesión en el frontend con `demo_karla` y la contraseña `123456`.
2. Entrar a `http://localhost:5173/tablero?partidaId=3`.
3. Hacer click en un barco propio y después en una casilla verde para moverlo. El tablero, los recursos, las acciones y la bitácora se actualizan con lo que responde el servidor, y si la jugada no es válida se muestra el mensaje de error.
4. En una ventana privada, iniciar sesión con `demo_diego` y abrir la misma partida: se ve su propia versión del mapa y el servidor le rechaza las jugadas porque no es su turno.
5. Karla aprieta "Terminar turno". La pantalla de Diego se actualiza sola: ahora puede mover y, al terminar su turno, empieza la ronda 5 con una carta de evento nueva.
6. Con "Abandonar" la partida termina con victoria del rival y se muestra el resultado.

**Partida desde cero:**

1. Iniciar sesión con `demo_libre1` en una ventana y con `demo_libre2` en otra ventana privada.
2. Los dos eligen "Buscar partida" en el menú, o uno crea la partida y el otro se une con el código.
3. En Preparación, cada uno ubica sus 4 barcos en su zona y confirma antes de que se acaben los 2 minutos.
4. Cuando los dos confirman, el servidor sortea quién parte y ambos pasan al tablero.

El mismo ciclo por API es: `PATCH /games/2` (Ana inicia) → `POST /games/2/desplegar` (Ana) → `POST /games/2/desplegar` (Beto) → `GET /games/2` → `POST /games/2/acciones` → `POST /games/2/terminar-turno`. Hasta el despliegue está armado en la carpeta 2 de la colección de tablero, y los turnos en la colección de turnos y eventos.

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

El frontend guarda los datos públicos del usuario y el token JWT en
`sessionStorage`, sin incluir su contraseña. La sesión se mantiene al
recargar la misma pestaña y se elimina al cerrar sesión o cerrar la pestaña.

Las rutas `/menu`, `/preparacion` y `/tablero` requieren una sesión en el
frontend. Al recuperar la sesión se comprueba que existan usuario y token.
El servidor valida el JWT en cada petición protegida.

`pedirApi` lee el token de `sessionStorage` y agrega el header
`Authorization: Bearer <token>`. Preparación también utiliza este servicio.
Si una petición realizada con `pedirApi` recibe `401`, se eliminan usuario y
token y se redirige a `/login`.

Las cuentas permanecen guardadas en PostgreSQL aunque se cierre sesión.

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

**Turnos:** al terminar el turno, el rival recolecta los recursos de las casillas que ocupa (regla 8), recupera sus 3 acciones (regla 14) y recibe 1 de combustible de reserva si quedó sin combustible ni casillas de recurso (regla 18). La ronda cambia cuando el turno vuelve al jugador que inició la partida, y en ese momento el servidor revela una carta al azar (regla 33). Si el turno vence (3 minutos), el servidor lo cierra solo: un intervalo revisa cada 5 segundos los turnos y despliegues vencidos y avisa por WebSocket (regla 15). También se resuelve al consultar la partida, como respaldo. Al terminar la ronda 20 se calcula el puntaje de la regla 36 con los desempates de la regla 37.

**Abandono:** termina la partida con victoria del rival (regla 38). En el lobby se sigue usando `DELETE /games/:id`.

**Estado de la partida:** `GET /games/:id` ahora incluye `eventoRonda` (`{ carta, efecto }`) y, cuando la partida termina, `resultadoFinal` con `motivo` (`FLOTA_DESTRUIDA`, `LIMITE_RONDAS`, `ABANDONO` o `EMPATE`), `ganador` y `puntajes` por jugador.

**Ajustes al protocolo de E2:** `terminar-turno` y `abandonar` responden con un resumen JSON en vez de cuerpo vacío; así quien hizo la jugada tiene el resultado sin esperar el aviso del socket. Los errores de juego usan `422`, igual que las acciones.

**Cartas de evento:** al revelarse, **Sabotaje** le quita 1 de munición a un jugador elegido al azar (sin bajar de 0) y **Botín flotante** convierte una casilla de agua vacía (sin barcos ni chatarra) en `BOTIN_COMBUSTIBLE` o `BOTIN_MUNICION`, que entrega 2 del recurso al primer barco que pasa por ella. El detalle (a quién le tocó o dónde apareció el botín) queda en la `descripcion` de la carta y se ve en `eventoRonda.efecto`. **Tormenta** y **Marea alta** se aplican durante la ronda en las acciones y el estado.

**Flujo de prueba:** `demo_karla` (turno suyo, ronda 4) → `POST /games/3/terminar-turno` → `demo_diego` → `POST /games/3/terminar-turno` → empieza la ronda 5 con una carta nueva (`GET /games/3/eventos`).

## Pruebas automatizadas con Jest — Entrega 4

### Herramientas y ejecución

Se utilizan Jest y Supertest, con las versiones registradas en
`package.json` y `package-lock.json`.

Para instalar las dependencias:

```bash
npm install
```

Para ejecutar las pruebas:

```bash
npm test
```

PostgreSQL debe estar funcionando. Supertest prueba la aplicación exportada
por `src/app.js`; no hace falta levantar por separado el backend ni el
frontend.

El comando utiliza `jest --runInBand`, por lo que los archivos de pruebas
se ejecutan uno después del otro.

### Infraestructura compartida

| Archivo | Función |
|---|---|
| `jest.config.js` | Configura Jest y busca los archivos `tests/**/*.test.js` |
| `tests/setup.js` | Selecciona el entorno de pruebas, comprueba la base y configura las variables de ese entorno |
| `tests/globalSetup.js` | Prepara la base mediante las migraciones y seeders existentes antes de ejecutar las pruebas |
| `tests/helpers/tokenDe.js` | Genera tokens para los usuarios utilizados en las pruebas |
| `tests/auth.test.js` | Contiene las pruebas de autenticación y permisos y sirve como referencia |

Las nuevas pruebas deben utilizar esta configuración común y las
dependencias existentes.

### Base de datos de pruebas

Se utiliza la configuración `test` de `src/config/database.js`.
El nombre de la base es `${DB_NAME}_test`; con la configuración local
del proyecto corresponde a `guerra_pacifico_dev_test`.

Antes de cada ejecución, `tests/globalSetup.js` elimina y vuelve a crear
esa base, ejecuta las migraciones y carga los seeders.

**Los datos de la base de pruebas se borran al comenzar cada ejecución.**
La base de desarrollo se conserva.

El usuario de PostgreSQL configurado en `.env` debe tener permisos para
crear y eliminar la base de pruebas.

La preparación de la base ya está centralizada en `tests/globalSetup.js`;
los archivos de pruebas reutilizan esa preparación.

### Agregar pruebas de cada integrante

Cada integrante agrega pruebas de las funcionalidades que implementa,
incluyendo casos de éxito y de error.

- Crear archivos terminados en `.test.js` dentro de `tests`.
- Utilizar Jest y Supertest con la configuración existente.
- Importar la aplicación desde `src/app.js` y utilizar `app.callback()` con Supertest.
- Tomar `tests/auth.test.js` como referencia para preparar usuarios propios y cerrar la conexión con Sequelize al terminar el archivo.
- Obtener los IDs de los registros creados en la base de pruebas, en lugar de utilizar IDs de la base de desarrollo.
- Generar los tokens mediante `tests/helpers/tokenDe.js`.

Ejemplo del ayudante desde un archivo ubicado directamente en `tests`:

```javascript
const tokenDe = require('./helpers/tokenDe');

const token = tokenDe(usuario);
```

El ayudante recibe un usuario con sus campos `id` y `role` y devuelve
el token que se envía mediante `Authorization: Bearer <token>`.

Actualmente, `tests/auth.test.js` contiene ocho pruebas de registro,
contraseñas, login, autenticación y permisos, ejecutadas correctamente
con `npm test`.

Las pruebas nuevas se ejecutan con el mismo comando.

`tests/turnos.test.js` prueba terminar turno (200 y 422 `NO_ES_TU_TURNO`) y abandonar (la partida queda `TERMINADA` con el rival como ganador). `tests/socket.test.js` levanta un servidor real en un puerto libre y conecta clientes con `socket.io-client` para probar la autenticación, las salas y los avisos.

## Colecciones de Postman y bitácora de jugadas

Las colecciones corresponden a E3 y están pendientes de adaptación a JWT.
Son independientes de las pruebas de Jest ejecutadas mediante `npm test`.

| Colección | Qué prueba | Peticiones |
|---|---|---|
| [usuarios](docs/postman/usuarios.postman_collection.json) | CRUD de usuarios, registro e inicio de sesión | 7 |
| [partidas](docs/postman/partidas.postman_collection.json) | Lobby privado, matchmaking y errores de partidas | 16 |
| [tablero](docs/postman/tablero.postman_collection.json) | Estado de la partida, despliegue, mover y combates | 28 |
| [acciones](docs/postman/acciones.postman_collection.json) | Historial de acciones: consultar, corregir y borrar | 4 |
| [turnos-eventos](docs/postman/turnos-eventos.postman_collection.json) | Terminar turno, abandonar y cartas de evento | 12 |

Cada colección modifica los datos de prueba (crea partidas, mueve barcos o termina la partida), así que hay que correr `npm run db:reset` antes de ejecutar cada una con el Runner. Las variables traen los ids de una base recién reseteada y el resto de los ids se guardan solos. Todas las peticiones tienen un ejemplo de respuesta y tests que revisan el código HTTP.

La [bitácora de ejecución de jugadas](docs/bitacora-jugadas.md) registra una partida completa jugada contra la API, desde el registro de dos usuarios hasta el resultado final, con cada petición y la respuesta del servidor.

## Tiempo real con WebSockets

El backend usa **socket.io** en el mismo puerto que la API (`src/index.js` crea un servidor http con Koa y le monta el socket). El socket solo avisa que algo cambió. El cliente vuelve a pedir `GET /games/:id`, que filtra la niebla de guerra para cada jugador. Así nunca viaja por el socket información del rival que no debería ver.

| Archivo | Función |
|---|---|
| `src/realtime/socket.js` | Autenticación con JWT, salas y envío de avisos |
| `src/middlewares/avisarPartida.js` | Después de cada POST/PATCH/DELETE exitoso de una partida, avisa a sus jugadores |
| `src/realtime/vencimientos.js` | Cada 5 s cierra turnos y despliegues vencidos y borra lobbies privados expirados |

### Conexión

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', { auth: { token } }); // el mismo JWT del login
socket.on('connect_error', (error) => console.log(error.message)); // 'TOKEN_INVALIDO'
```

Sin token, con un token vencido o con un usuario que ya no existe, la conexión se rechaza con `TOKEN_INVALIDO`. Al conectarse, cada usuario entra solo a su sala personal `usuario:{id}`, por donde recibe los avisos del lobby. El origen permitido es `FRONTEND_URL`, igual que en CORS.

### Eventos del cliente al servidor

| Evento | Datos | Respuesta (ack) |
|---|---|---|
| `partida:unirse` | `{ partidaId }` | `{ ok: true, partidaId }` o `{ ok: false, codigo, mensaje }` con `ID_INVALIDO`, `PARTIDA_NO_EXISTE` o `NO_PERTENECES_A_LA_PARTIDA` |
| `partida:salir` | `{ partidaId }` | `{ ok: true }` |

En `partida:terminada`, `motivo` es el `motivoFin` (`FLOTA_DESTRUIDA`, `LIMITE_RONDAS`, `ABANDONO` o `EMPATE`) y `ganador` es el `usuarioId` del ganador (`null` si hay empate).
Solo entran a la sala `partida:{id}` sus jugadores y el administrador, con la misma regla que `GET /games/:id`.

```javascript
socket.emit('partida:unirse', { partidaId: 3 }, (respuesta) => console.log(respuesta));
```

### Eventos del servidor al cliente

| Evento | Quién lo recibe | Datos |
|---|---|---|
| `partida:actualizada` | Sala `partida:{id}` | `{ partidaId, motivo }` |
| `lobby:actualizado` | Sala personal de cada jugador de la partida | `{ partidaId, motivo }` |
| `partida:terminada` | Sala de la partida y salas personales de sus jugadores | `{ partidaId, motivo, ganador }` |

Valores de `motivo` en `partida:actualizada` y `lobby:actualizado`:

| `motivo` | Cuándo ocurre | Eventos |
|---|---|---|
| `RIVAL_ENCONTRADO` | `POST /games/matchmaking` arma una partida | `partida:actualizada`, `lobby:actualizado` |
| `JUGADOR_UNIDO` | `POST /games/:codigo/join` | `partida:actualizada`, `lobby:actualizado` |
| `PARTIDA_INICIADA` | `PATCH /games/:id` | `partida:actualizada`, `lobby:actualizado` |
| `PARTIDA_CANCELADA` | `DELETE /games/:id` | `partida:actualizada`, `lobby:actualizado` |
| `LOBBY_EXPIRADO` | El intervalo borra un lobby privado expirado | `partida:actualizada`, `lobby:actualizado` |
| `DESPLIEGUE` | `POST /games/:id/desplegar` | `partida:actualizada` |
| `ACCION` | `POST /games/:id/acciones` | `partida:actualizada` |
| `TURNO_TERMINADO` | `POST /games/:id/terminar-turno` | `partida:actualizada` |
| `ABANDONO` | `POST /games/:id/abandonar` | `partida:actualizada`, `partida:terminada` |
| `DESPLIEGUE_VENCIDO` | El intervalo cierra un despliegue vencido | `partida:actualizada` |
| `TURNO_VENCIDO` | El intervalo cierra un turno vencido | `partida:actualizada` |

Cualquier aviso que deje la partida en `TERMINADA` (por ejemplo, una `ACCION` que hunde el último barco o el turno de la ronda 20) también envía `partida:terminada`. Las jugadas rechazadas (4xx) y la respuesta `202` del matchmaking, cuando todavía no hay rival, no envían avisos.

### Cómo probarlo con dos ventanas

1. Levantar backend (`npm run dev`) y frontend (`npm run dev`).
2. Abrir `http://localhost:5173` en una ventana normal y en una de incógnito.
3. Iniciar sesión con dos usuarios distintos y probar:
   - **Lobby por código:** uno crea una partida privada y el otro se une con el código. El primero ve "Partida lista" sin recargar.
   - **Matchmaking:** ambos buscan rival y los dos pasan a "Partida lista".
   - **Preparación:** el primero que confirma su despliegue queda esperando. Cuando el rival confirma el suyo, la pantalla del primero pasa sola al tablero sin recargar.
   - **Abandono:** si uno abandona, el otro ve el aviso al instante.

Las pruebas automáticas están en `tests/socket.test.js`.