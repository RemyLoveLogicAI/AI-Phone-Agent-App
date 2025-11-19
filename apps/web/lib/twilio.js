import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const phoneNumber = process.env.TWILIO_PHONE_NUMBER;

// Initialize the client only if credentials are present to avoid build errors
// In a real app, we'd throw an error or handle this more gracefully
const client = (accountSid && authToken) ? twilio(accountSid, authToken) : null;

export const makeCall = async (to, url) => {
  if (!client) throw new Error("Twilio credentials missing");
  
  try {
    const call = await client.calls.create({
      url, // TwiML URL that controls the call
      to,
      from: phoneNumber,
    });
    return call;
  } catch (error) {
    console.error("Error making call:", error);
    throw error;
  }
};

export const sendSms = async (to, body) => {
  if (!client) throw new Error("Twilio credentials missing");

  try {
    const message = await client.messages.create({
      body,
      to,
      from: phoneNumber,
    });
    return message;
  } catch (error) {
    console.error("Error sending SMS:", error);
    throw error;
  }
};

export const getRecentCalls = async (limit = 10) => {
  if (!client) return [];
  try {
    const calls = await client.calls.list({ limit });
    return calls.map(c => ({
      id: c.sid,
      from: c.from,
      to: c.to,
      status: c.status,
      duration: c.duration,
      dateCreated: c.dateCreated,
      direction: c.direction
    }));
  } catch (error) {
    console.error("Error fetching calls:", error);
    return [];
  }
};

export const getRecentMessages = async (limit = 10) => {
  if (!client) return [];
  try {
    const messages = await client.messages.list({ limit });
    return messages.map(m => ({
      id: m.sid,
      from: m.from,
      to: m.to,
      body: m.body,
      status: m.status,
      dateSent: m.dateSent,
      direction: m.direction
    }));
  } catch (error) {
    console.error("Error fetching messages:", error);
    return [];
  }
};

// --- New AI & Helper Functions ---

import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const analyzeCallIntent = async (callerSpeech) => {
  if (!callerSpeech) return { isSpam: false, summary: "No speech detected." };

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an AI Call Screener. Analyze the caller's speech.
          Return a JSON object with:
          - isSpam (boolean): true if it sounds like a robocall, scam, or telemarketing.
          - isUrgent (boolean): true if it sounds like an emergency or time-sensitive.
          - summary (string): A brief 1-sentence summary of who is calling and why.
          - riskScore (number): 0-100 likelihood of being a scam.`
        },
        { role: "user", content: callerSpeech }
      ],
      response_format: { type: "json_object" },
    });

    return JSON.parse(completion.choices[0].message.content);
  } catch (error) {
    console.error("Error analyzing intent:", error);
    return { isSpam: false, summary: "Error analyzing call." };
  }
};

export const generateAutoReply = async (messageBody) => {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a helpful personal assistant. Draft a polite, concise SMS reply to this message. If it looks like spam, suggest ignoring it."
        },
        { role: "user", content: messageBody }
      ],
    });
    return completion.choices[0].message.content;
  } catch (error) {
    console.error("Error generating reply:", error);
    return null;
  }
};

