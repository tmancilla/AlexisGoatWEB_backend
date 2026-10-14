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

Modelos `Partida` y `JugadorPartida` (relación muchos a muchos entre `Usuario` y `Partida`, con rol `DUENO`/`INVITADO` y recursos iniciales). Todos los endpoints requieren el header `X-Usuario-Id`.

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

**Postman:** [`docs/postman/partidas.postman_collection.json`](docs/postman/partidas.postman_collection.json). Poner en `jugadorA` y `jugadorB` los ids de `demo_libre1` y `demo_libre2` y ejecutar en orden.