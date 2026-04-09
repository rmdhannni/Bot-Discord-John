const BaseCommand = require('../../structures/BaseCommand');
const Badge = require('../../models/Badge');
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

class BadgeCommand extends BaseCommand {
    constructor(client) {
        super(client, {
            name: 'badge',
            description: 'Manajemen Badge/Lencana eksklusif untuk user donatur/event (Khusus Admin).',
            category: 'Admin',
            permissions: [PermissionFlagsBits.Administrator],
            options: [
                {
                    name: 'create',
                    description: 'Buat badge baru dari gambar',
                    type: 1, // SUB_COMMAND
                    options: [
                        { name: 'nama', description: 'Nama Badge (tanpa spasi, misal: Idul_Fitri_2026)', type: 3, required: true },
                        { name: 'deskripsi', description: 'Deskripsi untuk badge ini', type: 3, required: true },
                        { name: 'gambar', description: 'Upload gambar badge (PNG/JPG)', type: 11, required: true },
                        { name: 'claimable', description: 'Apakah user bisa klaim sendiri pakai /claim?', type: 5, required: false },
                        { name: 'durasi_jam', description: 'Batas waktu klaim dalam hitungan Jam (Kosongkan jika permanen)', type: 4, required: false }
                    ]
                },
                {
                    name: 'edit',
                    description: 'Edit deskripsi atau status klaim badge',
                    type: 1, // SUB_COMMAND
                    options: [
                        { name: 'nama', description: 'Nama Badge yang ingin diubah', type: 3, required: true },
                        { name: 'deskripsi', description: 'Deskripsi baru', type: 3, required: false },
                        { name: 'claimable', description: 'Apakah user bisa klaim sendiri?', type: 5, required: false },
                        { name: 'durasi_jam', description: 'Batas waktu klaim baru (Jam)', type: 4, required: false },
                        { name: 'gambar', description: 'Upload gambar baru (PNG/JPG)', type: 11, required: false }
                    ]
                },
                {
                    name: 'delete',
                    description: 'Hapus badge dari server',
                    type: 1, // SUB_COMMAND
                    options: [
                        { name: 'nama', description: 'Nama Badge yang ingin dihapus', type: 3, required: true }
                    ]
                },
                {
                    name: 'list',
                    description: 'Lihat daftar semua lencana di server ini',
                    type: 1, // SUB_COMMAND
                },
                {
                    name: 'give',
                    description: 'Berikan satu atau beberapa badge kepada user',
                    type: 1, // SUB_COMMAND
                    options: [
                        { name: 'user', description: 'Pilih user yang diberi badge', type: 6, required: true }
                    ]
                },
                {
                    name: 'take',
                    description: 'Tarik/Hapus badge dari seorang user',
                    type: 1, // SUB_COMMAND
                    options: [
                        { name: 'user', description: 'Pilih user yang ingin ditarik badgenya', type: 6, required: true }
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
                const description = interaction.options.getString('deskripsi');
                const attachment = interaction.options.getAttachment('gambar');
                const isClaimable = interaction.options.getBoolean('claimable') || false;
                const durasiJam = interaction.options.getInteger('durasi_jam');

                await interaction.deferReply();

                if (!attachment.contentType.startsWith('image/')) {
                    return interaction.editReply({ content: '❌ File yang diunggah harus berupa gambar!' });
                }

                const existingBadge = await Badge.findOne({ where: { guildId: guild.id, name: badgeName } });
                if (existingBadge) {
                    return interaction.editReply({ content: `❌ Badge dengan nama **${badgeName}** sudah ada!` });
                }

                // --- Download & simpan file lokal ---
                const uploadDir = path.join(__dirname, '../../../assets/badges');
                if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

                const res = await fetch(attachment.url);
                const arrayBuffer = await res.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);
                const fileName = `badge_${badgeName}_${Date.now()}.png`;
                const filePath = path.join(uploadDir, fileName);
                fs.writeFileSync(filePath, buffer);

                let claimDeadline = null;
                let infoWaktu = 'Permanen';
                if (isClaimable && durasiJam) {
                    claimDeadline = new Date();
                    claimDeadline.setHours(claimDeadline.getHours() + durasiJam);
                    infoWaktu = `Terbatas! Berakhir pada <t:${Math.floor(claimDeadline.getTime() / 1000)}:F>`;
                }

                await Badge.create({
                    guildId: guild.id,
                    name: badgeName,
                    description: description,
                    emojiId: null,
                    emojiFormat: '🏅',
                    imageUrl: fileName,
                    isClaimable: isClaimable,
                    claimDeadline: claimDeadline
                });

                const embed = new EmbedBuilder()
                    .setColor('#95A5A6')
                    .setTitle('🦇 Lencana Kehormatan Ditempa!')
                    .setDescription(`**Pratinjau:** 🏅\n**Kode Lencana:** \`${badgeName}\`\n**Deskripsi:** *${description}*\n**Status:** ${infoWaktu}`)
                    .setThumbnail(attachment.url);

                return interaction.editReply({ embeds: [embed] });
            }

            // ================= LOGIKA EDIT =================
            if (subCommand === 'edit') {
                const badgeName = interaction.options.getString('nama').replace(/\s+/g, '_');
                const description = interaction.options.getString('deskripsi');
                const isClaimable = interaction.options.getBoolean('claimable');
                const durasiJam = interaction.options.getInteger('durasi_jam');
                const attachment = interaction.options.getAttachment('gambar');

                await interaction.deferReply({ ephemeral: true });

                const badge = await Badge.findOne({ where: { guildId: guild.id, name: badgeName } });
                if (!badge) {
                    return interaction.editReply({ content: `❌ Badge **${badgeName}** tidak ditemukan!` });
                }

                // --- Ganti Gambar jika ada ---
                if (attachment) {
                    if (!attachment.contentType.startsWith('image/')) {
                        return interaction.editReply({ content: '❌ File yang diunggah harus berupa gambar!' });
                    }
                    const uploadDir = path.join(__dirname, '../../../assets/badges');
                    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

                    // Hapus gambar lama
                    const oldPath = path.join(uploadDir, badge.imageUrl);
                    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);

                    const res = await fetch(attachment.url);
                    const arrayBuffer = await res.arrayBuffer();
                    const buffer = Buffer.from(arrayBuffer);
                    const fileName = `badge_${badgeName}_${Date.now()}.png`;
                    const filePath = path.join(uploadDir, fileName);
                    fs.writeFileSync(filePath, buffer);
                    badge.imageUrl = fileName;
                }

                if (description !== null) badge.description = description;
                if (isClaimable !== null) badge.isClaimable = isClaimable;
                
                let infoWaktu = badge.claimDeadline ? `Berakhir pada <t:${Math.floor(badge.claimDeadline.getTime() / 1000)}:F>` : 'Permanen';
                
                if (durasiJam !== null) {
                    const newDeadline = new Date();
                    newDeadline.setHours(newDeadline.getHours() + durasiJam);
                    badge.claimDeadline = newDeadline;
                    infoWaktu = `Diperbarui! Berakhir pada <t:${Math.floor(newDeadline.getTime() / 1000)}:F>`;
                } else if (isClaimable === false) {
                    badge.claimDeadline = null;
                    infoWaktu = 'Berubah menjadi Permanen';
                }

                await badge.save();

                const embed = new EmbedBuilder()
                    .setColor('#F1C40F')
                    .setTitle('🛠️ Lencana Diperbarui!')
                    .setDescription(`**Kode Lencana:** \`${badgeName}\`\n**Deskripsi Baru:** *${badge.description}*\n**Status Klaim:** ${badge.isClaimable ? '✅ Aktif' : '❌ Nonaktif'}\n**Waktu:** ${infoWaktu}`)
                    .setThumbnail(`attachment://${badge.imageUrl}`);

                // Mencoba kirim gambar jika file ada
                const uploadDir = path.join(__dirname, '../../../assets/badges');
                const filePath = path.join(uploadDir, badge.imageUrl);
                if (fs.existsSync(filePath)) {
                    return interaction.editReply({ embeds: [embed] });
                }
                
                return interaction.editReply({ embeds: [embed] });
            }

            // ================= LOGIKA DELETE =================
            if (subCommand === 'delete') {
                const badgeName = interaction.options.getString('nama').replace(/\s+/g, '_');

                await interaction.deferReply({ ephemeral: true });

                const badge = await Badge.findOne({ where: { guildId: guild.id, name: badgeName } });
                if (!badge) {
                    return interaction.editReply({ content: `❌ Badge **${badgeName}** tidak ditemukan!` });
                }

                // Hapus file gambar jika ada
                const uploadDir = path.join(__dirname, '../../../assets/badges');
                const filePath = path.join(uploadDir, badge.imageUrl);
                if (fs.existsSync(filePath)) {
                    try {
                        fs.unlinkSync(filePath);
                    } catch (e) {
                        console.error(`[WARN] Gagal menghapus file badge: ${filePath}`, e);
                    }
                }

                await badge.destroy();

                return interaction.editReply({ content: `✅ Badge **${badgeName}** telah dihapus secara permanen dari server.` });
            }

            // ================= LOGIKA LIST =================
            if (subCommand === 'list') {
                const allBadges = await Badge.findAll({ where: { guildId: guild.id } });

                if (allBadges.length === 0) {
                    return interaction.reply({ content: '❌ Belum ada badge yang dibuat di server ini.', ephemeral: true });
                }

                const embed = new EmbedBuilder()
                    .setColor('#3498DB')
                    .setTitle('🏅 Daftar Lencana Gotham')
                    .setDescription('Gunakan kode lencana untuk mengedit atau menghapusnya.')
                    .setTimestamp();

                const badgeList = allBadges.map(b => {
                    const infoWaktu = b.claimDeadline ? ` (⏳ <t:${Math.floor(b.claimDeadline.getTime() / 1000)}:R>)` : '';
                    return `• \`${b.name}\` - *${b.description || 'Tanpa deskripsi'}*${infoWaktu}${b.isClaimable ? ' [Klaim ✅]' : ''}`;
                }).join('\n');

                if (badgeList.length > 4000) {
                    embed.setDescription(badgeList.substring(0, 4000) + '...');
                } else {
                    embed.setDescription(badgeList);
                }

                return interaction.reply({ embeds: [embed], ephemeral: true });
            }

            // ================= LOGIKA GIVE (DROPDOWN MENU MULTI-SELECT) =================
            if (subCommand === 'give') {
                const targetUser = interaction.options.getUser('user');

                // 1. Ambil semua data badge dari Database
                const allBadges = await Badge.findAll({ where: { guildId: guild.id } });

                if (allBadges.length === 0) {
                    return interaction.reply({ content: '❌ Belum ada badge yang dibuat di server ini.', ephemeral: true });
                }

                // 2. Siapkan opsi Dropdown (Maksimal 25 opsi sesuai limit Discord)
                const options = allBadges.slice(0, 25).map(badge => {
                    return new StringSelectMenuOptionBuilder()
                        .setLabel(badge.name)
                        .setValue(badge.id.toString());
                });

                // 3. Buat Menu Dropdown yang bisa memilih lebih dari 1
                const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId('admin_give_badge')
                    .setPlaceholder('Pilih satu atau beberapa badge...')
                    .setMinValues(1)
                    .setMaxValues(options.length) // Bisa pilih semua sekaligus
                    .addOptions(options);

                const row = new ActionRowBuilder().addComponents(selectMenu);

                // Kirim menu hanya ke Admin (Ephemeral)
                const response = await interaction.reply({
                    content: `Pilih badge yang ingin diberikan kepada ${targetUser}:`,
                    components: [row],
                    ephemeral: true
                });

                // 4. Tangkap pilihan Admin
                const collector = response.createMessageComponentCollector({
                    componentType: ComponentType.StringSelect,
                    time: 60000
                });

                collector.on('collect', async (i) => {
                    // Ambil array ID badge yang dipilih (konversi ke Integer)
                    const selectedBadgeIds = i.values.map(id => parseInt(id));

                    // Cari profil target user
                    let [userProfile] = await UserProfile.findOrCreate({
                        where: { guildId: guild.id, userId: targetUser.id }
                    });

                    let currentBadges = userProfile.badges || [];
                    let addedCount = 0;
                    let addedNames = [];

                    // Filter data badge asli dari database sesuai pilihan Admin
                    const selectedBadgeData = allBadges.filter(b => selectedBadgeIds.includes(b.id));

                    // Tambahkan badge yang belum dimiliki user
                    for (const badge of selectedBadgeData) {
                        if (!currentBadges.includes(badge.id)) {
                            currentBadges.push(badge.id);
                            addedCount++;
                            addedNames.push(`${badge.emojiFormat} **${badge.name}**`);
                        }
                    }

                    if (addedCount === 0) {
                        return i.update({ content: `❌ ${targetUser.username} sudah memiliki semua badge yang kamu pilih!`, components: [] });
                    }

                    // Simpan ke database
                    userProfile.badges = currentBadges;
                    userProfile.changed('badges', true);
                    await userProfile.save();

                    // Update pesan Admin
                    await i.update({ content: `✅ Berhasil mengirim ${addedCount} badge ke ${targetUser.username}!`, components: [] });

                    // 5. Kirim Pengumuman Publik ke Channel
                    const successEmbed = new EmbedBuilder()
                        .setColor('#95A5A6')
                        .setTitle('🎁 Lencana Didistribusikan!')
                        .setDescription(`Pengumuman! ${targetUser} telah menerima **${addedCount} lencana eksklusif** dari Komisaris GCPD:\n\n${addedNames.join('\n')}`);

                    await interaction.channel.send({ content: `${targetUser}`, embeds: [successEmbed] });
                });

                collector.on('end', (collected, reason) => {
                    if (reason === 'time') {
                        interaction.editReply({ content: 'Waktu pemilihan habis. Silakan ulangi command.', components: [] }).catch(() => { });
                    }
                });
            }

            // ================= LOGIKA TAKE (TARIK BADGE) =================
            if (subCommand === 'take') {
                const targetUser = interaction.options.getUser('user');

                // 1. Cari profil user
                const userProfile = await UserProfile.findOne({
                    where: { guildId: guild.id, userId: targetUser.id }
                });

                if (!userProfile || !userProfile.badges || userProfile.badges.length === 0) {
                    return interaction.reply({ content: `❌ ${targetUser.username} tidak memiliki badge apapun.`, ephemeral: true });
                }

                // 2. Ambil data badge yang dimiliki user dari database
                const ownedBadges = await Badge.findAll({
                    where: {
                        guildId: guild.id,
                        id: userProfile.badges
                    }
                });

                if (ownedBadges.length === 0) {
                    // Jika user punya ID di profile tapi data badgenya sudah dihapus di master
                    userProfile.badges = [];
                    userProfile.displayedBadges = [];
                    await userProfile.save();
                    return interaction.reply({ content: `✅ Profil ${targetUser.username} telah dibersihkan dari badge yang sudah tidak ada.`, ephemeral: true });
                }

                // 3. Siapkan opsi Dropdown (Badge yang dimiliki user saja)
                const options = ownedBadges.map(badge => {
                    return new StringSelectMenuOptionBuilder()
                        .setLabel(badge.name)
                        .setValue(badge.id.toString())
                        .setDescription(badge.description?.substring(0, 50) || 'Badge eksklusif');
                });

                const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId('admin_take_badge')
                    .setPlaceholder('Pilih badge yang ingin ditarik...')
                    .setMinValues(1)
                    .setMaxValues(options.length)
                    .addOptions(options);

                const row = new ActionRowBuilder().addComponents(selectMenu);

                // 4. Buat Embed Pratinjau Koleksi User
                const listEmbed = new EmbedBuilder()
                    .setColor('#E74C3C')
                    .setTitle(`📋 Koleksi Lencana: ${targetUser.username}`)
                    .setDescription(`Berikut adalah lencana yang saat ini dimiliki oleh user. Pilih dari menu dropdown di bawah untuk menariknya.\n\n${ownedBadges.map(b => `• **${b.name}** (\`${b.id}\`)`).join('\n')}`)
                    .setFooter({ text: 'Penarikan lencana akan menghapusnya dari koleksi & tampilan profil.' });

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
                    const selectedBadgeIds = i.values.map(id => parseInt(id));
                    
                    let currentBadges = [...(userProfile.badges || [])];
                    let currentDisplayed = [...(userProfile.displayedBadges || [])];
                    let removedNames = [];

                    for (const badgeId of selectedBadgeIds) {
                        const badgeData = ownedBadges.find(b => b.id === badgeId);
                        if (badgeData) {
                            removedNames.push(`**${badgeData.name}**`);
                        }
                        
                        // Hapus dari daftar koleksi
                        currentBadges = currentBadges.filter(id => id !== badgeId);
                        // Hapus dari daftar display jika ada
                        currentDisplayed = currentDisplayed.filter(id => id !== badgeId);
                    }

                    // Update database
                    userProfile.badges = currentBadges;
                    userProfile.displayedBadges = currentDisplayed;
                    userProfile.changed('badges', true);
                    userProfile.changed('displayedBadges', true);
                    await userProfile.save();

                    await i.update({ 
                        content: `✅ Sukses! ${removedNames.length} lencana telah ditarik dari ${targetUser.username}.`, 
                        embeds: [],
                        components: [] 
                    });

                    // 5. Kirim Pengumuman (Log Publik)
                    const announcement = new EmbedBuilder()
                        .setColor('#C0392B')
                        .setTitle('🚫 Lencana Dicabut')
                        .setDescription(`Sesuai protokol GCPD, **${removedNames.length} lencana** telah ditarik dari ${targetUser}:\n\n${removedNames.join('\n')}`)
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
            console.error(`[ERROR] Gagal mengeksekusi /badge:`, error);
            const replyMsg = '❌ Terjadi kesalahan saat memproses data.';
            if (interaction.deferred) await interaction.editReply({ content: replyMsg });
            else await interaction.reply({ content: replyMsg, ephemeral: true });
        }
    }
}

module.exports = BadgeCommand;