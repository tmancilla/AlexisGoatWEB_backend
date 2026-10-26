const { TIPOS_COMBATE } = require('../config/reglas');

function dado(nombre) {
  return {
    allowNull: true,
    validate: {
      isInt: { msg: `${nombre} debe ser un numero entero.` },
      min: { args: [1], msg: `${nombre} debe estar entre 1 y 10.` },
      max: { args: [10], msg: `${nombre} debe estar entre 1 y 10.` }}};
}

module.exports = (sequelize, DataTypes) => {
  const Combate = sequelize.define(
    'Combate',
    {
      atacanteId: {
        type: DataTypes.INTEGER,
        allowNull: false},

      defensorId: {
        type: DataTypes.INTEGER,
        allowNull: false},

      tipo: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          isIn: { args: [TIPOS_COMBATE], msg: `El tipo de combate debe ser uno de: ${TIPOS_COMBATE.join(', ')}.` }}},

      dadoAtacante: { type: DataTypes.INTEGER, ...dado('El dado del atacante') },
      dadoDefensor: { type: DataTypes.INTEGER, ...dado('El dado del defensor') },

      impacto: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false},

      ronda: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          isInt: { msg: 'La ronda debe ser un numero entero.' },
          min: { args: [1], msg: 'La ronda debe ser al menos 1.' }}}},
    {
      tableName: 'Combates',
      validate: {
        barcosDistintos() {
          if (this.atacanteId === this.defensorId) throw new Error('Un barco no puede combatir contra si mismo.');
        },
        dadosSegunTipo() {
          const conDados = this.dadoAtacante != null || this.dadoDefensor != null;
          if (this.tipo === 'DISTANCIA' && conDados) {
            throw new Error('Un combate a distancia no lleva dados.');
          }
          if (this.tipo === 'CUERPO_A_CUERPO') {
            if (this.dadoAtacante == null || this.dadoDefensor == null) {
              throw new Error('Un combate cuerpo a cuerpo necesita el dado de los dos barcos.');
            }
            if (this.dadoAtacante === this.dadoDefensor) {
              throw new Error('En un combate cuerpo a cuerpo los dados no pueden quedar empatados, se vuelven a lanzar.');
            }
            if ((this.dadoAtacante > this.dadoDefensor) !== Boolean(this.impacto)) {
              throw new Error('En cuerpo a cuerpo hay impacto solo si el atacante saca el dado mas alto.');
            }
          }
        }}});

  Combate.associate = (models) => {
    Combate.belongsTo(models.Barco, { foreignKey: 'atacanteId', as: 'atacante' });
    Combate.belongsTo(models.Barco, { foreignKey: 'defensorId', as: 'defensor' });
    models.Barco.hasMany(Combate, { foreignKey: 'atacanteId', as: 'ataques' });
    models.Barco.hasMany(Combate, { foreignKey: 'defensorId', as: 'defensas' });
  };

  return Combate;
};
