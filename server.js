const express = require("express")
const dotenv = require("dotenv");
const { GoogleGenAI } = require("@google/genai");


dotenv.config();
const hotelData = require("./hotelData.json");

const app = express();

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

app.use(express.static("public"));
app.use(express.json());

app.post("/api/chat", async (req, res) => {
    try {
        const message = req.body.message;

        console.log("Customer asked:", message);

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "openrouter/free",
               messages: [
    {
        role: "system",
        content: `
You are a professional and friendly hotel customer assistant.

Here is the hotel's actual information:

${JSON.stringify(hotelData, null, 2)}

Use ONLY the hotel information provided above to answer customer questions.

Do not invent hotel information, room prices, availability, policies, or facilities.

If the customer asks something that is not available in the hotel information, clearly say that the information is not available yet.

Give short, clear, helpful, and professional answers.
`
    },
    {
        role: "user",
        content: message
    }
]
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("OpenRouter error:", data);
            throw new Error("OpenRouter request failed");
        }

        const reply = data.choices[0].message.content;

        res.json({
            reply: reply
        });

    } catch (error) {
        console.error("AI error:", error);

        res.status(500).json({
            reply: "Sorry, the hotel assistant is temporarily unavailable."
        });
    }
});
const PORT = 3000;

app.listen(PORT, () => {
  console.log(`Hotel chatbot server running on http://localhost:${PORT}`);
});