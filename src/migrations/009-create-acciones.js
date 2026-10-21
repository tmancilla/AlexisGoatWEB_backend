module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Acciones', {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true},

      jugadorPartidaId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'JugadoresPartida', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'},

      barcoId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Barcos', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'},

      tipo: {
        type: Sequelize.STRING,
        allowNull: false},

      ronda: {
        type: Sequelize.INTEGER,
        allowNull: false},

      resultado: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {}},

      createdAt: {
        type: Sequelize.DATE,
        allowNull: false},

      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false}});

    await queryInterface.addIndex('Acciones', ['jugadorPartidaId', 'ronda'], {
      name: 'acciones_jugador_ronda'});
  },

  async down(queryInterface) {
    await queryInterface.dropTable('Acciones');
  },
};
