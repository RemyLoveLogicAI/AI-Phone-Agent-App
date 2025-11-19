import { v4 as uuidv4 } from 'uuid';
import VoiceResponse from 'twilio/lib/twiml/VoiceResponse';
import { saveCallData } from '../../../lib/storage';

export default function handler(req, res) {
  const twiml = new VoiceResponse();
  const callSid = req.body.CallSid || `mock-${uuidv4()}`;
  const caller = req.body.From || 'Unknown';

  // Initialize call data
  saveCallData(callSid, {
    from: caller,
    status: 'screening',
    startTime: new Date().toISOString(),
  });

  // Connect to Media Stream
  const connect = twiml.connect();
  connect.stream({
    url: `wss://${req.headers.host}/streams`,
  });

  res.setHeader('Content-Type', 'text/xml');
  res.status(200).send(twiml.toString());
}
