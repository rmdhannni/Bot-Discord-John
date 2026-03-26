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
                    .setDescription('Cara mengatur bot, welcome, dan permission')
                    .setValue('admin')
                    .setEmoji('⚙️'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('💎 Panduan Booster (Premium)')
                    .setDescription('Fitur khusus untuk donatur server')
                    .setValue('booster')
                    .setEmoji('💎'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('🎮 Panduan RPG & Sosial')
                    .setDescription('Sistem Level, Profile, dan Achievement')
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
            .setDescription('Selamat datang di pusat bantuan! Bot ini dilengkapi dengan berbagai fitur canggih mulai dari sistem manajemen Server, Leveling, hingga fitur Premium khusus donatur.\n\n👇 **Silakan pilih kategori panduan dari menu di bawah ini.**')
            .setFooter({ text: 'Gunakan dropdown untuk bernavigasi' });

        const response = await interaction.reply({ 
            embeds: [mainEmbed], 
            components: [row] 
            // Hapus 'ephemeral: true' jika Anda ingin guide ini bisa dibaca bareng-bareng di chat
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
                        { name: '`/setup welcome` & `/setup booster`', value: 'Mengatur channel ucapan selamat datang dan role Booster utama.' },
                        { name: '`/setup_snipe`', value: 'Mengatur role apa saja yang diizinkan mengintip pesan yang dihapus.' },
                        { name: '`/setup_rewards`', value: 'Membuat otomatisasi hadiah Role ketika user mencapai level tertentu (contoh: Level 10 dapat role VIP).' },
                        { name: '`/permission`', value: 'Sistem pengunci command. Bisa digunakan untuk melarang/mengizinkan role tertentu memakai command tertentu.' },
                        { name: '`/achievements_admin`', value: 'Membuat master data *Achievement* dan membagikannya ke member secara manual.' },
                        { name: '`/badge` & `/background`', value: 'Membuat lencana custom dari gambar, dan memasangkan *background* custom ke kartu nama member.' }
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
                newEmbed.setTitle('🏅 Panduan RPG & Sosial')
                    .setDescription('Fitur interaktif untuk member server.')
                    .addFields(
                        { name: '💬 Cara Mendapatkan XP', value: 'Cukup aktif mengobrol di text channel! Kamu akan mendapat XP setiap 1 menit. Dilarang spam!' },
                        { name: '`/profile`', value: 'Menampilkan Kartu Nama (Profile Card) keren yang berisi Foto, Bar EXP, Level, Lencana Donatur, dan Pencapaianmu.' },
                        { name: '`/achievements`', value: 'Membuka lemari piala. Kamu bisa memilih maksimal 3 Achievement untuk dipajang di kartu namamu (menggunakan dropdown menu).' }
                    );
            }
            else if (selected === 'utility') {
                newEmbed.setTitle('🛠️ Panduan Utility')
                    .setDescription('Fitur utilitas sehari-hari.')
                    .addFields(
                        { name: '`/snipe`', value: 'Membaca pesan terakhir yang baru saja dihapus oleh seseorang di channel tersebut (Butuh akses khusus dari Admin).' },
                        { name: '`/ping`', value: 'Mengecek kecepatan respon bot.' },
                        { name: '`/stats`', value: 'Melihat status server bot, penggunaan RAM, dan statistik member.' }
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