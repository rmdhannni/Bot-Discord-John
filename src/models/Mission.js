const { DataTypes } = require('sequelize');
const sequelize = require('../utils/database');

const Mission = sequelize.define('Mission', {
    guildId: { type: DataTypes.STRING, allowNull: false },
    title: { type: DataTypes.STRING, allowNull: false }, // Nama misi
    description: { type: DataTypes.STRING, allowNull: true },
    
    // Tipe misi: 'chat' (jumlah pesan) atau 'voice' (menit di voice channel)
    type: { type: DataTypes.STRING, allowNull: false }, 
    target: { type: DataTypes.INTEGER, allowNull: false }, // Contoh: 100 (pesan) atau 60 (menit)
    
    // Hadiah: 'xp', 'role', atau 'badge'
    rewardType: { type: DataTypes.STRING, allowNull: false }, 
    rewardValue: { type: DataTypes.STRING, allowNull: false }, // Jumlah XP, ID Role, atau ID Badge
    
    deadline: { type: DataTypes.DATE, allowNull: false }, // Kapan misi ini hangus
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true } // Admin bisa mematikan misi paksa
}, { 
    tableName: 'missions', 
    timestamps: true 
});

module.exports = Mission;