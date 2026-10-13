module.exports = (sequelize, DataTypes) => {
  const Usuario = sequelize.define(
    'Usuario',
    {
      username: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
          notEmpty: true,
        },
      },

      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
          notEmpty: true,
          isEmail: true,
        },
      },

      password: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },

      role: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'Jugador',
        validate: {
          isIn: [['Jugador', 'Administrador']],
        },
      },
    },
    {
      tableName: 'Usuarios',
    }
  );

  return Usuario;
};