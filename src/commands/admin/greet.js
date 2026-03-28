const BaseCommand = require('../../structures/BaseCommand');
const GuildConfig = require('../../models/GuildConfig');
const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');

class GreetCommand extends BaseCommand {
    constructor(client) {
        super(client, {
            name: 'greet',
            description: 'Mengatur pesan kustom untuk Welcome dan Goodbye.',
            category: 'Admin',
            permissions: [PermissionFlagsBits.Administrator], // Hanya untuk Admin
            options: [
                {
                    name: 'welcome',
                    description: 'Atur teks sambutan untuk member baru',
                    type: 1, // SUB_COMMAND
                    options: [
                        {
                            name: 'pesan',
                            description: 'Gunakan: {user}, {username}, {server}, {memberCount}',
                            type: 3, // 3 = Tipe STRING
                            required: true
                        }
                    ]
                },
                {
                    name: 'leave',
                    description: 'Atur teks perpisahan untuk member yang keluar',
                    type: 1, // SUB_COMMAND
                    options: [
                        {
                            name: 'pesan',
                            description: 'Gunakan: {user}, {username}, {server}, {memberCount}',
                            type: 3, // STRING
                            required: true
                        }
                    ]
                }
            ]
        });
    }

    async execute(interaction) {
        const subCommand = interaction.options.getSubcommand();
        const pesanBaru = interaction.options.getString('pesan');
        const guildId = interaction.guild.id;

        try {
            // Cari data config server ini, atau buat baru jika belum ada
            let [config, created] = await GuildConfig.findOrCreate({
                where: { guildId: guildId }
            });

            const embed = new EmbedBuilder()
                .setColor('#95A5A6') // Warna kuning emas untuk notifikasi admin
                .setTimestamp();

            if (subCommand === 'welcome') {
                // Simpan ke database MySQL
                config.welcomeMessage = pesanBaru;
                await config.save();

                embed.setTitle('🎉 Pesan Welcome Diperbarui!')
                     .setDescription(`**Preview teks mentah:**\n\`\`\`\n${pesanBaru}\n\`\`\``)
                     .addFields({ 
                         name: 'Tips Variabel', 
                         value: 'Pesan ini akan diformat otomatis saat ada yang bergabung.' 
                     });
            }

            if (subCommand === 'leave') {
                // Simpan ke database MySQL
                config.leaveMessage = pesanBaru;
                await config.save();

                embed.setTitle('👋 Pesan Goodbye Diperbarui!')
                     .setDescription(`**Preview teks mentah:**\n\`\`\`\n${pesanBaru}\n\`\`\``);
            }

            // Balas interaksi agar Admin tahu proses berhasil
            await interaction.reply({ embeds: [embed], ephemeral: true });

        } catch (error) {
            console.error(`[ERROR] Gagal menjalankan /greet di ${guildId}:`, error);
            await interaction.reply({ 
                content: 'Terjadi kesalahan saat menyimpan pengaturan ke database.', 
                ephemeral: true 
            });
        }
    }
}

module.exports = GreetCommand;