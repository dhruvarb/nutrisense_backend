const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

/**
 * Analyzes OCR text from a blood report to extract key nutritional markers.
 * Identifies missing markers to enable the frontend to ask the user.
 */
async function analyzeReportData(extractedText) {
    const prompt = `
    You are an expert medical data extraction assistant. I will provide OCR text from a blood report.
    
    1. Extract values for these specific markers if present: 
       Hemoglobin (hb), Vitamin D (vitamin_d), Vitamin B12 (b12), Iron (iron), Ferritin (ferritin), Zinc (zinc), Magnesium (magnesium), Calcium (calcium).
    
    2. For EACH marker, return:
       - "value": the numeric value found (or null if not found)
       - "unit": the unit found (e.g., 'ng/mL', 'g/dL')
       - "min_normal": the minimum normal value for this marker (number)
       - "max_normal": the maximum normal value for this marker (number)
       - "status": 'normal', 'moderate', or 'critical' based on standard healthy ranges.
       - "recommendation": A very short (1 sentence) specific action based on the value.

    3. Identify "missing_markers": 
       Provide an array of strings naming which of the markers listed above were NOT found in the OCR text.

    4. Calculate an "overall_score" (0-100) based on the markers found.
    
    5. Provide "ai_analysis": A paragraph summarizing the overall health and nutrition actionable insights.

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
            ... (only include those found)
        ],
        "missing_markers": ["name1", "name2"],
        "daily_suggestions": ["string", "string", "string"],
        "ai_analysis": "string"
    }

    OCR Text:
    ${extractedText}
    `;
    
    try {
        const result = await model.generateContent(prompt);
        let textMatch = result.response.text();
        
        // Clean JSON formatting
        if (textMatch.includes('```json')) {
            textMatch = textMatch.replace(/```json/g, '').replace(/```/g, '');
        }
        
        const data = JSON.parse(textMatch.trim());
        return data;
    } catch (error) {
        console.error("Gemini Analysis Error:", error);
        throw new Error("Failed to extract medical data correctly.");
    }
}

async function analyzeMealImage(mimeType, base64Image) {
    const prompt = `
    You are a nutritional assistant. I have provided an image of a meal.
    Please identify the food and estimate its caloric and protein content.
    Return STRICTLY valid JSON ONLY:
    {
        "food_name": "Name of the meal/food",
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
    
    Provide helpful, supportive, and medically safe dietary advice. Keep it concise.
    `;
    
    const response = await model.generateContent(prompt);
    return response.response.text();
}

module.exports = {
    analyzeReportData,
    analyzeMealImage,
    chatWithAssistant
};
