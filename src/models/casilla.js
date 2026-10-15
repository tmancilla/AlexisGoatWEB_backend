const { TAMANO_TABLERO, TIPOS_CASILLA } = require('../config/reglas');

function coordenada(eje) {
  const mensaje = `La coordenada ${eje} debe ser un entero entre 1 y ${TAMANO_TABLERO}.`;
  return {
    allowNull: false,
    validate: {
      isInt: { msg: mensaje },
      min: { args: [1], msg: mensaje },
      max: { args: [TAMANO_TABLERO], msg: mensaje }}};
}

module.exports = (sequelize, DataTypes) => {
  const Casilla = sequelize.define(
    'Casilla',
    {
      partidaId: {
        type: DataTypes.INTEGER,
        allowNull: false},

      x: { type: DataTypes.INTEGER, ...coordenada('x') },
      y: { type: DataTypes.INTEGER, ...coordenada('y') },

      tipo: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'AGUA_ABIERTA',
        validate: {
          isIn: { args: [TIPOS_CASILLA], msg: `El tipo de casilla debe ser uno de: ${TIPOS_CASILLA.join(', ')}.` }}},

      agotada: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false}},
    {
      tableName: 'Casillas',
      indexes: [{ unique: true, fields: ['partidaId', 'x', 'y'] }]});

  Casilla.associate = (models) => {
    Casilla.belongsTo(models.Partida, { foreignKey: 'partidaId', as: 'partida' });
    models.Partida.hasMany(Casilla, { foreignKey: 'partidaId', as: 'casillas' });
  };

  return Casilla;
};
