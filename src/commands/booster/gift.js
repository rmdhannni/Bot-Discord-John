const BaseCommand = require('../../structures/BaseCommand');
const GuildConfig = require('../../models/GuildConfig');
const BoosterUser = require('../../models/BoosterUser');
const { EmbedBuilder } = require('discord.js');

class GiftCommand extends BaseCommand {
    constructor(client) {
        super(client, {
            name: 'gift',
            description: 'Bagikan atau tarik kembali Custom Role kamu dari teman (Khusus Booster!).',
            category: 'Booster',
            options: [
                {
                    name: 'add',
                    description: 'Berikan custom role kamu ke member lain',
                    type: 1, // SUB_COMMAND
                    options: [
                        {
                            name: 'target',
                            description: 'Pilih teman yang ingin diberi role',
                            type: 6, // 6 = Tipe USER
                            required: true
                        }
                    ]
                },
                {
                    name: 'remove',
                    description: 'Tarik kembali custom role kamu dari member lain',
                    type: 1, // SUB_COMMAND
                    options: [
                        {
                            name: 'target',
                            description: 'Pilih teman yang ingin ditarik role-nya',
                            type: 6, // USER
                            required: true
                        }
                    ]
                }
            ]
        });
    }

    async execute(interaction) {
        const subCommand = interaction.options.getSubcommand();
        const targetUser = interaction.options.getMember('target');
        const guild = interaction.guild;
        const member = interaction.member;

        try {
            // 1. Validasi Akses Booster Dasar
            const config = await GuildConfig.findOne({ where: { guildId: guild.id } });
            if (!config || !config.boosterRoleId) {
                return interaction.reply({ content: '❌ Sistem Booster belum di-setup oleh Admin.', ephemeral: true });
            }
            if (!member.roles.cache.has(config.boosterRoleId)) {
                return interaction.reply({ content: '💎 Kamu harus menjadi Server Booster untuk menggunakan fitur ini!', ephemeral: true });
            }

            // 2. Cek apakah Booster ini punya Custom Role di Database
            const boosterData = await BoosterUser.findOne({ 
                where: { guildId: guild.id, userId: member.id } 
            });

            if (!boosterData || !boosterData.customRoleId) {
                return interaction.reply({ content: 'Kamu belum membuat Custom Role! Buat dulu menggunakan `/role create`.', ephemeral: true });
            }

            // 3. Pastikan Role-nya masih ada di Discord (belum terhapus manual oleh Admin)
            const customRole = guild.roles.cache.get(boosterData.customRoleId);
            if (!customRole) {
                // Jika terhapus manual, bersihkan database
                boosterData.customRoleId = null;
                await boosterData.save();
                return interaction.reply({ content: 'Custom Role kamu tidak ditemukan di server. Silakan buat ulang dengan `/role create`.', ephemeral: true });
            }

            // 4. Mencegah user membagikan role ke dirinya sendiri atau ke bot
            if (targetUser.id === member.id) {
                return interaction.reply({ content: 'Kamu tidak perlu memberikan role ke dirimu sendiri!', ephemeral: true });
            }
            if (targetUser.user.bot) {
                return interaction.reply({ content: 'Kamu tidak bisa memberikan custom role ke Bot.', ephemeral: true });
            }

            // ================= LOGIKA ADD (MEMBERIKAN ROLE) =================
            if (subCommand === 'add') {
                if (targetUser.roles.cache.has(customRole.id)) {
                    return interaction.reply({ content: `${targetUser.user.username} sudah memiliki role ini.`, ephemeral: true });
                }

                await targetUser.roles.add(customRole, `Diberikan (Gift) oleh pemilik role: ${member.user.tag}`);

                const embed = new EmbedBuilder()
                    .setColor(customRole.color || '#2ECC71')
                    .setTitle('🎁 Role Berhasil Dibagikan!')
                    .setDescription(`Kamu telah memberikan role ${customRole} kepada ${targetUser}.`);

                await interaction.reply({ embeds: [embed] });
            }

            // ================= LOGIKA REMOVE (MENARIK ROLE) =================
            else if (subCommand === 'remove') {
                if (!targetUser.roles.cache.has(customRole.id)) {
                    return interaction.reply({ content: `${targetUser.user.username} memang tidak memiliki role ini.`, ephemeral: true });
                }

                await targetUser.roles.remove(customRole, `Ditarik kembali oleh pemilik role: ${member.user.tag}`);

                const embed = new EmbedBuilder()
                    .setColor('#95A5A6')
                    .setTitle('💔 Role Berhasil Ditarik!')
                    .setDescription(`Kamu telah mengambil kembali role ${customRole} dari ${targetUser}.`);

                await interaction.reply({ embeds: [embed] });
            }

        } catch (error) {
            console.error(`[ERROR] Gagal menjalankan /gift di ${guild.id}:`, error);
            await interaction.reply({ content: 'Terjadi kesalahan. Pastikan posisi bot berada di atas Custom Role kamu.', ephemeral: true });
        }
    }
}

module.exports = GiftCommand;