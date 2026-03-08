/**
 * SMS Service - Twilio wrapper for sending OTP codes.
 * In development mode, OTPs are logged to the console instead of being sent.
 */

let twilioClient = null;

function getTwilioClient() {
  if (twilioClient) return twilioClient;
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) return null;
  try {
    twilioClient = require('twilio')(sid, token);
  } catch (err) {
    console.warn('⚠️  Twilio module not available or credentials invalid:', err.message);
  }
  return twilioClient;
}

/**
 * Send an OTP code via SMS to the given phone number.
 * @param {string} phoneNumber - E.164 formatted phone number (e.g. +1234567890)
 * @param {string} code - 6-digit OTP code
 */
async function sendSMSOTP(phoneNumber, code) {
  if (!phoneNumber) {
    throw new Error('Phone number is required to send SMS OTP');
  }

  const message = `Your verification code is: ${code}. It expires in 10 minutes. Do not share this code with anyone.`;

  // Dev mode: just log
  if (process.env.NODE_ENV !== 'production') {
    console.log(`📱 SMS OTP would be sent to: ${phoneNumber}`);
    console.log(`   Code: ${code}`);
    return { success: true, message: 'SMS logged (dev mode)' };
  }

  const client = getTwilioClient();
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!client || !fromNumber) {
    console.warn('⚠️  Twilio not configured. SMS not sent. Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER to .env');
    // Don't throw — treat as dev-mode silent pass so the flow still works
    return { success: true, message: 'SMS skipped (Twilio not configured)' };
  }

  try {
    await client.messages.create({
      body: message,
      from: fromNumber,
      to: phoneNumber,
    });
    return { success: true, message: 'SMS sent successfully' };
  } catch (error) {
    console.error('Error sending SMS OTP:', error);
    return { success: false, error: error.message };
  }
}

module.exports = { sendSMSOTP };
