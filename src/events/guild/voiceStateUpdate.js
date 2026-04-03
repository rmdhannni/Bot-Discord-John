const Mission = require('../../models/Mission');
const UserProgress = require('../../models/UserProgress');
const UserProfile = require('../../models/UserProfile');
const { EmbedBuilder } = require('discord.js');
const { Op } = require('sequelize');

// Menggunakan Map di memori RAM (sangat cepat) untuk mencatat jam masuk
const voiceJoinTimes = new Map();

module.exports = {
    name: 'voiceStateUpdate',
    once: false,

    async execute(oldState, newState) {
        // Abaikan bot
        if (newState.member.user.bot) return;

        const userId = newState.member.id;
        const guildId = newState.guild.id;

        // KONDISI 1: USER JOIN VOICE CHANNEL
        if (!oldState.channelId && newState.channelId) {
            voiceJoinTimes.set(userId, Date.now()); // Catat waktu saat ini dalam milidetik
            return;
        }

        // KONDISI 2: USER LEAVE VOICE CHANNEL
        if (oldState.channelId && !newState.channelId) {
            const joinTime = voiceJoinTimes.get(userId);
            if (!joinTime) return; // Jika karena suatu alasan data join tidak ada, abaikan

            // Hitung durasi (dalam Menit)
            const durationMs = Date.now() - joinTime;
            const durationMinutes = Math.floor(durationMs / 60000); 

            voiceJoinTimes.delete(userId); // Bersihkan memori

            // Jika kurang dari 1 menit, abaikan agar tidak spam database
            if (durationMinutes < 1) return;

            try {
                const now = new Date();
                // Cari misi 'voice' yang aktif
                const activeVoiceMissions = await Mission.findAll({
                    where: { guildId, isActive: true, type: 'voice', deadline: { [Op.gt]: now } }
                });

                for (const mission of activeVoiceMissions) {
                    let [progressData] = await UserProgress.findOrCreate({
                        where: { guildId, userId, missionId: mission.id }
                    });

                    if (!progressData.isCompleted) {
                        progressData.progress += durationMinutes;
                        
                        // CEK APAKAH TARGET TERCAPAI
                        if (progressData.progress >= mission.target) {
                            progressData.isCompleted = true;
                            progressData.progress = mission.target;

                            // === LOGIKA PEMBAGIAN HADIAH ===
                            let rewardMsg = '';
                            if (mission.rewardType === 'xp') {
                                const xpReward = parseInt(mission.rewardValue);
                                let [profile] = await UserProfile.findOrCreate({ where: { guildId, userId } });
                                profile.xp += xpReward;
                                await profile.save();
                                rewardMsg = `**${xpReward} XP**`;
                            } else if (mission.rewardType === 'role') {
                                const roleId = mission.rewardValue.replace(/\D/g, ''); 
                                const role = newState.guild.roles.cache.get(roleId);
                                if (role) await newState.member.roles.add(role).catch(() => {});
                                rewardMsg = `Role **${role ? role.name : 'Unknown'}**`;
                            } else if (mission.rewardType === 'badge') {
                                let [profile] = await UserProfile.findOrCreate({ where: { guildId, userId } });
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

                            // Kirim Pengumuman ke channel notifikasi utama (misal general)
                            // Jika Anda punya setting default channel, kirim ke sana. Untuk keamanan, kita kirim DM atau fallback.
                            try {
                                const embed = new EmbedBuilder()
                                    .setColor('#95A5A6')
                                    .setTitle('🎙️ PENYADAPAN GOTHAM SELESAI!')
                                    .setDescription(`Luar biasa! Kamu berhasil menuntaskan penyadapan **${mission.title}** di Saluran Suara Rahasia!\n\n🎁 **Bayaranmu:** ${rewardMsg}`);
                                await newState.member.send({ embeds: [embed] });
                            } catch (e) {
                                console.log(`[INFO] Gagal mengirim DM ke user ${userId} untuk misi voice.`);
                            }
                        }
                        await progressData.save();
                    }
                }
            } catch (error) {
                console.error('[ERROR] Gagal memproses Misi Voice:', error);
            }
        }
    }
};