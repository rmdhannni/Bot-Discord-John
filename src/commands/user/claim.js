const BaseCommand = require('../../structures/BaseCommand');
const Badge = require('../../models/Badge');
const UserProfile = require('../../models/UserProfile');
const { EmbedBuilder } = require('discord.js');
const { Op } = require('sequelize');

class ClaimCommand extends BaseCommand {
    constructor(client) {
        super(client, {
            name: 'claim',
            description: 'Klaim badge eksklusif yang sedang tersedia dengan waktu terbatas!',
            category: 'User',
            options: [
                { name: 'nama_badge', description: 'Ketik nama badge yang ingin diklaim', type: 3, required: true }
            ]
        });
    }

    async execute(interaction) {
        const badgeName = interaction.options.getString('nama_badge');
        const guildId = interaction.guild.id;
        const userId = interaction.user.id;

        try {
            // 1. Cari Badge yang dimaksud
            const badge = await Badge.findOne({ where: { guildId, name: badgeName } });

            if (!badge) return interaction.reply({ content: `❌ Badge **${badgeName}** tidak ditemukan.`, ephemeral: true });
            if (!badge.isClaimable) return interaction.reply({ content: `❌ Badge ini eksklusif dan tidak bisa diklaim secara publik.`, ephemeral: true });

            // 2. Pengecekan Waktu (Deadline)
            if (badge.claimDeadline) {
                const now = new Date();
                const deadline = new Date(badge.claimDeadline);
                if (now > deadline) {
                    return interaction.reply({ content: `⏰ **WAKTU HABIS!** Kamu terlambat, masa klaim untuk badge ini sudah ditutup.`, ephemeral: true });
                }
            }

            // 3. Berikan ke User
            let [profile] = await UserProfile.findOrCreate({ where: { guildId, userId } });
            let currentBadges = profile.badges || [];

            if (currentBadges.includes(badge.id)) {
                return interaction.reply({ content: `⚠️ Kamu sudah memiliki badge ini!`, ephemeral: true });
            }

            currentBadges.push(badge.id);
            profile.badges = currentBadges;
            profile.changed('badges', true);
            await profile.save();

            const embed = new EmbedBuilder()
                .setColor('#95A5A6')
                .setTitle('🎉 KLAIM BERHASIL!')
                .setDescription(`Selamat! Kamu berhasil mengamankan badge limited edition: ${badge.emojiFormat} **${badge.name}**.`);

            return interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error(error);
            interaction.reply({ content: '❌ Terjadi kesalahan.', ephemeral: true });
        }
    }
}
module.exports = ClaimCommand;