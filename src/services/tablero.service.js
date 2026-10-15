const { Casilla } = require('../models');
const { generarCasillas } = require('../utils/tablero');

async function generarTablero(partidaId, transaction) {
  const existentes = await Casilla.findAll({
    where: { partidaId },
    order: [['y', 'ASC'], ['x', 'ASC']],
    transaction});

  if (existentes.length > 0) return existentes;

  return Casilla.bulkCreate(
    generarCasillas().map((casilla) => ({ ...casilla, partidaId })),
    { validate: true, transaction });
}

module.exports = {
  generarTablero,
};
