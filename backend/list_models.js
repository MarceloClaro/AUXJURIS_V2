require('dotenv').config({ path: __dirname + '/.env' });
require('dotenv').config({ path: __dirname + '/.env.new' });
require('dotenv').config({ path: __dirname + '/.env.example' });

const { GoogleGenerativeAI } = require("@google/generative-ai");
const apiKey = process.env.GOOGLE_API_KEY || 'YOUR_FALLBACK_API_KEY'; // Use a placeholder or fallback if needed

async function listModels() {
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    console.log("Available models:");
    const models = await genAI.models.list();
    for await (const model of models) {
      console.log(model.name);
    }
  } catch (error) {
    console.error("Error listing models:", error);
  }
}

listModels(); 