const BaseCommand = require('../../structures/BaseCommand');
const GuildConfig = require('../../models/GuildConfig');
const BoosterUser = require('../../models/BoosterUser');
const { EmbedBuilder } = require('discord.js');

class LevelCommand extends BaseCommand {
    constructor(client) {
        super(client, {
            name: 'level',
            description: 'Lihat kartu level boost kamu dan klaim role hadiahnya.',
            category: 'Booster',
            options: [
                {
                    name: 'info',
                    description: 'Lihat kartu informasi Level Boost kamu',
                    type: 1 // SUB_COMMAND
                },
                {
                    name: 'roles',
                    description: 'Klaim role berdasarkan total jumlah boost kamu',
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
            // 1. Validasi Akses Dasar
            const config = await GuildConfig.findOne({ where: { guildId: guild.id } });
            if (!config || !config.boosterRoleId) {
                return interaction.reply({ content: '❌ Admin belum mengatur sistem Booster di server ini.', ephemeral: true });
            }

            // Cek apakah user adalah booster (memiliki role booster dari Discord)
            if (!member.roles.cache.has(config.boosterRoleId)) {
                return interaction.reply({ content: '💎 Kamu harus menjadi Server Booster untuk mengakses fitur ini!', ephemeral: true });
            }

            // 2. Ambil data user dari Database MySQL kita
            const [boosterData] = await BoosterUser.findOrCreate({
                where: { guildId: guild.id, userId: member.id }
            });

            const totalBoosts = boosterData.boostCount || 0; // Jika null/undefined, jadikan 0

            // ================= LOGIKA KARTU LEVEL (INFO) =================
            if (subCommand === 'info') {
                // Membuat "Level Card" sederhana menggunakan Embed
                // Anda bisa mengintegrasikan library pembuat gambar (seperti canvas/napi-rs) nanti jika ingin berupa gambar
                const embed = new EmbedBuilder()
                    .setColor('#95A5A6') // Warna pink khas Booster Discord
                    .setAuthor({ name: `Sertifikat Donatur Utama: ${member.user.username}`, iconURL: member.user.displayAvatarURL({ dynamic: true }) })
                    .setThumbnail(guild.iconURL({ dynamic: true }))
                    .addFields(
                        { name: 'Suntikan Dana (Boost)', value: `🚀 **${totalBoosts} Boosts**`, inline: true },
                        { name: 'Kasta Sosil', value: totalBoosts > 0 ? '🌟 Donatur Aktif Gotham' : '👀 Pengamat', inline: true }
                    )
                    .setFooter({ text: 'Akses /level roles untuk klaim keistimewaanmu!' })
                    .setTimestamp();

                return interaction.reply({ embeds: [embed] });
            }

            // ================= LOGIKA CLAIM LEVEL ROLE =================
            if (subCommand === 'roles') {
                if (totalBoosts === 0) {
                    return interaction.reply({ 
                        content: 'Jumlah boost kamu tercatat 0 di database. Jika kamu baru saja nge-boost, minta Admin untuk memperbarui datamu menggunakan `/boosts add`.', 
                        ephemeral: true 
                    });
                }

                // --- SKELETON LOGIKA KLAIM (Clean Code Architecture) ---
                // Nantinya akan dicocokkan dengan tabel database `LevelRoles` yang diatur Admin.
                /*
                const levelRolesDB = await LevelRoles.findAll({ where: { guildId: guild.id } });
                let rolesAdded = [];

                for (const levelRole of levelRolesDB) {
                    // Misal: Jika user punya 2 boost, dan syarat role adalah 2 boost
                    if (totalBoosts >= levelRole.requiredBoosts) {
                        const roleGuild = guild.roles.cache.get(levelRole.roleId);
                        if (roleGuild && !member.roles.cache.has(roleGuild.id)) {
                            await member.roles.add(roleGuild);
                            rolesAdded.push(roleGuild.toString());
                        }
                    }
                }
                */

                const embed = new EmbedBuilder()
                    .setColor('#95A5A6')
                    .setTitle('🎉 Status Sosial (Level) Meroket!')
                    .setDescription(`Dengan kucuran donasi **${totalBoosts} Boosts**, Balai Kota Gotham mulai mengakui pengaruhmu.\n\n*(Catatan Wayne Corp: Pengukuhan kasta secara otomatis sedang disiapkan)*`);

                return interaction.reply({ embeds: [embed], ephemeral: true });
            }

        } catch (error) {
            console.error(`[ERROR] Gagal menjalankan /level di ${guild.id}:`, error);
            await interaction.reply({ content: 'Terjadi kesalahan sistem saat mengambil data levelmu.', ephemeral: true });
        }
    }
}

module.exports = LevelCommand;