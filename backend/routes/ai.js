const express = require("express");
const OpenAI = require("openai");

const router = express.Router();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

router.post("/starter", async (req, res) => {
  try {
    const { userA, userB } = req.body;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: `Create a fun, short conversation starter between ${userA} and ${userB} for a dating app.`,
        },
      ],
    });

    res.json({
      message: completion.choices[0].message.content,
    });
  } catch (error) {
    console.error("AI error:", error.message);
    res.status(500).json({ error: "AI generation failed" });
  }
});

module.exports = router;