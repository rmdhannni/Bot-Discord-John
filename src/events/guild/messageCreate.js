const UserProfile = require('../../models/UserProfile');
const LevelReward = require('../../models/LevelReward');
const Mission = require('../../models/Mission');
const UserProgress = require('../../models/UserProgress');
const { EmbedBuilder } = require('discord.js');
const { Op } = require('sequelize');

// Set memori untuk Anti-Spam (Cooldown XP)
const cooldownSet = new Set();
const COOLDOWN_TIME = 60000; // 60 detik

module.exports = {
    name: 'messageCreate',
    once: false,
    
    async execute(message, client) {
        // Abaikan pesan dari bot lain atau pesan di DM (Direct Message)
        if (message.author.bot || !message.guild) return;

        const userId = message.author.id;
        const guildId = message.guild.id;

        // ==========================================================
        // 🚀 BAGIAN 1: TRACKER MISI CHAT (DI LUAR COOLDOWN XP)
        // Setiap pesan akan dihitung untuk Misi, tanpa peduli spam atau tidak
        // ==========================================================
        try {
            const now = new Date();
            // Cari misi tipe 'chat' yang aktif dan belum kadaluarsa
            const activeChatMissions = await Mission.findAll({
                where: { guildId, isActive: true, type: 'chat', deadline: { [Op.gt]: now } }
            });

            for (const mission of activeChatMissions) {
                let [progressData] = await UserProgress.findOrCreate({
                    where: { guildId, userId, missionId: mission.id }
                });

                // Jika misi belum selesai, tambahkan progresnya
                if (!progressData.isCompleted) {
                    progressData.progress += 1;
                    
                    // CEK APAKAH TARGET TERCAPAI DI PESAN INI
                    if (progressData.progress >= mission.target) {
                        progressData.isCompleted = true;
                        progressData.progress = mission.target; // Kunci di angka maksimal

                        let rewardMsg = '';
                        // Buka profil user untuk memberikan hadiah
                        let [profile] = await UserProfile.findOrCreate({ where: { guildId, userId } });

                        // --- LOGIKA PEMBAGIAN HADIAH MISI ---
                        if (mission.rewardType === 'xp') {
                            const xpReward = parseInt(mission.rewardValue);
                            profile.xp += xpReward;
                            await profile.save();
                            rewardMsg = `**${xpReward} XP**`;
                        } 
                        else if (mission.rewardType === 'role') {
                            const roleId = mission.rewardValue.replace(/\D/g, ''); // Ambil angka ID-nya saja
                            const role = message.guild.roles.cache.get(roleId);
                            if (role) {
                                await message.member.roles.add(role).catch(() => {});
                                rewardMsg = `Role **${role.name}**`;
                            } else {
                                rewardMsg = `Role tidak ditemukan di server`;
                            }
                        } 
                        else if (mission.rewardType === 'badge') {
                            let currentBadges = profile.badges || [];
                            const badgeId = parseInt(mission.rewardValue);
                            if (!currentBadges.includes(badgeId)) {
                                currentBadges.push(badgeId);
                                profile.badges = currentBadges;
                                profile.changed('badges', true);
                                await profile.save();
                            }
                            rewardMsg = `**Badge Eksklusif** (ID: ${badgeId})`;
                        }

                        // Kirim Pengumuman Misi Selesai ke Channel
                        const embed = new EmbedBuilder()
                            .setColor('#95A5A6')
                            .setTitle('🎊 MISI SELESAI!')
                            .setDescription(`Selamat ${message.author}! Kamu berhasil menyelesaikan misi **${mission.title}**!\n\n🎁 **Hadiahmu:** ${rewardMsg}`);
                        
                        await message.channel.send({ content: `${message.author}`, embeds: [embed] });
                    }
                    // Simpan progres terbaru ke database
                    await progressData.save();
                }
            }
        } catch (error) {
            console.error('[ERROR] Gagal memproses Misi Chat:', error);
        }

        // ==========================================================
        // ⭐ BAGIAN 2: SISTEM LEVELING & XP (DENGAN COOLDOWN)
        // Mencegah user spam huruf acak untuk cepat naik level
        // ==========================================================
        const cooldownKey = `${guildId}-${userId}`;
        
        // Jika user masih dalam masa cooldown, abaikan penambahan XP
        if (cooldownSet.has(cooldownKey)) return;

        try {
            // Cari profil user di database
            let [profile] = await UserProfile.findOrCreate({
                where: { userId, guildId }
            });

            // Tambahkan XP acak (15 sampai 25)
            const xpAdded = Math.floor(Math.random() * 11) + 15;
            profile.xp += xpAdded;

            // Kalkulasi kebutuhan XP untuk naik level
            const nextLevelXp = Math.pow(profile.level, 2) * 100;
            let isLevelUp = false;

            if (profile.xp >= nextLevelXp) {
                profile.level += 1;
                isLevelUp = true;
            }

            // Simpan perubahan XP & Level ke database
            await profile.save();

            // Masukkan user ke daftar Cooldown
            cooldownSet.add(cooldownKey);
            setTimeout(() => {
                cooldownSet.delete(cooldownKey); // Hapus cooldown setelah 1 menit
            }, COOLDOWN_TIME);

            // ==========================================================
            // 🎁 BAGIAN 3: PENGUMUMAN NAIK LEVEL & ROLE REWARD
            // ==========================================================
            if (isLevelUp) {
                let rewardText = ''; 
                
                // Cek apakah ada hadiah Role di level baru ini
                const rewardData = await LevelReward.findOne({ 
                    where: { guildId: guildId, level: profile.level } 
                });

                if (rewardData) {
                    const roleToGive = message.guild.roles.cache.get(rewardData.roleId);
                    if (roleToGive) {
                        try {
                            await message.member.roles.add(roleToGive);
                            rewardText = `\n🎁 Dan kamu berhak mendapatkan role **${roleToGive.name}**!`;
                        } catch (err) {
                            console.error(`[WARN] Bot posisi rolenya di bawah, tidak bisa memberikan role di guild ${guildId}`);
                        }
                    }
                }

                // Kirim ucapan selamat naik level
                const embed = new EmbedBuilder()
                    .setColor('#95A5A6')
                    .setDescription(`🎉 Selamat <@${userId}>! Kamu baru saja mencapai **Level ${profile.level}**!${rewardText}`);
                
                await message.channel.send({ embeds: [embed] });
            }

        } catch (error) {
            console.error(`[ERROR] Gagal memproses XP Message untuk user ${userId}:`, error);
        }
    }
};