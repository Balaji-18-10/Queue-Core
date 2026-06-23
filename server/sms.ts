import fetch from 'node-fetch';

/**
 * Clean helper function to format and send SMS notifications using Twilio or Fast2SMS.
 * If API keys are not supplied in the environment, it prints a beautiful mock output directly to the server terminal.
 */
export async function sendSMS(toPhone: string, messageBody: string): Promise<{ success: boolean; provider: string; details?: any }> {
  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioFrom = process.env.TWILIO_PHONE_NUMBER;

  const fast2smsKey = process.env.FAST2SMS_API_KEY;

  const formattedTo = toPhone.startsWith('+') ? toPhone : '+91' + toPhone.replace(/\D/g, '');

  console.log("\n=======================================================");
  console.log("       💬 QUEUE CURE OUTGOING SMS NOTIFICATION        ");
  console.log("=======================================================");
  console.log(`Recipient: ${formattedTo}`);
  console.log(`Message:\n"${messageBody}"`);
  console.log("-------------------------------------------------------");

  // Case 1: Twilio SMS configured
  if (twilioSid && twilioAuthToken && twilioFrom) {
    try {
      console.log("SMS Service: Dispatching via Twilio REST API...");
      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;
      const basicAuth = Buffer.from(`${twilioSid}:${twilioAuthToken}`).toString('base64');
      
      const params = new URLSearchParams();
      params.append('To', formattedTo);
      params.append('From', twilioFrom);
      params.append('Body', messageBody);

      const response = await fetch(twilioUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${basicAuth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params
      });

      const json: any = await response.json();
      if (response.ok) {
        console.log(`Twilio STATUS: Success (SID: ${json.sid})`);
        console.log("=======================================================\n");
        return { success: true, provider: 'twilio', details: json };
      } else {
        console.error(`Twilio ERROR: ${json.message || response.statusText}`);
        console.log("=======================================================\n");
        return { success: false, provider: 'twilio', details: json };
      }
    } catch (err: any) {
      console.error(`Twilio EXCEPTION: ${err.message}`);
      console.log("=======================================================\n");
      return { success: false, provider: 'twilio', details: err.message };
    }
  }

  // Case 2: Fast2SMS configured
  if (fast2smsKey) {
    try {
      console.log("SMS Service: Dispatching via Fast2SMS Indian SMS Gateway...");
      // Using Fast2SMS direct message sending endpoint (bulkV2)
      // Reference: https://www.fast2sms.com/dashboard/dev-api
      const fastUrl = 'https://www.fast2sms.com/dev/bulkV2';
      
      const payload = {
        route: 'q', // Quick SMS route
        message: messageBody,
        numbers: formattedTo.replace(/^\+91/, ''), // fast2sms requires plain 10 digit Indian numbers
        language: 'english'
      };

      const response = await fetch(fastUrl, {
        method: 'POST',
        headers: {
          'authorization': fast2smsKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const json: any = await response.json();
      if (json.return) {
        console.log(`Fast2SMS STATUS: Success`);
        console.log("=======================================================\n");
        return { success: true, provider: 'fast2sms', details: json };
      } else {
        console.error(`Fast2SMS ERROR: ${json.message || "Failed to deliver message"}`);
        console.log("=======================================================\n");
        return { success: false, provider: 'fast2sms', details: json };
      }
    } catch (err: any) {
      console.error(`Fast2SMS EXCEPTION: ${err.message}`);
      console.log("=======================================================\n");
      return { success: false, provider: 'fast2sms', details: err.message };
    }
  }

  // Fallback Case: Mock logging mode
  console.log("ℹ️ SMS STATUS: Mocked Success (No Active Twilio/Fast2SMS Keys Set in Workspace)");
  console.log("=======================================================\n");
  return { success: true, provider: 'mock_console' };
}
