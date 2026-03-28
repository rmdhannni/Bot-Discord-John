const BaseCommand = require('../../structures/BaseCommand');
const { EmbedBuilder } = require('discord.js');

class BoostersCommand extends BaseCommand {
    constructor(client) {
        super(client, {
            name: 'boosters',
            description: 'Lihat daftar pahlawan (Booster) di server ini dan total boost-nya.',
            category: 'User'
        });
    }

    async execute(interaction) {
        const guild = interaction.guild;

        // Ambil data asli dari Discord API
        const totalBoosts = guild.premiumSubscriptionCount || 0;
        const tier = guild.premiumTier;

        // Ambil semua member yang sedang nge-boost, urutkan dari yang paling lama
        const boosters = guild.members.cache
            .filter(member => member.premiumSinceTimestamp)
            .sort((a, b) => a.premiumSinceTimestamp - b.premiumSinceTimestamp);

        const embed = new EmbedBuilder()
            .setColor('#95A5A6') // Pink Booster
            .setTitle(`💎 Server Boosters: ${guild.name}`)
            .setDescription(`Server ini memiliki **${totalBoosts} Boosts** (Tier ${tier}).\nTerima kasih kepada ${boosters.size} member luar biasa di bawah ini!`)
            .setThumbnail(guild.iconURL({ dynamic: true }));

        if (boosters.size > 0) {
            // Format daftar booster (maksimal 10 orang pertama agar embed tidak error karena limit karakter)
            const boosterList = boosters.map(member => {
                const time = `<t:${Math.floor(member.premiumSinceTimestamp / 1000)}:R>`; // Format waktu relatif (ex: "2 months ago")
                return `• ${member} - Sejak ${time}`;
            }).slice(0, 10).join('\n');

            embed.addFields({ name: '🏆 Top 10 Boosters Terlama', value: boosterList });

            if (boosters.size > 10) {
                embed.setFooter({ text: `...dan ${boosters.size - 10} booster lainnya!` });
            }
        } else {
            embed.addFields({ name: 'Status', value: 'Belum ada member yang nge-boost server ini. Jadilah yang pertama! 🚀' });
        }

        await interaction.reply({ embeds: [embed] });
    }
}

module.exports = BoostersCommand;