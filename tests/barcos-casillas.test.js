const request = require('supertest');
const app = require('../src/app');
const { Usuario, Partida, JugadorPartida, Casilla, sequelize } = require('../src/models');
const { BARCOS } = require('../src/config/reglas');
const tokenDe = require('./helpers/tokenDe');

const api = request(app.callback());

let administrador;
let karla;
let partidaEnCurso;
let partidaDespliegue;

function comoAdministrador(metodo, ruta) {
  return api[metodo](ruta).set('Authorization', `Bearer ${tokenDe(administrador)}`);
}

beforeAll(async () => {
  sequelize.options.logging = false;

  administrador = await Usuario.create({
    username: 'tablero_admin',
    email: 'tablero_admin@example.com',
    password: 'ClaveTablero123',
    role: 'Administrador',
  });

  karla = await Usuario.findOne({ where: { username: 'demo_karla' } });
  const jugadorKarla = await JugadorPartida.findOne({
    where: { usuarioId: karla.id },
    include: [{ association: 'partida', where: { estado: 'EN_CURSO' } }],
  });
  partidaEnCurso = jugadorKarla.partida;

  partidaDespliegue = await Partida.findOne({ where: { estado: 'LISTO_PARA_INICIAR' } });
  await partidaDespliegue.update({ estado: 'DESPLIEGUE' });
});

afterAll(async () => {
  await sequelize.close();
});

describe('CRUD de barcos y casillas', () => {
  test('un jugador no puede consultar los barcos ni las casillas de una partida', async () => {
    const autorizacion = `Bearer ${tokenDe(karla)}`;

    const barcos = await api
      .get(`/games/${partidaEnCurso.id}/barcos`)
      .set('Authorization', autorizacion);
    const casillas = await api
      .get(`/games/${partidaEnCurso.id}/casillas`)
      .set('Authorization', autorizacion);

    expect(barcos.status).toBe(403);
    expect(casillas.status).toBe(403);
    expect(barcos.body.codigo).toBe('ROL_NO_AUTORIZADO');
  });

  test('el administrador lista los 8 barcos y las 100 casillas de una partida en curso', async () => {
    const barcos = await comoAdministrador('get', `/games/${partidaEnCurso.id}/barcos`);
    const casillas = await comoAdministrador('get', `/games/${partidaEnCurso.id}/casillas`);

    expect(barcos.status).toBe(200);
    expect(barcos.body).toHaveLength(8);
    expect(barcos.body[0]).toEqual(expect.objectContaining({
      partidaId: partidaEnCurso.id,
      jugadorId: expect.any(Number),
      casilla: expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) }),
    }));
    expect(casillas.status).toBe(200);
    expect(casillas.body).toHaveLength(100);
  });

  test('en una partida en curso el administrador corrige una casilla pero no puede crear barcos', async () => {
    const casilla = await Casilla.findOne({ where: { partidaId: partidaEnCurso.id, x: 10, y: 10 } });

    const corregida = await comoAdministrador('patch', `/games/${partidaEnCurso.id}/casillas/${casilla.id}`)
      .send({ agotada: true });
    const creado = await comoAdministrador('post', `/games/${partidaEnCurso.id}/barcos`)
      .send({ jugadorId: karla.id, tipo: 'LANCHA', casilla: { x: 1, y: 1 } });

    expect(corregida.status).toBe(200);
    expect(corregida.body.agotada).toBe(true);
    expect(creado.status).toBe(409);
    expect(creado.body.codigo).toBe('PARTIDA_NO_EN_DESPLIEGUE');
  });

  test('durante el despliegue el administrador crea un barco con las stats de su tipo y lo elimina', async () => {
    const jugador = await JugadorPartida.findOne({
      where: { partidaId: partidaDespliegue.id, numeroJugador: 1 },
    });
    const ruta = `/games/${partidaDespliegue.id}/barcos`;
    const cuerpo = { jugadorId: jugador.usuarioId, tipo: 'FRAGATA', casilla: { x: 2, y: 2 } };

    const creado = await comoAdministrador('post', ruta).send(cuerpo);
    const repetido = await comoAdministrador('post', ruta).send({ ...cuerpo, casilla: { x: 3, y: 2 } });

    expect(creado.status).toBe(201);
    expect(creado.body).toEqual(expect.objectContaining({
      jugadorId: jugador.usuarioId,
      casilla: { x: 2, y: 2 },
      casco: BARCOS.FRAGATA.casco,
      movimiento: BARCOS.FRAGATA.movimiento,
      alcance: BARCOS.FRAGATA.alcance,
      aFlote: true,
    }));
    expect(repetido.status).toBe(409);
    expect(repetido.body.codigo).toBe('BARCO_REPETIDO');

    const eliminado = await comoAdministrador('delete', `${ruta}/${creado.body.barcoId}`);
    const consultado = await comoAdministrador('get', `${ruta}/${creado.body.barcoId}`);

    expect(eliminado.status).toBe(204);
    expect(consultado.status).toBe(404);
  });
});
