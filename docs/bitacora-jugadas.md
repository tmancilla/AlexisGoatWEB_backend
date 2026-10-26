# Bitácora de ejecución de jugadas

Registro de una partida completa jugada contra la API el 25 de octubre de 2026, desde el registro de dos usuarios nuevos hasta el resultado final, con la base recién creada (`npm run db:reset`). Cada paso muestra la petición y la respuesta real del servidor; en las consultas de estado se resumen la flota y las casillas visibles para que se lean mejor.

El tablero y el jugador que parte se sortean en el servidor, por lo que al repetir el recorrido cambian las casillas especiales, la carta de cada ronda y el orden de los turnos. Las peticiones de juego se identifican con el header `X-Usuario-Id`. El mismo recorrido se puede repetir con las colecciones de `docs/postman/` o siguiendo la sección "Cómo simular el ciclo de juego" del README.

| # | Paso | Petición | Respuesta |
|---|---|---|---|
| 1 | Registrar a capitan_prat | `POST /auth/register` | 201 |
| 2 | Registrar a capitan_grau | `POST /auth/register` | 201 |
| 3 | capitan_prat inicia sesión | `POST /auth/login` | 200 |
| 4 | capitan_prat crea una partida privada | `POST /games` | 201 |
| 5 | capitan_grau se une con el código | `POST /games/HWK92N/join` | 200 |
| 6 | capitan_prat inicia la partida | `PATCH /games/5` | 200 |
| 7 | capitan_prat consulta la partida en despliegue | `GET /games/5` | 200 |
| 8 | Error: capitan_grau despliega en las filas del jugador 1 | `POST /games/5/desplegar` | 400 DESPLIEGUE_INVALIDO |
| 9 | capitan_prat despliega su flota | `POST /games/5/desplegar` | 200 |
| 10 | capitan_grau despliega y parte la partida | `POST /games/5/desplegar` | 200 |
| 11 | capitan_grau consulta la partida | `GET /games/5` | 200 |
| 12 | Error: capitan_prat intenta mover fuera de su turno | `POST /games/5/acciones` | 422 NO_ES_TU_TURNO |
| 13 | capitan_grau mueve su lancha | `POST /games/5/acciones` | 200 |
| 14 | Error: capitan_grau mueve el acorazado más lejos de lo que puede | `POST /games/5/acciones` | 422 FUERA_DE_MOVIMIENTO |
| 15 | capitan_grau mueve su fragata | `POST /games/5/acciones` | 200 |
| 16 | capitan_grau revisa su historial de acciones | `GET /games/5/acciones` | 200 |
| 17 | capitan_grau termina su turno | `POST /games/5/terminar-turno` | 200 |
| 18 | capitan_prat consulta la partida | `GET /games/5` | 200 |
| 19 | capitan_prat mueve su lancha | `POST /games/5/acciones` | 200 |
| 20 | capitan_prat termina su turno | `POST /games/5/terminar-turno` | 200 |
| 21 | Cartas de evento reveladas | `GET /games/5/eventos` | 200 |
| 22 | capitan_grau abandona la partida | `POST /games/5/abandonar` | 200 |
| 23 | capitan_prat ve el resultado final | `GET /games/5` | 200 |

## 1. Registrar a capitan_prat

`POST /auth/register`

```json
{
  "username": "capitan_prat",
  "email": "capitan_prat@uc.cl",
  "password": "123456",
  "role": "Jugador"
}
```

Respuesta `201 Created`

```json
{
  "usuario": {
    "id": 10,
    "username": "capitan_prat",
    "email": "capitan_prat@uc.cl",
    "role": "Jugador"
  }
}
```

Se crea el primer jugador. La respuesta no incluye la contraseña.

## 2. Registrar a capitan_grau

`POST /auth/register`

```json
{
  "username": "capitan_grau",
  "email": "capitan_grau@uc.cl",
  "password": "123456",
  "role": "Jugador"
}
```

Respuesta `201 Created`

```json
{
  "usuario": {
    "id": 11,
    "username": "capitan_grau",
    "email": "capitan_grau@uc.cl",
    "role": "Jugador"
  }
}
```

Se crea el segundo jugador.

## 3. capitan_prat inicia sesión

`POST /auth/login`

```json
{
  "username": "capitan_prat",
  "password": "123456"
}
```

Respuesta `200 OK`

```json
{
  "usuario": {
    "id": 10,
    "username": "capitan_prat",
    "email": "capitan_prat@uc.cl",
    "role": "Jugador"
  }
}
```

Desde aquí las peticiones de juego se identifican con el header X-Usuario-Id, que lleva el id devuelto en el login.

## 4. capitan_prat crea una partida privada

`POST /games` con `X-Usuario-Id: 10` (capitan_prat)

Respuesta `201 Created`

```json
{
  "partidaId": 5,
  "codigoInvitacion": "HWK92N",
  "estado": "ESPERANDO_JUGADOR",
  "dueno": {
    "id": 10,
    "username": "capitan_prat"
  },
  "expiraEn": "2026-10-26T00:18:57.215Z"
}
```

Queda como dueño (jugador 1) y recibe el código de invitación para compartir.

## 5. capitan_grau se une con el código

`POST /games/HWK92N/join` con `X-Usuario-Id: 11` (capitan_grau)

Respuesta `200 OK`

```json
{
  "partidaId": 5,
  "estado": "LISTO_PARA_INICIAR",
  "jugadores": [
    {
      "id": 10,
      "username": "capitan_prat",
      "rolPartida": "DUENO",
      "numeroJugador": 1
    },
    {
      "id": 11,
      "username": "capitan_grau",
      "rolPartida": "INVITADO",
      "numeroJugador": 2
    }
  ]
}
```

Entra como invitado (jugador 2) y la partida pasa a LISTO_PARA_INICIAR.

## 6. capitan_prat inicia la partida

`PATCH /games/5` con `X-Usuario-Id: 10` (capitan_prat)

```json
{
  "estado": "DESPLIEGUE"
}
```

Respuesta `200 OK`

```json
{
  "partidaId": 5,
  "estado": "DESPLIEGUE",
  "expiraEn": "2026-10-26T00:15:57.319Z",
  "jugadores": [
    {
      "id": 10,
      "username": "capitan_prat",
      "rolPartida": "DUENO",
      "numeroJugador": 1
    },
    {
      "id": 11,
      "username": "capitan_grau",
      "rolPartida": "INVITADO",
      "numeroJugador": 2
    }
  ]
}
```

Al pasar a DESPLIEGUE el servidor genera las 100 casillas del tablero (12 especiales al azar, regla 7) y da 2 minutos para desplegar.

## 7. capitan_prat consulta la partida en despliegue

`GET /games/5` con `X-Usuario-Id: 10` (capitan_prat)

Respuesta `200 OK`

```json
{
  "partidaId": 5,
  "estado": "DESPLIEGUE",
  "ronda": 0,
  "jugadorActivo": null,
  "turnoExpiraEn": null,
  "despliegueExpiraEn": "2026-10-26T00:15:57.319Z",
  "eventoRonda": null,
  "yo": {
    "jugadorId": 10,
    "username": "capitan_prat",
    "numeroJugador": 1,
    "listo": false,
    "recursos": {
      "combustible": 12,
      "municion": 8,
      "chatarra": 0
    },
    "accionesRestantes": 3,
    "accionesPorBarco": {},
    "flota": []
  },
  "rival": {
    "jugadorId": 11,
    "username": "capitan_grau",
    "numeroJugador": 2,
    "listo": false,
    "conectado": true,
    "segundosParaAbandono": null,
    "barcosAFlote": 0
  },
  "casillasVisibles": "0 casillas, de ellas 0 especiales",
  "contactosEnemigos": [],
  "resultadoFinal": null
}
```

Cada jugador ve su numeroJugador (para saber sus filas) y el plazo, pero todavía nada del mapa ni del rival.

## 8. Error: capitan_grau despliega en las filas del jugador 1

`POST /games/5/desplegar` con `X-Usuario-Id: 11` (capitan_grau)

```json
{
  "barcos": [
    {
      "tipo": "LANCHA",
      "casilla": {
        "x": 2,
        "y": 1
      }
    },
    {
      "tipo": "FRAGATA",
      "casilla": {
        "x": 5,
        "y": 2
      }
    },
    {
      "tipo": "DESTRUCTOR",
      "casilla": {
        "x": 8,
        "y": 3
      }
    },
    {
      "tipo": "ACORAZADO",
      "casilla": {
        "x": 4,
        "y": 4
      }
    }
  ]
}
```

Respuesta `400 Bad Request`

```json
{
  "codigo": "DESPLIEGUE_INVALIDO",
  "mensaje": "LANCHA debe ir en tu zona, entre las filas 7 y 10."
}
```

El jugador 2 solo puede desplegar en las filas 7 a 10. No se crea ningún barco.

## 9. capitan_prat despliega su flota

`POST /games/5/desplegar` con `X-Usuario-Id: 10` (capitan_prat)

```json
{
  "barcos": [
    {
      "tipo": "LANCHA",
      "casilla": {
        "x": 2,
        "y": 1
      }
    },
    {
      "tipo": "FRAGATA",
      "casilla": {
        "x": 5,
        "y": 2
      }
    },
    {
      "tipo": "DESTRUCTOR",
      "casilla": {
        "x": 8,
        "y": 3
      }
    },
    {
      "tipo": "ACORAZADO",
      "casilla": {
        "x": 4,
        "y": 4
      }
    }
  ]
}
```

Respuesta `200 OK`

```json
{
  "partidaId": 5,
  "estado": "DESPLIEGUE",
  "jugadorActivo": null
}
```

Cuatro barcos, uno de cada tipo, en las filas 1 a 4. Queda esperando al rival.

## 10. capitan_grau despliega y parte la partida

`POST /games/5/desplegar` con `X-Usuario-Id: 11` (capitan_grau)

```json
{
  "barcos": [
    {
      "tipo": "LANCHA",
      "casilla": {
        "x": 9,
        "y": 10
      }
    },
    {
      "tipo": "FRAGATA",
      "casilla": {
        "x": 6,
        "y": 9
      }
    },
    {
      "tipo": "DESTRUCTOR",
      "casilla": {
        "x": 3,
        "y": 8
      }
    },
    {
      "tipo": "ACORAZADO",
      "casilla": {
        "x": 7,
        "y": 7
      }
    }
  ]
}
```

Respuesta `200 OK`

```json
{
  "partidaId": 5,
  "estado": "EN_CURSO",
  "jugadorActivo": 11
}
```

Con los dos listos la partida pasa a EN_CURSO en la ronda 1. El servidor sorteó que parte el usuario 11, y el otro recibe 2 de combustible extra (regla 5).

## 11. capitan_grau consulta la partida

`GET /games/5` con `X-Usuario-Id: 11` (capitan_grau)

Respuesta `200 OK`

```json
{
  "partidaId": 5,
  "estado": "EN_CURSO",
  "ronda": 1,
  "jugadorActivo": 11,
  "turnoExpiraEn": "2026-10-26T00:16:57.500Z",
  "despliegueExpiraEn": null,
  "eventoRonda": {
    "carta": "MAREA_ALTA",
    "efecto": "Las corrientes peligrosas no hacen daño esta ronda."
  },
  "yo": {
    "jugadorId": 11,
    "username": "capitan_grau",
    "numeroJugador": 2,
    "listo": true,
    "recursos": {
      "combustible": 12,
      "municion": 8,
      "chatarra": 0
    },
    "accionesRestantes": 3,
    "accionesPorBarco": {
      "21": 0,
      "22": 0,
      "23": 0,
      "24": 0
    },
    "flota": [
      "LANCHA en (9,10), casco 1/1",
      "FRAGATA en (6,9), casco 2/2",
      "DESTRUCTOR en (3,8), casco 3/3",
      "ACORAZADO en (7,7), casco 4/4"
    ]
  },
  "rival": {
    "jugadorId": 10,
    "username": "capitan_prat",
    "numeroJugador": 1,
    "listo": true,
    "conectado": true,
    "segundosParaAbandono": null,
    "barcosAFlote": 4
  },
  "casillasVisibles": "35 casillas, de ellas 1 especiales: POZO_PETROLERO (8,7)",
  "contactosEnemigos": [],
  "resultadoFinal": null
}
```

Estado filtrado: su flota y recursos completos, la carta de la ronda y solo las casillas dentro del radio de detección de sus barcos. Del rival solo sabe cuántos barcos le quedan.

## 12. Error: capitan_prat intenta mover fuera de su turno

`POST /games/5/acciones` con `X-Usuario-Id: 10` (capitan_prat)

```json
{
  "tipoAccion": "MOVER",
  "barcoId": 17,
  "casillaDestino": {
    "x": 2,
    "y": 2
  }
}
```

Respuesta `422 Unprocessable Entity`

```json
{
  "codigo": "NO_ES_TU_TURNO",
  "mensaje": "No es tu turno, espera a que el rival termine."
}
```

Las jugadas que violan las reglas responden 422 y no gastan acciones ni recursos.

## 13. capitan_grau mueve su lancha

`POST /games/5/acciones` con `X-Usuario-Id: 11` (capitan_grau)

```json
{
  "tipoAccion": "MOVER",
  "barcoId": 21,
  "casillaDestino": {
    "x": 9,
    "y": 8
  }
}
```

Respuesta `200 OK`

```json
{
  "tipoAccion": "MOVER",
  "barcoId": 21,
  "resultado": {
    "casillaFinal": {
      "x": 9,
      "y": 9
    },
    "casillasRecorridas": 1,
    "detenidoPor": "CORRIENTE_PELIGROSA",
    "dano": 1,
    "hundido": true
  },
  "costos": {
    "combustible": 1,
    "acciones": 1
  },
  "accionesRestantes": 2
}
```

Gasta 1 acción y 1 de combustible por casilla recorrida. El resultado indica dónde quedó y por qué se detuvo.

## 14. Error: capitan_grau mueve el acorazado más lejos de lo que puede

`POST /games/5/acciones` con `X-Usuario-Id: 11` (capitan_grau)

```json
{
  "tipoAccion": "MOVER",
  "barcoId": 24,
  "casillaDestino": {
    "x": 7,
    "y": 4
  }
}
```

Respuesta `422 Unprocessable Entity`

```json
{
  "codigo": "FUERA_DE_MOVIMIENTO",
  "mensaje": "El destino esta a 3 casillas y este barco mueve 1."
}
```

El acorazado mueve 1 casilla por acción.

## 15. capitan_grau mueve su fragata

`POST /games/5/acciones` con `X-Usuario-Id: 11` (capitan_grau)

```json
{
  "tipoAccion": "MOVER",
  "barcoId": 22,
  "casillaDestino": {
    "x": 6,
    "y": 7
  }
}
```

Respuesta `200 OK`

```json
{
  "tipoAccion": "MOVER",
  "barcoId": 22,
  "resultado": {
    "casillaFinal": {
      "x": 6,
      "y": 7
    },
    "casillasRecorridas": 2,
    "detenidoPor": "DESTINO_ALCANZADO"
  },
  "costos": {
    "combustible": 2,
    "acciones": 1
  },
  "accionesRestantes": 1
}
```

Segunda acción del turno, con otro barco.

## 16. capitan_grau revisa su historial de acciones

`GET /games/5/acciones` con `X-Usuario-Id: 11` (capitan_grau)

Respuesta `200 OK`

```json
[
  {
    "id": 10,
    "tipo": "MOVER",
    "ronda": 1,
    "resultado": {
      "dano": 1,
      "costos": {
        "acciones": 1,
        "combustible": 1
      },
      "hundido": true,
      "detenidoPor": "CORRIENTE_PELIGROSA",
      "casillaFinal": {
        "x": 9,
        "y": 9
      },
      "casillaDestino": {
        "x": 9,
        "y": 8
      },
      "casillasRecorridas": 1
    }
  },
  {
    "id": 11,
    "tipo": "MOVER",
    "ronda": 1,
    "resultado": {
      "costos": {
        "acciones": 1,
        "combustible": 2
      },
      "detenidoPor": "DESTINO_ALCANZADO",
      "casillaFinal": {
        "x": 6,
        "y": 7
      },
      "casillaDestino": {
        "x": 6,
        "y": 7
      },
      "casillasRecorridas": 2
    }
  }
]
```

Cada jugada queda guardada en la tabla Acciones con su ronda y su resultado.

## 17. capitan_grau termina su turno

`POST /games/5/terminar-turno` con `X-Usuario-Id: 11` (capitan_grau)

Respuesta `200 OK`

```json
{
  "partidaId": 5,
  "estado": "EN_CURSO",
  "ronda": 1,
  "jugadorActivo": 10,
  "turnoExpiraEn": "2026-10-26T00:16:57.876Z"
}
```

El turno pasa al rival, que recolecta lo que dan sus casillas de recurso, recupera sus 3 acciones y tiene 3 minutos.

## 18. capitan_prat consulta la partida

`GET /games/5` con `X-Usuario-Id: 10` (capitan_prat)

Respuesta `200 OK`

```json
{
  "partidaId": 5,
  "estado": "EN_CURSO",
  "ronda": 1,
  "jugadorActivo": 10,
  "turnoExpiraEn": "2026-10-26T00:16:57.876Z",
  "despliegueExpiraEn": null,
  "eventoRonda": {
    "carta": "MAREA_ALTA",
    "efecto": "Las corrientes peligrosas no hacen daño esta ronda."
  },
  "yo": {
    "jugadorId": 10,
    "username": "capitan_prat",
    "numeroJugador": 1,
    "listo": true,
    "recursos": {
      "combustible": 14,
      "municion": 8,
      "chatarra": 0
    },
    "accionesRestantes": 3,
    "accionesPorBarco": {
      "17": 0,
      "18": 0,
      "19": 0,
      "20": 0
    },
    "flota": [
      "LANCHA en (2,1), casco 1/1",
      "FRAGATA en (5,2), casco 2/2",
      "DESTRUCTOR en (8,3), casco 3/3",
      "ACORAZADO en (4,4), casco 4/4"
    ]
  },
  "rival": {
    "jugadorId": 11,
    "username": "capitan_grau",
    "numeroJugador": 2,
    "listo": true,
    "conectado": true,
    "segundosParaAbandono": null,
    "barcosAFlote": 3
  },
  "casillasVisibles": "35 casillas, de ellas 4 especiales: DEPOSITO_MUNICION (2,4), NAUFRAGIO (7,4), NAUFRAGIO (8,4), DEPOSITO_MUNICION (9,4)",
  "contactosEnemigos": [],
  "resultadoFinal": null
}
```

Ahora es su turno. Ve su propia versión del mapa, distinta a la del rival.

## 19. capitan_prat mueve su lancha

`POST /games/5/acciones` con `X-Usuario-Id: 10` (capitan_prat)

```json
{
  "tipoAccion": "MOVER",
  "barcoId": 17,
  "casillaDestino": {
    "x": 2,
    "y": 3
  }
}
```

Respuesta `200 OK`

```json
{
  "tipoAccion": "MOVER",
  "barcoId": 17,
  "resultado": {
    "casillaFinal": {
      "x": 2,
      "y": 3
    },
    "casillasRecorridas": 2,
    "detenidoPor": "DESTINO_ALCANZADO"
  },
  "costos": {
    "combustible": 2,
    "acciones": 1
  },
  "accionesRestantes": 2
}
```

## 20. capitan_prat termina su turno

`POST /games/5/terminar-turno` con `X-Usuario-Id: 10` (capitan_prat)

Respuesta `200 OK`

```json
{
  "partidaId": 5,
  "estado": "EN_CURSO",
  "ronda": 2,
  "jugadorActivo": 11,
  "turnoExpiraEn": "2026-10-26T00:16:58.053Z"
}
```

El turno vuelve al jugador que partió, así que empieza la ronda 2 y el servidor revela una carta de evento nueva (regla 33).

## 21. Cartas de evento reveladas

`GET /games/5/eventos` con `X-Usuario-Id: 10` (capitan_prat)

Respuesta `200 OK`

```json
[
  {
    "eventoId": 5,
    "partidaId": 5,
    "ronda": 1,
    "carta": "MAREA_ALTA",
    "efecto": "Las corrientes peligrosas no hacen daño esta ronda.",
    "createdAt": "2026-10-26T00:13:57.504Z"
  },
  {
    "eventoId": 6,
    "partidaId": 5,
    "ronda": 2,
    "carta": "BOTIN_FLOTANTE",
    "efecto": "Aparece un bono de 2 de combustible o munición en una casilla vacía al azar.",
    "createdAt": "2026-10-26T00:13:58.046Z"
  }
]
```

Una carta por ronda.

## 22. capitan_grau abandona la partida

`POST /games/5/abandonar` con `X-Usuario-Id: 11` (capitan_grau)

Respuesta `200 OK`

```json
{
  "partidaId": 5,
  "estado": "TERMINADA",
  "motivo": "ABANDONO",
  "ganador": 10
}
```

La partida termina de inmediato con victoria del rival (regla 38).

## 23. capitan_prat ve el resultado final

`GET /games/5` con `X-Usuario-Id: 10` (capitan_prat)

Respuesta `200 OK`

```json
{
  "partidaId": 5,
  "estado": "TERMINADA",
  "ronda": 2,
  "jugadorActivo": null,
  "turnoExpiraEn": null,
  "despliegueExpiraEn": null,
  "eventoRonda": null,
  "yo": {
    "jugadorId": 10,
    "username": "capitan_prat",
    "numeroJugador": 1,
    "listo": true,
    "recursos": {
      "combustible": 12,
      "municion": 8,
      "chatarra": 0
    },
    "accionesRestantes": 2,
    "accionesPorBarco": {
      "17": 0,
      "18": 0,
      "19": 0,
      "20": 0
    },
    "flota": [
      "LANCHA en (2,3), casco 1/1",
      "FRAGATA en (5,2), casco 2/2",
      "DESTRUCTOR en (8,3), casco 3/3",
      "ACORAZADO en (4,4), casco 4/4"
    ]
  },
  "rival": {
    "jugadorId": 11,
    "username": "capitan_grau",
    "numeroJugador": 2,
    "listo": true,
    "conectado": true,
    "segundosParaAbandono": null,
    "barcosAFlote": 3
  },
  "casillasVisibles": "40 casillas, de ellas 5 especiales: DEPOSITO_MUNICION (2,4), NAUFRAGIO (7,4), NAUFRAGIO (8,4), DEPOSITO_MUNICION (9,4), POZO_PETROLERO (1,5)",
  "contactosEnemigos": [],
  "resultadoFinal": {
    "motivo": "ABANDONO",
    "ganador": 10,
    "puntajes": {
      "10": {
        "total": 40,
        "detalle": {
          "barcosAFlote": 20,
          "cascoRestante": 10,
          "enemigosHundidos": 10,
          "casillasRecurso": 0,
          "mejoras": 0
        }
      },
      "11": {
        "total": 24,
        "detalle": {
          "barcosAFlote": 15,
          "cascoRestante": 9,
          "enemigosHundidos": 0,
          "casillasRecurso": 0,
          "mejoras": 0
        }
      }
    }
  }
}
```

La partida queda TERMINADA y el estado trae resultadoFinal con el motivo, el ganador y el puntaje de cada jugador.
