'use strict';

const BaseCommand  = require('../../structures/BaseCommand');
const UserProfile  = require('../../models/UserProfile');
const { EmbedBuilder } = require('discord.js');

// ─────────────────────────────────────────────
//  Konstanta aturan rep
// ─────────────────────────────────────────────
const REP_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 jam dalam milidetik

// ═════════════════════════════════════════════
//  Class: RepCooldownGuard
//  Tanggung jawab: menyimpan & mengecek cooldown
//  di memory (Map). Tidak perlu kolom DB tambahan.
// ═════════════════════════════════════════════
class RepCooldownGuard {
    constructor() {
        // key: `${guildId}:${giverId}` → timestamp terakhir kasih rep
        this._cache = new Map();
    }

    /**
     * Cek apakah user masih dalam cooldown.
     * @returns {{ onCooldown: boolean, remainingMs: number }}
     */
    check(guildId, giverId) {
        const key       = `${guildId}:${giverId}`;
        const lastGiven = this._cache.get(key) ?? 0;
        const remaining = REP_COOLDOWN_MS - (Date.now() - lastGiven);

        if (remaining > 0) return { onCooldown: true, remainingMs: remaining };
        return { onCooldown: false, remainingMs: 0 };
    }

    /** Catat bahwa user appena kasih rep sekarang. */
    record(guildId, giverId) {
        this._cache.set(`${guildId}:${giverId}`, Date.now());
    }
}

// Singleton — satu instance untuk seluruh proses bot
const cooldownGuard = new RepCooldownGuard();

// ═════════════════════════════════════════════
//  Class: RepCommand
//  Tanggung jawab: menangani slash command /rep
// ═════════════════════════════════════════════
class RepCommand extends BaseCommand {
    constructor(client) {
        super(client, {
            name: 'rep',
            description: 'Berikan +1 reputasi kepada user lain. Cooldown 24 jam.',
            category: 'User',
            options: [
                {
                    name: 'user',
                    description: 'User yang ingin kamu beri reputasi',
                    type: 6, // USER
                    required: true,
                },
            ],
        });
    }

    async execute(interaction) {
        const giver  = interaction.user;
        const target = interaction.options.getUser('user');
        const guildId = interaction.guild.id;

        // ── Validasi: tidak boleh rep diri sendiri ──
        if (giver.id === target.id) {
            return interaction.reply({
                embeds: [this._errorEmbed('❌ Kamu tidak bisa memberikan rep kepada dirimu sendiri!')],
                ephemeral: true,
            });
        }

        // ── Validasi: tidak boleh rep bot ──
        if (target.bot) {
            return interaction.reply({
                embeds: [this._errorEmbed('❌ Kamu tidak bisa memberikan rep kepada bot!')],
                ephemeral: true,
            });
        }

        // ── Cek cooldown ──
        const { onCooldown, remainingMs } = cooldownGuard.check(guildId, giver.id);
        if (onCooldown) {
            return interaction.reply({
                embeds: [this._cooldownEmbed(remainingMs)],
                ephemeral: true,
            });
        }

        try {
            await interaction.deferReply();

            // ── Tambahkan +1 rep ke profil target ──
            const [targetProfile] = await UserProfile.findOrCreate({
                where: { guildId, userId: target.id },
            });

            await targetProfile.increment('rep', { by: 1 });
            await targetProfile.reload();

            // ── Catat cooldown untuk giver ──
            cooldownGuard.record(guildId, giver.id);

            // ── Kirim konfirmasi ──
            await interaction.editReply({
                embeds: [this._successEmbed(giver, target, targetProfile.rep)],
            });

        } catch (error) {
            console.error(`[RepCommand] Gagal memberikan rep dari ${giver.tag} ke ${target.tag}:`, error);
            await interaction.editReply({
                embeds: [this._errorEmbed('❌ Terjadi kesalahan. Coba lagi nanti.')],
            }).catch(() => {});
        }
    }

    // ─── Embed Helpers ────────────────────────────────────────────────────────────

    _successEmbed(giver, target, totalRep) {
        return new EmbedBuilder()
            .setColor(0x5865f2)
            .setTitle('⭐ Reputasi Diberikan!')
            .setDescription(
                `**${giver.username}** memberikan **+1 rep** kepada **${target.username}**!`
            )
            .addFields(
                { name: '👤 Penerima',     value: `<@${target.id}>`,       inline: true },
                { name: '⭐ Total Rep',    value: `**${totalRep} rep**`,    inline: true },
            )
            .setThumbnail(target.displayAvatarURL({ size: 128 }))
            .setFooter({ text: `Kamu bisa memberikan rep lagi dalam 24 jam.` })
            .setTimestamp();
    }

    _cooldownEmbed(remainingMs) {
        const hours   = Math.floor(remainingMs / 3_600_000);
        const minutes = Math.floor((remainingMs % 3_600_000) / 60_000);
        const seconds = Math.floor((remainingMs % 60_000) / 1_000);

        let timeStr = '';
        if (hours   > 0) timeStr += `${hours}j `;
        if (minutes > 0) timeStr += `${minutes}m `;
        timeStr += `${seconds}d`;

        return new EmbedBuilder()
            .setColor(0xff6b6b)
            .setTitle('⏳ Masih Cooldown!')
            .setDescription(
                `Kamu sudah memberikan rep hari ini.\n` +
                `Coba lagi dalam **${timeStr.trim()}**.`
            );
    }

    _errorEmbed(message) {
        return new EmbedBuilder()
            .setColor(0xff4757)
            .setDescription(message);
    }
}

module.exports = RepCommand;