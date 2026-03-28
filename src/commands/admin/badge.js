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
                        { name: 'gambar', description: 'Upload gambar badge (PNG/JPG)', type: 11, required: true },
                        { name: 'claimable', description: 'Apakah user bisa klaim sendiri pakai /claim?', type: 5, required: false },
                        { name: 'durasi_jam', description: 'Batas waktu klaim dalam hitungan Jam (Kosongkan jika permanen)', type: 4, required: false }
                    ]
                },
                {
                    name: 'give',
                    description: 'Berikan satu atau beberapa badge kepada user',
                    type: 1, // SUB_COMMAND
                    options: [
                        { name: 'user', description: 'Pilih user yang diberi badge', type: 6, required: true }
                        // 📍 KITA HAPUS OPSI KETIK MANUAL DI SINI
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
                const isClaimable = interaction.options.getBoolean('claimable') || false; 
                const durasiJam = interaction.options.getInteger('durasi_jam'); 

                await interaction.deferReply(); 

                if (!attachment.contentType.startsWith('image/')) {
                    return interaction.editReply({ content: '❌ File yang diunggah harus berupa gambar!' });
                }
                if (attachment.size > (1 * 1024 * 1024)) {
                    return interaction.editReply({ content: `❌ Ukuran gambar terlalu besar! Maksimal 1 MB.` });
                }

                const existingBadge = await Badge.findOne({ where: { guildId: guild.id, name: badgeName } });
                if (existingBadge) {
                    return interaction.editReply({ content: `❌ Badge dengan nama **${badgeName}** sudah ada!` });
                }

                let claimDeadline = null;
                let infoWaktu = 'Permanen (Selalu bisa diklaim jika claimable=True)';
                
                if (isClaimable && durasiJam) {
                    claimDeadline = new Date();
                    claimDeadline.setHours(claimDeadline.getHours() + durasiJam); 
                    infoWaktu = `Terbatas! Berakhir pada <t:${Math.floor(claimDeadline.getTime() / 1000)}:F>`;
                } else if (!isClaimable) {
                    infoWaktu = 'Eksklusif (Hanya bisa diberikan oleh Admin via /badge give)';
                }

                const createdEmoji = await guild.emojis.create({
                    attachment: attachment.url,
                    name: badgeName
                });

                await Badge.create({
                    guildId: guild.id,
                    name: badgeName,
                    emojiId: createdEmoji.id,
                    emojiFormat: createdEmoji.toString(), 
                    imageUrl: attachment.url,
                    isClaimable: isClaimable,
                    claimDeadline: claimDeadline
                });

                const embed = new EmbedBuilder()
                    .setColor('#2ECC71')
                    .setTitle('🎖️ Badge Limited Edition Berhasil Dibuat!')
                    .setDescription(`Gambar telah diconvert menjadi Emote Discord dan disimpan ke Database.\n\n**Preview:** ${createdEmoji.toString()}\n**Nama:** \`${badgeName}\`\n**Status:** ${infoWaktu}`)
                    .setThumbnail(attachment.url);

                return interaction.editReply({ embeds: [embed] });
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
                        .setValue(badge.id.toString())
                        .setEmoji(badge.emojiId); // Menggunakan emoji custom
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
                        .setColor('#F1C40F')
                        .setTitle('🎁 Badges Diberikan!')
                        .setDescription(`Selamat! ${targetUser} telah menerima **${addedCount} badge eksklusif** dari Admin:\n\n${addedNames.join('\n')}`);

                    await interaction.channel.send({ content: `${targetUser}`, embeds: [successEmbed] });
                });

                collector.on('end', (collected, reason) => {
                    if (reason === 'time') {
                        interaction.editReply({ content: 'Waktu pemilihan habis. Silakan ulangi command.', components: [] }).catch(() => {});
                    }
                });
            }

        } catch (error) {
            console.error(`[ERROR] Gagal mengeksekusi /badge:`, error);
            const replyMsg = '❌ Terjadi kesalahan! Pastikan slot Emoji di server Anda belum penuh.';
            if (interaction.deferred) await interaction.editReply({ content: replyMsg });
            else await interaction.reply({ content: replyMsg, ephemeral: true });
        }
    }
}

module.exports = BadgeCommand;