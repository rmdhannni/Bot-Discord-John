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
                    .setLabel('💎 Panduan Booster (Premium)')
                    .setDescription('Fitur khusus untuk donatur server')
                    .setValue('booster')
                    .setEmoji('💎'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('🎮 Panduan RPG, Badge & Misi')
                    .setDescription('Sistem Level, Profile, Badge, dan Quest')
                    .setValue('rpg')
                    .setEmoji('🏅'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('🛠️ Panduan Utility')
                    .setDescription('Fitur umum seperti Snipe dan Ping')
                    .setValue('utility')
                    .setEmoji('🛠️')
            );

        const row = new ActionRowBuilder().addComponents(selectMenu);

        // 2. Embed Halaman Utama (Welcome Page)
        const mainEmbed = new EmbedBuilder()
            .setColor('#2B2D31')
            .setTitle('📚 Buku Panduan Bot')
            .setDescription('Selamat datang di pusat bantuan! Bot ini dilengkapi dengan ekosistem MMORPG yang canggih, mulai dari sistem manajemen Server, Leveling, Ekonomi Badge, hingga fitur Premium khusus donatur.\n\n👇 **Silakan pilih kategori panduan dari menu di bawah ini.**')
            .setFooter({ text: 'Gunakan dropdown untuk bernavigasi' });

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
            let newEmbed = new EmbedBuilder().setColor('#3498DB');

            // ================= KONTEN PANDUAN =================

            if (selected === 'admin') {
                newEmbed.setTitle('⚙️ Panduan Admin & Setup')
                    .setDescription('Kumpulan command khusus Administrator Server.')
                    .addFields(
                        { name: '🛠️ Core Setup', value: '`/setup` (Set Welcome & Booster Role), `/setup_snipe` (Set Role Snipe), `/permission` (Kunci command untuk role tertentu).' },
                        { name: '🎁 Level Rewards', value: '`/setup_rewards` (Otomatis memberikan Role saat user mencapai Level tertentu).' },
                        { name: '🎖️ Master Badge & Background', value: '`/badge` (Buat badge permanen/limited time dan bagikan ke user), `/background` (Pasang custom background ke profil user).' },
                        { name: '🏆 Master Achievements', value: '`/achievements_admin` (Buat master piala dan bagikan ke user).' },
                        { name: '📜 Mission Control', value: '`/mission_admin` (Buat quest berbatas waktu dengan hadiah XP/Role/Badge untuk chat dan voice channel).' }
                    );
            } 
            else if (selected === 'booster') {
                newEmbed.setTitle('💎 Panduan Premium (Booster)')
                    .setDescription('Kumpulan command eksklusif untuk member yang memiliki Role Booster.')
                    .addFields(
                        { name: '`/pc create`', value: 'Membuat Text Channel pribadi (Private Channel) yang hanya bisa dilihat oleh pembuatnya.' },
                        { name: '`/pc rename` & `/pc delete`', value: 'Mengubah nama channel pribadi atau menghapusnya jika sudah tidak dipakai.' },
                        { name: '`/role create`', value: 'Membuat Custom Role dengan warna pilihan sendiri (menggunakan kode HEX, misal: #FF0000).' },
                        { name: '`/role edit` & `/role delete`', value: 'Mengubah warna role custom atau menghapusnya.' }
                    );
            }
            else if (selected === 'rpg') {
                newEmbed.setTitle('🎮 Panduan RPG, Badge & Misi')
                    .setDescription('Fitur interaktif dan ekonomi sosial untuk member server.')
                    .addFields(
                        { name: '💬 Cara Naik Level', value: 'Aktif mengobrol di text channel! Kamu akan mendapat XP setiap 1 menit (Anti-Spam System).' },
                        { name: '`/profile`', value: 'Menampilkan Kartu Nama (Profile Card) keren yang berisi Foto, Bar EXP, Level, Lencana, dan Pencapaianmu.' },
                        { name: '`/missions`', value: 'Membuka Papan Quest. Cek misi aktif (Chat/Voice) dan dapatkan hadiahnya secara otomatis sebelum waktu habis!' },
                        { name: '`/claim`', value: 'Klaim Badge Limited Edition (Event Terbatas) sebelum masa tenggatnya habis.' },
                        { name: '`/giftbadge`', value: 'Transfer/berikan badge milikmu kepada user lain secara cuma-cuma.' },
                        { name: '`/mybadges` & `/achievements`', value: 'Atur badge dan achievement mana saja yang ingin kamu pamerkan di Profil Card-mu (Maks 8 Badge, Maks 3 Achievement).' }
                    );
            }
            else if (selected === 'utility') {
                newEmbed.setTitle('🛠️ Panduan Utility')
                    .setDescription('Fitur utilitas sehari-hari.')
                    .addFields(
                        { name: '`/snipe`', value: 'Membaca pesan terakhir yang baru saja dihapus oleh seseorang di channel tersebut (Butuh akses khusus dari Admin).' },
                        { name: '`/ping`', value: 'Mengecek kecepatan respon dan latensi bot ke server Discord.' }
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