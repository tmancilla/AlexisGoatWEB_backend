const { TIPOS_ACCION } = require('../config/reglas');

module.exports = (sequelize, DataTypes) => {
  const Accion = sequelize.define(
    'Accion',
    {
      jugadorPartidaId: {
        type: DataTypes.INTEGER,
        allowNull: false},

      barcoId: {
        type: DataTypes.INTEGER,
        allowNull: false},

      tipo: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          isIn: { args: [TIPOS_ACCION], msg: `El tipo de accion debe ser uno de: ${TIPOS_ACCION.join(', ')}.` }}},

      ronda: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          isInt: { msg: 'La ronda debe ser un numero entero.' },
          min: { args: [1], msg: 'La ronda debe ser al menos 1.' }}},

      resultado: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {}}},
    {
      tableName: 'Acciones',
      indexes: [{ fields: ['jugadorPartidaId', 'ronda'] }]});

  Accion.associate = (models) => {
    Accion.belongsTo(models.JugadorPartida, { foreignKey: 'jugadorPartidaId', as: 'jugadorPartida' });
    Accion.belongsTo(models.Barco, { foreignKey: 'barcoId', as: 'barco' });
    models.JugadorPartida.hasMany(Accion, { foreignKey: 'jugadorPartidaId', as: 'acciones' });
    models.Barco.hasMany(Accion, { foreignKey: 'barcoId', as: 'acciones' });
  };

  return Accion;
};
