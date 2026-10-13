const usuarioService = require('../services/usuario.service');

function usuarioPublico(usuario) {
  return {
    id: usuario.id,
    username: usuario.username,
    email: usuario.email,
    role: usuario.role,
    createdAt: usuario.createdAt,
    updatedAt: usuario.updatedAt,
  };
}

async function listarUsuarios(ctx) {
  const usuarios = await usuarioService.listarUsuarios();

  ctx.status = 200;
  ctx.body = usuarios.map(usuarioPublico);
}

async function obtenerUsuario(ctx) {
  const usuario = await usuarioService.obtenerUsuario(ctx.params.id);

  ctx.status = 200;
  ctx.body = usuarioPublico(usuario);
}

async function crearUsuario(ctx) {
  const datos = ctx.request.body || {};
  const usuario = await usuarioService.crearUsuario(datos);

  ctx.status = 201;
  ctx.body = usuarioPublico(usuario);
}

async function actualizarUsuario(ctx) {
  const datos = ctx.request.body || {};
  const usuario = await usuarioService.actualizarUsuario(
    ctx.params.id,
    datos
  );

  ctx.status = 200;
  ctx.body = usuarioPublico(usuario);
}

async function eliminarUsuario(ctx) {
  await usuarioService.eliminarUsuario(ctx.params.id);

  ctx.status = 204;
}

module.exports = {
  listarUsuarios,
  obtenerUsuario,
  crearUsuario,
  actualizarUsuario,
  eliminarUsuario,
};