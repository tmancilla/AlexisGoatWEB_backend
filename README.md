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