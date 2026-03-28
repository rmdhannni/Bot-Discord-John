const BaseCommand = require('../../structures/BaseCommand');
const LevelReward = require('../../models/LevelReward');
const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');

class SetupRewardsCommand extends BaseCommand {
    constructor(client) {
        super(client, {
            name: 'setup_rewards',
            description: 'Atur hadiah role otomatis untuk level tertentu.',
            category: 'Admin',
            permissions: [PermissionFlagsBits.Administrator],
            options: [
                {
                    name: 'add',
                    description: 'Tambahkan hadiah role untuk level',
                    type: 1, // SUB_COMMAND
                    options: [
                        { name: 'level', description: 'Angka level (misal: 10)', type: 4, required: true },
                        { name: 'role', description: 'Role hadiah yang diberikan', type: 8, required: true }
                    ]
                },
                {
                    name: 'remove',
                    description: 'Hapus hadiah role dari level',
                    type: 1, // SUB_COMMAND
                    options: [
                        { name: 'level', description: 'Angka level yang ingin dihapus hadiahnya', type: 4, required: true }
                    ]
                },
                {
                    name: 'list',
                    description: 'Lihat semua daftar hadiah level',
                    type: 1 // SUB_COMMAND
                }
            ]
        });
    }

    async execute(interaction) {
        const subCommand = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        try {
            if (subCommand === 'add') {
                const targetLevel = interaction.options.getInteger('level');
                const targetRole = interaction.options.getRole('role');

                // Cek apakah level tersebut sudah ada hadiahnya
                let reward = await LevelReward.findOne({ where: { guildId, level: targetLevel } });
                
                if (reward) {
                    // Update role jika sudah ada
                    reward.roleId = targetRole.id;
                    await reward.save();
                } else {
                    // Buat baru
                    await LevelReward.create({ guildId, level: targetLevel, roleId: targetRole.id });
                }

                return interaction.reply({ content: `✅ Berhasil! Saat mencapai **Level ${targetLevel}**, user akan otomatis mendapatkan role ${targetRole}.` });
            }

            if (subCommand === 'remove') {
                const targetLevel = interaction.options.getInteger('level');
                const deleted = await LevelReward.destroy({ where: { guildId, level: targetLevel } });

                if (deleted) {
                    return interaction.reply({ content: `🗑️ Hadiah untuk **Level ${targetLevel}** berhasil dihapus.` });
                } else {
                    return interaction.reply({ content: `❌ Tidak ada pengaturan hadiah untuk Level ${targetLevel}.`, ephemeral: true });
                }
            }

            if (subCommand === 'list') {
                const rewards = await LevelReward.findAll({ 
                    where: { guildId },
                    order: [['level', 'ASC']] // Urutkan dari level terkecil
                });

                if (rewards.length === 0) {
                    return interaction.reply({ content: 'Tidak ada hadiah level yang diatur di server ini.', ephemeral: true });
                }

                const embed = new EmbedBuilder()
                    .setColor('#95A5A6')
                    .setTitle('🏆 Daftar Level Role Rewards')
                    .setDescription(rewards.map(r => `**Level ${r.level}** ➡️ <@&${r.roleId}>`).join('\n'));

                return interaction.reply({ embeds: [embed] });
            }

        } catch (error) {
            console.error('[ERROR] Gagal setup_rewards:', error);
            await interaction.reply({ content: '❌ Terjadi kesalahan pada database.', ephemeral: true });
        }
    }
}

module.exports = SetupRewardsCommand;