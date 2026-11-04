const request = require('supertest');
const app = require('../src/app');
const { Usuario, JugadorPartida, Barco, Casilla, Combate, sequelize } = require('../src/models');
const { CHATARRA_HUNDIMIENTO } = require('../src/config/reglas');
const tokenDe = require('./helpers/tokenDe');

const api = request(app.callback());

let partida;
let karla;
let diego;
let destructor;

async function participante(username) {
  const usuario = await Usuario.findOne({ where: { username } });
  const jugador = await JugadorPartida.findOne({
    where: { usuarioId: usuario.id },
    include: [{ association: 'partida', where: { estado: 'EN_CURSO' } }],
  });

  return { usuario, jugador };
}

function barcoDe(jugador, tipo) {
  return Barco.findOne({ where: { jugadorPartidaId: jugador.id, tipo } });
}

function dispararA(casillaObjetivo) {
  return api
    .post(`/games/${partida.id}/acciones`)
    .set('Authorization', `Bearer ${tokenDe(karla.usuario)}`)
    .send({ tipoAccion: 'DISPARAR', barcoId: destructor.id, casillaObjetivo });
}

beforeAll(async () => {
  sequelize.options.logging = false;

  karla = await participante('demo_karla');
  diego = await participante('demo_diego');
  partida = karla.jugador.partida;
  destructor = await barcoDe(karla.jugador, 'DESTRUCTOR');

  await partida.update({ turnoActualId: karla.jugador.id });
  await karla.jugador.update({ accionesRestantes: 3, municion: 6 });
});

afterAll(async () => {
  await sequelize.close();
});

describe('Disparar', () => {
  test('disparar sin munición responde 422 y no descuenta la acción', async () => {
    await karla.jugador.update({ municion: 0 });
    const lancha = await barcoDe(diego.jugador, 'LANCHA');

    const respuesta = await dispararA({ x: lancha.x, y: lancha.y });

    expect(respuesta.status).toBe(422);
    expect(respuesta.body.codigo).toBe('MUNICION_INSUFICIENTE');

    await karla.jugador.reload();
    expect(karla.jugador.accionesRestantes).toBe(3);

    await karla.jugador.update({ municion: 6 });
  });

  test('disparar fuera del alcance responde 422 y no gasta munición', async () => {
    const fragata = await barcoDe(diego.jugador, 'FRAGATA');

    const respuesta = await dispararA({ x: fragata.x, y: fragata.y });

    expect(respuesta.status).toBe(422);
    expect(respuesta.body.codigo).toBe('FUERA_DE_ALCANCE');

    await karla.jugador.reload();
    expect(karla.jugador.municion).toBe(6);
  });

  test('un disparo al agua solo informa que no hubo impacto', async () => {
    const respuesta = await dispararA({ x: destructor.x, y: destructor.y + 2 });

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.resultado).toEqual({ impacto: false });
    expect(respuesta.body.costos).toEqual({ municion: 1, acciones: 1 });
  });

  test('un disparo que hunde a un enemigo deja chatarra en su casilla y registra el combate', async () => {
    const lancha = await barcoDe(diego.jugador, 'LANCHA');
    const posicion = { x: lancha.x, y: lancha.y };

    const respuesta = await dispararA(posicion);

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.resultado).toEqual({ impacto: true, hundido: true, cascoRestante: 0 });

    await lancha.reload();
    const casilla = await Casilla.findOne({ where: { partidaId: partida.id, ...posicion } });
    const combate = await Combate.findOne({ where: { atacanteId: destructor.id, defensorId: lancha.id } });

    expect(lancha.aFlote).toBe(false);
    expect(lancha.cascoActual).toBe(0);
    expect(casilla.chatarra).toBe(CHATARRA_HUNDIMIENTO);
    expect(combate).toEqual(expect.objectContaining({ tipo: 'DISTANCIA', impacto: true }));

    const estado = await api
      .get(`/games/${partida.id}`)
      .set('Authorization', `Bearer ${tokenDe(karla.usuario)}`);
    const vista = estado.body.casillasVisibles.find((c) => c.x === posicion.x && c.y === posicion.y);

    expect(vista).toEqual(expect.objectContaining({ tipo: 'CHATARRA', chatarra: CHATARRA_HUNDIMIENTO }));
  });
});
