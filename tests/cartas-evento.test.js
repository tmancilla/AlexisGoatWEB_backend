const { sequelize, Partida, JugadorPartida, Barco, Casilla } = require('../src/models');
const { revelarEvento } = require('../src/services/turno.service');
const { CARTAS_EVENTO, MUNICION_SABOTAJE, TIPOS_BOTIN } = require('../src/config/reglas');

const RONDA_PRUEBA = 99;

let partida;
let transaction;

function jugadoresDeLaPartida() {
  return JugadorPartida.findAll({
    where: { partidaId: partida.id },
    order: [['id', 'ASC']],
    transaction,
  });
}

beforeAll(async () => {
  sequelize.options.logging = false;
  partida = await Partida.findOne({ where: { estado: 'EN_CURSO' } });
});

beforeEach(async () => {
  transaction = await sequelize.transaction();
});

afterEach(async () => {
  await transaction.rollback();
});

afterAll(async () => {
  await sequelize.close();
});

describe('Cartas de evento al empezar la ronda', () => {
  test('Sabotaje le quita munición a uno solo de los jugadores', async () => {
    for (const jugador of await jugadoresDeLaPartida()) {
      await jugador.update({ municion: 5 }, { transaction });
    }

    const evento = await revelarEvento(partida, RONDA_PRUEBA, transaction, 'SABOTAJE');
    const municiones = (await jugadoresDeLaPartida()).map((jugador) => jugador.municion);

    expect(evento.tipoCarta).toBe('SABOTAJE');
    expect(evento.descripcion).toContain(CARTAS_EVENTO.SABOTAJE);
    expect(municiones.sort()).toEqual([5 - MUNICION_SABOTAJE, 5]);
  });

  test('Sabotaje no deja la munición bajo 0', async () => {
    for (const jugador of await jugadoresDeLaPartida()) {
      await jugador.update({ municion: 0 }, { transaction });
    }

    const evento = await revelarEvento(partida, RONDA_PRUEBA, transaction, 'SABOTAJE');
    const municiones = (await jugadoresDeLaPartida()).map((jugador) => jugador.municion);

    expect(municiones).toEqual([0, 0]);
    expect(evento.descripcion).toContain('perdió 0 de munición');
  });

  test('Botín flotante aparece en una casilla de agua vacía', async () => {
    const antes = await Casilla.count({ where: { partidaId: partida.id, tipo: TIPOS_BOTIN }, transaction });

    const evento = await revelarEvento(partida, RONDA_PRUEBA, transaction, 'BOTIN_FLOTANTE');

    const [, x, y] = evento.descripcion.match(/\((\d+), (\d+)\)/).map(Number);
    const casilla = await Casilla.findOne({ where: { partidaId: partida.id, x, y }, transaction });
    const jugadores = await jugadoresDeLaPartida();
    const barcoEncima = await Barco.findOne({
      where: { jugadorPartidaId: jugadores.map((jugador) => jugador.id), aFlote: true, x, y },
      transaction,
    });
    const despues = await Casilla.count({ where: { partidaId: partida.id, tipo: TIPOS_BOTIN }, transaction });

    expect(TIPOS_BOTIN).toContain(casilla.tipo);
    expect(casilla.agotada).toBe(false);
    expect(casilla.chatarra).toBe(0);
    expect(barcoEncima).toBeNull();
    expect(despues).toBe(antes + 1);
  });

  test('Tormenta solo se guarda, su efecto se aplica al jugar', async () => {
    const recursosAntes = (await jugadoresDeLaPartida()).map((jugador) => jugador.municion);

    const evento = await revelarEvento(partida, RONDA_PRUEBA, transaction, 'TORMENTA');
    const recursosDespues = (await jugadoresDeLaPartida()).map((jugador) => jugador.municion);

    expect(evento.descripcion).toBe(CARTAS_EVENTO.TORMENTA);
    expect(recursosDespues).toEqual(recursosAntes);
  });
});
