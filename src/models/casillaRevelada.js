module.exports = (sequelize, DataTypes) => {
  const CasillaRevelada = sequelize.define(
    'CasillaRevelada',
    {
      jugadorPartidaId: {
        type: DataTypes.INTEGER,
        allowNull: false},

      casillaId: {
        type: DataTypes.INTEGER,
        allowNull: false},

      rondaDescubierta: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
          isInt: { msg: 'La ronda en que se descubrio debe ser un numero entero.' },
          min: { args: [0], msg: 'La ronda en que se descubrio no puede ser negativa.' }}}},
    {
      tableName: 'CasillasReveladas',
      indexes: [{ unique: true, fields: ['jugadorPartidaId', 'casillaId'] }]});

  CasillaRevelada.associate = (models) => {
    CasillaRevelada.belongsTo(models.JugadorPartida, { foreignKey: 'jugadorPartidaId', as: 'jugadorPartida' });
    CasillaRevelada.belongsTo(models.Casilla, { foreignKey: 'casillaId', as: 'casilla' });
    models.JugadorPartida.belongsToMany(models.Casilla, {
      through: CasillaRevelada,
      foreignKey: 'jugadorPartidaId',
      otherKey: 'casillaId',
      as: 'casillasReveladas'});
  };

  return CasillaRevelada;
};
