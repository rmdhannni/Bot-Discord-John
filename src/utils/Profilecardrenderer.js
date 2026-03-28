'use strict';

const { createCanvas, loadImage } = require('@napi-rs/canvas');

// ─────────────────────────────────────────────
//  Konstanta Layout — Kartu PERSEGI 580x580
// ─────────────────────────────────────────────
const CARD = Object.freeze({
    SIZE:   580,
    RADIUS: 28,
});

const AVATAR = Object.freeze({
    X:      28,
    Y:      180,
    SIZE:   148,
    RADIUS: 14,
});

const LAYOUT = Object.freeze({
    PAD:          28,
    LVL_Y:        54,
    RANK_Y:       54,

    // Badge mini di sebelah kanan avatar
    BADGE_MINI_X:  28 + 148 + 14,
    BADGE_MINI_Y:  180,
    BADGE_MINI_SZ: 44,
    BADGE_MINI_R:  10,

    // Username
    USER_X:        28 + 148 + 14,
    USER_Y:        180 + 44 + 20 + 28,

    // XP Bar + Rep button
    BAR_Y:        362,
    BAR_H:        46,
    BAR_RADIUS:   23,
    BAR_W:        320,
    XP_LABEL_X:   28,
    REP_X:        364,
    REP_Y:        362,
    REP_W:        188,
    REP_H:        46,
    REP_RADIUS:   23,

    // ── Stats kiri & Achievement kanan (sejajar) ──
    STAT_Y:        436,        // Y baris pertama stats
    STAT_LINE:     32,         // jarak antar baris
    STAT_LABEL_X:  28,         // X label "Global XP" dll
    STAT_VAL_X:    200,        // X value angka

    // Divider vertikal pemisah kolom
    DIVIDER_X:     308,
    DIVIDER_Y1:    424,
    DIVIDER_Y2:    514,

    // Achievement kolom kanan
    ACH_HEADER_Y:  424,        // Y judul "Achievements"
    ACH_Y:         460,        // Y baris achievement pertama
    ACH_LINE:      36,         // jarak antar baris (lebih lega)
    ACH_X:         322,        // X mulai teks ach
    ACH_MAX:       3,
    ACH_COL_W:     230,        // lebar maksimum teks ach
    ACH_PILL_H:    28,         // pill lebih tinggi agar teks 17px muat
    ACH_PILL_R:    8,

    // About section
    ABOUT_TITLE_Y: 530,
    ABOUT_TEXT_Y:  556,
});

// ─────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────
function roundRect(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
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

function clip(ctx, x, y, w, h, r) { roundRect(ctx, x, y, w, h, r); ctx.clip(); }

function ellipsis(ctx, text, maxW) {
    if (ctx.measureText(text).width <= maxW) return text;
    let s = text;
    while (s.length > 0 && ctx.measureText(s + '…').width > maxW) s = s.slice(0, -1);
    return s + '…';
}

// ═════════════════════════════════════════════
//  Class: ProfileCardRenderer  (layout persegi)
// ═════════════════════════════════════════════
class ProfileCardRenderer {
    /**
     * @param {object}   data
     * @param {import('discord.js').User} data.user
     * @param {object}   data.profile
     * @param {object[]} data.badges
     * @param {object[]} data.achievements  – max 3, sudah difilter sebelum masuk
     * @param {number}   data.globalRank
     * @param {number}   data.chatRank
     */
    constructor(data) {
        this.user         = data.user;
        this.profile      = data.profile;
        this.badges       = data.badges                     || [];
        this.achievements = (data.achievements || []).slice(0, 3); // hard-cap 3
        this.globalRank   = data.globalRank                 || 0;
        this.chatRank     = data.chatRank                   || 0;
    }

    get xpStats() {
        const { level, xp } = this.profile;
        const prevXP = level === 1 ? 0 : Math.pow(level - 1, 2) * 100;
        const nextXP = Math.pow(level, 2) * 100;
        const pct    = Math.max(0, Math.min((xp - prevXP) / (nextXP - prevXP), 1));
        return { level, currentXP: xp, nextXP, pct };
    }

    // ─── Entry point ─────────────────────────────────────────────────────────────
    async render() {
        const canvas = createCanvas(CARD.SIZE, CARD.SIZE);
        const ctx    = canvas.getContext('2d');

        ctx.save();
        roundRect(ctx, 0, 0, CARD.SIZE, CARD.SIZE, CARD.RADIUS);
        ctx.clip();

        await this._drawBackground(ctx);
        this._drawTopOverlay(ctx);
        this._drawBottomPanel(ctx);
        this._drawLvlRankHeader(ctx);
        await this._drawAvatar(ctx);
        await this._drawBadgeMini(ctx);
        this._drawUsername(ctx);
        this._drawXPBarAndRep(ctx);
        this._drawStatsDivider(ctx);          // garis pemisah kolom
        this._drawStats(ctx);                 // kolom kiri
        this._drawAchievements(ctx);          // kolom kanan (sejajar stats)
        this._drawAbout(ctx);

        ctx.restore();
        return canvas.encode('png');
    }

    // ─── Layer 1: Background full card ───────────────────────────────────────────
    async _drawBackground(ctx) {
        if (this.profile.backgroundUrl) {
            try {
                const bg    = await loadImage(this.profile.backgroundUrl);
                const scale = Math.max(CARD.SIZE / bg.width, CARD.SIZE / bg.height);
                const sw    = bg.width  * scale;
                const sh    = bg.height * scale;
                ctx.drawImage(bg, (CARD.SIZE - sw) / 2, (CARD.SIZE - sh) / 2, sw, sh);
                return;
            } catch { /* fallback */ }
        }
        this._drawDefaultBg(ctx);
    }

    _drawDefaultBg(ctx) {
        const g = ctx.createLinearGradient(0, 0, CARD.SIZE, CARD.SIZE);
        g.addColorStop(0,   '#c8c8d8');
        g.addColorStop(0.5, '#a8a8bc');
        g.addColorStop(1,   '#888898');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, CARD.SIZE, CARD.SIZE);
        this._drawDecorDots(ctx);
    }

    _drawDecorDots(ctx) {
        ctx.fillStyle = 'rgba(255,255,255,0.22)';
        const cols = 4, rows = 6, sz = 12, gapX = 36, gapY = 32;
        const sx   = CARD.SIZE - 20 - (cols - 1) * gapX;
        const sy   = CARD.SIZE / 2 + 20;
        for (let r = 0; r < rows; r++)
            for (let c = 0; c < cols; c++) {
                ctx.beginPath();
                ctx.arc(sx + c * gapX, sy + r * gapY, sz / 2, 0, Math.PI * 2);
                ctx.fill();
            }
    }

    // ─── Layer 2 & 3: Overlay ────────────────────────────────────────────────────
    _drawTopOverlay(ctx) {
        ctx.fillStyle = 'rgba(0,0,0,0.12)';
        ctx.fillRect(0, 0, CARD.SIZE, 140);
    }

    _drawBottomPanel(ctx) {
        const panelY = AVATAR.Y + AVATAR.SIZE + 16;
        ctx.fillStyle = 'rgba(0,0,0,0.30)';
        ctx.fillRect(0, panelY, CARD.SIZE, CARD.SIZE - panelY);
    }

    // ─── Layer 4: Header lvl + rank ──────────────────────────────────────────────
    _drawLvlRankHeader(ctx) {
        const { level } = this.xpStats;
        const rank = this.globalRank ? `#${this.globalRank.toLocaleString()}` : '#—';

        ctx.font        = 'bold 32px sans-serif';
        ctx.fillStyle   = '#FFFFFF';
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur  = 8;

        ctx.textAlign = 'left';
        ctx.fillText(`lvl ${level}`, LAYOUT.PAD, LAYOUT.LVL_Y);
        ctx.textAlign = 'right';
        ctx.fillText(rank, CARD.SIZE - LAYOUT.PAD, LAYOUT.RANK_Y);

        ctx.shadowBlur = 0;
        ctx.textAlign  = 'left';
    }

    // ─── Layer 5: Avatar ─────────────────────────────────────────────────────────
    async _drawAvatar(ctx) {
        const url    = this.user.displayAvatarURL({ extension: 'png', size: 256 });
        const avatar = await loadImage(url).catch(() => null);
        if (!avatar) return;

        ctx.save();
        clip(ctx, AVATAR.X, AVATAR.Y, AVATAR.SIZE, AVATAR.SIZE, AVATAR.RADIUS);
        ctx.drawImage(avatar, AVATAR.X, AVATAR.Y, AVATAR.SIZE, AVATAR.SIZE);
        ctx.restore();
    }

    // ─── Layer 6: Badge mini ─────────────────────────────────────────────────────
    async _drawBadgeMini(ctx) {
        const { BADGE_MINI_X, BADGE_MINI_Y, BADGE_MINI_SZ, BADGE_MINI_R } = LAYOUT;
        const featured = this.badges[0];
        if (!featured?.imageUrl) return;

        try {
            const img = await loadImage(featured.imageUrl);
            ctx.fillStyle = 'rgba(100, 130, 220, 0.85)';
            roundRect(ctx, BADGE_MINI_X, BADGE_MINI_Y, BADGE_MINI_SZ, BADGE_MINI_SZ, BADGE_MINI_R);
            ctx.fill();

            const pad = 6;
            ctx.save();
            clip(ctx, BADGE_MINI_X + pad, BADGE_MINI_Y + pad, BADGE_MINI_SZ - pad * 2, BADGE_MINI_SZ - pad * 2, 4);
            ctx.drawImage(img, BADGE_MINI_X + pad, BADGE_MINI_Y + pad, BADGE_MINI_SZ - pad * 2, BADGE_MINI_SZ - pad * 2);
            ctx.restore();
        } catch { /* skip */ }
    }

    // ─── Layer 7: Username ────────────────────────────────────────────────────────
    _drawUsername(ctx) {
        const maxW = CARD.SIZE - LAYOUT.USER_X - LAYOUT.PAD;
        ctx.font        = 'bold 36px sans-serif';
        ctx.fillStyle   = '#FFFFFF';
        ctx.shadowColor = 'rgba(0,0,0,0.55)';
        ctx.shadowBlur  = 6;
        ctx.textAlign   = 'left';
        ctx.fillText(ellipsis(ctx, this.user.username, maxW), LAYOUT.USER_X, LAYOUT.USER_Y);
        ctx.shadowBlur  = 0;
    }

    // ─── Layer 8: XP Bar + Rep button ────────────────────────────────────────────
    _drawXPBarAndRep(ctx) {
        const { pct }  = this.xpStats;
        const rep      = this.profile.rep ?? 0;
        const { BAR_Y, BAR_H, BAR_RADIUS, BAR_W, XP_LABEL_X,
                REP_X, REP_Y, REP_W, REP_H, REP_RADIUS } = LAYOUT;

        // Track
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        roundRect(ctx, XP_LABEL_X, BAR_Y, BAR_W, BAR_H, BAR_RADIUS);
        ctx.fill();

        // Fill
        if (pct > 0) {
            const fillW = Math.max(BAR_RADIUS * 2, BAR_W * pct);
            ctx.fillStyle = 'rgba(255,255,255,0.70)';
            roundRect(ctx, XP_LABEL_X, BAR_Y, fillW, BAR_H, BAR_RADIUS);
            ctx.fill();
        }

        // Label "xp"
        ctx.font      = 'bold 17px sans-serif';
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'left';
        ctx.fillText('xp', XP_LABEL_X + 18, BAR_Y + BAR_H - 14);

        // Rep pill
        ctx.fillStyle = 'rgba(100, 120, 200, 0.75)';
        roundRect(ctx, REP_X, REP_Y, REP_W, REP_H, REP_RADIUS);
        ctx.fill();
        ctx.font      = 'bold 20px sans-serif';
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.fillText(`+${rep}rep`, REP_X + REP_W / 2, REP_Y + REP_H - 13);
        ctx.textAlign = 'left';
    }

    // ─── Divider vertikal antara stats & achievement ──────────────────────────────
    _drawStatsDivider(ctx) {
        const { DIVIDER_X, DIVIDER_Y1, DIVIDER_Y2 } = LAYOUT;
        ctx.strokeStyle = 'rgba(255,255,255,0.20)';
        ctx.lineWidth   = 1;
        ctx.beginPath();
        ctx.moveTo(DIVIDER_X, DIVIDER_Y1);
        ctx.lineTo(DIVIDER_X, DIVIDER_Y2);
        ctx.stroke();
    }

    // ─── Layer 9: Stats — kolom KIRI ─────────────────────────────────────────────
    _drawStats(ctx) {
        const { currentXP } = this.xpStats;
        const rows = [
            { label: 'Global XP',     value: currentXP.toLocaleString() },
            { label: 'Chat Activity', value: (this.profile.chatXP ?? currentXP).toLocaleString() },
        ];
        const { STAT_Y, STAT_LINE, STAT_LABEL_X, STAT_VAL_X } = LAYOUT;

        rows.forEach(({ label, value }, i) => {
            const y = STAT_Y + i * STAT_LINE;
            ctx.textAlign = 'left';
            ctx.font      = 'bold 17px sans-serif';
            ctx.fillStyle = '#FFFFFF';
            ctx.fillText(label, STAT_LABEL_X, y);
            ctx.fillText(value, STAT_VAL_X, y);
        });
        ctx.textAlign = 'left';
    }

    // ─── Layer 10: Achievements — kolom KANAN (sejajar stats) ────────────────────
    _drawAchievements(ctx) {
        const { ACH_X, ACH_HEADER_Y, ACH_Y, ACH_LINE, ACH_COL_W,
                ACH_PILL_H, ACH_PILL_R } = LAYOUT;

        // Header "Achievements"
        ctx.font      = 'bold 14px sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.50)';
        ctx.textAlign = 'left';
        ctx.fillText('ACHIEVEMENTS', ACH_X, ACH_HEADER_Y);

        if (!this.achievements.length) {
            ctx.font      = 'italic 16px sans-serif';
            ctx.fillStyle = 'rgba(255,255,255,0.30)';
            ctx.fillText('—', ACH_X, ACH_Y);
            return;
        }

        this.achievements.forEach((ach, i) => {
            const y        = ACH_Y + i * ACH_LINE;
            const emoji    = ach.emoji || '🏅';
            const rawLabel = `${emoji} ${ach.label}`;

            // Ukur lebar teks untuk pill yang pas
            ctx.font = 'bold 17px sans-serif';
            const textW = Math.min(ctx.measureText(rawLabel).width, ACH_COL_W - 24);
            const pillW = textW + 24;
            const pillX = ACH_X;
            const pillY = y - ACH_PILL_H + 6;

            // Pill background
            ctx.fillStyle = 'rgba(255,255,255,0.12)';
            roundRect(ctx, pillX, pillY, pillW, ACH_PILL_H, ACH_PILL_R);
            ctx.fill();

            // Teks achievement — 17px bold emas
            ctx.font      = 'bold 17px sans-serif';
            ctx.fillStyle = '#FFD700';
            ctx.textAlign = 'left';
            ctx.fillText(
                ellipsis(ctx, rawLabel, ACH_COL_W - 24),
                ACH_X + 12,
                y
            );
        });

        ctx.textAlign = 'left';
    }

    // ─── Layer 11: About ──────────────────────────────────────────────────────────
    _drawAbout(ctx) {
        const about = this.profile.about || null;
        const { ABOUT_TITLE_Y, ABOUT_TEXT_Y, PAD } = LAYOUT;
        const maxW  = CARD.SIZE - PAD * 2;

        // Ikon chat bubble mini
        ctx.fillStyle = 'rgba(255,255,255,0.50)';
        ctx.fillRect(PAD, ABOUT_TITLE_Y - 18, 18, 14);
        ctx.fillRect(PAD, ABOUT_TITLE_Y - 4,   8,  5);

        ctx.font      = 'bold 20px sans-serif';
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'left';
        ctx.fillText('About', PAD + 26, ABOUT_TITLE_Y);

        ctx.font      = '17px sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.75)';
        ctx.fillText(
            ellipsis(ctx, about ?? 'No description set.', maxW),
            PAD,
            ABOUT_TEXT_Y
        );
    }
}

module.exports = ProfileCardRenderer;