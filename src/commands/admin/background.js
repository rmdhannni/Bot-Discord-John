const BaseCommand = require('../../structures/BaseCommand');
const UserProfile = require('../../models/UserProfile');
const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');

class BackgroundCommand extends BaseCommand {
    constructor(client) {
        super(client, {
            name: 'background',
            description: 'Manajemen custom background kartu nama user (Khusus Admin).',
            category: 'Admin',
            permissions: [PermissionFlagsBits.Administrator],
            options: [
                {
                    name: 'set',
                    description: 'Pasang custom background untuk user tertentu',
                    type: 1, // SUB_COMMAND
                    options: [
                        { name: 'user', description: 'Pilih user', type: 6, required: true }, // 6 = USER
                        { name: 'gambar', description: 'Upload gambar background (Disarankan 800x250px)', type: 11, required: true } // 11 = ATTACHMENT
                    ]
                },
                {
                    name: 'remove',
                    description: 'Hapus custom background user (Kembali ke default)',
                    type: 1, // SUB_COMMAND
                    options: [
                        { name: 'user', description: 'Pilih user', type: 6, required: true }
                    ]
                }
            ]
        });
    }

    async execute(interaction) {
        const subCommand = interaction.options.getSubcommand();
        const targetUser = interaction.options.getUser('user');
        const guildId = interaction.guild.id;

        try {
            await interaction.deferReply(); // Loading state, mencegah timeout

            // Cari atau buat profil user di database
            let [userProfile] = await UserProfile.findOrCreate({
                where: { guildId: guildId, userId: targetUser.id }
            });

            // ================= LOGIKA SET (PASANG BACKGROUND) =================
           if (subCommand === 'set') {
                const attachment = interaction.options.getAttachment('gambar');

                // 1. Validasi tipe file (Harus gambar)
                if (!attachment.contentType.startsWith('image/')) {
                    return interaction.editReply({ content: '❌ File yang diunggah harus berupa gambar (PNG/JPG)!' });
                }

                // 2. 📍 VALIDASI UKURAN FILE (Maksimal 3 MB)
                const maxSizeInBytes = 3 * 1024 * 1024; // 3 MB
                if (attachment.size > maxSizeInBytes) {
                    const sizeInMB = (attachment.size / (1024 * 1024)).toFixed(2);
                    return interaction.editReply({ 
                        content: `❌ Ukuran gambar terlalu besar! (Ukuran filemu: **${sizeInMB} MB**).\nMaksimal ukuran file untuk background adalah **3 MB**.` 
                    });
                }

                // Update URL background di database
                userProfile.backgroundUrl = attachment.url;
                await userProfile.save();

                const embed = new EmbedBuilder()
                    .setColor('#3498DB')
                    .setTitle('🖼️ Background Berhasil Diperbarui!')
                    .setDescription(`Custom background untuk profil ${targetUser} telah berhasil dipasang oleh Admin.`)
                    .setImage(attachment.url);

                return interaction.editReply({ embeds: [embed] });
            }

            // ================= LOGIKA REMOVE (HAPUS BACKGROUND) =================
            if (subCommand === 'remove') {
                if (!userProfile.backgroundUrl) {
                    return interaction.editReply({ content: `❌ ${targetUser.username} belum memiliki custom background.` });
                }

                // Reset ke null
                userProfile.backgroundUrl = null;
                await userProfile.save();

                const embed = new EmbedBuilder()
                    .setColor('#E74C3C')
                    .setTitle('🗑️ Background Dihapus')
                    .setDescription(`Custom background milik ${targetUser} telah dihapus dan dikembalikan ke tampilan default.`);

                return interaction.editReply({ embeds: [embed] });
            }

        } catch (error) {
            console.error(`[ERROR] Gagal mengeksekusi /background:`, error);
            await interaction.editReply({ content: '❌ Terjadi kesalahan saat menyimpan data ke database.' });
        }
    }
}

module.exports = BackgroundCommand;