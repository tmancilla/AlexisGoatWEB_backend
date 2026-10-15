// catalogo de las 4 mejoras de la regla 30, cada barco las compra con chatarra
module.exports = (sequelize, DataTypes) => {
  const CatalogoMejora = sequelize.define(
    'CatalogoMejora',
    {
      nombre: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
          isIn: {
            args: [['BLINDAJE', 'MOTORES', 'ARTILLERIA', 'RADAR']],
            msg: 'La mejora debe ser BLINDAJE, MOTORES, ARTILLERIA o RADAR.'}}},

      // stat del barco que sube cuando se compra la mejora
      atributo: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          isIn: {
            args: [['casco', 'movimiento', 'alcance', 'deteccion']],
            msg: 'El atributo debe ser casco, movimiento, alcance o deteccion.'}}},

      incremento: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        validate: {
          isInt: { msg: 'El incremento debe ser un numero entero.' },
          min: { args: [1], msg: 'El incremento debe ser al menos 1.' }}},

      costoChatarra: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          isInt: { msg: 'El costo en chatarra debe ser un numero entero.' },
          min: { args: [1], msg: 'El costo en chatarra debe ser al menos 1.' }}}},
    {
      tableName: 'CatalogoMejoras'});

  return CatalogoMejora;
};
