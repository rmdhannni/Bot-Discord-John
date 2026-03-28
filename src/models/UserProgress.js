const { DataTypes } = require('sequelize');
const sequelize = require('../utils/database');

const UserProgress = sequelize.define('UserProgress', {
    userId: { type: DataTypes.STRING, allowNull: false },
    guildId: { type: DataTypes.STRING, allowNull: false },
    missionId: { type: DataTypes.INTEGER, allowNull: false }, // Relasi ke tabel Mission
    
    progress: { type: DataTypes.INTEGER, defaultValue: 0 }, // Angka progres saat ini
    isCompleted: { type: DataTypes.BOOLEAN, defaultValue: false } // Apakah sudah klaim hadiah?
}, { 
    tableName: 'user_mission_progress', 
    timestamps: true 
});

module.exports = UserProgress;