const BaseCommand = require('../../structures/BaseCommand');
const Mission = require('../../models/Mission');
const UserProgress = require('../../models/UserProgress');
const { EmbedBuilder } = require('discord.js');
const { Op } = require('sequelize');

class MissionsCommand extends BaseCommand {
    constructor(client) {
        super(client, {
            name: 'missions',
            description: 'Lihat daftar misi aktif dan progres pengerjaanmu.',
            category: 'User'
        });
    }

    async execute(interaction) {
        const guildId = interaction.guild.id;
        const userId = interaction.user.id;

        try {
            await interaction.deferReply();

            const now = new Date();
            // 1. Ambil semua misi aktif yang belum expired
            const activeMissions = await Mission.findAll({
                where: {
                    guildId: guildId,
                    isActive: true,
                    deadline: { [Op.gt]: now } // deadline > waktu sekarang
                }
            });

            if (activeMissions.length === 0) {
                return interaction.editReply({ content: '🏜️ Saat ini tidak ada misi yang tersedia. Tunggu Admin membuat misi baru!' });
            }

            // 2. Ambil progres user untuk misi-misi tersebut
            const missionIds = activeMissions.map(m => m.id);
            const userProgresses = await UserProgress.findAll({
                where: { guildId, userId, missionId: missionIds }
            });

            const embed = new EmbedBuilder()
                .setColor('#95A5A6')
                .setTitle('📜 Papan Misi (Quest Board)')
                .setDescription('Selesaikan misi di bawah ini sebelum waktunya habis untuk mendapatkan hadiah menarik!');

            // 3. Render teks progres untuk setiap misi
            for (const mission of activeMissions) {
                // Cari data progres user, jika belum ada berarti 0
                const progressRecord = userProgresses.find(up => up.missionId === mission.id);
                const currentProgress = progressRecord ? progressRecord.progress : 0;
                const isCompleted = progressRecord ? progressRecord.isCompleted : false;

                // Visualisasi Progress Bar Sederhana: [██████░░░░]
                const percentage = Math.min(currentProgress / mission.target, 1);
                const filledBars = Math.floor(percentage * 10);
                const emptyBars = 10 - filledBars;
                const bar = '█'.repeat(filledBars) + '░'.repeat(emptyBars);

                let statusText = isCompleted ? '✅ **SELESAI**' : `⏳ \`${bar}\` (${currentProgress} / ${mission.target})`;
                const taskType = mission.type === 'chat' ? 'Kirim Pesan' : 'Menit di Voice';
                let rewardText = mission.rewardType === 'xp' ? `${mission.rewardValue} XP` : (mission.rewardType === 'role' ? `<@&${mission.rewardValue.replace(/\D/g,'')}>` : `Badge ID ${mission.rewardValue}`);

                embed.addFields({
                    name: `🎯 ${mission.title}`,
                    value: `*${mission.description}*\n**Tugas:** ${taskType}\n**Hadiah:** ${rewardText}\n**Deadline:** <t:${Math.floor(mission.deadline.getTime() / 1000)}:R>\n**Progres:** ${statusText}`,
                    inline: false
                });
            }

            return interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('[ERROR] Gagal merender /missions:', error);
            await interaction.editReply({ content: '❌ Terjadi kesalahan saat memuat data misi.' });
        }
    }
}

module.exports = MissionsCommand;