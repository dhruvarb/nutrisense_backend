require('dotenv').config(); // Note: The user uses GenAI standard package or the newer `@google/genai`. Let's assume standard since it was an alternate in the npm command. Wait, I installed `@google/generative-ai`, not `@google/genai`. Let me fix imports.
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }); // Fast and cheap for simple extracts and chat

async function analyzeReportData(extractedText) {
    const prompt = `
    You are a medical data extraction assistant. I will provide you with OCR text extracted from a blood report.
    Please extract the exact values for hemoglobin, vitamin_d, and iron.
    Additionally, please provide a short string naming any deficiencies found based on standard ranges, 
    and a simple "ai_analysis" paragraph explaining what this means for the patient and dietary recommendations.
    
    Respond STRICTLY in valid JSON format only, matching this structure exactly:
    {
        "hb": "string describing hemoglobin value (e.g., '12.5 g/dL') or 'Not Found'",
        "vitamin_d": "string describing vitamin d value or 'Not Found'",
        "iron": "string describing iron value or 'Not Found'",
        "deficiencies": "string describing any deficiencies based on values",
        "ai_analysis": "string"
    }

    OCR Text:
    ${extractedText}
    `;
    
    // We expect JSON back
    const response = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }]
    });

    try {
        let textMatch = response.response.text();
        // Extract json manually in case it brings markdown ticks
        if (textMatch.includes('```json')) {
            textMatch = textMatch.replace(/```json/g, '').replace(/```/g, '');
        }
        return JSON.parse(textMatch.trim());
    } catch (error) {
        console.error("Gemini Parse Error:", error);
        throw new Error("Failed to parse Gemini response into expected JSON.");
    }
}

async function analyzeMealImage(mimeType, base64Image) {
    const prompt = `
    You are a nutritional assistant. I have provided an image of a meal.
    Please identify the food and estimate its caloric and protein content.
    Return STRICTLY valid JSON ONLY:
    {
        "food_name": "Name of the meal/food",
        "calories": "Estimated total calories as a number",
        "protein": "Estimated total protein in grams as a number"
    }
    `;

    const response = await model.generateContent({
        contents: [
            {
                role: 'user',
                parts: [
                    {
                        inlineData: {
                            data: base64Image,
                            mimeType: mimeType
                        }
                    },
                    { text: prompt }
                ]
            }
        ]
    });

    try {
        let textMatch = response.response.text();
        if (textMatch.includes('```json')) {
            textMatch = textMatch.replace(/```json/g, '').replace(/```/g, '');
        }
        return JSON.parse(textMatch.trim());
    } catch (error) {
        console.error("Gemini Meal Parse Error:", error);
        throw new Error("Failed to parse meal analysis.");
    }
}

async function chatWithAssistant(userMessage, healthContext) {
    const prompt = `
    You are NutriSense AI, a helpful nutritional assistant.
    Here is the user's health context (if any):
    ${JSON.stringify(healthContext)}
    
    User message: ${userMessage}
    
    Provide helpful, supportive, and medically safe dietary advice.
    `;
    
    const response = await model.generateContent(prompt);
    return response.response.text();
}

module.exports = {
    analyzeReportData,
    analyzeMealImage,
    chatWithAssistant
};
