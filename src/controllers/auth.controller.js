const authService = require('../services/auth.service');
const { firmarToken } = require('../utils/token');

function usuarioPublico(usuario) {
  return {
    id: usuario.id,
    username: usuario.username,
    email: usuario.email,
    role: usuario.role,
  };
}

async function registrarUsuario(ctx) {
  const datos = ctx.request.body || {};
  const usuario = await authService.registrarUsuario(datos);

  ctx.status = 201;
  ctx.body = {
    token: firmarToken(usuario),
    usuario: usuarioPublico(usuario),
  };
}

async function iniciarSesion(ctx) {
  const datos = ctx.request.body || {};
  const usuario = await authService.iniciarSesion(datos);

  ctx.status = 200;
  ctx.body = {
    token: firmarToken(usuario),
    usuario: usuarioPublico(usuario),
  };
}

module.exports = {
  registrarUsuario,
  iniciarSesion,
};