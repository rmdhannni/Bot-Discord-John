const BaseCommand = require('../../structures/BaseCommand');
const Achievement = require('../../models/Achievement');
const UserProfile = require('../../models/UserProfile');
const { 
    EmbedBuilder, 
    PermissionFlagsBits,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ComponentType
} = require('discord.js');
const fs = require('fs');
const path = require('path');

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
                        { name: 'emoji', description: 'Emoji (contoh: 🏆)', type: 3, required: false },
                        { name: 'gambar', description: 'Upload gambar Achievement (PNG/JPG)', type: 11, required: false }
                    ]
                },
                {
                    name: 'edit',
                    description: 'Edit data Achievement',
                    type: 1, // SUB_COMMAND
                    options: [
                        { name: 'kode', description: 'Kode Achievement yang ingin diubah', type: 3, required: true },
                        { name: 'nama', description: 'Nama baru', type: 3, required: false },
                        { name: 'deskripsi', description: 'Deskripsi baru', type: 3, required: false },
                        { name: 'emoji', description: 'Emoji baru (contoh: 🏆)', type: 3, required: false },
                        { name: 'gambar', description: 'Ganti gambar Achievement (PNG/JPG)', type: 11, required: false }
                    ]
                },
                {
                    name: 'delete',
                    description: 'Hapus master data Achievement',
                    type: 1, // SUB_COMMAND
                    options: [
                        { name: 'kode', description: 'Kode Achievement yang ingin dihapus', type: 3, required: true }
                    ]
                },
                {
                    name: 'list',
                    description: 'Lihat daftar semua Achievement di server ini',
                    type: 1, // SUB_COMMAND
                },
                {
                    name: 'give',
                    description: 'Berikan Achievement ke user',
                    type: 1, // SUB_COMMAND
                    options: [
                        { name: 'user', description: 'Pilih user', type: 6, required: true },
                        { name: 'kode_achievement', description: 'Ketik kode achievement yang sudah dibuat', type: 3, required: true }
                    ]
                },
                {
                    name: 'take',
                    description: 'Tarik/Hapus Achievement dari seorang user',
                    type: 1, // SUB_COMMAND
                    options: [
                        { name: 'user', description: 'Pilih user yang ingin ditarik achievementnya', type: 6, required: true }
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
                const emoji = interaction.options.getString('emoji');
                const attachment = interaction.options.getAttachment('gambar');

                // Validasi: Harus pilih salah satu
                if (emoji && attachment) {
                    return interaction.reply({ content: '❌ Pilih salah satu: Kirim Emoji **ATAU** Upload Gambar, jangan keduanya!', ephemeral: true });
                }
                if (!emoji && !attachment) {
                    return interaction.reply({ content: '❌ Kamu harus memberikan setidaknya satu ikon (Emoji atau Gambar)!', ephemeral: true });
                }

                // Cek apakah kode sudah dipakai
                const existing = await Achievement.findOne({ where: { guildId, code } });
                if (existing) {
                    return interaction.reply({ content: `❌ Achievement dengan kode **${code}** sudah ada!`, ephemeral: true });
                }

                let imageUrl = null;
                if (attachment) {
                    if (!attachment.contentType.startsWith('image/')) {
                        return interaction.reply({ content: '❌ File yang diunggah harus berupa gambar!', ephemeral: true });
                    }
                    const uploadDir = path.join(__dirname, '../../../assets/achievements');
                    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

                    const res = await fetch(attachment.url);
                    const arrayBuffer = await res.arrayBuffer();
                    const buffer = Buffer.from(arrayBuffer);
                    const fileName = `ach_${code}_${Date.now()}.png`;
                    const filePath = path.join(uploadDir, fileName);
                    fs.writeFileSync(filePath, buffer);
                    imageUrl = fileName;
                }

                // Simpan ke database
                await Achievement.create({ 
                    guildId, 
                    code, 
                    label, 
                    description, 
                    emoji: attachment ? null : (emoji || '🏅'), 
                    imageUrl 
                });

                const embed = new EmbedBuilder()
                    .setColor('#95A5A6')
                    .setTitle('✅ Gelar Kehormatan Dicetak!')
                    .setDescription(`Komisaris dapat menyematkan Gelar Prestise ini melalui arsip \`/achievements_admin give\`.\n\n**Detail Rekam Jejak:**\n${imageUrl ? '🖼️ [Gambar]' : (emoji || '🏅')} **${label}** (\`${code}\`)\n*${description}*`);

                if (attachment) embed.setThumbnail(attachment.url);

                return interaction.reply({ embeds: [embed] });
            }

            // ================= LOGIKA EDIT =================
            if (subCommand === 'edit') {
                const code = interaction.options.getString('kode').toLowerCase();
                const label = interaction.options.getString('nama');
                const description = interaction.options.getString('deskripsi');
                const emoji = interaction.options.getString('emoji');
                const attachment = interaction.options.getAttachment('gambar');

                // Validasi: Jika sedang edit gambar/emoji, pastikan tidak mengirim keduanya
                if (emoji && attachment) {
                    return interaction.reply({ content: '❌ Pilih salah satu: Gunakan Emoji **ATAU** Gambar baru, jangan keduanya!', ephemeral: true });
                }

                const ach = await Achievement.findOne({ where: { guildId, code } });
                if (!ach) {
                    return interaction.reply({ content: `❌ Achievement dengan kode **${code}** tidak ditemukan!`, ephemeral: true });
                }

                if (attachment) {
                    if (!attachment.contentType.startsWith('image/')) {
                        return interaction.reply({ content: '❌ File yang diunggah harus berupa gambar!', ephemeral: true });
                    }
                    const uploadDir = path.join(__dirname, '../../../assets/achievements');
                    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

                    // Hapus gambar lama jika ada
                    if (ach.imageUrl) {
                        const oldPath = path.join(uploadDir, ach.imageUrl);
                        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
                    }

                    const res = await fetch(attachment.url);
                    const arrayBuffer = await res.arrayBuffer();
                    const buffer = Buffer.from(arrayBuffer);
                    const fileName = `ach_${code}_${Date.now()}.png`;
                    const filePath = path.join(uploadDir, fileName);
                    fs.writeFileSync(filePath, buffer);
                    ach.imageUrl = fileName;
                    ach.emoji = null; // Menghapus emoji jika beralih ke gambar
                }

                if (label !== null) ach.label = label;
                if (description !== null) ach.description = description;
                
                if (emoji !== null) {
                    ach.emoji = emoji;
                    // Hapus gambar lama jika beralih ke emoji
                    if (ach.imageUrl) {
                        const uploadDir = path.join(__dirname, '../../../assets/achievements');
                        const oldPath = path.join(uploadDir, ach.imageUrl);
                        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
                        ach.imageUrl = null;
                    }
                }

                await ach.save();

                const embed = new EmbedBuilder()
                    .setColor('#F1C40F')
                    .setTitle('🛠️ Gelar Kehormatan Diperbarui!')
                    .setDescription(`**Detail Rekam Jejak Baru:**\n${ach.imageUrl ? '🖼️ [Gambar]' : ach.emoji} **${ach.label}** (\`${code}\`)\n*${ach.description}*`);

                if (ach.imageUrl && attachment) embed.setThumbnail(attachment.url);

                return interaction.reply({ embeds: [embed] });
            }

            // ================= LOGIKA DELETE =================
            if (subCommand === 'delete') {
                const code = interaction.options.getString('kode').toLowerCase();

                const ach = await Achievement.findOne({ where: { guildId, code } });
                if (!ach) {
                    return interaction.reply({ content: `❌ Achievement dengan kode **${code}** tidak ditemukan!`, ephemeral: true });
                }

                await ach.destroy();

                return interaction.reply({ content: `✅ Master data Achievement dengan kode **${code}** telah dihapus.` });
            }

            // ================= LOGIKA LIST =================
            if (subCommand === 'list') {
                const allAchs = await Achievement.findAll({ where: { guildId } });

                if (allAchs.length === 0) {
                    return interaction.reply({ content: '❌ Belum ada achievement yang dibuat di server ini.', ephemeral: true });
                }

                const embed = new EmbedBuilder()
                    .setColor('#FFD700')
                    .setTitle('🏅 Arsip Gelar Gotham')
                    .setDescription('Gunakan kode prestasi untuk mengedit atau menghapusnya.')
                    .setTimestamp();

                const achList = allAchs.map(a => {
                    const icon = a.imageUrl ? '🖼️ [Gambar]' : (a.emoji || '🏅');
                    return `• \`${a.code}\` - ${icon} **${a.label}**\n  *${a.description || 'Tanpa deskripsi'}*`;
                }).join('\n\n');

                if (achList.length > 4000) {
                    embed.setDescription(achList.substring(0, 4000) + '...');
                } else {
                    embed.setDescription(achList);
                }

                return interaction.reply({ embeds: [embed], ephemeral: true });
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
                    .setTitle('🎉 Penganugerahan Gelar!')
                    .setDescription(`Diumumkan! ${targetUser} resmi menorehkan rekam jejak prestise di GCPD:\n\n${achData.emoji} **${achData.label}**\n*${achData.description}*`);

                return interaction.reply({ embeds: [embed] });
            }

            // ================= LOGIKA TAKE (TARIK ACHIEVEMENT) =================
            if (subCommand === 'take') {
                const targetUser = interaction.options.getUser('user');

                // 1. Cari profil user
                const userProfile = await UserProfile.findOne({
                    where: { guildId: guildId, userId: targetUser.id }
                });

                if (!userProfile || !userProfile.achievements || userProfile.achievements.length === 0) {
                    return interaction.reply({ content: `❌ ${targetUser.username} tidak memiliki achievement apapun.`, ephemeral: true });
                }

                // 2. Ambil data achievement yang dimiliki user dari master data
                const ownedAchs = await Achievement.findAll({
                    where: {
                        guildId: guildId,
                        code: userProfile.achievements
                    }
                });

                if (ownedAchs.length === 0) {
                    // Jika user punya kode di profile tapi master datanya sudah dihapus
                    userProfile.achievements = [];
                    userProfile.displayedAchievements = [];
                    await userProfile.save();
                    return interaction.reply({ content: `✅ Profil ${targetUser.username} telah dibersihkan dari achievement yang datanya sudah tidak ada.`, ephemeral: true });
                }

                // 3. Siapkan opsi Dropdown
                const options = ownedAchs.map(ach => {
                    const icon = ach.imageUrl ? '🖼️' : (ach.emoji || '🏅');
                    return new StringSelectMenuOptionBuilder()
                        .setLabel(ach.label)
                        .setValue(ach.code)
                        .setDescription(`Kode: ${ach.code}`);
                });

                const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId('admin_take_achievement')
                    .setPlaceholder('Pilih achievement yang ingin ditarik...')
                    .setMinValues(1)
                    .setMaxValues(options.length)
                    .addOptions(options);

                const row = new ActionRowBuilder().addComponents(selectMenu);

                // 4. Buat Embed Pratinjau Master Achievement User
                const listEmbed = new EmbedBuilder()
                    .setColor('#E74C3C')
                    .setTitle(`📋 Daftar Pencapaian: ${targetUser.username}`)
                    .setDescription(`User ini memiliki achievement berikut. Pilih yang ingin ditarik:\n\n${ownedAchs.map(a => `• ${a.imageUrl ? '🖼️' : (a.emoji || '🏅')} **${a.label}** (\`${a.code}\`)`).join('\n')}`);

                const response = await interaction.reply({
                    embeds: [listEmbed],
                    components: [row],
                    ephemeral: true
                });

                const collector = response.createMessageComponentCollector({
                    componentType: ComponentType.StringSelect,
                    time: 60000
                });

                collector.on('collect', async (i) => {
                    const selectedCodes = i.values;
                    
                    let currentAch = [...(userProfile.achievements || [])];
                    let currentDisplayed = [...(userProfile.displayedAchievements || [])];
                    let removedLabels = [];

                    for (const code of selectedCodes) {
                        const achData = ownedAchs.find(a => a.code === code);
                        if (achData) {
                            removedLabels.push(`**${achData.label}**`);
                        }
                        
                        currentAch = currentAch.filter(c => c !== code);
                        currentDisplayed = currentDisplayed.filter(c => c !== code);
                    }

                    // Update database
                    userProfile.achievements = currentAch;
                    userProfile.displayedAchievements = currentDisplayed;
                    userProfile.changed('achievements', true);
                    userProfile.changed('displayedAchievements', true);
                    await userProfile.save();

                    await i.update({ 
                        content: `✅ Sukses! ${removedLabels.length} achievement telah ditarik dari ${targetUser.username}.`, 
                        embeds: [],
                        components: [] 
                    });

                    // 5. Pengumuman
                    const announcement = new EmbedBuilder()
                        .setColor('#C0392B')
                        .setTitle('⚠️ Pencopotan Gelar')
                        .setDescription(`Pencatatan GCPD diperbarui: **${removedLabels.length} Gelar Kehormatan** telah ditarik dari ${targetUser}:\n\n${removedLabels.join('\n')}`)
                        .setTimestamp();

                    await interaction.channel.send({ embeds: [announcement] });
                });

                collector.on('end', (collected, reason) => {
                    if (reason === 'time') {
                        interaction.editReply({ content: 'Waktu pemilihan habis.', components: [] }).catch(() => { });
                    }
                });
            }

        } catch (error) {
            console.error(`[ERROR] Gagal menjalankan achievements_admin:`, error);
            await interaction.reply({ content: '❌ Terjadi kesalahan pada database.', ephemeral: true });
        }
    }
}

module.exports = ManageAchievementsCommand;