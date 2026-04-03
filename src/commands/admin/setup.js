const BaseCommand = require('../../structures/BaseCommand');
const GuildConfig = require('../../models/GuildConfig');
const { EmbedBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');

class SetupCommand extends BaseCommand {
    constructor(client) {
        super(client, {
            name: 'setup',
            description: 'Mengatur konfigurasi utama bot untuk server ini.',
            category: 'Admin',
            // Membatasi command ini HANYA untuk user dengan izin Administrator
            permissions: [PermissionFlagsBits.Administrator], 
            options: [
                {
                    name: 'welcome',
                    description: 'Atur channel untuk fitur Welcome & Goodbye Soya-style',
                    type: 1, // 1 = Tipe SUB_COMMAND di Discord API
                    options: [
                        {
                            name: 'channel',
                            description: 'Pilih channel teks untuk mengirim pesan',
                            type: 7, // 7 = Tipe CHANNEL
                            required: true,
                            channelTypes: [ChannelType.GuildText] // Hanya terima channel teks
                        }
                    ]
                },
                {
                    name: 'booster',
                    description: 'Atur role default yang diberikan Discord untuk Server Booster',
                    type: 1, // SUB_COMMAND
                    options: [
                        {
                            name: 'role',
                            description: 'Pilih role booster',
                            type: 8, // 8 = Tipe ROLE
                            required: true
                        }
                    ]
                },
                {
                    name: 'level',
                    description: 'Atur channel untuk notifikasi naik level',
                    type: 1, // SUB_COMMAND
                    options: [
                        {
                            name: 'channel',
                            description: 'Pilih channel teks untuk mengirim notifikasi',
                            type: 7, // 7 = Tipe CHANNEL
                            required: true,
                            channelTypes: [ChannelType.GuildText]
                        }
                    ]
                }
            ]
        });
    }

    async execute(interaction) {
        // Ambil sub-command yang dipilih oleh Admin
        const subCommand = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        try {
            // Sequelize: Cari data server di MySQL, jika belum ada maka buat baru
            let [config, created] = await GuildConfig.findOrCreate({
                where: { guildId: guildId }
            });

            // Siapkan embed balasan yang elegan
            const embed = new EmbedBuilder()
                .setColor('#95A5A6') // Warna biru untuk informasi
                .setTimestamp();

            // Logika untuk sub-command '/setup welcome'
            if (subCommand === 'welcome') {
                const channel = interaction.options.getChannel('channel');
                
                // Update kolom di MySQL dan simpan
                config.welcomeChannelId = channel.id;
                await config.save();

                embed.setTitle('🦇 Rute Kedatangan Warga Sipil Ditetapkan!')
                     .setDescription(`Laporan pendatang baru di Gotham akan dikirim ke ${channel}`);
            }

            // Logika untuk sub-command '/setup booster'
            if (subCommand === 'booster') {
                const role = interaction.options.getRole('role');
                
                // Update kolom di MySQL dan simpan
                config.boosterRoleId = role.id;
                await config.save();

                embed.setTitle('💎 Setup Akses VIP Mengudara!')
                     .setDescription(`Sistem mengenali donatur Elite (Booster) sebagai ${role}`);
            }

            // Logika untuk sub-command '/setup level'
            if (subCommand === 'level') {
                const channel = interaction.options.getChannel('channel');
                
                config.levelChannelId = channel.id;
                await config.save();

                embed.setTitle('📈 Sistem Reputasi Diluncurkan!')
                     .setDescription(`Setiap kenaikan derajat (level) warga akan diumumkan di ${channel}`);
            }

            // Kirim balasan ephemeral (hanya bisa dilihat oleh Admin yang mengeksekusi)
            await interaction.reply({ embeds: [embed], ephemeral: true });

        } catch (error) {
            console.error(`[ERROR] Gagal menjalankan /setup di ${guildId}:`, error);
            await interaction.reply({ 
                content: 'Terjadi kesalahan saat menyimpan ke database. Coba lagi nanti.', 
                ephemeral: true 
            });
        }
    }
}

module.exports = SetupCommand;