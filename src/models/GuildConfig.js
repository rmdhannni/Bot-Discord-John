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
    snipeAllowedRoles: {
        type: DataTypes.JSON,
        defaultValue: []
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
    staffRoleId: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    welcomeTitle: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    welcomeThumbnail: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    welcomeImage: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    welcomeFooter: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    welcomeColor: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    goodbyeChannelId: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    goodbyeTitle: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    goodbyeThumbnail: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    goodbyeImage: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    goodbyeFooter: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    goodbyeColor: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    levelUpMessage: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    levelUpTitle: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    levelUpThumbnail: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    levelUpImage: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    levelUpFooter: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    levelUpColor: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    levelUpContent: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
}, {
    tableName: 'guild_configs',
    timestamps: true, // Otomatis membuat kolom createdAt & updatedAt
});

module.exports = GuildConfig;