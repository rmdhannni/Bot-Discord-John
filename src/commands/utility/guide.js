const BaseCommand = require('../../structures/BaseCommand');
const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    StringSelectMenuBuilder, 
    StringSelectMenuOptionBuilder, 
    ComponentType 
} = require('discord.js');

class GuideCommand extends BaseCommand {
    constructor(client) {
        super(client, {
            name: 'guide',
            description: 'Buku panduan lengkap cara menggunakan semua fitur bot.',
            category: 'Utility'
        });
    }

    async execute(interaction) {
        // 1. Buat Menu Dropdown Kategori
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('guide_menu')
            .setPlaceholder('Pilih kategori panduan...')
            .addOptions(
                new StringSelectMenuOptionBuilder()
                    .setLabel('🔰 Panduan Admin & Setup')
                    .setDescription('Cara mengatur bot, welcome, misi, dan permission')
                    .setValue('admin')
                    .setEmoji('⚙️'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('💎 Akses VIP (Premium)')
                    .setDescription('Fitur khusus untuk donatur Elite Gotham')
                    .setValue('booster')
                    .setEmoji('💎'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('🎮 Operasi & Lencana (RPG)')
                    .setDescription('Sistem Level, Profile, Badge, dan Operasi Misi')
                    .setValue('rpg')
                    .setEmoji('🏅'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('🛠️ Utilitas Batcomputer')
                    .setDescription('Fitur umum seperti Radar (Ping) dan Arsip Pesan (Snipe)')
                    .setValue('utility')
                    .setEmoji('🛠️')
            );

        const row = new ActionRowBuilder().addComponents(selectMenu);

        // 2. Embed Halaman Utama (Welcome Page)
        const mainEmbed = new EmbedBuilder()
            .setColor('#95A5A6')
            .setTitle('🦇 Arsip Database GCPD (Panduan Gotham)')
            .setDescription('Selamat datang di pusat terminal informasi Gotham. Bot ini dilengkapi dengan ekosistem MMORPG yang canggih, mulai dari sistem manajemen Server, Leveling, Lencana Gotham, hingga fitur Elite khusus donatur.\n\n👇 **Silakan akses database melalui menu di bawah ini.**')
            .setFooter({ text: 'Gunakan dropdown untuk mengakses terminal' });

        const response = await interaction.reply({ 
            embeds: [mainEmbed], 
            components: [row] 
        });

        // 3. Event Collector untuk Navigasi Menu
        const collector = response.createMessageComponentCollector({ 
            componentType: ComponentType.StringSelect, 
            time: 120000 // Menu aktif selama 2 menit
        });

        collector.on('collect', async (i) => {
            // Hanya orang yang mengetik command yang bisa memencet menu
            if (i.user.id !== interaction.user.id) {
                return i.reply({ content: '❌ Silakan ketik `/guide` sendiri untuk membaca panduan.', ephemeral: true });
            }

            const selected = i.values[0];
            let newEmbed = new EmbedBuilder().setColor('#95A5A6');

            // ================= KONTEN PANDUAN =================

            if (selected === 'admin') {
                newEmbed.setTitle('⚙️ Panduan Admin & Kepolisian Gotham')
                    .setDescription('Kumpulan command khusus bagi Komisaris Server (Admin).')
                    .addFields(
                        { name: '🛠️ Core Setup', value: '`/setup` (Set Welcome & Booster Role), `/setup_snipe` (Set Role Investigasi Data), `/permission` (Kunci command rahasia).' },
                        { name: '🎁 Level Rewards', value: '`/setup_rewards` (Otomatis memberikan tanda pengenal/Role saat Warga Gotham mencapai Level tertentu).' },
                        { name: '🎖️ Master Badge & Background', value: '`/badge` (Buat lencana khusus/berbatas waktu dan bagikan ke warga), `/background` (Pasang profil kustom jalanan Gotham).' },
                        { name: '🏆 Gelar Kepahlawanan', value: '`/achievements_admin` (Buat gelar pahlawan Gotham dan bagikan).' },
                        { name: '📜 Papan Bounty GCPD', value: '`/mission_admin` (Buat Target Operasi berbatas waktu dengan hadiah XP/Role/Lencana).' }
                    );
            } 
            else if (selected === 'booster') {
                newEmbed.setTitle('💎 Panduan Elite (Gotham Booster)')
                    .setDescription('Akses Terminal eksklusif untuk member yang menjadi donatur kota (Booster).')
                    .addFields(
                        { name: '`/pc create`', value: 'Membangun Markas Rahasia (Private Channel) yang hanya bisa dilihat olehmu.' },
                        { name: '`/pc rename` & `/pc delete`', value: 'Menyamarkan nama markas atau meratakannya jika sudah ditinggalkan.' },
                        { name: '`/role create`', value: 'Membuat Identitas Palsu (Custom Role) dengan warna jas setelan pilihan (opsi HEX, misal: #FF0000).' },
                        { name: '`/role edit` & `/role delete`', value: 'Merias ulang jas warna atau menghancurkan identitas lamamu.' }
                    );
            }
            else if (selected === 'rpg') {
                newEmbed.setTitle('🎮 Peta Operasi Gotham (RPG)')
                    .setDescription('Bertahan hidup di jalanan keras Gotham dan tingkatkan pengalamanmu.')
                    .addFields(
                        { name: '💬 Cara Naik Level', value: 'Eksis meronda malam di chat! Kamu mendapat XP tiap menit bertahan hidup (Anti-Spam System).' },
                        { name: '`/profile`', value: 'Kartu Tanda Penduduk Gotham (ID Card). Tampilkan Foto, Bar Perjalanan Level, Lencana yang didapat, dsb.' },
                        { name: '`/missions`', value: 'Akses Papan Buronan GCPD. Jalankan operasi target dan kumpulkan bayarannya di tengah malam!' },
                        { name: '`/claim`', value: 'Klaim Pasokan Gelap (Badge Limited Edition) sebelum truk menghilang dari radar.' },
                        { name: '`/giftbadge`', value: 'Berbagi harta jarahan Lencana ke Warga Gotham lainnya secara rahasia.' },
                        { name: '`/mybadges` & `/achievements`', value: 'Atur lencana mana yang ingin disombongkan di KTP Gotham-mu (Maks 8 Badge, Maks 3 Gelar).' }
                    );
            }
            else if (selected === 'utility') {
                newEmbed.setTitle('🛠️ Alat Sabotase Utility')
                    .setDescription('Gadget sehari-hari dari Lucius Fox.')
                    .addFields(
                        { name: '`/snipe`', value: 'Menyadap pesan rahasia yang baru dikubur (dihapus) oleh mafia lain (Butuh izin Keamanan GCPD).' },
                        { name: '`/ping`', value: 'Uji koneksi jaringan Bat-Signal menuju server utama Gotham.' }
                    );
            }

            // Update pesan dengan embed kategori yang dipilih
            await i.update({ embeds: [newEmbed] });
        });

        // Hapus komponen menu jika waktu habis agar tidak nyangkut
        collector.on('end', () => {
            interaction.editReply({ components: [] }).catch(() => {});
        });
    }
}

module.exports = GuideCommand;