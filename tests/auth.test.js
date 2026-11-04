const request = require('supertest');
const bcrypt = require('bcrypt');
const app = require('../src/app');
const { Usuario, sequelize } = require('../src/models');
const { verificarToken } = require('../src/utils/token');
const tokenDe = require('./helpers/tokenDe');

const api = request(app.callback());
const password = 'ClaveAuth123';

let jugador;
let administrador;

beforeAll(async () => {
  sequelize.options.logging = false;

  jugador = await Usuario.create({
    username: 'auth_jugador',
    email: 'auth_jugador@example.com',
    password,
    role: 'Jugador',
  });

  administrador = await Usuario.create({
    username: 'auth_admin',
    email: 'auth_admin@example.com',
    password,
    role: 'Administrador',
  });
});

afterAll(async () => {
  await sequelize.close();
});

describe('Autenticación y permisos', () => {
  test('registrar un jugador guarda su contraseña protegida y entrega un token', async () => {
    const respuesta = await api
      .post('/auth/register')
      .send({
        username: 'auth_registro',
        email: 'auth_registro@example.com',
        password,
        role: 'Jugador',
      })
      .expect(201);

    const guardado = await Usuario.findOne({
      where: { username: 'auth_registro' },
    });

    expect(guardado).not.toBeNull();
    expect(guardado.password).not.toBe(password);
    expect(await bcrypt.compare(password, guardado.password)).toBe(true);
    expect(respuesta.body.usuario).not.toHaveProperty('password');

    expect(verificarToken(respuesta.body.token)).toMatchObject({
      id: guardado.id,
      rol: 'Jugador',
    });
  });

  test('el login correcto entrega un token del usuario', async () => {
    const respuesta = await api
      .post('/auth/login')
      .send({
        username: jugador.username,
        password,
      })
      .expect(200);

    expect(respuesta.body.usuario.id).toBe(jugador.id);

    expect(verificarToken(respuesta.body.token)).toMatchObject({
      id: jugador.id,
      rol: 'Jugador',
    });
  });

  test('el login con contraseña incorrecta responde 401', async () => {
    const respuesta = await api
      .post('/auth/login')
      .send({
        username: jugador.username,
        password: 'incorrecta',
      })
      .expect(401);

    expect(respuesta.body.codigo).toBe('CREDENCIALES_INVALIDAS');
  });

  test('acceder a partidas sin token responde 401', async () => {
    const respuesta = await api
      .get('/games')
      .expect(401);

    expect(respuesta.body.codigo).toBe('TOKEN_INVALIDO');
  });

  test('un jugador no puede acceder al listado administrativo', async () => {
    const respuesta = await api
      .get('/admin/usuarios')
      .set('Authorization', `Bearer ${tokenDe(jugador)}`)
      .expect(403);

    expect(respuesta.body.codigo).toBe('ROL_NO_AUTORIZADO');
  });

  test('un administrador puede listar usuarios sin recibir sus contraseñas', async () => {
    const respuesta = await api
      .get('/admin/usuarios')
      .set('Authorization', `Bearer ${tokenDe(administrador)}`)
      .expect(200);

    expect(Array.isArray(respuesta.body)).toBe(true);

    expect(
      respuesta.body.some((usuario) => usuario.id === administrador.id)
    ).toBe(true);

    expect(
      respuesta.body.every((usuario) => usuario.password === undefined)
    ).toBe(true);
  });

  test('un jugador no puede cambiarse a administrador', async () => {
    const respuesta = await api
      .patch(`/users/${jugador.id}`)
      .set('Authorization', `Bearer ${tokenDe(jugador)}`)
      .send({
        role: 'Administrador',
      })
      .expect(403);

    expect(respuesta.body.codigo).toBe('CAMBIO_ROL_NO_AUTORIZADO');

    const guardado = await Usuario.findByPk(jugador.id);

    expect(guardado.role).toBe('Jugador');
  });

  test('POST /users rechaza crear administradores sin código', async () => {
    const respuesta = await api
      .post('/users')
      .send({
        username: 'auth_admin_sin_codigo',
        email: 'auth_admin_sin_codigo@example.com',
        password,
        role: 'Administrador',
      })
      .expect(403);

    expect(respuesta.body.codigo).toBe('CODIGO_ADMIN_INVALIDO');

    const guardado = await Usuario.findOne({
      where: { username: 'auth_admin_sin_codigo' },
    });

    expect(guardado).toBeNull();
  });
});