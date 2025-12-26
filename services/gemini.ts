import { GoogleGenAI } from "@google/genai";
import { RESTAURANTS } from "../data";

// Initialize Gemini AI with API key from environment variables as per guidelines.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getGeminiRecommendation = async (userQuery: string): Promise<string> => {
  const dataContext = RESTAURANTS.map(r => 
    `${r.name} (Cuisines: ${r.cuisine.join(', ')}, Price: ${r.priceRange}) - Best items: ${r.menu.flatMap(c => c.items.filter(i => i.isBestseller).map(i => i.name)).join(', ')}`
  ).join('\n');

  const prompt = `
    You are CityBite's AI Concierge. Recommend a restaurant from the list below based on the user's craving.
    Keep it short, fun, and appetizing (max 50 words).
    
    Available Restaurants:
    ${dataContext}

    User Craving: "${userQuery}"
    
    Answer:
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    // Use .text property as per guidelines
    return response.text || "I couldn't find a perfect match, but all our options are delicious!";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Oops! My AI brain froze. Try exploring the list manually!";
  }
};