const { DataTypes } = require('sequelize');
const sequelize = require('../utils/database');

const CommandPermission = sequelize.define('CommandPermission', {
    guildId: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    commandName: {
        type: DataTypes.STRING,
        allowNull: false, // Contoh: "badge", "background", "snipe"
    },
    allowedRoles: {
        type: DataTypes.JSON,
        defaultValue: [], // Array berisi kumpulan Role ID
    }
}, {
    tableName: 'command_permissions',
    timestamps: false,
});

module.exports = CommandPermission;