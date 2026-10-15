const { TAMANO_TABLERO, TIPOS_BARCO } = require('../config/reglas');

function stat(nombre, minimo) {
  return {
    allowNull: false,
    validate: {
      isInt: { msg: `${nombre} debe ser un numero entero.` },
      min: { args: [minimo], msg: `${nombre} debe ser al menos ${minimo}.` }}};
}

function coordenada(eje) {
  const mensaje = `La coordenada ${eje} del barco debe ser un entero entre 1 y ${TAMANO_TABLERO}.`;
  return {
    allowNull: false,
    validate: {
      isInt: { msg: mensaje },
      min: { args: [1], msg: mensaje },
      max: { args: [TAMANO_TABLERO], msg: mensaje }}};
}

module.exports = (sequelize, DataTypes) => {
  const Barco = sequelize.define(
    'Barco',
    {
      jugadorPartidaId: {
        type: DataTypes.INTEGER,
        allowNull: false},

      tipo: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          isIn: { args: [TIPOS_BARCO], msg: `El tipo de barco debe ser uno de: ${TIPOS_BARCO.join(', ')}.` }}},

      cascoActual: { type: DataTypes.INTEGER, ...stat('El casco actual', 0) },
      cascoMaximo: { type: DataTypes.INTEGER, ...stat('El casco maximo', 1) },
      movimiento: { type: DataTypes.INTEGER, ...stat('El movimiento', 1) },
      alcance: { type: DataTypes.INTEGER, ...stat('El alcance', 1) },
      deteccion: { type: DataTypes.INTEGER, ...stat('La deteccion', 1) },

      x: { type: DataTypes.INTEGER, ...coordenada('x') },
      y: { type: DataTypes.INTEGER, ...coordenada('y') },

      aFlote: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true}},
    {
      tableName: 'Barcos',
      indexes: [{ unique: true, fields: ['jugadorPartidaId', 'tipo'] }],
      validate: {
        cascoDentroDelMaximo() {
          if (this.cascoActual > this.cascoMaximo) throw new Error('El casco actual no puede superar el casco maximo.');
        },
        hundidoSinCasco() {
          if (this.aFlote && this.cascoActual === 0) throw new Error('Un barco a flote no puede tener casco 0.');
          if (!this.aFlote && this.cascoActual !== 0) throw new Error('Un barco hundido debe quedar con casco 0.');
        }}});

  Barco.associate = (models) => {
    Barco.belongsTo(models.JugadorPartida, { foreignKey: 'jugadorPartidaId', as: 'jugadorPartida' });
    models.JugadorPartida.hasMany(Barco, { foreignKey: 'jugadorPartidaId', as: 'barcos' });
    Barco.belongsToMany(models.CatalogoMejora, {
      through: models.MejoraBarco,
      foreignKey: 'barcoId',
      otherKey: 'catalogoMejoraId',
      as: 'mejoras'});
  };

  return Barco;
};
