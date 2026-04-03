const BaseCommand = require('../../structures/BaseCommand');
const { EmbedBuilder } = require('discord.js');

class PingCommand extends BaseCommand {
    constructor(client) {
        super(client, {
            name: 'ping',
            description: 'Cek kecepatan respons (latensi) bot dan API Discord.',
            category: 'User'
        });
    }

    async execute(interaction) {
        // Ambil waktu saat interaksi diterima
        const sent = await interaction.deferReply({ fetchReply: true });
        
        // Hitung selisih waktu (Ping bot)
        const latency = sent.createdTimestamp - interaction.createdTimestamp;
        // Hitung latensi dari WebSocket Discord API
        const apiLatency = Math.round(this.client.ws.ping);

        const embed = new EmbedBuilder()
            .setColor('#95A5A6') // Hijau jika lancar, Orange jika agak lambat
            .setTitle('🦇 Sinyal Bat-Signal Diterima!')
            .addFields(
                { name: '🤖 Batcomputer Latency', value: `\`${latency}ms\``, inline: true },
                { name: '🌐 Jaringan Keamanan GCPD', value: `\`${apiLatency}ms\``, inline: true }
            )
            .setFooter({ text: 'Langit Gotham cerah malam ini.' })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    }
}

module.exports = PingCommand;