module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Combates', {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true},

      atacanteId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Barcos', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'},

      defensorId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Barcos', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'},

      tipo: {
        type: Sequelize.STRING,
        allowNull: false},

      dadoAtacante: {
        type: Sequelize.INTEGER,
        allowNull: true},

      dadoDefensor: {
        type: Sequelize.INTEGER,
        allowNull: true},

      impacto: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false},

      ronda: {
        type: Sequelize.INTEGER,
        allowNull: false},

      createdAt: {
        type: Sequelize.DATE,
        allowNull: false},

      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false}});

    await queryInterface.addIndex('Combates', ['atacanteId'], { name: 'combates_atacante' });
    await queryInterface.addIndex('Combates', ['defensorId'], { name: 'combates_defensor' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('Combates');
  },
};
