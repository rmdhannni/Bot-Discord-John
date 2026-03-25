const BaseCommand = require('../../structures/BaseCommand');
const { EmbedBuilder } = require('discord.js');

class SnipeCommand extends BaseCommand {
    constructor(client) {
        super(client, {
            name: 'snipe',
            description: 'Melihat pesan terakhir yang dihapus di channel ini',
            category: 'Utilitas',
            options: [
                {
                    name: 'urutan',
                    description: 'Pesan ke berapa yang ingin dilihat? (1-5, default: 1)',
                    type: 4, // 4 adalah tipe INTEGER di Discord API
                    required: false,
                    minValue: 1,
                    maxValue: 5
                }
            ]
        });
    }

    async execute(interaction) {
        // Ambil opsi urutan, default ke 1 (index 0)
        const position = interaction.options.getInteger('urutan') || 1;
        const index = position - 1; 

        // Ambil data snipe dari manager
        const snipeData = this.client.snipeManager.getSnipe(interaction.channelId, index);

        if (!snipeData) {
            return interaction.reply({ 
                content: 'Tidak ada pesan yang dihapus baru-baru ini di channel ini.', 
                ephemeral: true // Hanya bisa dilihat oleh user yang mengetik command
            });
        }

        // Buat embed untuk menampilkan pesan yang di-snipe
        const embed = new EmbedBuilder()
            .setAuthor({ 
                name: snipeData.author.tag, 
                iconURL: snipeData.author.displayAvatarURL({ dynamic: true }) 
            })
            .setDescription(snipeData.content || '*Tidak ada teks (mungkin hanya gambar)*')
            .setColor('#2F3136')
            .setFooter({ text: `Snipe ${position}/5 • Dikirim` })
            .setTimestamp(snipeData.timestamp);

        // Jika pesan yang dihapus ada gambarnya, tampilkan
        if (snipeData.image) {
            embed.setImage(snipeData.image);
        }

        await interaction.reply({ embeds: [embed] });
    }
}

module.exports = SnipeCommand;