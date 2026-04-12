const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "AI_KEY_MISSING");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

/**
 * Analyzes a blood report IMAGE directly using Gemini Multimodal Vision.
 */
async function analyzeReportImage(mimeType, base64Image) {
    if (!process.env.GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY is not set on the server environment.");
    }
    const prompt = `
    You are an expert medical data extraction assistant. I have provided an image of a blood report.
    
    1. Extract values for these specific markers if present: 
       Hemoglobin (hb), Vitamin D (vitamin_d), Vitamin B12 (b12), Iron (iron), Ferritin (ferritin), Zinc (zinc), Magnesium (magnesium), Calcium (calcium).
    
    2. For EACH marker, return:
       - "value": the numeric value found (or null if not found)
       - "unit": the unit found (e.g., 'ng/mL', 'g/dL')
       - "min_normal": the minimum normal value (number)
       - "max_normal": the maximum normal value (number)
       - "status": 'normal', 'moderate', or 'critical' 
       - "recommendation": A very short (1 sentence) specific action based on the value.

    3. Identify "missing_markers": 
       Provide an array of strings naming which of the markers listed above were NOT found in the image.

    4. Calculate an "overall_score" (0-100) based on the markers found.
    
    5. Provide "ai_analysis": A paragraph summarizing results and actionable insights.

    Respond STRICTLY in valid JSON format matching this structure:
    {
        "overall_score": number,
        "markers": [
            { 
                "name": "Hemoglobin", 
                "key": "hb", 
                "value": number, 
                "unit": "string", 
                "min_normal": number,
                "max_normal": number,
                "level": "string", 
                "recommendation": "string" 
            },
            ...
        ],
        "missing_markers": ["name1", "name2"],
        "daily_suggestions": ["string", "string", "string"],
        "ai_analysis": "string"
    }
    `;

    try {
        const result = await model.generateContent({
            contents: [
                {
                    role: 'user',
                    parts: [
                        { inlineData: { data: base64Image, mimeType: mimeType } },
                        { text: prompt }
                    ]
                }
            ]
        });

        let textMatch = result.response.text();
        if (textMatch.includes('```json')) {
            textMatch = textMatch.replace(/```json/g, '').replace(/```/g, '');
        }
        
        return JSON.parse(textMatch.trim());
    } catch (error) {
        console.error("Gemini Report Vision Error:", error);
        throw new Error("AI failed to read the report image. Please ensure it is clear.");
    }
}

async function analyzeMealImage(mimeType, base64Image) {
    const prompt = `
    You are a nutritional assistant identifying food and estimating caloric/protein content.
    Return STRICTLY valid JSON ONLY:
    {
        "food_name": "Name",
        "calories": number,
        "protein": number
    }
    `;

    try {
        const response = await model.generateContent({
            contents: [
                {
                    role: 'user',
                    parts: [
                        { inlineData: { data: base64Image, mimeType: mimeType } },
                        { text: prompt }
                    ]
                }
            ]
        });

        let textMatch = response.response.text();
        if (textMatch.includes('```json')) {
            textMatch = textMatch.replace(/```json/g, '').replace(/```/g, '');
        }
        return JSON.parse(textMatch.trim());
    } catch (error) {
        console.error("Gemini Meal Analysis Error:", error);
        throw new Error("Failed to analyze meal.");
    }
}

async function chatWithAssistant(userMessage, healthContext) {
    const prompt = `
    You are NutriSense AI, a helpful nutritional assistant.
    User Health Context: ${JSON.stringify(healthContext)}
    User Message: ${userMessage}
    Provide helpful, supportive advice.
    `;
    
    const response = await model.generateContent(prompt);
    return response.response.text();
}

module.exports = {
    analyzeReportImage, // Export new method
    analyzeMealImage,
    chatWithAssistant
};
