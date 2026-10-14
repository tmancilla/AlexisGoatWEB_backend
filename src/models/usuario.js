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

  Usuario.associate = (models) => {
    Usuario.belongsToMany(models.Partida, {
      through: models.JugadorPartida,
      foreignKey: 'usuarioId',
      otherKey: 'partidaId',
      as: 'partidas',
    });
    Usuario.hasMany(models.JugadorPartida, {
      foreignKey: 'usuarioId',
      as: { singular: 'participacion', plural: 'participaciones' },
    });
  };

  return Usuario;
};