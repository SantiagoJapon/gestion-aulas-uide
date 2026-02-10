const axios = require('axios');

async function checkN8N() {
    try {
        // We'll skip the middleware check by calling the service directly if possible, 
        // OR we need to simulate a token. 
        // For now, let's just check if N8N service class can reach N8N URL.
        const N8nService = require('./services/n8n.service');

        console.log('Checking N8N health via Service...');
        const isHealthy = await N8nService.healthCheck();
        console.log(`N8N Service Health: ${isHealthy ? '✅ OK' : '❌ FAILED'}`);

    } catch (err) {
        console.error('Test failed:', err.message);
    }
}

checkN8N();
