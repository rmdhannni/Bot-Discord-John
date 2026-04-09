const BaseCommand = require('../../structures/BaseCommand');
const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');

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
            .setTitle('💻 Akses Terminal Batcomputer (Bantuan)')
            .setDescription('Berikut adalah dekripsi berkas perintah utilitas kota:')
            .setThumbnail(this.client.user.displayAvatarURL());

        const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator);

        // Looping untuk memasukkan kategori ke dalam Fields Embed
        for (const [category, cmds] of Object.entries(categories)) {
            // Sembunyikan kategori Admin dari user biasa agar rapi
            if (category === 'Admin' && !isAdmin) continue; 
            
            embed.addFields({
                name: `📌 ${category} Commands`,
                value: cmds.join(', '),
                inline: false
            });
        }

        if (!isAdmin) {
            // Tambahkan catatan khusus untuk user biasa
            embed.addFields({
                name: '🛠️ Admin Commands',
                value: '*(Perintah administratif disembunyikan dari publik. Hanya dapat diakses oleh Komisaris Gotham/Admin).*',
                inline: false
            });
        }

        await interaction.reply({ embeds: [embed], ephemeral: true }); // Ephemeral agar tidak nyepam di chat
    }
}

module.exports = HelpCommand;