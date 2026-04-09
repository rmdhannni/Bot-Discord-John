const BaseCommand = require('../../structures/BaseCommand');
const GuildConfig = require('../../models/GuildConfig');
const { 
    EmbedBuilder, 
    PermissionFlagsBits, 
    ChannelType, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle, 
    ActionRowBuilder,
    RoleSelectMenuBuilder,
    ComponentType
} = require('discord.js');

class SetupCommand extends BaseCommand {
    constructor(client) {
        super(client, {
            name: 'setup',
            description: 'Mengatur konfigurasi utama bot untuk server ini.',
            category: 'Admin',
            permissions: [PermissionFlagsBits.Administrator], 
            options: [
                {
                    name: 'welcome',
                    description: 'Atur channel untuk fitur Welcome',
                    type: 1,
                    options: [{ name: 'channel', description: 'Pilih channel teks', type: 7, required: true, channelTypes: [ChannelType.GuildText] }]
                },
                {
                    name: 'goodbye',
                    description: 'Atur channel untuk fitur Goodbye',
                    type: 1,
                    options: [{ name: 'channel', description: 'Pilih channel teks', type: 7, required: true, channelTypes: [ChannelType.GuildText] }]
                },
                {
                    name: 'welcome_edit',
                    description: 'Pop-up editor untuk tampilan Welcome',
                    type: 1
                },
                {
                    name: 'goodbye_edit',
                    description: 'Pop-up editor untuk tampilan Goodbye',
                    type: 1
                },
                {
                    name: 'snipe',
                    description: 'Atur role yang diizinkan menggunakan /snipe (multiple)',
                    type: 1
                },
                {
                    name: 'staff',
                    description: 'Atur role staff (multiple) untuk pronouns profil',
                    type: 1
                },
                {
                    name: 'booster',
                    description: 'Atur role Server Booster',
                    type: 1,
                    options: [{ name: 'role', description: 'Pilih role booster', type: 8, required: true }]
                },
                {
                    name: 'level',
                    description: 'Atur channel notifikasi naik level',
                    type: 1,
                    options: [{ name: 'channel', description: 'Pilih channel teks', type: 7, required: true, channelTypes: [ChannelType.GuildText] }]
                },
                {
                    name: 'level_edit',
                    description: 'Pop-up editor untuk tampilan naik level',
                    type: 1
                }
            ]
        });
    }

    async execute(interaction) {
        const subCommand = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        try {
            const [config] = await GuildConfig.findOrCreate({ where: { guildId } });
            const embed = new EmbedBuilder().setColor('#95A5A6').setTimestamp();

            // 1. SETUP WELCOME / GOODBYE CHANNEL (SLASHS)
            if (subCommand === 'welcome') {
                const channel = interaction.options.getChannel('channel');
                config.welcomeChannelId = channel.id;
                await config.save();
                embed.setTitle('🦇 Rute Kedatangan Ditetapkan!')
                     .setDescription(`Laporan pendatang baru di Gotham akan dikirim ke ${channel}`);
                return interaction.reply({ embeds: [embed], ephemeral: true });
            }

            if (subCommand === 'goodbye') {
                const channel = interaction.options.getChannel('channel');
                config.goodbyeChannelId = channel.id;
                await config.save();
                embed.setTitle('🌧️ Rute Kepergian Ditetapkan!')
                     .setDescription(`Laporan warga yang meninggalkan Gotham akan dikirim ke ${channel}`);
                return interaction.reply({ embeds: [embed], ephemeral: true });
            }

            // 2. MODAL POP-UP FOR WELCOME/GOODBYE EDIT
            if (subCommand === 'welcome_edit') {
                const modal = new ModalBuilder()
                    .setCustomId('modal_welcome_edit')
                    .setTitle('Edit Welcome Style');

                modal.addComponents(
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('w_title').setLabel('Judul Embed').setStyle(TextInputStyle.Short).setValue(config.welcomeTitle || '').setRequired(false)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('w_message').setLabel('Pesan (Gunakan {user}, {server}, {count})').setStyle(TextInputStyle.Paragraph).setValue(config.welcomeMessage || '').setRequired(false)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('w_thumb').setLabel('Thumbnail URL ({userAvatar} untuk pfp)').setStyle(TextInputStyle.Short).setValue(config.welcomeThumbnail || '').setRequired(false)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('w_image').setLabel('Image URL (Besar di Bawah)').setStyle(TextInputStyle.Short).setValue(config.welcomeImage || '').setRequired(false)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('w_footer').setLabel('Footer Text').setStyle(TextInputStyle.Short).setValue(config.welcomeFooter || 'You are the {count} Gothamians').setRequired(false))
                );

                return interaction.showModal(modal);
            }

            if (subCommand === 'goodbye_edit') {
                const modal = new ModalBuilder()
                    .setCustomId('modal_goodbye_edit')
                    .setTitle('Edit Goodbye Style');

                modal.addComponents(
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('g_title').setLabel('Judul Embed').setStyle(TextInputStyle.Short).setValue(config.goodbyeTitle || '').setRequired(false)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('g_message').setLabel('Pesan (Gunakan {user}, {server}, {count})').setStyle(TextInputStyle.Paragraph).setValue(config.leaveMessage || '').setRequired(false)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('g_thumb').setLabel('Thumbnail URL ({userAvatar} untuk pfp)').setStyle(TextInputStyle.Short).setValue(config.goodbyeThumbnail || '').setRequired(false)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('g_image').setLabel('Image URL (Besar di Bawah)').setStyle(TextInputStyle.Short).setValue(config.goodbyeImage || '').setRequired(false)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('g_footer').setLabel('Footer Text').setStyle(TextInputStyle.Short).setValue(config.goodbyeFooter || '').setRequired(false))
                );

                return interaction.showModal(modal);
            }

            if (subCommand === 'level_edit') {
                const modal = new ModalBuilder()
                    .setCustomId('modal_level_edit')
                    .setTitle('Edit Level Up Style');

                modal.addComponents(
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('l_content').setLabel('Tag / Pesan Diluar Embed (Gunakan {user})').setStyle(TextInputStyle.Short).setValue(config.levelUpContent || '<@{user}>').setRequired(false)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('l_title').setLabel('Judul Embed').setStyle(TextInputStyle.Short).setValue(config.levelUpTitle || '').setRequired(false)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('l_message').setLabel('Pesan (Gunakan {user}, {level}, {server})').setStyle(TextInputStyle.Paragraph).setValue(config.levelUpMessage || '').setRequired(false)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('l_footer').setLabel('Teks Footer').setStyle(TextInputStyle.Short).setValue(config.levelUpFooter || '').setRequired(false)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('l_image').setLabel('Image URL (Besar di Bawah)').setStyle(TextInputStyle.Short).setValue(config.levelUpImage || '').setRequired(false)),
                );

                return interaction.showModal(modal);
            }

            // 3. SNIPE SETUP (ROLE SELECT MENU)
            if (subCommand === 'snipe') {
                const currentRoles = config.snipeAllowedRoles || [];
                const roleMentionList = currentRoles.length > 0 ? currentRoles.map(id => `<@&${id}>`).join(', ') : '*Belum ada role yang diatur.*';

                embed.setTitle('🎯 Pengaturan Izin Sniper Gotham')
                     .setDescription(`Pilih role yang diizinkan untuk melihat pesan yang terhapus (/snipe).\n\n**Role Saat Ini:**\n${roleMentionList}\n\n*Gunakan menu di bawah untuk menambah atau mengganti role.*`);

                const roleSelect = new RoleSelectMenuBuilder()
                    .setCustomId('select_snipe_roles')
                    .setPlaceholder('Pilih role sniper...')
                    .setMinValues(0)
                    .setMaxValues(10); 

                if (currentRoles.length > 0) roleSelect.addDefaultRoles(currentRoles);

                const row = new ActionRowBuilder().addComponents(roleSelect);
                return interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
            }

            // 4. STAFF SETUP (ROLE SELECT MENU)
            if (subCommand === 'staff') {
                const currentRoles = config.staffRoles || [];
                const roleMentionList = currentRoles.length > 0 ? currentRoles.map(id => `<@&${id}>`).join(', ') : '*Belum ada role yang diatur.*';

                embed.setTitle('🛡️ Protokol Otoritas Staff')
                     .setDescription(`Pilih role yang diizinkan untuk memodifikasi pronouns profil.\n\n**Role Saat Ini:**\n${roleMentionList}\n\n*Gunakan menu di bawah untuk menambah atau mengganti staff.*`);

                const roleSelect = new RoleSelectMenuBuilder()
                    .setCustomId('select_staff_roles')
                    .setPlaceholder('Pilih role staff...')
                    .setMinValues(0)
                    .setMaxValues(10); 

                if (currentRoles.length > 0) roleSelect.addDefaultRoles(currentRoles);

                const row = new ActionRowBuilder().addComponents(roleSelect);
                return interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
            }

            // 5. OTHER CONFIGS (BOOSTER, LEVEL)
            if (subCommand === 'booster') {
                const role = interaction.options.getRole('role');
                config.boosterRoleId = role.id;
                await config.save();
                embed.setTitle('💎 Setup Akses VIP Mengudara!').setDescription(`Sistem mengenali donatur Elite (Booster) sebagai ${role}`);
            }

            if (subCommand === 'level') {
                const channel = interaction.options.getChannel('channel');
                config.levelChannelId = channel.id;
                await config.save();
                embed.setTitle('📈 Sistem Reputasi Diluncurkan!').setDescription(`Setiap kenaikan derajat (level) warga akan diumumkan di ${channel}`);
            }

            await interaction.reply({ embeds: [embed], ephemeral: true });

        } catch (error) {
            console.error(`[ERROR] /setup in ${guildId}:`, error);
            await interaction.reply({ content: 'Terjadi kesalahan database.', ephemeral: true });
        }
    }

    /**
     * Handler untuk menangkap respon dari Modal Submit
     */
    static async handleModal(interaction) {
        const guildId = interaction.guild.id;
        const [config] = await GuildConfig.findOrCreate({ where: { guildId } });

        if (interaction.customId === 'modal_welcome_edit') {
            config.welcomeTitle     = interaction.fields.getTextInputValue('w_title');
            config.welcomeMessage   = interaction.fields.getTextInputValue('w_message');
            config.welcomeThumbnail = interaction.fields.getTextInputValue('w_thumb');
            config.welcomeImage     = interaction.fields.getTextInputValue('w_image');
            config.welcomeFooter    = interaction.fields.getTextInputValue('w_footer');
            await config.save();
            return interaction.reply({ content: '✅ Tampilan **Welcome** berhasil diperbarui!', ephemeral: true });
        }

        if (interaction.customId === 'modal_goodbye_edit') {
            config.goodbyeTitle     = interaction.fields.getTextInputValue('g_title');
            config.leaveMessage      = interaction.fields.getTextInputValue('g_message');
            config.goodbyeThumbnail = interaction.fields.getTextInputValue('g_thumb');
            config.goodbyeImage     = interaction.fields.getTextInputValue('g_image');
            config.goodbyeFooter    = interaction.fields.getTextInputValue('g_footer');
            await config.save();
            return interaction.reply({ content: '✅ Tampilan **Goodbye** berhasil diperbarui!', ephemeral: true });
        }

        if (interaction.customId === 'modal_level_edit') {
            config.levelUpContent   = interaction.fields.getTextInputValue('l_content');
            config.levelUpTitle     = interaction.fields.getTextInputValue('l_title');
            config.levelUpMessage   = interaction.fields.getTextInputValue('l_message');
            config.levelUpFooter    = interaction.fields.getTextInputValue('l_footer');
            config.levelUpImage     = interaction.fields.getTextInputValue('l_image');
            await config.save();
            return interaction.reply({ content: '✅ Tampilan **Level Up** berhasil diperbarui!', ephemeral: true });
        }
    }

    /**
     * Handler untuk menangkap respon dari Component (Select Menu)
     */
    static async handleComponent(interaction) {
        const guildId = interaction.guild.id;
        const [config] = await GuildConfig.findOrCreate({ where: { guildId } });

        if (interaction.customId === 'select_snipe_roles') {
            const selectedRoles = interaction.values;
            config.snipeAllowedRoles = selectedRoles;
            await config.save();

            const roleMentionList = selectedRoles.length > 0 ? selectedRoles.map(id => `<@&${id}>`).join(', ') : '*Semua role dicabut izinnya (Hanya Admin).*';
            const embed = new EmbedBuilder().setColor('#95A5A6').setTitle('🎯 Izin Snipe Diperbarui').setDescription(`Role berikut kini memiliki izin sniper:\n${roleMentionList}`).setTimestamp();

            return interaction.update({ embeds: [embed], components: [] });
        }

        if (interaction.customId === 'select_staff_roles') {
            const selectedRoles = interaction.values;
            config.staffRoles = selectedRoles;
            await config.save();

            const roleMentionList = selectedRoles.length > 0 ? selectedRoles.map(id => `<@&${id}>`).join(', ') : '*Semua role staff dicabut (Hanya Admin).*';
            const embed = new EmbedBuilder().setColor('#95A5A6').setTitle('🛡️ Izin Staff Diperbarui').setDescription(`Role berikut kini memiliki otoritas Staff:\n${roleMentionList}`).setTimestamp();

            return interaction.update({ embeds: [embed], components: [] });
        }
    }
}

module.exports = SetupCommand;