// Patch os.release() to return a standard Linux kernel version
// This prevents WhatsApp from detecting WSL2 in the browser fingerprint
// which was causing connection rejection during QR/pairing handshake
const os = require('os');
os.release = () => '5.15.0-91-generic';
