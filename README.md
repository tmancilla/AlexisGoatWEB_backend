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