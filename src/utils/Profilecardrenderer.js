'use strict';

const { createCanvas, loadImage } = require('@napi-rs/canvas');
const path  = require('path');
const fs    = require('fs');
const https = require('https');
const http  = require('http');

// ─────────────────────────────────────────────
// Cache emoji custom Discord ke file lokal
// ─────────────────────────────────────────────
const EMOJI_CACHE_DIR = path.join(__dirname, '../assets/emoji_cache');
if (!fs.existsSync(EMOJI_CACHE_DIR)) fs.mkdirSync(EMOJI_CACHE_DIR, { recursive: true });

/**
 * Download URL ke file lokal (jika belum ada), lalu kembalikan path-nya.
 * @param {string} url - URL gambar
 * @param {string} filename - nama file cache (e.g. '1234567890.png')
 * @returns {Promise<string>} - path file lokal
 */
function downloadToCache(url, filename) {
    return new Promise((resolve, reject) => {
        const dest = path.join(EMOJI_CACHE_DIR, filename);
        if (fs.existsSync(dest)) return resolve(dest);

        const proto = url.startsWith('https') ? https : http;
        const file  = fs.createWriteStream(dest);

        proto.get(url, (res) => {
            // Ikuti redirect
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
const CARD = Object.freeze({
    SIZE_W: 1000,
    SIZE_H: 700,
    RADIUS: 30,
});

// DEFAULT BACKGROUND URL sesuai request user
const DEFAULT_BG_URL = 'https://media.discordapp.net/attachments/1360272805932957898/1487727750654726284/BG.png?ex=69ca31f0&is=69c8e070&hm=8f0da6ae74f10a74dbfc23dc90160f9afed572e88bf97426e51a58b4e4b61b6b&=&format=webp&quality=lossless&width=1775&height=1332';

// TOP PANEL (Avatar, badging, info)
const TOP = Object.freeze({
    X: 30,
    Y: 30,
    W: 940,
    H: 220,
    R: 30
});

// BOTTOM PANEL (Stats, XP, columns)
const BOT = Object.freeze({
    X: 30,
    Y: 280,
    W: 940,
    H: 390,
    R: 30
});

const LAYOUT = Object.freeze({
    AVATAR_X: TOP.X + 40,
    AVATAR_Y: TOP.Y + 40,
    AVATAR_SIZE: 140,
    AVATAR_RADIUS: 70,

    USER_X: TOP.X + 40 + 140 + 30,
    USER_Y: TOP.Y + 115,

    ROLE_X: TOP.X + 40 + 140 + 30,
    ROLE_Y: TOP.Y + 155,

    BADGE_Y: TOP.Y + 70,
    BADGE_SZ: 40,
    BADGE_GAP: 15,

    // XP Bar di Bottom Panel
    BAR_X: BOT.X + 40,
    BAR_Y: BOT.Y + 40,
    BAR_W: BOT.W - 80,
    BAR_H: 50,
    BAR_RADIUS: 25,

    // Posisi Text XP
    LVL_Y: BOT.Y + 40 + 34,
    XP_Y: BOT.Y + 40 + 34,

    // 3 Panel Stats di bawah XP Bar
    STAT_Y_LABEL: BOT.Y + 40 + 50 + 30,
    STAT_Y_VAL: BOT.Y + 40 + 50 + 60,

    // Divider Line Kolom
    DIVIDER_X: 500,
    DIVIDER_Y1: BOT.Y + 190,
    DIVIDER_Y2: BOT.Y + BOT.H - 40,

    COL_RIGHT_X: 530,
    COL_LEFT_X: BOT.X + 40,
    COL_HEAD_Y: BOT.Y + 220,
    ACH_Y: BOT.Y + 265,
    ACH_LINE: 36,
    ABOUT_TEXT_Y: BOT.Y + 265,
});

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function roundRect(ctx, x, y, w, h, r) {
    const rr = Math.min(Math.abs(r), w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.lineTo(x + w - rr, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
    ctx.lineTo(x + w, y + h - rr);
    ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
    ctx.lineTo(x + rr, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
    ctx.lineTo(x, y + rr);
    ctx.quadraticCurveTo(x, y, x + rr, y);
    ctx.closePath();
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
        this.user = data.user;
        this.profile = data.profile;
        this.badges = data.badges || [];
        // Max 5 achievements untuk baris
        this.achievements = (data.achievements || []).slice(0, 5);
        this.globalRank = data.globalRank || 0;
        this.chatRank = data.chatRank || 0;
        this.roleName = data.roleName || 'Member';
    }

    get xpStats() {
        const { level, xp } = this.profile;
        const prevXP = level <= 1 ? 0 : Math.pow(level - 1, 2) * 100;
        const nextXP = Math.pow(level, 2) * 100;
        const pct = Math.max(0, Math.min((xp - prevXP) / (nextXP - prevXP), 1));
        return { level, currentXP: xp, nextXP, pct };
    }

    async render() {
        const canvas = createCanvas(CARD.SIZE_W, CARD.SIZE_H);
        const ctx = canvas.getContext('2d');

        // Draw Layer
        await this._drawBackground(ctx);
        this._drawTopPanel(ctx);
        this._drawBottomPanel(ctx);

        // Top Content
        await this._drawAvatar(ctx);
        this._drawUsername(ctx);
        await this._drawBadges(ctx);

        // Bottom Content
        this._drawXPBar(ctx);
        this._drawStats(ctx);
        this._drawStatsDivider(ctx);
        await this._drawAbout(ctx);
        await this._drawAchievements(ctx);

        return canvas.encode('png');
    }

    // ─── Layer 1: Background ───────────────────────────────────────────────────
    async _drawBackground(ctx) {
        ctx.save();
        clip(ctx, 0, 0, CARD.SIZE_W, CARD.SIZE_H, CARD.RADIUS);

        let bgUrl = this.profile.backgroundUrl;
        if (!bgUrl) bgUrl = DEFAULT_BG_URL;

        try {
            const bg = await loadImage(bgUrl);
            const scale = Math.max(CARD.SIZE_W / bg.width, CARD.SIZE_H / bg.height);
            const sw = bg.width * scale;
            const sh = bg.height * scale;
            ctx.drawImage(bg, (CARD.SIZE_W - sw) / 2, (CARD.SIZE_H - sh) / 2, sw, sh);

            // Subtle dark overlay untuk meningkatkan keterbacaan
            ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
            ctx.fillRect(0, 0, CARD.SIZE_W, CARD.SIZE_H);
        } catch {
            // fallback color jika gagal load
            const g = ctx.createLinearGradient(0, 0, CARD.SIZE_W, CARD.SIZE_H);
            g.addColorStop(0, '#333333');
            g.addColorStop(1, '#111111');
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, CARD.SIZE_W, CARD.SIZE_H);
        }
        ctx.restore();
    }

    // ─── Layer 2: Panels ───────────────────────────────────────────────────────
    _drawTopPanel(ctx) {
        ctx.fillStyle = '#18181a'; // Warna Gelap Hitam/Abu-abu gelap
        roundRect(ctx, TOP.X, TOP.Y, TOP.W, TOP.H, TOP.R);
        ctx.fill();
    }

    _drawBottomPanel(ctx) {
        ctx.fillStyle = 'rgba(15, 15, 18, 0.65)'; // Transparan
        roundRect(ctx, BOT.X, BOT.Y, BOT.W, BOT.H, BOT.R);
        ctx.fill();
    }

    // ─── Elements: Top Panel ───────────────────────────────────────────────────
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
        if (!this.badges || !this.badges.length) return;

        // Direktori assets/badges untuk file lokal
        const badgesDir = path.join(__dirname, '../assets/badges');

        ctx.font = 'bold 56px "Impact", "Arial Black", "Arial", sans-serif';
        const nameWidth = ctx.measureText(ellipsis(ctx, this.user.username, 600)).width;
        let startX = LAYOUT.USER_X + nameWidth + 25;

        // Hitung total lebar untuk background pill
        const validBadges = this.badges.filter(b => b?.imageUrl);
        if (!validBadges.length) return;

        const totalW = (validBadges.length * LAYOUT.BADGE_SZ) + ((validBadges.length - 1) * LAYOUT.BADGE_GAP) + 20;
        ctx.fillStyle = 'rgba(15, 15, 18, 0.6)';
        roundRect(ctx, startX - 10, LAYOUT.BADGE_Y - 5, totalW, LAYOUT.BADGE_SZ + 10, 20);
        ctx.fill();

        for (const badge of validBadges) {
            try {
                let img;
                if (badge.imageUrl.startsWith('http')) {
                    // URL Discord lama — fallback
                    img = await loadImage(badge.imageUrl);
                } else {
                    // Nama file lokal (format baru dari /badge create)
                    const localPath = path.join(badgesDir, badge.imageUrl);
                    if (!fs.existsSync(localPath)) { startX += LAYOUT.BADGE_SZ + LAYOUT.BADGE_GAP; continue; }
                    img = await loadImage(localPath);
                }

                const pad = 4;
                ctx.save();
                clip(ctx, startX + pad, LAYOUT.BADGE_Y + pad, LAYOUT.BADGE_SZ - pad * 2, LAYOUT.BADGE_SZ - pad * 2, 6);
                ctx.drawImage(img, startX + pad, LAYOUT.BADGE_Y + pad, LAYOUT.BADGE_SZ - pad * 2, LAYOUT.BADGE_SZ - pad * 2);
                ctx.restore();

                startX += LAYOUT.BADGE_SZ + LAYOUT.BADGE_GAP;
            } catch (e) {
                // Abaikan badge yang gagal, jangan matikan bot
                startX += LAYOUT.BADGE_SZ + LAYOUT.BADGE_GAP;
            }
        }
    }

    // ─── Elements: Bottom Panel ────────────────────────────────────────────────
    _drawXPBar(ctx) {
        const { level, currentXP, nextXP, pct } = this.xpStats;
        const { BAR_X, BAR_Y, BAR_W, BAR_H, BAR_RADIUS, LVL_Y, XP_Y } = LAYOUT;

        ctx.fillStyle = '#A8A8A8'; // Light silver sesuai desain
        roundRect(ctx, BAR_X, BAR_Y, BAR_W, BAR_H, BAR_RADIUS);
        ctx.fill();

        if (pct > 0) {
            ctx.save();
            const fillW = Math.max(BAR_RADIUS * 2, BAR_W * pct);
            clip(ctx, BAR_X, BAR_Y, BAR_W, BAR_H, BAR_RADIUS);
            ctx.fillStyle = '#121212'; // Gelap, melambangkan isinya ("dark fill")
            ctx.fillRect(BAR_X, BAR_Y, fillW, BAR_H);

            if (fillW < BAR_W && fillW > BAR_RADIUS * 2) {
                ctx.beginPath();
                ctx.arc(BAR_X + fillW, BAR_Y + BAR_H / 2, BAR_H / 2, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }

        ctx.font = 'bold 24px sans-serif';
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'left';
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 6;
        ctx.fillText(`Lv. ${level}`, BAR_X + 24, LVL_Y);

        ctx.textAlign = 'right';
        ctx.fillText(`${currentXP.toLocaleString()}/${nextXP.toLocaleString()}`, BAR_X + BAR_W - 24, XP_Y);
        ctx.shadowBlur = 0;
    }

    _drawStats(ctx) {
        const { currentXP } = this.xpStats;
        const rows = [
            { label: 'server xp', value: currentXP },
            { label: 'chat xp', value: this.profile.chatXP ?? Math.floor(currentXP * 0.2) },
            { label: 'voice xp', value: this.profile.voiceXP ?? Math.floor(currentXP * 0.8) },
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
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(DIVIDER_X, DIVIDER_Y1);
        ctx.lineTo(DIVIDER_X, DIVIDER_Y2);
        ctx.stroke();
    }

    async _drawAbout(ctx) {
        // Field di UserProfile: `about` (bukan `aboutMe`)
        const aboutText = this.profile.about || this.profile.aboutMe || 'Belum ada deskripsi.\nGunakan /aboutme untuk mengatur ini.';
        const { COL_LEFT_X, COL_HEAD_Y, ABOUT_TEXT_Y } = LAYOUT;

        // Custom emoji: <:chatbubble:1488086302019555419>
        const EMOJI_SIZE = 36;
        const EMOJI_GAP = 10;
        let headerTextX = COL_LEFT_X;

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
        ctx.textAlign = 'left';
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText('About Me', headerTextX, COL_HEAD_Y);

        ctx.font = '18px sans-serif';
        ctx.fillStyle = '#CCCCCC';

        let words = aboutText.replace(/\n/g, " \n ").split(' ');
        let lines = [];
        let curLine = '';

        for (let word of words) {
            if (word === '\n') {
                lines.push(curLine);
                curLine = '';
                continue;
            }
            let testLine = curLine + word + ' ';
            if (ctx.measureText(testLine).width > 420 && curLine !== '') {
                lines.push(curLine);
                curLine = word + ' ';
            } else {
                curLine = testLine;
            }
        }
        lines.push(curLine);

        lines.forEach((l, i) => {
            if (i > 4) return;
            ctx.fillText(l, COL_LEFT_X, ABOUT_TEXT_Y + (i * 28));
        });
    }

    async _drawAchievements(ctx) {
        const { COL_RIGHT_X, COL_HEAD_Y, ACH_Y, ACH_LINE } = LAYOUT;

        // Custom emoji: <:trophy:1488086268486357033>
        const EMOJI_SIZE = 36;
        const EMOJI_GAP = 10;
        let headerTextX = COL_RIGHT_X;

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
        ctx.textAlign = 'left';
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText('Achievements', headerTextX, COL_HEAD_Y);

        if (!this.achievements || !this.achievements.length) {
            ctx.font = 'italic 18px sans-serif';
            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            ctx.fillText('—', COL_RIGHT_X, ACH_Y);
            return;
        }

        this.achievements.forEach((ach, i) => {
            const y = ACH_Y + i * ACH_LINE;
            const emoji = ach.emoji ? ach.emoji + ' ' : '🏅 ';
            const lbl = ach.label || 'Unknown';

            ctx.font = 'bold 18px sans-serif';
            ctx.fillStyle = '#FFFFFF';
            ctx.textAlign = 'left';
            ctx.fillText(ellipsis(ctx, emoji + lbl, 420), COL_RIGHT_X, y);
        });
    }
}

module.exports = ProfileCardRenderer;