const { CARTAS_EVENTO } = require('../config/reglas');

const TIPOS_CARTA = Object.keys(CARTAS_EVENTO);

module.exports = (sequelize, DataTypes) => {
  const EventoPartida = sequelize.define(
    'EventoPartida',
    {
      partidaId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      ronda: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          isInt: { msg: 'La ronda debe ser un número entero.' },
          min: { args: [1], msg: 'La ronda debe ser al menos 1.' },
        },
      },

      tipoCarta: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          isIn: { args: [TIPOS_CARTA], msg: `La carta debe ser una de: ${TIPOS_CARTA.join(', ')}.` },
        },
      },

      descripcion: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: { msg: 'La descripción no puede estar vacía.' },
        },
      },
    },
    {
      tableName: 'EventosPartida',
      indexes: [{ unique: true, fields: ['partidaId', 'ronda'] }],
    }
  );

  EventoPartida.associate = (models) => {
    EventoPartida.belongsTo(models.Partida, { foreignKey: 'partidaId', as: 'partida' });
    models.Partida.hasMany(EventoPartida, { foreignKey: 'partidaId', as: 'eventos' });
  };

  EventoPartida.TIPOS_CARTA = TIPOS_CARTA;

  return EventoPartida;
};
