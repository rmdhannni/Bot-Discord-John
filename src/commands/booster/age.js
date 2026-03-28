const BaseCommand = require('../../structures/BaseCommand');
const GuildConfig = require('../../models/GuildConfig');
const { EmbedBuilder } = require('discord.js');

class AgeCommand extends BaseCommand {
    constructor(client) {
        super(client, {
            name: 'age',
            description: 'Kelola dan klaim role berdasarkan durasi boost kamu.',
            category: 'Booster',
            options: [
                {
                    name: 'role',
                    description: 'Klaim role berdasarkan seberapa lama kamu sudah nge-boost',
                    type: 1 // SUB_COMMAND
                },
                {
                    name: 'info',
                    description: 'Cek detail durasi boost kamu',
                    type: 1 // SUB_COMMAND
                }
            ]
        });
    }

    async execute(interaction) {
        const subCommand = interaction.options.getSubcommand();
        const member = interaction.member;
        const guild = interaction.guild;

        try {
            // 1. Cek apakah user sedang nge-boost server ini
            const premiumSince = member.premiumSince;
            if (!premiumSince) {
                return interaction.reply({ 
                    content: '❌ Kamu saat ini tidak sedang nge-boost server ini.', 
                    ephemeral: true 
                });
            }

            // 2. Kalkulasi Durasi (Matematika Tanggal)
            const sekarang = new Date();
            const selisihWaktu = Math.abs(sekarang - premiumSince);
            const totalHari = Math.floor(selisihWaktu / (1000 * 60 * 60 * 24));
            const totalBulan = Math.floor(totalHari / 30);

            // ================= LOGIKA INFO DURASI =================
            if (subCommand === 'info') {
                const embed = new EmbedBuilder()
                    .setColor('#95A5A6')
                    .setAuthor({ name: member.user.username, iconURL: member.user.displayAvatarURL({ dynamic: true }) })
                    .setTitle('📈 Informasi Durasi Boost')
                    .addFields(
                        { name: 'Mulai Boost Sejak', value: `<t:${Math.floor(premiumSince.getTime() / 1000)}:D>`, inline: true },
                        { name: 'Total Durasi', value: `**${totalHari}** Hari (~${totalBulan} Bulan)`, inline: true }
                    )
                    .setFooter({ text: 'Terima kasih telah mendukung server kami! 💖' });

                return interaction.reply({ embeds: [embed] });
            }

            // ================= LOGIKA CLAIM AGE ROLE =================
            if (subCommand === 'role') {
                // Asumsi: Kita mengambil data "Age Roles" yang sudah disetup Admin dari Database
                // Contoh statis untuk logika (nantinya ini diambil dari tabel MySQL AgeRoles):
                /* const ageRolesDB = await AgeRoles.findAll({ where: { guildId: guild.id } });
                   // Format data: [ { durationDays: 30, roleId: '123' }, { durationDays: 60, roleId: '456' } ]
                */
                
                // --- SIMULASI LOGIKA KLAIM ---
                // Karena kita belum membuat tabel AgeRoles untuk Admin, kita buat pseudo-code logikanya
                
                let roleDiklaim = 0;
                
                /*
                for (const ageRole of ageRolesDB) {
                    if (totalHari >= ageRole.durationDays) {
                        const roleGuild = guild.roles.cache.get(ageRole.roleId);
                        if (roleGuild && !member.roles.cache.has(roleGuild.id)) {
                            await member.roles.add(roleGuild);
                            roleDiklaim++;
                        }
                    }
                }
                */

                // Tampilan sementara sebelum tabel AgeRoles selesai:
                const embed = new EmbedBuilder()
                    .setColor('#95A5A6')
                    .setTitle('🎁 Klaim Age Role')
                    .setDescription(`Kamu telah nge-boost selama **${totalHari} hari**.\n\n*(Sistem klaim role otomatis sedang dalam tahap integrasi dengan database Admin. Silakan cek kembali nanti!)*`);

                return interaction.reply({ embeds: [embed], ephemeral: true });
            }

        } catch (error) {
            console.error(`[ERROR] Gagal menjalankan /age di ${guild.id}:`, error);
            await interaction.reply({ content: 'Terjadi kesalahan sistem saat menghitung durasi boost.', ephemeral: true });
        }
    }
}

module.exports = AgeCommand;