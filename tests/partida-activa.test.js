const request = require('supertest');
const app = require('../src/app');
const { Usuario, Partida, JugadorPartida, sequelize } = require('../src/models');
const tokenDe = require('./helpers/tokenDe');

const api = request(app.callback());

let usuario;
let partida;

beforeAll(async () => {
  sequelize.options.logging = false;

  usuario = await Usuario.create({
    username: 'test_partida_activa',
    email: 'test_partida_activa@example.com',
    password: 'ClaveActiva123',
    role: 'Jugador',
  });

  partida = await Partida.create({ modo: 'MATCHMAKING', estado: 'EN_CURSO', rondaActual: 1 });
  await JugadorPartida.create({ partidaId: partida.id, usuarioId: usuario.id, numeroJugador: 1, listo: true });
});

afterAll(async () => {
  await sequelize.close();
});

describe('Partida activa', () => {
  test.each([
    ['buscar rival', '/games/matchmaking'],
    ['crear un lobby', '/games'],
  ])('al %s con una partida en curso, el 409 indica cuál es para volver a ella', async (_, ruta) => {
    const respuesta = await api
      .post(ruta)
      .set('Authorization', `Bearer ${tokenDe(usuario)}`);

    expect(respuesta.status).toBe(409);
    expect(respuesta.body).toMatchObject({
      codigo: 'YA_ESTAS_EN_PARTIDA',
      partidaActiva: { partidaId: partida.id, estado: 'EN_CURSO', modo: 'MATCHMAKING' },
    });
  });
});