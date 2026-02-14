module.exports = {
    apps: [
        {
            name: 'gestion-aulas-backend',
            script: './backend/src/index.js',
            cwd: '.',
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: '500M',
            env: {
                NODE_ENV: 'production',
                PORT: 3000
            }
        },
        {
            name: 'whatsapp-bot-aulas',
            script: './whatsapp-bot-aulas/bot.js',
            cwd: '.',
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: '300M',
            env: {
                NODE_ENV: 'production'
            }
        }
    ]
};
