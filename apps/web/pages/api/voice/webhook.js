import twilio from 'twilio';
const VoiceResponse = twilio.twiml.VoiceResponse;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const twiml = new VoiceResponse();
  const { CallSid, From, Digits, SpeechResult } = req.body;

  // Simple state machine using query params or session (stateless for now)
  // In a real app, we'd check a database for the call state
  const step = req.query.step || 'initial';

  try {
    if (step === 'initial') {
      // 1. Greet the caller and ask for purpose
      const gather = twiml.gather({
        input: 'speech',
        action: '/api/voice/webhook?step=analyze',
        timeout: 3,
        language: 'en-US',
      });
      
      gather.say({ voice: 'alice' }, 
        "Hello. You have reached Remy's AI Assistant. Remy is currently unavailable. Please state your name and the reason for your call, and I will see if I can put you through."
      );
      
      // If no input, move to voicemail
      twiml.redirect('/api/voice/webhook?step=voicemail');
    } 
    
    else if (step === 'analyze') {
      // 2. Analyze the speech result
      if (SpeechResult) {
        try {
          const OpenAI = require('openai');
          const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
          });

          const completion = await openai.chat.completions.create({
            messages: [
              {
                role: "system",
                content: "You are an AI assistant for Remy. Analyze the caller's message. Determine if it is 'urgent' (emergency, time-sensitive matter requiring immediate attention), 'spam' (sales, robocall), or 'normal' (general message). Return a JSON object with keys: 'classification' (string: 'urgent', 'spam', 'normal') and 'reply' (string: a short, polite response to speak back to the caller). For urgent calls, say you are connecting them. For others, ask them to leave a message."
              },
              { role: "user", content: SpeechResult }
            ],
            model: "gpt-4o",
            response_format: { type: "json_object" },
          });

          const result = JSON.parse(completion.choices[0].message.content);
          const classification = result.classification;
          const reply = result.reply;

          console.log('OpenAI Analysis:', result);

          if (classification === 'urgent') {
            twiml.say({ voice: 'alice' }, reply);
            twiml.dial(process.env.MY_REAL_PHONE_NUMBER || '+15550000000');
          } else if (classification === 'spam') {
             twiml.say({ voice: 'alice' }, "This call has been identified as potential spam. Goodbye.");
             twiml.hangup();
          } else {
            twiml.say({ voice: 'alice' }, reply);
            twiml.record({
              action: '/api/voice/webhook?step=end',
              transcribe: true,
              maxLength: 60
            });
          }
        } catch (aiError) {
          console.error('OpenAI Error:', aiError);
          // Fallback logic
          const isUrgent = SpeechResult.toLowerCase().includes('urgent') || SpeechResult.toLowerCase().includes('emergency');
          if (isUrgent) {
             twiml.say({ voice: 'alice' }, "I understand this is urgent. Connecting you now.");
             twiml.dial(process.env.MY_REAL_PHONE_NUMBER || '+15550000000');
          } else {
             twiml.say({ voice: 'alice' }, "Please leave a message after the beep.");
             twiml.record({
               action: '/api/voice/webhook?step=end',
               transcribe: true,
               maxLength: 60
             });
          }
        }
      } else {
        twiml.redirect('/api/voice/webhook?step=voicemail');
      }
    }
    
    else if (step === 'voicemail') {
      twiml.say({ voice: 'alice' }, "Please leave a message after the beep.");
      twiml.record({
        action: '/api/voice/webhook?step=end',
        transcribe: true
      });
    }
    
    else if (step === 'end') {
      twiml.say({ voice: 'alice' }, "Thank you. Goodbye.");
      twiml.hangup();
    }

    res.setHeader('Content-Type', 'text/xml');
    res.status(200).send(twiml.toString());
    
  } catch (error) {
    console.error(error);
    // Fallback
    const errorTwiml = new VoiceResponse();
    errorTwiml.say("We are experiencing technical difficulties. Please try again later.");
    res.setHeader('Content-Type', 'text/xml');
    res.status(200).send(errorTwiml.toString());
  }
}
