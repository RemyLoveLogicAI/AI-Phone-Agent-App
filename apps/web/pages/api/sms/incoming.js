import MessagingResponse from 'twilio/lib/twiml/MessagingResponse';
import { generateAutoReply } from '../../../lib/twilio';

export default async function handler(req, res) {
  const twiml = new MessagingResponse();
  const incomingMsg = req.body.Body;
  
  if (incomingMsg) {
    const reply = await generateAutoReply(incomingMsg);
    if (reply) {
      twiml.message(reply);
    }
  }

  res.setHeader('Content-Type', 'text/xml');
  res.status(200).send(twiml.toString());
}
