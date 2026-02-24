const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Returns true if message should be flagged
 */
async function moderateMessage(text) {
  try {
    if (!text) return false;

    // Basic fallback filter
    const bannedWords = ["spam", "scam", "fake"];
    const containsBanned = bannedWords.some(word =>
      text.toLowerCase().includes(word)
    );

    if (containsBanned) return true;

    // GPT moderation check
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a moderation AI. Respond only with SAFE or FLAG.",
        },
        {
          role: "user",
          content: `Is this message inappropriate, abusive, sexual, or spam? "${text}"`,
        },
      ],
      temperature: 0,
    });

    const result = response.choices[0].message.content.trim();
    return result === "FLAG";
  } catch (error) {
    console.error("Moderation error:", error.message);
    return false; // fail safe (do not block if API fails)
  }
}

module.exports = moderateMessage;