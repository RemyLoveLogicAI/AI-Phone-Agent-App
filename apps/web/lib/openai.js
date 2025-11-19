import OpenAI from 'openai';

const apiKey = process.env.OPENAI_API_KEY;

const openai = apiKey ? new OpenAI({ apiKey }) : null;

export const generateAIResponse = async (prompt, context = []) => {
  if (!openai) return "AI Configuration Missing";

  try {
    const messages = [
      { role: "system", content: "You are an advanced AI Phone Assistant. You are helpful, professional, and concise. You are acting as a gatekeeper and assistant for the user, Remy." },
      ...context,
      { role: "user", content: prompt }
    ];

    const completion = await openai.chat.completions.create({
      messages,
      model: "gpt-4-turbo",
    });

    return completion.choices[0].message.content;
  } catch (error) {
    console.error("Error generating AI response:", error);
    return "I'm having trouble processing that right now.";
  }
};

export const analyzeCallIntent = async (transcription) => {
  if (!openai) return { intent: "unknown", summary: "Analysis failed" };

  try {
    const completion = await openai.chat.completions.create({
      messages: [
        { role: "system", content: "Analyze the following call transcription. Return a JSON object with 'intent' (e.g., 'sales', 'personal', 'spam', 'urgent') and a brief 'summary'." },
        { role: "user", content: transcription }
      ],
      model: "gpt-4-turbo",
      response_format: { type: "json_object" }
    });

    return JSON.parse(completion.choices[0].message.content);
  } catch (error) {
    console.error("Error analyzing intent:", error);
    return { intent: "unknown", summary: "Could not analyze" };
  }
};
