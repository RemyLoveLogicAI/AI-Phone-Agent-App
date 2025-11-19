import { MessagingResponse } from 'twilio';
import { generateAIResponse } from '../../../lib/openai';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const twiml = new MessagingResponse();
  const { Body, From } = req.body;

  try {
    // Generate AI response
    // Note: Twilio webhooks have a timeout. If GPT-4 is slow, this might time out.
    // Better architecture: Acknowledge receipt, then send async reply via API.
    // For MVP/Demo: We'll try direct reply.
    
    const aiReply = await generateAIResponse(Body, [
      { role: "system", content: "You are replying to an SMS on behalf of Remy. Keep it short (under 160 chars if possible) and helpful." }
    ]);

    twiml.message(aiReply);

    res.setHeader('Content-Type', 'text/xml');
    res.status(200).send(twiml.toString());

  } catch (error) {
    console.error(error);
    twiml.message("I received your message but couldn't process a reply just yet.");
    res.setHeader('Content-Type', 'text/xml');
    res.status(200).send(twiml.toString());
  }
}
