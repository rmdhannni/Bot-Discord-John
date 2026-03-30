const BaseCommand = require('../../structures/BaseCommand');
const UserProfile = require('../../models/UserProfile');
const GuildConfig = require('../../models/GuildConfig'); // Pastikan Anda punya model ini
const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

class BackgroundCommand extends BaseCommand {
    constructor(client) {
        super(client, {
            name: 'background',
            description: 'Atur custom background profil untuk user atau default server (Khusus Admin).',
            category: 'Admin',
            permissions: [PermissionFlagsBits.Administrator],
            options: [
                {
                    name: 'set',
                    description: 'Set custom background dengan opsi default server atau user spesifik',
                    type: 1, // SUB_COMMAND
                    options: [
                        { name: 'gambar', description: 'Upload gambar background (PNG/JPG) - Maks 2MB', type: 11, required: true },
                        { name: 'set_default', description: 'Jadikan background default server? (Jika False, wajib pilih User)', type: 5, required: true },
                        { name: 'user', description: 'Pilih user yang diberi background (Abaikan jika set_default = True)', type: 6, required: false }
                    ]
                }
            ]
        });
    }

    async execute(interaction) {
        await interaction.deferReply();

        const attachment = interaction.options.getAttachment('gambar');
        const isDefault = interaction.options.getBoolean('set_default');
        const targetUser = interaction.options.getUser('user');
        const guildId = interaction.guild.id;

        try {
            // 1. Validasi Input
            if (!isDefault && !targetUser) {
                return interaction.editReply({ content: '❌ Jika `set_default` bernilai **False**, kamu **WAJIB** mengisi kolom `user`!' });
            }

            if (!attachment.contentType.startsWith('image/')) {
                return interaction.editReply({ content: '❌ File yang diunggah harus berupa gambar (PNG/JPG)!' });
            }

            if (attachment.size > (2 * 1024 * 1024)) { // Limit 2 MB
                return interaction.editReply({ content: '❌ Ukuran gambar terlalu besar! Maksimal 2 MB.' });
            }

            // 2. Siapkan Folder Penyimpanan Lokal (Anti-Link Mati)
            const uploadDir = path.join(__dirname, '../../../assets');
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }

            // 3. Download Gambar dari Discord URL
            const response = await fetch(attachment.url);
            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            // 4. Logika Penyimpanan berdasarkan Opsi (Default vs User)
            if (isDefault) {
                // ================= SETUP DEFAULT SERVER =================
                const fileName = `default_bg_${guildId}.png`;
                const filePath = path.join(uploadDir, fileName);
                
                // Simpan file fisik
                fs.writeFileSync(filePath, buffer);

                // Simpan nama file ke Database GuildConfig
                let [config] = await GuildConfig.findOrCreate({ where: { guildId } });
                config.defaultBackground = fileName; // Pastikan Anda menambah kolom ini di tabel GuildConfig
                await config.save();

                const embed = new EmbedBuilder()
                    .setColor('#2ECC71')
                    .setTitle('🖼️ Default Background Berhasil Diatur!')
                    .setDescription(`Gambar berhasil diunduh dan disimpan secara permanen sebagai background default untuk server **${interaction.guild.name}**.`)
                    .setImage(attachment.url); // Menampilkan preview saja

                return interaction.editReply({ embeds: [embed] });

            } else {
                // ================= SETUP BACKGROUND USER =================
                const fileName = `user_bg_${targetUser.id}.png`;
                const filePath = path.join(uploadDir, fileName);
                
                // Simpan file fisik
                fs.writeFileSync(filePath, buffer);

                // Simpan nama file ke Database UserProfile
                let [profile] = await UserProfile.findOrCreate({ where: { guildId, userId: targetUser.id } });
                profile.backgroundUrl = fileName; 
                await profile.save();

                const embed = new EmbedBuilder()
                    .setColor('#3498DB')
                    .setTitle('🖼️ Background User Berhasil Diatur!')
                    .setDescription(`Gambar berhasil diunduh dan dipasang sebagai background personal untuk ${targetUser}.`)
                    .setImage(attachment.url); // Menampilkan preview saja

                return interaction.editReply({ embeds: [embed] });
            }

        } catch (error) {
            console.error('[ERROR] Gagal mengatur background:', error);
            return interaction.editReply({ content: '❌ Terjadi kesalahan saat mengunduh atau menyimpan gambar.' });
        }
    }
}

module.exports = BackgroundCommand;