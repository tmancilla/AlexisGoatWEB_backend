const request = require('supertest');
const app = require('../src/app');
const { Usuario, JugadorPartida, Barco, Casilla, Accion, sequelize } = require('../src/models');
const { BARCOS, CANTIDAD_BOTIN, CHATARRA_HUNDIMIENTO } = require('../src/config/reglas');
const tokenDe = require('./helpers/tokenDe');

const api = request(app.callback());

let partidaId;
let karla;
let diego;

async function participante(username) {
  const usuario = await Usuario.findOne({ where: { username } });
  const jugador = await JugadorPartida.findOne({
    where: { usuarioId: usuario.id },
    include: [{ association: 'partida', where: { estado: 'EN_CURSO' } }],
  });

  return { usuario, jugador };
}

function moverBarco(usuario, barco, casillaDestino) {
  return api
    .post(`/games/${partidaId}/acciones`)
    .set('Authorization', `Bearer ${tokenDe(usuario)}`)
    .send({ tipoAccion: 'MOVER', barcoId: barco.id, casillaDestino });
}

beforeAll(async () => {
  sequelize.options.logging = false;

  karla = await participante('demo_karla');
  diego = await participante('demo_diego');
  partidaId = karla.jugador.partidaId;

  await karla.jugador.partida.update({ turnoActualId: karla.jugador.id });
  await karla.jugador.update({ accionesRestantes: 3 });
});

afterAll(async () => {
  await sequelize.close();
});

describe('Acciones de la partida', () => {
  test('mover un barco lo deja en el destino y descuenta el combustible y la acción', async () => {
    const acorazado = await Barco.findOne({
      where: { jugadorPartidaId: karla.jugador.id, tipo: 'ACORAZADO' },
    });
    const destino = { x: acorazado.x, y: acorazado.y - 1 };
    const combustibleAntes = karla.jugador.combustible;
    const accionesAntes = karla.jugador.accionesRestantes;

    const respuesta = await moverBarco(karla.usuario, acorazado, destino);

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.resultado.casillaFinal).toEqual(destino);
    expect(respuesta.body.resultado.detenidoPor).toBe('DESTINO_ALCANZADO');

    await acorazado.reload();
    await karla.jugador.reload();

    expect({ x: acorazado.x, y: acorazado.y }).toEqual(destino);
    expect(karla.jugador.combustible).toBe(
      combustibleAntes - BARCOS.ACORAZADO.combustiblePorCasilla
    );
    expect(karla.jugador.accionesRestantes).toBe(accionesAntes - 1);
  });

  test('pasar por un botín flotante entrega el recurso una sola vez', async () => {
    const acorazado = await Barco.findOne({
      where: { jugadorPartidaId: karla.jugador.id, tipo: 'ACORAZADO' },
    });
    const destino = { x: acorazado.x + 1, y: acorazado.y };
    const casilla = await Casilla.findOne({
      where: { partidaId, x: destino.x, y: destino.y },
    });
    await casilla.update({ tipo: 'BOTIN_MUNICION', agotada: false });
    const municionAntes = karla.jugador.municion;

    const respuesta = await moverBarco(karla.usuario, acorazado, destino);

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.resultado.municionRecogida).toBe(CANTIDAD_BOTIN);

    await karla.jugador.reload();
    await casilla.reload();

    expect(karla.jugador.municion).toBe(municionAntes + CANTIDAD_BOTIN);
    expect(casilla.agotada).toBe(true);
  });

  test('un barco que se hunde en una corriente deja su chatarra en esa casilla', async () => {
    const fragata = await Barco.findOne({
      where: { jugadorPartidaId: karla.jugador.id, tipo: 'FRAGATA' },
    });
    await fragata.update({ cascoActual: 1 });
    const corrientes = await Casilla.findAll({
      where: { partidaId, tipo: 'CORRIENTE_PELIGROSA' },
    });
    const corriente = corrientes.find((casilla) =>
      Math.abs(casilla.x - fragata.x) + Math.abs(casilla.y - fragata.y) === 1);

    const respuesta = await moverBarco(karla.usuario, fragata, { x: corriente.x, y: corriente.y });

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.resultado).toEqual(expect.objectContaining({
      detenidoPor: 'CORRIENTE_PELIGROSA',
      hundido: true,
    }));

    await fragata.reload();
    await corriente.reload();

    expect(fragata.aFlote).toBe(false);
    expect(corriente.chatarra).toBe(CHATARRA_HUNDIMIENTO);
  });

  test('una jugada fuera de turno responde 422 y no cambia el tablero ni los recursos', async () => {
    const lancha = await Barco.findOne({
      where: { jugadorPartidaId: diego.jugador.id, tipo: 'LANCHA' },
    });
    const posicionAntes = { x: lancha.x, y: lancha.y };
    const combustibleAntes = diego.jugador.combustible;
    const accionesAntes = await Accion.count({
      where: { jugadorPartidaId: diego.jugador.id },
    });

    const respuesta = await moverBarco(diego.usuario, lancha, {
      x: lancha.x,
      y: lancha.y - 1,
    });

    expect(respuesta.status).toBe(422);
    expect(respuesta.body.codigo).toBe('NO_ES_TU_TURNO');

    await lancha.reload();
    await diego.jugador.reload();

    expect({ x: lancha.x, y: lancha.y }).toEqual(posicionAntes);
    expect(diego.jugador.combustible).toBe(combustibleAntes);
    expect(
      await Accion.count({ where: { jugadorPartidaId: diego.jugador.id } })
    ).toBe(accionesAntes);
  });
});
