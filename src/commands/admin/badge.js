const BaseCommand = require('../../structures/BaseCommand');
const Badge = require('../../models/Badge');
const UserProfile = require('../../models/UserProfile');
const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');

class BadgeCommand extends BaseCommand {
    constructor(client) {
        super(client, {
            name: 'badge',
            description: 'Manajemen Badge/Lencana eksklusif untuk user donatur (Khusus Admin).',
            category: 'Admin',
            permissions: [PermissionFlagsBits.Administrator],
            options: [
                {
                    name: 'create',
                    description: 'Buat badge baru dari gambar',
                    type: 1, // SUB_COMMAND
                    options: [
                        { name: 'nama', description: 'Nama Badge (tanpa spasi, misal: VIP_Gold)', type: 3, required: true },
                        { name: 'gambar', description: 'Upload gambar badge (PNG/JPG/GIF)', type: 11, required: true } // 11 = ATTACHMENT
                    ]
                },
                {
                    name: 'give',
                    description: 'Berikan badge kepada user donatur',
                    type: 1, // SUB_COMMAND
                    options: [
                        { name: 'user', description: 'Pilih user yang diberi badge', type: 6, required: true },
                        { name: 'nama_badge', description: 'Ketik nama badge yang ingin diberikan', type: 3, required: true }
                    ]
                }
            ]
        });
    }

    async execute(interaction) {
        const subCommand = interaction.options.getSubcommand();
        const guild = interaction.guild;

        try {
            // ================= LOGIKA CREATE (BUAT BADGE) =================
           if (subCommand === 'create') {
                const badgeName = interaction.options.getString('nama').replace(/\s+/g, '_');
                const attachment = interaction.options.getAttachment('gambar');

                await interaction.deferReply(); 

                // 1. Validasi tipe file
                if (!attachment.contentType.startsWith('image/')) {
                    return interaction.editReply({ content: '❌ File yang diunggah harus berupa gambar!' });
                }

                // 2. 📍 VALIDASI UKURAN FILE (Maksimal 1 MB)
                const maxSizeInBytes = 1 * 1024 * 1024; // 1 MB
                if (attachment.size > maxSizeInBytes) {
                    const sizeInMB = (attachment.size / (1024 * 1024)).toFixed(2);
                    return interaction.editReply({ 
                        content: `❌ Ukuran gambar terlalu besar! (Ukuran filemu: **${sizeInMB} MB**).\nKarena ini untuk ukuran Emote/Badge, maksimal ukuran file adalah **1 MB**.` 
                    });
                }

                // Cek apakah nama badge sudah ada di database
                const existingBadge = await Badge.findOne({ where: { guildId: guild.id, name: badgeName } });
                if (existingBadge) {
                    return interaction.editReply({ content: `❌ Badge dengan nama **${badgeName}** sudah ada!` });
                }

                // 1. Buat Custom Emoji di Server Discord
                const createdEmoji = await guild.emojis.create({
                    attachment: attachment.url,
                    name: badgeName
                });

                // 2. Simpan Data ke MySQL
                await Badge.create({
                    guildId: guild.id,
                    name: badgeName,
                    emojiId: createdEmoji.id,
                    emojiFormat: createdEmoji.toString(), // Contoh: <:VIP_Gold:12345678> atau <a:VIP_Gold:12345678> jika GIF
                    imageUrl: attachment.url
                });

                const embed = new EmbedBuilder()
                    .setColor('#2ECC71')
                    .setTitle('🎖️ Badge Berhasil Dibuat!')
                    .setDescription(`Gambar telah diconvert menjadi Emote Discord dan disimpan ke Database.\n\n**Preview:** ${createdEmoji.toString()}\n**Nama:** \`${badgeName}\``)
                    .setThumbnail(attachment.url);

                return interaction.editReply({ embeds: [embed] });
            }

            // ================= LOGIKA GIVE (BERIKAN BADGE KE USER) =================
            if (subCommand === 'give') {
                const targetUser = interaction.options.getUser('user');
                const badgeName = interaction.options.getString('nama_badge');

                // 1. Cari Badge di Database
                const badgeData = await Badge.findOne({ where: { guildId: guild.id, name: badgeName } });
                if (!badgeData) {
                    return interaction.reply({ content: `❌ Badge bernama **${badgeName}** tidak ditemukan!`, ephemeral: true });
                }

                // 2. Cari Profil User (Buat baru jika belum ada)
                let [userProfile] = await UserProfile.findOrCreate({
                    where: { guildId: guild.id, userId: targetUser.id }
                });

                // 3. Cek apakah user sudah punya badge ini
                let currentBadges = userProfile.badges || [];
                if (currentBadges.includes(badgeData.id)) {
                    return interaction.reply({ content: `❌ ${targetUser.username} sudah memiliki badge ini!`, ephemeral: true });
                }

                // 4. Tambahkan ID Badge ke array profil user dan simpan
                currentBadges.push(badgeData.id);
                userProfile.badges = currentBadges;
                // Penting: Di Sequelize, kalau update data Array/JSON, kita harus kasih tau kolomnya berubah
                userProfile.changed('badges', true); 
                await userProfile.save();

                const embed = new EmbedBuilder()
                    .setColor('#F1C40F')
                    .setTitle('🎁 Badge Donatur Diberikan!')
                    .setDescription(`Selamat! ${targetUser} telah menerima badge eksklusif ${badgeData.emojiFormat} **${badgeData.name}** dari Admin.`);

                return interaction.reply({ embeds: [embed] });
            }

        } catch (error) {
            console.error(`[ERROR] Gagal mengeksekusi /badge:`, error);
            // Fallback jika error (misal slot emoji server penuh)
            const replyMsg = '❌ Terjadi kesalahan! Pastikan slot Emoji di server Anda belum penuh.';
            if (interaction.deferred) await interaction.editReply({ content: replyMsg });
            else await interaction.reply({ content: replyMsg, ephemeral: true });
        }
    }
}

module.exports = BadgeCommand;