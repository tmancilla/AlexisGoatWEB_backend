module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('CatalogoMejoras', {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true},

      nombre: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true},

      atributo: {
        type: Sequelize.STRING,
        allowNull: false},

      incremento: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1},

      costoChatarra: {
        type: Sequelize.INTEGER,
        allowNull: false},

      createdAt: {
        type: Sequelize.DATE,
        allowNull: false},

      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false}});
  },

  async down(queryInterface) {
    await queryInterface.dropTable('CatalogoMejoras');
  },
};
