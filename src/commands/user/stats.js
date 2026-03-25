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
            .setColor('#3498DB')
            .setAuthor({ name: this.client.user.username, iconURL: this.client.user.displayAvatarURL() })
            .setTitle('📊 Statistik Bot')
            .addFields(
                { name: '🖥️ Servers', value: `\`${this.client.guilds.cache.size}\``, inline: true },
                { name: '👥 Users', value: `\`${this.client.users.cache.size}\``, inline: true },
                { name: '⏱️ Uptime', value: `\`${uptime}\``, inline: true },
                { name: '💾 RAM Usage', value: `\`${memoryUsage} MB\``, inline: true },
                { name: '⚙️ Node.js', value: `\`${process.version}\``, inline: true },
                { name: '📚 Discord.js', value: `\`v${version}\``, inline: true }
            )
            .setFooter({ text: 'Dibuat dengan ❤️ dan Clean Code' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
}

module.exports = StatsCommand;