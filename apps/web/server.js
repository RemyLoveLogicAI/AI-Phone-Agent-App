const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const WebSocket = require('ws');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  const wss = new WebSocket.Server({ server });

  wss.on('connection', (ws) => {
    console.log('New WebSocket connection initiated');
    let streamSid = null;
    
    ws.on('message', async (message) => {
      const msg = JSON.parse(message);
      switch (msg.event) {
        case 'connected':
          console.log('Twilio Media Stream Connected');
          break;
        case 'start':
          streamSid = msg.streamSid;
          console.log(`Twilio Media Stream Started: ${streamSid}`);
          break;
        case 'media':
          // In a real app, we'd send this payload to OpenAI Realtime API
          // For now, we'll just log that we're receiving data
          // console.log(`Received media chunk: ${msg.media.payload.length} bytes`);
          break;
        case 'stop':
          console.log('Twilio Media Stream Stopped');
          break;
        
        // Custom event for client-side simulation
        case 'simulate_audio':
          console.log('Simulating audio input:', msg.text);
          // Simulate processing delay
          setTimeout(() => {
            ws.send(JSON.stringify({
              event: 'ai_response',
              text: `I heard you say: "${msg.text}". This is a simulated AI response.`,
              isSpam: msg.text.toLowerCase().includes('spam'),
              isUrgent: msg.text.toLowerCase().includes('urgent')
            }));
          }, 1500);
          break;
      }
    });

    ws.on('close', () => {
      console.log('WebSocket disconnected');
    });
  });

  server.listen(3000, (err) => {
    if (err) throw err;
    console.log('> Ready on http://localhost:3000');
  });
});
