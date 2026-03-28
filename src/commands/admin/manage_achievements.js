const BaseCommand = require('../../structures/BaseCommand');
const Achievement = require('../../models/Achievement');
const UserProfile = require('../../models/UserProfile');
const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');

class ManageAchievementsCommand extends BaseCommand {
    constructor(client) {
        super(client, {
            name: 'achievements_admin',
            description: 'Buat dan bagikan Achievement custom ke user (Khusus Admin).',
            category: 'Admin',
            permissions: [PermissionFlagsBits.Administrator],
            options: [
                {
                    name: 'create',
                    description: 'Buat master data Achievement baru',
                    type: 1, // SUB_COMMAND
                    options: [
                        { name: 'kode', description: 'Kode unik tanpa spasi (misal: event_1)', type: 3, required: true },
                        { name: 'nama', description: 'Nama Achievement (misal: Juara Satu)', type: 3, required: true },
                        { name: 'deskripsi', description: 'Deskripsi singkat', type: 3, required: true },
                        { name: 'emoji', description: 'Emoji (contoh: 🏆)', type: 3, required: false }
                    ]
                },
                {
                    name: 'give',
                    description: 'Berikan Achievement ke user',
                    type: 1, // SUB_COMMAND
                    options: [
                        { name: 'user', description: 'Pilih user', type: 6, required: true },
                        { name: 'kode_achievement', description: 'Ketik kode achievement yang sudah dibuat', type: 3, required: true }
                    ]
                }
            ]
        });
    }

    async execute(interaction) {
        const subCommand = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        try {
            // ================= LOGIKA CREATE =================
            if (subCommand === 'create') {
                const code = interaction.options.getString('kode').toLowerCase().replace(/\s+/g, '_');
                const label = interaction.options.getString('nama');
                const description = interaction.options.getString('deskripsi');
                const emoji = interaction.options.getString('emoji') || '🏅';

                // Cek apakah kode sudah dipakai
                const existing = await Achievement.findOne({ where: { guildId, code } });
                if (existing) {
                    return interaction.reply({ content: `❌ Achievement dengan kode **${code}** sudah ada!`, ephemeral: true });
                }

                // Simpan ke database
                await Achievement.create({ guildId, code, label, description, emoji });

                const embed = new EmbedBuilder()
                    .setColor('#95A5A6')
                    .setTitle('✅ Achievement Dibuat!')
                    .setDescription(`Admin sekarang bisa membagikan Achievement ini menggunakan \`/achievements_admin give\`.\n\n**Detail:**\n${emoji} **${label}** (\`${code}\`)\n*${description}*`);

                return interaction.reply({ embeds: [embed] });
            }

            // ================= LOGIKA GIVE =================
            if (subCommand === 'give') {
                const targetUser = interaction.options.getUser('user');
                const code = interaction.options.getString('kode_achievement').toLowerCase();

                // 1. Cek apakah achievement itu ada di Master Data
                const achData = await Achievement.findOne({ where: { guildId, code } });
                if (!achData) {
                    return interaction.reply({ content: `❌ Achievement dengan kode **${code}** tidak ditemukan!`, ephemeral: true });
                }

                // 2. Ambil profil user
                let [userProfile] = await UserProfile.findOrCreate({
                    where: { guildId, userId: targetUser.id }
                });

                // 3. Cek apakah user sudah punya
                let currentAch = userProfile.achievements || [];
                if (currentAch.includes(code)) {
                    return interaction.reply({ content: `❌ ${targetUser.username} sudah memiliki achievement ini!`, ephemeral: true });
                }

                // 4. Berikan ke user
                currentAch.push(code);
                userProfile.achievements = currentAch;
                userProfile.changed('achievements', true);
                await userProfile.save();

                const embed = new EmbedBuilder()
                    .setColor('#95A5A6')
                    .setTitle('🎉 Achievement Unlocked!')
                    .setDescription(`Selamat! ${targetUser} telah mendapatkan pencapaian:\n\n${achData.emoji} **${achData.label}**\n*${achData.description}*`);

                return interaction.reply({ embeds: [embed] });
            }
        } catch (error) {
            console.error(`[ERROR] Gagal menjalankan achievements_admin:`, error);
            await interaction.reply({ content: '❌ Terjadi kesalahan pada database.', ephemeral: true });
        }
    }
}

module.exports = ManageAchievementsCommand;