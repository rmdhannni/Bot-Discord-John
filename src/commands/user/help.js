const BaseCommand = require('../../structures/BaseCommand');
const { EmbedBuilder } = require('discord.js');

class HelpCommand extends BaseCommand {
    constructor(client) {
        super(client, {
            name: 'help',
            description: 'Lihat daftar semua perintah (commands) yang tersedia.',
            category: 'User'
        });
    }

    async execute(interaction) {
        // Kelompokkan command berdasarkan kategori
        const categories = {};
        
        this.client.commands.forEach((cmd) => {
            if (!categories[cmd.category]) {
                categories[cmd.category] = [];
            }
            // Masukkan nama command ke dalam array kategorinya
            categories[cmd.category].push(`\`/${cmd.name}\``);
        });

        const embed = new EmbedBuilder()
            .setColor('#95A5A6')
            .setTitle('📚 Menu Bantuan (Help)')
            .setDescription('Berikut adalah daftar perintah yang bisa kamu gunakan:')
            .setThumbnail(this.client.user.displayAvatarURL());

        // Looping untuk memasukkan kategori ke dalam Fields Embed
        for (const [category, cmds] of Object.entries(categories)) {
            // Sembunyikan kategori Admin dari user biasa agar rapi
            if (category === 'Admin') continue; 
            
            embed.addFields({
                name: `📌 ${category} Commands`,
                value: cmds.join(', '),
                inline: false
            });
        }

        // Tambahkan catatan khusus untuk command admin
        embed.addFields({
            name: '🛠️ Admin Commands',
            value: '*(Perintah admin seperti `/setup` dan `/greet` disembunyikan dari publik dan hanya muncul jika kamu memiliki izin Administrator).*',
            inline: false
        });

        await interaction.reply({ embeds: [embed], ephemeral: true }); // Ephemeral agar tidak nyepam di chat
    }
}

module.exports = HelpCommand;