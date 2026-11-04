const bcrypt = require('bcrypt');
const { Usuario } = require('../models');
const usuarioService = require('./usuario.service');
const HttpError = require('../utils/HttpError');

async function registrarUsuario(datos) {
  if (
    !datos.username ||
    !datos.email ||
    !datos.password ||
    !datos.role
  ) {
    throw new HttpError(
      400,
      'CAMPOS_FALTANTES',
      'Debes completar nombre de usuario, correo, contraseña y rol.'
    );
  }

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

  return usuarioService.crearUsuario(datos);
}

async function iniciarSesion(datos) {
  if (!datos.username || !datos.password) {
    throw new HttpError(
      400,
      'CAMPOS_FALTANTES',
      'Debes completar nombre de usuario y contraseña.'
    );
  }

  const usuario = await Usuario.findOne({
    where: {
      username: datos.username,
    },
  });

  if (
    !usuario ||
    !(await bcrypt.compare(datos.password, usuario.password))
  ) {
    throw new HttpError(
      401,
      'CREDENCIALES_INVALIDAS',
      'Nombre de usuario o contraseña incorrectos.'
    );
  }

  return usuario;
}

module.exports = {
  registrarUsuario,
  iniciarSesion,
};