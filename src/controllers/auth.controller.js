const authService = require('../services/auth.service');

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
    usuario: usuarioPublico(usuario),
  };
}

async function iniciarSesion(ctx) {
  const datos = ctx.request.body || {};
  const usuario = await authService.iniciarSesion(datos);

  ctx.status = 200;
  ctx.body = {
    usuario: usuarioPublico(usuario),
  };
}

module.exports = {
  registrarUsuario,
  iniciarSesion,
};