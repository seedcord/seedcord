import { commandTranslations } from '@seedcord/plugin-i18n';

export default commandTranslations({
    slash: {
        ping: {
            description: 'जाँचें कि बॉट जवाब दे रहा है',
            options: { detailed: { name: 'विवरण', description: 'इस आइसोलेट की पिंग गिनती दिखाएँ' } }
        }
    }
});
