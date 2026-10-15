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
      numeroJugador: {
        type: Sequelize.INTEGER,
        allowNull: false,
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

    await queryInterface.addConstraint('JugadoresPartida', {
      fields: ['partidaId', 'numeroJugador'],
      type: 'unique',
      name: 'jugadores_partida_partida_numero_unico',
    });

    await queryInterface.addConstraint('Partidas', {
      fields: ['turnoActualId'],
      type: 'foreign key',
      name: 'partidas_turno_actual_fkey',
      references: { table: 'JugadoresPartida', field: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });

    await queryInterface.addConstraint('Partidas', {
      fields: ['ganadorId'],
      type: 'foreign key',
      name: 'partidas_ganador_fkey',
      references: { table: 'JugadoresPartida', field: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeConstraint('Partidas', 'partidas_ganador_fkey');
    await queryInterface.removeConstraint('Partidas', 'partidas_turno_actual_fkey');
    await queryInterface.dropTable('JugadoresPartida');
  },
};