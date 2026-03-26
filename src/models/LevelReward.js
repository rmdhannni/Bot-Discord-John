const { DataTypes } = require('sequelize');
const sequelize = require('../utils/database');

const LevelReward = sequelize.define('LevelReward', {
    guildId: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    level: {
        type: DataTypes.INTEGER,
        allowNull: false, // Level target (misal: 5, 10, 50)
    },
    roleId: {
        type: DataTypes.STRING,
        allowNull: false, // ID Role Discord yang akan diberikan
    }
}, {
    tableName: 'level_rewards',
    timestamps: false,
});

module.exports = LevelReward;