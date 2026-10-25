const ESTADOS = ['ESPERANDO_JUGADOR', 'LISTO_PARA_INICIAR', 'DESPLIEGUE', 'EN_CURSO', 'TERMINADA'];
const MODOS = ['PRIVADA', 'MATCHMAKING'];
const { MOTIVOS_FIN } = require('../config/reglas');

module.exports = (sequelize, DataTypes) => {
  const Partida = sequelize.define(
    'Partida',
    {
      codigoInvitacion: {
        type: DataTypes.STRING(6),
        allowNull: true,
        unique: true,
        validate: {
          is: {
            args: /^[A-Z0-9]{6}$/,
            msg: 'El código de invitación debe tener 6 caracteres en mayúsculas o números.',
          },
        },
      },

      estado: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'ESPERANDO_JUGADOR',
        validate: {
          isIn: { args: [ESTADOS], msg: 'Estado de partida inválido.' },
        },
      },

      modo: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          isIn: { args: [MODOS], msg: 'El modo debe ser PRIVADA o MATCHMAKING.' },
        },
      },

      rondaActual: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: { args: [0], msg: 'La ronda actual no puede ser negativa.' },
        },
      },

      maxRondas: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 20,
        validate: {
          min: { args: [1], msg: 'La partida debe tener al menos 1 ronda.' },
        },
      },

      turnoActualId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      ganadorId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      expiraEn: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      terminadaEn: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      jugadorInicialId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      motivoFin: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          isIn: { args: [MOTIVOS_FIN], msg: `El motivo de fin debe ser uno de: ${MOTIVOS_FIN.join(', ')}.` },
        },
      },
    },
    {
      tableName: 'Partidas',
      validate: {
        codigoSegunModo() {
          if (this.modo === 'PRIVADA' && !this.codigoInvitacion) {
            throw new Error('Una partida privada necesita código de invitación.');
          }
          if (this.modo === 'MATCHMAKING' && this.codigoInvitacion) {
            throw new Error('Una partida de emparejamiento no usa código de invitación.');
          }
        },
      },
    }
  );

  Partida.associate = (models) => {
    Partida.belongsToMany(models.Usuario, {
      through: models.JugadorPartida,
      foreignKey: 'partidaId',
      otherKey: 'usuarioId',
      as: { singular: 'jugador', plural: 'jugadores' },
    });
    Partida.hasMany(models.JugadorPartida, {
      foreignKey: 'partidaId',
      as: { singular: 'participacion', plural: 'participaciones' },
    });
    Partida.belongsTo(models.JugadorPartida, { foreignKey: 'turnoActualId', as: 'turnoActual' });
    Partida.belongsTo(models.JugadorPartida, { foreignKey: 'ganadorId', as: 'ganador' });
    Partida.belongsTo(models.JugadorPartida, { foreignKey: 'jugadorInicialId', as: 'jugadorInicial' });
  };

  Partida.ESTADOS = ESTADOS;
  Partida.MODOS = MODOS;

  return Partida;
};