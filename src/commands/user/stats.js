const BaseCommand = require('../../structures/BaseCommand');
const { EmbedBuilder, version } = require('discord.js');

class StatsCommand extends BaseCommand {
    constructor(client) {
        super(client, {
            name: 'stats',
            description: 'Lihat statistik performa dan informasi bot.',
            category: 'User'
        });
    }

    async execute(interaction) {
        // Format Uptime (Milidetik ke Hari, Jam, Menit)
        const totalSeconds = (this.client.uptime / 1000);
        const days = Math.floor(totalSeconds / 86400);
        const hours = Math.floor(totalSeconds / 3600) % 24;
        const minutes = Math.floor(totalSeconds / 60) % 60;
        const uptime = `${days}h ${hours}j ${minutes}m`;

        // Format Penggunaan RAM (Bytes ke MB)
        const memoryUsage = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);

        const embed = new EmbedBuilder()
            .setColor('#95A5A6')
            .setAuthor({ name: this.client.user.username, iconURL: this.client.user.displayAvatarURL() })
            .setTitle('📡 Status Jaringan Bat-Signal')
            .addFields(
                { name: '🖥️ Distrik Gotham Terpantau', value: `\`${this.client.guilds.cache.size}\``, inline: true },
                { name: '👥 Penduduk & Reserse', value: `\`${this.client.users.cache.size}\``, inline: true },
                { name: '⏱️ Beroperasi Melawan Kejahatan', value: `\`${uptime}\``, inline: true },
                { name: '💾 Kapasitas Penjara Arkham (RAM)', value: `\`${memoryUsage} MB\``, inline: true },
                { name: '⚙️ Inti Reaktor Node', value: `\`${process.version}\``, inline: true },
                { name: '📚 Jaringan Discord', value: `\`v${version}\``, inline: true }
            )
            .setFooter({ text: 'Melindungi kota ini dari kegelapan' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
}

module.exports = StatsCommand;