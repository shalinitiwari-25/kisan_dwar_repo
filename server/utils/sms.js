/**
 * sms.js — Thin wrapper around Twilio.
 *
 * If TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_PHONE_NUMBER are set
 * in the environment, messages are sent via Twilio.
 * Otherwise the message is simply logged to the console so the demo works
 * without real credentials.
 *
 * To enable real SMS:
 *   1. npm install twilio   (inside /server)
 *   2. Add the three env vars to server/.env
 */

async function sendSms(to, message) {
  const sid   = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from  = process.env.TWILIO_PHONE_NUMBER;

  if (sid && token && from) {
    try {
      // Dynamically require so the server does not crash if twilio is not installed
      const twilio = require('twilio');
      const client = twilio(sid, token);
      await client.messages.create({ body: message, from, to });
      console.log(`[SMS] Sent to ${to}`);
    } catch (err) {
      console.warn(`[SMS] Twilio error — falling back to console: ${err.message}`);
      console.log(`[SMS MOCK] To: ${to}\n${message}`);
    }
  } else {
    // Mock mode
    console.log(`[SMS MOCK] To: ${to}\n${message}`);
  }
}

module.exports = { sendSms };
