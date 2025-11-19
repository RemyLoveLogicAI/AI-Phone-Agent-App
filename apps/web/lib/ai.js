import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'mock-key',
  dangerouslyAllowBrowser: true // Only for demo/client-side simulation
});

export async function generateAIResponse(text) {
  // In a real app, this runs on the server
  if (!process.env.OPENAI_API_KEY) {
    // Mock response for demo
    await new Promise(r => setTimeout(r, 1000));
    return {
      text: `I understood: "${text}". How can I assist you further?`,
      isSpam: text.toLowerCase().includes('warranty') || text.toLowerCase().includes('lottery'),
      isUrgent: text.toLowerCase().includes('emergency') || text.toLowerCase().includes('help'),
      summary: `User said: "${text}"`
    };
  }

  try {
    const completion = await openai.chat.completions.create({
      messages: [
        { role: "system", content: "You are a helpful AI phone assistant. Analyze the input for spam and urgency." },
        { role: "user", content: text }
      ],
      model: "gpt-4-turbo-preview",
    });

    return {
      text: completion.choices[0].message.content,
      isSpam: false, // simplified
      isUrgent: false, // simplified
      summary: "AI processed response"
    };
  } catch (error) {
    console.error("OpenAI Error:", error);
    return {
      text: "I'm having trouble connecting to my brain right now.",
      isSpam: false,
      isUrgent: false,
      summary: "Error processing"
    };
  }
}

export async function analyzeCallIntent(transcript) {
  // Simulate analysis
  return {
    intent: 'general_inquiry',
    sentiment: 'neutral',
    suggestedAction: 'take_message'
  };
}
