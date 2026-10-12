const { sequelize } = require('../models');

async function getHealth(ctx) {
  await sequelize.authenticate();
  ctx.body = { estado: 'OK', baseDeDatos: 'conectada' };
}

module.exports = { getHealth };