import VoiceResponse from 'twilio/lib/twiml/VoiceResponse';
import { analyzeCallIntent } from '../../../lib/twilio';
import { saveCallData } from '../../../lib/storage';

export default async function handler(req, res) {
  const twiml = new VoiceResponse();
  const callSid = req.body.CallSid;
  const speechResult = req.body.SpeechResult;

  if (!speechResult) {
    twiml.redirect('/api/voice/incoming');
    res.setHeader('Content-Type', 'text/xml');
    return res.status(200).send(twiml.toString());
  }

  // AI Analysis
  const analysis = await analyzeCallIntent(speechResult);
  
  // Save analysis
  saveCallData(callSid, {
    transcript: speechResult,
    aiAnalysis: analysis
  });

  if (analysis.isSpam) {
    twiml.say({ voice: 'alice' }, "I'm sorry, but this number does not accept solicitation calls. Please remove us from your list. Goodbye.");
    twiml.hangup();
    
    saveCallData(callSid, { status: 'blocked', blockReason: 'spam_detected' });
  } else if (analysis.isUrgent || analysis.riskScore < 20) {
    // Forward to user
    twiml.say({ voice: 'alice' }, "Thank you. Please hold while I connect you.");
    twiml.dial(process.env.NEXT_PUBLIC_MY_NUMBER);
    
    saveCallData(callSid, { status: 'forwarded' });
  } else {
    // Send to voicemail
    twiml.say({ voice: 'alice' }, "Thank you. Remy is not available right now, but I will pass your message along. Please leave a detailed voicemail after the beep.");
    twiml.record({
      action: '/api/voice/recording',
      transcribe: true,
      transcribeCallback: '/api/voice/recording'
    });
    
    saveCallData(callSid, { status: 'voicemail' });
  }

  res.setHeader('Content-Type', 'text/xml');
  res.status(200).send(twiml.toString());
}
