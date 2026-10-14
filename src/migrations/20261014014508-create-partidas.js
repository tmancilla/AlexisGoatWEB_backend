module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Partidas', {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      codigoInvitacion: {
        type: Sequelize.STRING(6),
        allowNull: true,
        unique: true,
      },
      estado: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'ESPERANDO_JUGADOR',
      },
      modo: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      rondaActual: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      maxRondas: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 20,
      },
      turnoActualId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'Usuarios', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      ganadorId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'Usuarios', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      expiraEn: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      terminadaEn: {
        type: Sequelize.DATE,
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
  },

  async down(queryInterface) {
    await queryInterface.dropTable('Partidas');
  },
};