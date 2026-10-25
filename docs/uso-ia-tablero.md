# Uso de IA — Tablero, barcos y recursos (Miguel Mujica, Entrega 3)

## Alcance y contexto

Para mi parte de la Entrega 3 usé Claude (Claude Code, en la aplicación de escritorio), donde yo definía cada paso, las decisiones de diseño y lo que se probaba, y la herramienta escribía el código, ejecutaba las pruebas y preparaba los textos de los commits y PR, los cuales revisaba antes de subirlos. Lo que se hizo con apoyo de IA fue:

| Parte | Archivos |
|---|---|
| Catálogo de mejoras | `src/models/catalogoMejora.js`, `src/migrations/004-create-catalogo-mejoras.js`, `src/seeders/004-catalogo-mejoras.js` |
| Reglas y funciones del tablero | `src/config/reglas.js`, `src/utils/tablero.js`, `src/utils/validaciones.js` |
| Modelos del tablero | `src/models/{casilla,barco,casillaRevelada,mejoraBarco,accion}.js` y las migraciones `005` a `009` |
| Generar el tablero y desplegar | `src/services/tablero.service.js`, `src/services/despliegue.service.js`, `src/controllers/despliegue.controller.js` |
| Estado filtrado y acción de mover | `src/services/estado.service.js`, `src/services/accion.service.js`, `realizarAccion` en `src/controllers/accion.controller.js` |
| Cambios en archivos de Tomás | las llamadas a `iniciarDespliegue` en `partida.service.js`, las rutas en `partida.routes.js` y el estado en `obtenerPartida` |
| Datos de prueba y documentación | `src/seeders/005-demo-tablero.js`, `docs/postman/tablero.postman_collection.json`, la sección "Tablero, despliegue y acciones" del README |
| Frontend | `src/pages/Partida/Partida.jsx` (conexión de la pantalla de partida al backend, incluidos los botones de terminar turno y abandonar de Tomás) |

También la usé para preparar mi entorno local (PostgreSQL y Node), resolver el conflicto de merge de mi primer PR y redactar los mensajes al grupo.

## Registro de interacción

Los prompts principales, en orden, fueron estos (resumidos):

1. (13/10) "Parte haciendo pull a los repos de backend y frontend y dime cuando estés listo."
2. (13/10) "Siendo que yo soy Miguel, dame un listado de en qué orden hacer las tareas, qué tareas ya están hechas y cuáles son dependientes entre sí."
3. (14/10) "Partamos con el paso donde se mandan las decisiones al grupo y se levanta el backend en local." Aquí resolvimos que tenía dos PostgreSQL (Windows y Ubuntu) y que mi usuario existía solo en el de Ubuntu.
4. (14/10) "Con el entorno listo, partamos creando el catálogo de mejoras." / "Haz los 2 commits, pero que el autor sea solo yo."
5. (15/10) "Continúa con el siguiente paso", donde elegí que las corrientes puedan quedar en las zonas de despliegue sin hacer daño y que el radio de detección sea en distancia Manhattan, para quedar lo más pegado a las reglas.
6. (15/10) "Partamos con el paso 3", "Antes de subirlo, que el código sea solo código, sin comentarios" y "Continúa con el paso 4", donde elegí la opción de agregar yo las llamadas en el servicio de Tomás.
7. (15/10) "A en las dos, continúa con el paso 5": la ruta de despliegue en el archivo de Tomás y el plazo de 2 minutos revisado al consultar la partida.
8. (21/10) "A en las dos, continúa con el paso 7": tomar la tabla `Acciones` y usar los códigos 422 de la Entrega 4.
9. (24/10) "Revisa lo nuevo que se subió a ambos repos y continúa con mi parte" / "Termina con mis partes finales y júntalo en un PR por repo."
10. (25/10) "Hazlo de nuevo si es necesario, ya que hubo cambios de mis compañeros", donde revisamos que el seeder de Tomás ya no creaba el tablero de la partida en curso, actualizamos la colección de Postman y el README, y conectamos terminar turno y abandonar en la pantalla de partida.

Entre cada paso le hice preguntas para entender lo que se estaba haciendo, por ejemplo qué hacen `up` y `down` en una migración, por qué las migraciones llevan número, por qué hay validaciones en el modelo y además restricciones en la migración, la diferencia entre `hasMany`, `belongsTo` y `belongsToMany`, por qué el servidor nunca manda el estado completo, cómo funciona el límite de 2 minutos sin temporizadores y qué es el `lock` cuando dos jugadores despliegan al mismo tiempo.

El código que entregó la herramienta es el de los archivos de la tabla anterior, tal como quedó en mis commits de las ramas `feature/catalogo-mejoras`, `feature/reglas-tablero`, `feature/modelos-tablero`, `feature/generar-tablero`, `feature/estado-partida`, `feature/seeder-tablero` y, en el frontend, `feature/partida-backend`.

Capturas de las conversaciones: `docs/capturas-ia/` (por agregar).

## Aporte y análisis crítico

Mi trabajo fue principalmente dirigir y revisar, ya que yo definí el orden de los pasos en base a las dependencias con Tomás y Vicente, y las decisiones que no salían de las reglas las tomé yo después de ver las alternativas, es decir, qué hacer con las corrientes en las zonas de despliegue, cómo medir el radio de detección, cómo cumplir el plazo de 2 minutos sin WebSocket, dónde guardar las acciones por barco y qué códigos HTTP usar. También acordé con el grupo los puntos que unían las tres áreas (los recursos dentro de `JugadorPartida`, el header `X-Usuario-Id`, `numeroJugador`, los ids numéricos y un único `GET /games/:id`), lo cual evitó tener que rehacer modelos después.

Sobre lo que generó la herramienta hice varios cambios. Le pedí que el código quedara sin comentarios y con mi formato, que los commits y PR quedaran a mi nombre y escritos en mi estilo, más cortos y sin tantos títulos, y que no agregara dependencias nuevas. En las pruebas apareció que la FK hacia el catálogo con `RESTRICT` terminaba en un error 500, por lo que se cambió a `NO ACTION`, y también se corrigió una prueba de despliegue simultáneo que estaba mal armada. Cada paso lo probé antes de subirlo con scripts y peticiones HTTP sobre los usuarios demo, y la pantalla de partida la revisé en el navegador moviendo barcos con `demo_karla`.
