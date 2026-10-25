module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('EventosPartida', {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      partidaId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Partidas', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      ronda: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      tipoCarta: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      descripcion: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    await queryInterface.addConstraint('EventosPartida', {
      fields: ['partidaId', 'ronda'],
      type: 'unique',
      name: 'eventos_partida_partida_ronda_unico',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('EventosPartida');
  },
};
