const request = require('supertest');
const app = require('../src/app');
const { Usuario, Partida, JugadorPartida, Barco, sequelize } = require('../src/models');
const { ACCIONES_POR_TURNO } = require('../src/config/reglas');
const tokenDe = require('./helpers/tokenDe');

const api = request(app.callback());

let usuarioUno;
let usuarioDos;
let partida;
let jugadorUno;
let jugadorDos;

async function crearUsuario(username) {
  return Usuario.create({
    username,
    email: `${username}@example.com`,
    password: 'ClaveTurnos123',
    role: 'Jugador',
  });
}

async function crearJugador(usuario, numeroJugador, x) {
  const jugador = await JugadorPartida.create({
    partidaId: partida.id,
    usuarioId: usuario.id,
    numeroJugador,
    combustible: 5,
    municion: 5,
    accionesRestantes: 1,
    listo: true,
  });

  await Barco.create({
    jugadorPartidaId: jugador.id,
    tipo: 'FRAGATA',
    cascoActual: 2,
    cascoMaximo: 2,
    movimiento: 2,
    alcance: 3,
    deteccion: 2,
    x,
    y: numeroJugador === 1 ? 2 : 9,
  });

  return jugador;
}

function post(usuario, ruta) {
  return api
    .post(`/games/${partida.id}${ruta}`)
    .set('Authorization', `Bearer ${tokenDe(usuario)}`);
}

beforeAll(async () => {
  sequelize.options.logging = false;

  usuarioUno = await crearUsuario('test_turno_uno');
  usuarioDos = await crearUsuario('test_turno_dos');
});

beforeEach(async () => {
  partida = await Partida.create({
    modo: 'MATCHMAKING',
    estado: 'EN_CURSO',
    rondaActual: 1,
  });

  jugadorUno = await crearJugador(usuarioUno, 1, 3);
  jugadorDos = await crearJugador(usuarioDos, 2, 6);

  await partida.update({
    turnoActualId: jugadorUno.id,
    jugadorInicialId: jugadorUno.id,
    expiraEn: new Date(Date.now() + 60 * 1000),
  });
});

afterAll(async () => {
  await sequelize.close();
});

describe('Terminar turno', () => {
  test('el jugador de turno lo termina y el turno pasa al rival', async () => {
    const respuesta = await post(usuarioUno, '/terminar-turno');

    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toMatchObject({
      partidaId: partida.id,
      estado: 'EN_CURSO',
      ronda: 1,
      jugadorActivo: usuarioDos.id,
    });
    expect(new Date(respuesta.body.turnoExpiraEn).getTime()).toBeGreaterThan(Date.now());

    await partida.reload();
    await jugadorDos.reload();

    expect(partida.turnoActualId).toBe(jugadorDos.id);
    expect(jugadorDos.accionesRestantes).toBe(ACCIONES_POR_TURNO);
  });

  test('el rival no puede terminar un turno que no es suyo', async () => {
    const respuesta = await post(usuarioDos, '/terminar-turno');

    expect(respuesta.status).toBe(422);
    expect(respuesta.body.codigo).toBe('NO_ES_TU_TURNO');

    await partida.reload();
    expect(partida.turnoActualId).toBe(jugadorUno.id);
  });
});

describe('Abandonar', () => {
  test('quien abandona pierde y la partida queda TERMINADA con el rival como ganador', async () => {
    const respuesta = await post(usuarioDos, '/abandonar');

    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toEqual({
      partidaId: partida.id,
      estado: 'TERMINADA',
      motivo: 'ABANDONO',
      ganador: usuarioUno.id,
    });

    await partida.reload();
    expect(partida.estado).toBe('TERMINADA');
    expect(partida.ganadorId).toBe(jugadorUno.id);
    expect(partida.turnoActualId).toBeNull();
  });

  test('no se puede terminar turno en una partida que ya terminó', async () => {
    await post(usuarioDos, '/abandonar');

    const respuesta = await post(usuarioUno, '/terminar-turno');

    expect(respuesta.status).toBe(422);
    expect(respuesta.body.codigo).toBe('PARTIDA_NO_ACTIVA');
  });
});