module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Partidas', 'jugadorInicialId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'JugadoresPartida', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });

    await queryInterface.addColumn('Partidas', 'motivoFin', {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('Partidas', 'motivoFin');
    await queryInterface.removeColumn('Partidas', 'jugadorInicialId');
  },
};
