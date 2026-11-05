module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Casillas', 'chatarra', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('Casillas', 'chatarra');
  },
};
