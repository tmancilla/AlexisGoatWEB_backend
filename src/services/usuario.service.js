const { Usuario } = require('../models');
const HttpError = require('../utils/HttpError');

async function listarUsuarios() {
  return Usuario.findAll();
}

async function obtenerUsuario(id) {
  const usuarioId = Number(id);

  if (!Number.isInteger(usuarioId) || usuarioId <= 0) {
    throw new HttpError(
      400,
      'ID_INVALIDO',
      'El ID debe ser un entero positivo.'
    );
  }

  const usuario = await Usuario.findByPk(usuarioId);

  if (!usuario) {
    throw new HttpError(
      404,
      'USUARIO_NO_EXISTE',
      'No existe un usuario con ese ID.'
    );
  }

  return usuario;
}

async function crearUsuario(datos) {
  if (
    datos.role === 'Administrador' &&
    (
      !process.env.CODIGO_ADMIN ||
      datos.codigoAdmin !== process.env.CODIGO_ADMIN
    )
  ) {
    throw new HttpError(
      403,
      'CODIGO_ADMIN_INVALIDO',
      'El código de administrador es incorrecto.'
    );
  }

  const usuario = await Usuario.create({
    username: datos.username,
    email: datos.email,
    password: datos.password,
    role: datos.role,
  });

  return usuario;
}

async function actualizarUsuario(id, datos) {
  const usuario = await obtenerUsuario(id);

  if (
    datos.username === undefined &&
    datos.email === undefined &&
    datos.password === undefined &&
    datos.role === undefined
  ) {
    throw new HttpError(
      400,
      'CAMPOS_FALTANTES',
      'Debes enviar al menos un campo para actualizar.'
    );
  }

  await usuario.update({
    username: datos.username,
    email: datos.email,
    password: datos.password,
    role: datos.role,
  });

  return usuario;
}

async function eliminarUsuario(id) {
  const usuario = await obtenerUsuario(id);

  await usuario.destroy();
}

module.exports = {
  listarUsuarios,
  obtenerUsuario,
  crearUsuario,
  actualizarUsuario,
  eliminarUsuario,
};