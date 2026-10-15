module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Casillas', {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true},

      partidaId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Partidas', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'},

      x: {
        type: Sequelize.INTEGER,
        allowNull: false},

      y: {
        type: Sequelize.INTEGER,
        allowNull: false},

      tipo: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'AGUA_ABIERTA'},

      agotada: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false},

      createdAt: {
        type: Sequelize.DATE,
        allowNull: false},

      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false}});

    await queryInterface.addConstraint('Casillas', {
      fields: ['partidaId', 'x', 'y'],
      type: 'unique',
      name: 'casillas_partida_coordenada_unica'});
  },

  async down(queryInterface) {
    await queryInterface.dropTable('Casillas');
  },
};
