'use strict';

const BaseCommand = require('../../structures/BaseCommand');
const UserProfile = require('../../models/UserProfile');
const Badge = require('../../models/Badge');
const Achievement = require('../../models/Achievement');
const GuildConfig = require('../../models/GuildConfig');
const { AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const path  = require('path');
const fs    = require('fs');
const https = require('https');
const http  = require('http');

// ─────────────────────────────────────────────
// Cache emoji custom Discord ke file lokal
// ─────────────────────────────────────────────
const EMOJI_CACHE_DIR = path.join(__dirname, '../../../assets/emoji_cache');
if (!fs.existsSync(EMOJI_CACHE_DIR)) fs.mkdirSync(EMOJI_CACHE_DIR, { recursive: true });

function downloadToCache(url, filename) {
    return new Promise((resolve, reject) => {
        const dest = path.join(EMOJI_CACHE_DIR, filename);
        if (fs.existsSync(dest)) return resolve(dest);

        const proto = url.startsWith('https') ? https : http;
        const file  = fs.createWriteStream(dest);

        proto.get(url, (res) => {
            if (res.statusCode === 301 || res.statusCode === 302) {
                file.close();
                fs.unlink(dest, () => {});
                return downloadToCache(res.headers.location, filename).then(resolve).catch(reject);
            }
            if (res.statusCode !== 200) {
                file.close();
                fs.unlink(dest, () => {});
                return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
            }
            res.pipe(file);
            file.on('finish', () => file.close(() => resolve(dest)));
        }).on('error', (err) => {
            fs.unlink(dest, () => {});
            reject(err);
        });
    });
}

// ─────────────────────────────────────────────
// Konstanta Layout — Kartu Persegi Panjang 1000x700
// ─────────────────────────────────────────────
const CARD = Object.freeze({ SIZE_W: 1000, SIZE_H: 700, RADIUS: 30 });
const TOP = Object.freeze({ X: 30, Y: 30, W: 940, H: 220, R: 30 });
const BOT = Object.freeze({ X: 30, Y: 280, W: 940, H: 390, R: 30 });

const LAYOUT = Object.freeze({
    AVATAR_X: TOP.X + 40, AVATAR_Y: TOP.Y + 40, AVATAR_SIZE: 140, AVATAR_RADIUS: 70,
    USER_X: TOP.X + 210, USER_Y: TOP.Y + 115,
    ROLE_X: TOP.X + 210, ROLE_Y: TOP.Y + 155,
    BADGE_Y: TOP.Y + 70, BADGE_SZ: 40, BADGE_GAP: 15,
    BAR_X: BOT.X + 40, BAR_Y: BOT.Y + 40, BAR_W: BOT.W - 80, BAR_H: 50, BAR_RADIUS: 25,
    LVL_Y: BOT.Y + 74, XP_Y: BOT.Y + 74,
    STAT_Y_LABEL: BOT.Y + 120, STAT_Y_VAL: BOT.Y + 150,
    DIVIDER_X: 500, DIVIDER_Y1: BOT.Y + 190, DIVIDER_Y2: BOT.Y + BOT.H - 40,
    COL_RIGHT_X: 530, COL_LEFT_X: BOT.X + 40, COL_HEAD_Y: BOT.Y + 220,
    ACH_Y: BOT.Y + 265, ACH_LINE: 36, ABOUT_TEXT_Y: BOT.Y + 265,
});

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function roundRect(ctx, x, y, w, h, r) {
    const rr = Math.min(Math.abs(r), w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y); ctx.lineTo(x + w - rr, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + rr); ctx.lineTo(x + w, y + h - rr);
    ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h); ctx.lineTo(x + rr, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - rr); ctx.lineTo(x, y + rr);
    ctx.quadraticCurveTo(x, y, x + rr, y); ctx.closePath();
}

function clip(ctx, x, y, w, h, r) {
    roundRect(ctx, x, y, w, h, r);
    ctx.clip();
}

function ellipsis(ctx, text, maxW) {
    if (ctx.measureText(text).width <= maxW) return text;
    let s = text;
    while (s.length > 0 && ctx.measureText(s + '…').width > maxW) s = s.slice(0, -1);
    return s + '…';
}

// ═════════════════════════════════════════════
// Class: ProfileCardRenderer
// ═════════════════════════════════════════════
class ProfileCardRenderer {
    constructor(data) {
        this.user         = data.user;
        this.profile      = data.profile;
        this.config       = data.config || {};
        this.badges       = data.badges || []; // Sudah di-fetch dari DB oleh execute()
        this.achievements = (data.achievements || []).slice(0, 5);
        this.roleName     = data.roleName || 'Member';
    }

    get xpStats() {
        const { level, xp } = this.profile;
        const currentXP = xp || 0;
        const currentLevel = level || 1;
        const prevXP = currentLevel <= 1 ? 0 : Math.pow(currentLevel - 1, 2) * 100;
        const nextXP = Math.pow(currentLevel, 2) * 100;
        const pct = Math.max(0, Math.min((currentXP - prevXP) / (nextXP - prevXP), 1));
        return { level: currentLevel, currentXP, nextXP, pct };
    }

    async render() {
        const canvas = createCanvas(CARD.SIZE_W, CARD.SIZE_H);
        const ctx = canvas.getContext('2d');

        await this._drawBackground(ctx);
        this._drawTopPanel(ctx);
        this._drawBottomPanel(ctx);

        await this._drawAvatar(ctx);
        this._drawUsername(ctx);
        await this._drawBadges(ctx);

        this._drawXPBar(ctx);
        this._drawStats(ctx);
        this._drawStatsDivider(ctx);
        await this._drawAbout(ctx);
        await this._drawAchievements(ctx);

        return canvas.encode('png');
    }

    async _drawBackground(ctx) {
        ctx.save();
        clip(ctx, 0, 0, CARD.SIZE_W, CARD.SIZE_H, CARD.RADIUS);

        let bgPath = null;
        const assetsDir = path.join(__dirname, '../../../assets'); // Root project: Bot-Discord-John/assets/

        if (this.profile.backgroundUrl) {
            bgPath = path.join(assetsDir, this.profile.backgroundUrl);
            console.log(`[BG DEBUG] Pakai background USER  : ${bgPath}`);
        } else if (this.config.defaultBackground) {
            bgPath = path.join(assetsDir, this.config.defaultBackground);
            console.log(`[BG DEBUG] Pakai background DEFAULT: ${bgPath}`);
        } else {
            console.log(`[BG DEBUG] Tidak ada background, fallback ke gradient.`);
        }

        try {
            if (bgPath && fs.existsSync(bgPath)) {
                const bg = await loadImage(bgPath);
                const scale = Math.max(CARD.SIZE_W / bg.width, CARD.SIZE_H / bg.height);
                const sw = bg.width * scale;
                const sh = bg.height * scale;
                ctx.drawImage(bg, (CARD.SIZE_W - sw) / 2, (CARD.SIZE_H - sh) / 2, sw, sh);
                ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
                ctx.fillRect(0, 0, CARD.SIZE_W, CARD.SIZE_H);
                console.log(`[BG DEBUG] ✓ Background berhasil digambar.`);
            } else {
                if (bgPath) console.log(`[BG DEBUG] ✗ File tidak ditemukan: ${bgPath}`);
                throw new Error('Gambar lokal tidak ditemukan');
            }
        } catch (error) {
            console.log(`[BG DEBUG] Fallback gradient aktif. Reason: ${error.message}`);
            const g = ctx.createLinearGradient(0, 0, CARD.SIZE_W, CARD.SIZE_H);
            g.addColorStop(0, '#333333'); g.addColorStop(1, '#111111');
            ctx.fillStyle = g; ctx.fillRect(0, 0, CARD.SIZE_W, CARD.SIZE_H);
        }
        ctx.restore();
    }

    _drawTopPanel(ctx) {
        ctx.fillStyle = '#18181a';
        roundRect(ctx, TOP.X, TOP.Y, TOP.W, TOP.H, TOP.R); ctx.fill();
    }

    _drawBottomPanel(ctx) {
        ctx.fillStyle = 'rgba(15, 15, 18, 0.65)';
        roundRect(ctx, BOT.X, BOT.Y, BOT.W, BOT.H, BOT.R); ctx.fill();
    }

    async _drawAvatar(ctx) {
        const url = this.user.displayAvatarURL({ extension: 'png', size: 256 }) || this.user.defaultAvatarURL;
        const avatar = await loadImage(url).catch(() => null);
        if (!avatar) return;

        ctx.save();
        clip(ctx, LAYOUT.AVATAR_X, LAYOUT.AVATAR_Y, LAYOUT.AVATAR_SIZE, LAYOUT.AVATAR_SIZE, LAYOUT.AVATAR_RADIUS);
        ctx.drawImage(avatar, LAYOUT.AVATAR_X, LAYOUT.AVATAR_Y, LAYOUT.AVATAR_SIZE, LAYOUT.AVATAR_SIZE);
        ctx.restore();

        ctx.strokeStyle = 'rgba(255,255,255,0.05)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(LAYOUT.AVATAR_X + LAYOUT.AVATAR_RADIUS, LAYOUT.AVATAR_Y + LAYOUT.AVATAR_RADIUS, LAYOUT.AVATAR_RADIUS, 0, Math.PI * 2);
        ctx.stroke();
    }

    _drawUsername(ctx) {
        ctx.font = 'bold 56px "Impact", "Arial Black", "Arial", sans-serif';
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'left';
        ctx.fillText(ellipsis(ctx, this.user.username, 600), LAYOUT.USER_X, LAYOUT.USER_Y);

        ctx.font = '18px sans-serif';
        ctx.fillStyle = '#A0A0A0';
        ctx.fillText(this.roleName, LAYOUT.ROLE_X, LAYOUT.ROLE_Y);
    }

    async _drawBadges(ctx) {
        console.log(`[BADGE RENDER] Total badges di renderer: ${this.badges?.length ?? 0}`);
        if (!this.badges || !this.badges.length) {
            console.log(`[BADGE RENDER] Tidak ada badge, _drawBadges dilewati.`);
            return;
        }

        ctx.font = 'bold 56px "Impact", "Arial Black", "Arial", sans-serif';
        const nameWidth = ctx.measureText(ellipsis(ctx, this.user.username, 600)).width;
        let startX = LAYOUT.USER_X + nameWidth + 30;
        const badgeY = LAYOUT.USER_Y - 45;

        const totalWidth = (LAYOUT.BADGE_SZ * this.badges.length) + (LAYOUT.BADGE_GAP * (this.badges.length - 1)) + 20;

        ctx.fillStyle = 'rgba(15, 15, 18, 0.6)';
        roundRect(ctx, startX - 10, badgeY - 5, totalWidth, LAYOUT.BADGE_SZ + 10, 20);
        ctx.fill();

        const badgesDir = path.join(__dirname, '../../../assets/badges'); // Root project: Bot-Discord-John/assets/badges/
        console.log(`[BADGE RENDER] Direktori badges: ${badgesDir}`);

        for (const badge of this.badges) {
            console.log(`[BADGE RENDER] Proses badge id=${badge?.id} | imageUrl="${badge?.imageUrl}"`);
            if (!badge?.imageUrl) {
                console.log(`[BADGE RENDER]   ⚠ imageUrl kosong, dilewati.`);
                continue;
            }
            try {
                let img;
                if (badge.imageUrl.startsWith('http')) {
                    console.log(`[BADGE RENDER]   → Load dari URL: ${badge.imageUrl}`);
                    img = await loadImage(badge.imageUrl);
                } else {
                    const badgePath = path.join(badgesDir, badge.imageUrl);
                    const exists = fs.existsSync(badgePath);
                    console.log(`[BADGE RENDER]   → Load dari lokal: ${badgePath}`);
                    console.log(`[BADGE RENDER]   → File ada? ${exists}`);
                    if (!exists) {
                        console.log(`[BADGE RENDER]   ✗ File tidak ditemukan, dilewati.`);
                        continue;
                    }
                    img = await loadImage(badgePath);
                }
                ctx.drawImage(img, startX, badgeY, LAYOUT.BADGE_SZ, LAYOUT.BADGE_SZ);
                console.log(`[BADGE RENDER]   ✓ Badge berhasil digambar di x=${startX}`);
                startX += LAYOUT.BADGE_SZ + LAYOUT.BADGE_GAP;
            } catch (e) {
                console.error(`[BADGE RENDER]   ✗ ERROR saat load badge "${badge.imageUrl}":`, e.message);
            }
        }
    }

    _drawXPBar(ctx) {
        const { level, currentXP, nextXP, pct } = this.xpStats;
        const { BAR_X, BAR_Y, BAR_W, BAR_H, BAR_RADIUS, LVL_Y, XP_Y } = LAYOUT;

        ctx.fillStyle = '#A8A8A8';
        roundRect(ctx, BAR_X, BAR_Y, BAR_W, BAR_H, BAR_RADIUS); ctx.fill();

        if (pct > 0) {
            ctx.save();
            const fillW = Math.max(BAR_RADIUS * 2, BAR_W * pct);
            clip(ctx, BAR_X, BAR_Y, BAR_W, BAR_H, BAR_RADIUS);
            ctx.fillStyle = '#121212';
            ctx.fillRect(BAR_X, BAR_Y, fillW, BAR_H);

            if (fillW < BAR_W && fillW > BAR_RADIUS * 2) {
                ctx.beginPath(); ctx.arc(BAR_X + fillW, BAR_Y + BAR_H / 2, BAR_H / 2, 0, Math.PI * 2); ctx.fill();
            }
            ctx.restore();
        }

        ctx.font = 'bold 24px sans-serif';
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'left';
        ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 6;
        ctx.fillText(`Lv. ${level}`, BAR_X + 24, LVL_Y);

        ctx.textAlign = 'right';
        ctx.fillText(`${currentXP.toLocaleString()}/${nextXP.toLocaleString()}`, BAR_X + BAR_W - 24, XP_Y);
        ctx.shadowBlur = 0;
    }

    _drawStats(ctx) {
        const { currentXP } = this.xpStats;
        const rows = [
            { label: 'Server XP', value: currentXP },
            { label: 'Chat XP', value: this.profile.chatXP ?? Math.floor(currentXP * 0.2) },
            { label: 'Voice XP', value: this.profile.voiceXP ?? Math.floor(currentXP * 0.8) },
        ];

        const { STAT_Y_LABEL, STAT_Y_VAL, BAR_X, BAR_W } = LAYOUT;
        const areaWidth = BAR_W / 3;

        ctx.textAlign = 'center';
        rows.forEach(({ label, value }, i) => {
            const centerX = BAR_X + (areaWidth * i) + (areaWidth / 2);
            ctx.font = 'bold 18px sans-serif';
            ctx.fillStyle = '#FFFFFF';
            ctx.fillText(label, centerX, STAT_Y_LABEL);
            ctx.font = 'bold 20px sans-serif';
            ctx.fillStyle = '#FFF';
            ctx.fillText(value.toLocaleString(), centerX, STAT_Y_VAL);
        });
        ctx.textAlign = 'left';
    }

    _drawStatsDivider(ctx) {
        const { DIVIDER_X, DIVIDER_Y1, DIVIDER_Y2 } = LAYOUT;
        ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(DIVIDER_X, DIVIDER_Y1); ctx.lineTo(DIVIDER_X, DIVIDER_Y2); ctx.stroke();
    }

    async _drawAbout(ctx) {
        const aboutText = this.profile.about || 'Belum ada deskripsi.\nGunakan /aboutme untuk mengatur ini.';
        const { COL_LEFT_X, COL_HEAD_Y, ABOUT_TEXT_Y } = LAYOUT;

        // Custom emoji <:chatbubble:1488086302019555419>
        const EMOJI_SIZE = 36;
        const EMOJI_GAP  = 10;
        let headerTextX  = COL_LEFT_X;

        try {
            const emojiUrl  = 'https://cdn.discordapp.com/emojis/1488086302019555419.png?size=64';
            const localPath = await downloadToCache(emojiUrl, 'chatbubble_1488086302019555419.png');
            const emojiImg  = await loadImage(localPath);
            const emojiY    = COL_HEAD_Y - EMOJI_SIZE + 4;
            ctx.drawImage(emojiImg, COL_LEFT_X, emojiY, EMOJI_SIZE, EMOJI_SIZE);
            headerTextX = COL_LEFT_X + EMOJI_SIZE + EMOJI_GAP;
        } catch (err) {
            console.error('[ProfileCard] Gagal load emoji chatbubble:', err.message);
        }

        ctx.font = 'bold 36px sans-serif';
        ctx.textAlign = 'left'; ctx.fillStyle = '#FFFFFF';
        ctx.fillText('About Me', headerTextX, COL_HEAD_Y);

        ctx.font = '18px sans-serif'; ctx.fillStyle = '#CCCCCC';

        let words = aboutText.replace(/\n/g, " \n ").split(' ');
        let lines = []; let curLine = '';

        for (let word of words) {
            if (word === '\n') { lines.push(curLine); curLine = ''; continue; }
            let testLine = curLine + word + ' ';
            if (ctx.measureText(testLine).width > 420 && curLine !== '') {
                lines.push(curLine); curLine = word + ' ';
            } else { curLine = testLine; }
        }
        lines.push(curLine);

        lines.forEach((l, i) => {
            if (i > 4) return;
            ctx.fillText(l, COL_LEFT_X, ABOUT_TEXT_Y + (i * 28));
        });
    }

    async _drawAchievements(ctx) {
        const { COL_RIGHT_X, COL_HEAD_Y, ACH_Y, ACH_LINE } = LAYOUT;

        // Custom emoji <:trophy:1488086268486357033>
        const EMOJI_SIZE = 36;
        const EMOJI_GAP  = 10;
        let headerTextX  = COL_RIGHT_X;

        try {
            const emojiUrl  = 'https://cdn.discordapp.com/emojis/1488086268486357033.png?size=64';
            const localPath = await downloadToCache(emojiUrl, 'trophy_1488086268486357033.png');
            const emojiImg  = await loadImage(localPath);
            const emojiY    = COL_HEAD_Y - EMOJI_SIZE + 4;
            ctx.drawImage(emojiImg, COL_RIGHT_X, emojiY, EMOJI_SIZE, EMOJI_SIZE);
            headerTextX = COL_RIGHT_X + EMOJI_SIZE + EMOJI_GAP;
        } catch (err) {
            console.error('[ProfileCard] Gagal load emoji trophy:', err.message);
        }

        ctx.font = 'bold 36px sans-serif';
        ctx.textAlign = 'left'; ctx.fillStyle = '#FFFFFF';
        ctx.fillText('Achievements', headerTextX, COL_HEAD_Y);

        if (!this.achievements || !this.achievements.length) {
            ctx.font = 'italic 18px sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.4)';
            ctx.fillText('—', COL_RIGHT_X, ACH_Y); return;
        }

        this.achievements.forEach((ach, i) => {
            const y = ACH_Y + i * ACH_LINE;
            const emoji = ach.emoji ? ach.emoji + ' ' : '🏅 ';
            const lbl = ach.label || 'Unknown';
            ctx.font = 'bold 18px sans-serif'; ctx.fillStyle = '#FFFFFF'; ctx.textAlign = 'left';
            ctx.fillText(ellipsis(ctx, emoji + lbl, 420), COL_RIGHT_X, y);
        });
    }
}

// ═════════════════════════════════════════════
// Eksekusi Command Utama (Yang dipanggil oleh Bot)
// ═════════════════════════════════════════════
class ProfileCommand extends BaseCommand {
    constructor(client) {
        super(client, {
            name: 'profile',
            description: 'Lihat kartu profil bergaya Discord Original.',
            category: 'User',
            options: [{ name: 'user', description: 'Lihat profil user lain', type: 6, required: false }]
        });
    }

    async execute(interaction) {
        await interaction.deferReply();
        const targetUser = interaction.options.getUser('user') || interaction.user;
        const targetMember = interaction.options.getMember('user') || interaction.member;
        const guildId = interaction.guild.id;

        try {
            // 1. Ambil data dari Database
            const [profile] = await UserProfile.findOrCreate({ where: { guildId: guildId, userId: targetUser.id } });
            const [config] = await GuildConfig.findOrCreate({ where: { guildId: guildId } });

            // 2. Ambil data Badge
            const userBadges = profile.displayedBadges || [];
            console.log(`[BADGE DEBUG] displayedBadges dari DB:`, JSON.stringify(userBadges));

            let badgesData = [];
            if (userBadges.length > 0) {
                badgesData = await Badge.findAll({ where: { id: userBadges } });
                console.log(`[BADGE DEBUG] Badge ditemukan di DB: ${badgesData.length} item`);
                badgesData.forEach((b, i) => {
                    console.log(`  [${i}] id=${b.id} | name=${b.name} | imageUrl="${b.imageUrl}"`);
                });
            } else {
                console.log(`[BADGE DEBUG] displayedBadges kosong, tidak ada badge yang akan ditampilkan.`);
            }

            // 3. Ambil data Achievement
            const displayedAchCodes = profile.displayedAchievements || [];
            let achData = [];
            if (displayedAchCodes.length > 0) {
                achData = await Achievement.findAll({ where: { guildId: guildId, code: displayedAchCodes } });
            }

            // 4. Ambil Role Tertinggi User 
            let highestRoleName = 'Member';
            if (targetMember && targetMember.roles) {
                // Filter role '@everyone' agar tidak ditampilkan sebagai role tertinggi
                const roles = targetMember.roles.cache.filter(role => role.name !== '@everyone').sort((a, b) => b.position - a.position);
                const highestRole = roles.first();
                if (highestRole) {
                    highestRoleName = highestRole.name;
                }
            }

            // 5. MINTA CLASS RENDERER UNTUK MENGGAMBAR!
            const renderer = new ProfileCardRenderer({
                user: targetUser,
                profile: profile,
                config: config,
                badges: badgesData,
                achievements: achData,
                roleName: highestRoleName
            });

            // 5. Ekspor menjadi PNG dan kirim
            const buffer = await renderer.render();
            const attachment = new AttachmentBuilder(buffer, { name: 'profile-discord.png' });
            await interaction.editReply({ files: [attachment] });

        } catch (error) {
            console.error(`[ERROR] Gagal merender /profile:`, error);
            await interaction.editReply({ content: '❌ Terjadi kesalahan saat memproses kartu profil.' });
        }
    }
}

module.exports = ProfileCommand;