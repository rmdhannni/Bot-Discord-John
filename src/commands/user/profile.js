const BaseCommand = require('../../structures/BaseCommand');
const UserProfile = require('../../models/UserProfile');
const Badge = require('../../models/Badge');
const Achievement = require('../../models/Achievement');
const { AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('@napi-rs/canvas');

class ProfileCommand extends BaseCommand {
    constructor(client) {
        super(client, {
            name: 'profile',
            description: 'Lihat kartu nama, level, exp, dan badge eksklusif kamu.',
            category: 'User',
            options: [
                {
                    name: 'user',
                    description: 'Lihat profil user lain (kosongkan untuk melihat profil sendiri)',
                    type: 6, // USER
                    required: false
                }
            ]
        });
    }

    async execute(interaction) {
        // Wajib deferReply karena proses rendering Canvas memakan waktu 1-3 detik
        await interaction.deferReply(); 

        const targetUser = interaction.options.getUser('user') || interaction.user;
        const guildId = interaction.guild.id;

        try {
            // 1. Ambil Data Profil dari Database
            const [profile] = await UserProfile.findOrCreate({
                where: { guildId: guildId, userId: targetUser.id }
            });

            // 2. Kalkulasi Level & EXP
            const currentLevel = profile.level;
            const currentXP = profile.xp;
            // Rumus: XP untuk level N adalah N^2 * 100
            const previousLevelXP = currentLevel === 1 ? 0 : Math.pow(currentLevel - 1, 2) * 100;
            const nextLevelXP = Math.pow(currentLevel, 2) * 100;
            
            const xpNeededForCurrentLevel = nextLevelXP - previousLevelXP;
            const xpGainedInCurrentLevel = currentXP - previousLevelXP;
            // Hindari pembagian dengan nol atau persentase melebihi 100%
            const xpPercentage = Math.max(0, Math.min(xpGainedInCurrentLevel / xpNeededForCurrentLevel, 1));

            // 3. Siapkan Canvas (Ukuran 700x250 pixel)
            const canvas = createCanvas(700, 250);
            const ctx = canvas.getContext('2d');

            // 4. Gambar Background
            if (profile.backgroundUrl) {
                try {
                    const bg = await loadImage(profile.backgroundUrl);
                    ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);
                } catch (e) {
                    console.error(`Gagal load background untuk user ${targetUser.id}`);
                    // Fallback abu-abu gelap jika link rusak
                    ctx.fillStyle = '#2C2F33';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                }
            } else {
                // Background Default (Gradient Biru-Merah)
                const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
                gradient.addColorStop(0, '#1a2a6c');
                gradient.addColorStop(1, '#b21f1f');
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }

            // Tambahkan overlay gelap transparan agar teks putih selalu terbaca jelas
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // 5. Gambar Avatar (Foto Profil Lingkaran)
            const avatarUrl = targetUser.displayAvatarURL({ extension: 'png', size: 256 });
            const avatar = await loadImage(avatarUrl);
            
            ctx.save();
            ctx.beginPath();
            ctx.arc(125, 125, 75, 0, Math.PI * 2, true); // Koordinat X:125, Y:125, Radius: 75
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(avatar, 50, 50, 150, 150);
            ctx.restore();

            // Bingkai Putih untuk Avatar
            ctx.beginPath();
            ctx.arc(125, 125, 75, 0, Math.PI * 2, true);
            ctx.lineWidth = 6;
            ctx.strokeStyle = '#FFFFFF';
            ctx.stroke();

            // 6. Gambar Teks (Username, Level, XP)
            ctx.fillStyle = '#FFFFFF';
            
            // Username
            ctx.font = 'bold 36px sans-serif';
            ctx.fillText(targetUser.username, 230, 90);

            // Level & XP Text
            ctx.font = '24px sans-serif';
            ctx.fillStyle = '#AAAAAA';
            ctx.fillText(`Level ${currentLevel}  •  ${currentXP} / ${nextLevelXP} XP`, 230, 130);

            // 7. Gambar Progress Bar EXP
            const barX = 230;
            const barY = 150;
            const barWidth = 420; // Panjang full bar
            const barHeight = 25;
            const radius = 12;

            // Background Bar (Abu-abu gelap)
            ctx.fillStyle = '#424549';
            ctx.beginPath();
            ctx.roundRect(barX, barY, barWidth, barHeight, radius);
            ctx.fill();

            // Isi Progress Bar (Warna Hijau)
            if (xpPercentage > 0) {
                ctx.fillStyle = '#2ECC71';
                ctx.beginPath();
                ctx.roundRect(barX, barY, barWidth * xpPercentage, barHeight, radius);
                ctx.fill();
            }

            // 8. Gambar Badges (Lencana Donatur - di kiri bawah text)
            const userBadges = profile.badges || [];
            if (userBadges.length > 0) {
                let badgeX = 230;
                const badgeY = 190;
                const badgeSize = 40;

                // Ambil data badge dari MySQL
                const badgesData = await Badge.findAll({ where: { id: userBadges } });

                for (let i = 0; i < badgesData.length; i++) {
                    if (i >= 8) break; // Maksimal 8 lencana agar tidak menabrak batas kanan
                    try {
                        const badgeImg = await loadImage(badgesData[i].imageUrl);
                        ctx.drawImage(badgeImg, badgeX, badgeY, badgeSize, badgeSize);
                        badgeX += badgeSize + 10; // Geser ke kanan 10px untuk lencana berikutnya
                    } catch (err) {
                        console.error(`[CANVAS] Gagal meload gambar badge ${badgesData[i].name}`);
                    }
                }
            }

            // 9. Gambar Achievement yang Dipilih (Dinamic dari MySQL - di pojok kanan atas)
            const displayedAchCodes = profile.displayedAchievements || [];
            if (displayedAchCodes.length > 0) {
                // Ambil data asli dari database
                const displayedAchData = await Achievement.findAll({ 
                    where: { guildId: guildId, code: displayedAchCodes } 
                });

                ctx.font = 'bold 20px sans-serif';
                ctx.fillStyle = '#F1C40F'; // Warna emas
                
                let achTextY = 80;
                ctx.fillText('🏆 Pencapaian:', 480, 50);

                ctx.fillStyle = '#FFFFFF';
                ctx.font = 'italic 18px sans-serif';
                
                for (const ach of displayedAchData) {
                    // Gambar teks di canvas (contoh: "• Juara Turnamen")
                    ctx.fillText(`• ${ach.label}`, 480, achTextY);
                    achTextY += 25; // Turunkan Y sebesar 25px untuk teks baris berikutnya
                }
            }

            // 10. Ekspor Canvas menjadi file PNG
            const buffer = await canvas.encode('png');
            const attachment = new AttachmentBuilder(buffer, { name: 'profile-card.png' });

            // 11. Kirim hasil render ke Discord
            await interaction.editReply({ files: [attachment] });

        } catch (error) {
            console.error(`[ERROR] Gagal merender /profile:`, error);
            await interaction.editReply({ content: '❌ Terjadi kesalahan saat memproses kartu nama. Pastikan format background valid.' });
        }
    }
}

module.exports = ProfileCommand;