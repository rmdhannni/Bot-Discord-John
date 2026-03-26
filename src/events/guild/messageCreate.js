const UserProfile = require('../../models/UserProfile');
const LevelReward = require('../../models/LevelReward');
const { EmbedBuilder } = require('discord.js');

// Menggunakan Set di memori RAM untuk mencatat user yang sedang cooldown (Clean Code & Cepat)
const cooldownSet = new Set();
const COOLDOWN_TIME = 60000; // 60 detik (1 menit) jarak antar pesan yang dapat XP

module.exports = {
    name: 'messageCreate',
    once: false,
    
    async execute(message, client) {
        // Abaikan pesan dari bot lain atau pesan di DM (Direct Message)
        if (message.author.bot || !message.guild) return;

        const userId = message.author.id;
        const guildId = message.guild.id;
        const cooldownKey = `${guildId}-${userId}`;

        // Jika user masih dalam masa cooldown, abaikan penambahan XP
        if (cooldownSet.has(cooldownKey)) return;

        try {
            // 1. Cari profil user di database, buat baru jika belum pernah chat
            let [profile] = await UserProfile.findOrCreate({
                where: { userId, guildId }
            });

            // 2. Tambahkan XP secara acak antara 15 sampai 25 per pesan
            const xpAdded = Math.floor(Math.random() * 11) + 15;
            profile.xp += xpAdded;

            // 3. Sistem Kalkulasi Level (Rumus standar: XP Butuh = Level Saat Ini ^ 2 * 100)
            // Contoh: Naik ke Lvl 2 butuh 100 XP, Lvl 3 butuh 400 XP, Lvl 4 butuh 900 XP
            const nextLevelXp = Math.pow(profile.level, 2) * 100;

            let isLevelUp = false;
            if (profile.xp >= nextLevelXp) {
                profile.level += 1;
                isLevelUp = true;
            }

            // Simpan perubahan ke MySQL
            await profile.save();

            // 4. Masukkan user ke daftar Cooldown
            cooldownSet.add(cooldownKey);
            setTimeout(() => {
                cooldownSet.delete(cooldownKey); // Hapus dari cooldown setelah 1 menit
            }, COOLDOWN_TIME);

            // 5. Kirim pengumuman jika user naik level
            if (isLevelUp) {
                let rewardText = ''; // Teks tambahan jika dapat role

                // Cek apakah ada hadiah di level baru ini
                const rewardData = await LevelReward.findOne({ 
                    where: { guildId: guildId, level: profile.level } 
                });

                if (rewardData) {
                    const roleToGive = message.guild.roles.cache.get(rewardData.roleId);
                    // Pastikan rolenya masih ada di server (tidak dihapus manual oleh admin)
                    if (roleToGive) {
                        try {
                            await message.member.roles.add(roleToGive);
                            rewardText = `\n🎁 Dan kamu berhak mendapatkan role **${roleToGive.name}**!`;
                        } catch (err) {
                            console.error(`[WARN] Bot tidak punya izin untuk memberikan role di guild ${guildId}`);
                        }
                    }
                }

                const embed = new EmbedBuilder()
                    .setColor('#F1C40F')
                    .setDescription(`🎉 Selamat <@${userId}>! Kamu baru saja mencapai **Level ${profile.level}**!${rewardText}`);
                
                await message.channel.send({ embeds: [embed] });
            }

            // (Opsional) Di sinilah nanti logika pemeriksaan pencapaian (Achievement) dimasukkan.
            // Contoh: Jika user mengirim pesan ke-1000, berikan Achievement "Chatterbox".

        } catch (error) {
            console.error(`[ERROR] Gagal memproses XP Message untuk user ${userId}:`, error);
        }
    }
};