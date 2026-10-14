module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('JugadoresPartida', {
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
      usuarioId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Usuarios', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      rolPartida: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      combustible: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 12,
      },
      municion: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 8,
      },
      chatarra: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      accionesRestantes: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 3,
      },
      listo: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      puntajeFinal: {
        type: Sequelize.INTEGER,
        allowNull: true,
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

    await queryInterface.addConstraint('JugadoresPartida', {
      fields: ['partidaId', 'usuarioId'],
      type: 'unique',
      name: 'jugadores_partida_partida_usuario_unico',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('JugadoresPartida');
  },
};