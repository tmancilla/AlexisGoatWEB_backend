module.exports = (sequelize, DataTypes) => {
  const MejoraBarco = sequelize.define(
    'MejoraBarco',
    {
      barcoId: {
        type: DataTypes.INTEGER,
        allowNull: false},

      catalogoMejoraId: {
        type: DataTypes.INTEGER,
        allowNull: false},

      rondaAdquirida: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
          isInt: { msg: 'La ronda en que se compro la mejora debe ser un numero entero.' },
          min: { args: [0], msg: 'La ronda en que se compro la mejora no puede ser negativa.' }}}},
    {
      tableName: 'MejorasBarco',
      indexes: [{ unique: true, fields: ['barcoId', 'catalogoMejoraId'] }]});

  MejoraBarco.associate = (models) => {
    MejoraBarco.belongsTo(models.Barco, { foreignKey: 'barcoId', as: 'barco' });
    MejoraBarco.belongsTo(models.CatalogoMejora, { foreignKey: 'catalogoMejoraId', as: 'mejora' });
  };

  return MejoraBarco;
};
