const request = require('supertest');
const app = require('../src/app');
const { Usuario, Partida, JugadorPartida, Barco, Accion, sequelize } = require('../src/models');
const tokenDe = require('./helpers/tokenDe');

const api = request(app.callback());

let usuario;
let partida;
let jugador;
let barco;

function comprarBlindaje() {
  return api
    .post(`/games/${partida.id}/acciones`)
    .set('Authorization', `Bearer ${tokenDe(usuario)}`)
    .send({ tipoAccion: 'MEJORAR', barcoId: barco.id, mejora: 'BLINDAJE' });
}

beforeAll(async () => {
  sequelize.options.logging = false;

  usuario = await Usuario.create({
    username: 'test_mejorar',
    email: 'test_mejorar@example.com',
    password: 'ClaveMejorar123',
    role: 'Jugador',
  });
});

beforeEach(async () => {
  partida = await Partida.create({
    modo: 'MATCHMAKING',
    estado: 'EN_CURSO',
    rondaActual: 1,
  });

  jugador = await JugadorPartida.create({
    partidaId: partida.id,
    usuarioId: usuario.id,
    numeroJugador: 1,
    chatarra: 4,
    accionesRestantes: 3,
    listo: true,
  });

  await partida.update({ turnoActualId: jugador.id });

  barco = await Barco.create({
    jugadorPartidaId: jugador.id,
    tipo: 'DESTRUCTOR',
    cascoActual: 2,
    cascoMaximo: 3,
    movimiento: 3,
    alcance: 2,
    deteccion: 2,
    x: 2,
    y: 2,
  });
});

afterEach(async () => {
  if (partida) {
    await partida.destroy();
    partida = null;
  }
});

afterAll(async () => {
  if (usuario) await usuario.destroy();
  await sequelize.close();
});

describe('Mejorar', () => {
  test('comprar blindaje mejora el casco, cobra el costo y registra la acción', async () => {
    const respuesta = await comprarBlindaje();

    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toEqual({
      tipoAccion: 'MEJORAR',
      barcoId: barco.id,
      resultado: { mejora: 'BLINDAJE', statMejorado: 'casco', valorNuevo: 3 },
      costos: { chatarra: 3, acciones: 1 },
      accionesRestantes: 2,
    });

    await barco.reload();
    await jugador.reload();

    expect(barco.cascoActual).toBe(3);
    expect(barco.cascoMaximo).toBe(4);
    expect(jugador.chatarra).toBe(1);
    expect(jugador.accionesRestantes).toBe(2);

    const mejoras = await barco.getMejoras();
    expect(mejoras.map((mejora) => mejora.nombre)).toEqual(['BLINDAJE']);

    const accion = await Accion.findOne({
      where: { jugadorPartidaId: jugador.id, barcoId: barco.id, tipo: 'MEJORAR' },
    });
    expect(accion).toEqual(expect.objectContaining({
      ronda: partida.rondaActual,
      resultado: { ...respuesta.body.resultado, costos: respuesta.body.costos },
    }));
  });

  test('comprar sin chatarra suficiente responde 422 y conserva el estado', async () => {
    await jugador.update({ chatarra: 2 });

    const respuesta = await comprarBlindaje();

    expect(respuesta.status).toBe(422);
    expect(respuesta.body.codigo).toBe('CHATARRA_INSUFICIENTE');

    await barco.reload();
    await jugador.reload();

    expect(barco.cascoActual).toBe(2);
    expect(barco.cascoMaximo).toBe(3);
    expect(jugador.chatarra).toBe(2);
    expect(jugador.accionesRestantes).toBe(3);
    expect(await barco.getMejoras()).toHaveLength(0);
    expect(await Accion.count({ where: { jugadorPartidaId: jugador.id } })).toBe(0);
  });
});