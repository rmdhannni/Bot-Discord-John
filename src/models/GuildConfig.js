const { DataTypes } = require('sequelize');
const sequelize = require('../utils/database');

const GuildConfig = sequelize.define('GuildConfig', {
    guildId: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false,
    },
    welcomeChannelId: {
        type: DataTypes.STRING,
        allowNull: true, // Bisa null jika admin belum setup welcome
    },
    boosterRoleId: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    nonBoosterRoleId: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    boosterCategoryId: {
        type: DataTypes.STRING,
        allowNull: true, // Kategori untuk Personal Channels (pcs)
    },
    snipeRoleId: {
        type: DataTypes.STRING,
        allowNull: true 
    },
    welcomeMessage: {
    type: DataTypes.TEXT,
    allowNull: true,
    },
    leaveMessage: {
    type: DataTypes.TEXT,
    allowNull: true,
    },
    defaultBackground: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    levelChannelId: {
        type: DataTypes.STRING,
        allowNull: true,
    },
}, {
    tableName: 'guild_configs',
    timestamps: true, // Otomatis membuat kolom createdAt & updatedAt
});

module.exports = GuildConfig;