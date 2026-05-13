const { GoogleGenerativeAI } = require('@google/generative-ai');

const geminiModelName = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "AI_KEY_MISSING");
const model = genAI.getGenerativeModel({ model: geminiModelName });

function ensureGeminiApiKey() {
    if (!process.env.GEMINI_API_KEY) {
        const error = new Error("GEMINI_API_KEY is not set on the server environment.");
        error.statusCode = 500;
        throw error;
    }
}

function buildGeminiError(error, fallbackMessage) {
    const rawMessage = error.message || fallbackMessage;
    const isQuotaError = rawMessage.includes('[429 Too Many Requests]') ||
        rawMessage.includes('Quota exceeded') ||
        rawMessage.includes('Too Many Requests');

    if (isQuotaError) {
        const retryMatch = rawMessage.match(/retry in ([^.]+s)/i) || rawMessage.match(/"retryDelay":"([^"]+)"/i);
        const retryText = retryMatch ? ` Please retry in about ${retryMatch[1]}.` : ' Please retry later.';
        const quotaError = new Error(`Gemini quota exceeded for ${geminiModelName}.${retryText}`);
        quotaError.statusCode = 429;
        return quotaError;
    }

    const wrappedError = new Error(`${fallbackMessage}: ${rawMessage}`);
    wrappedError.statusCode = error.statusCode || 500;
    return wrappedError;
}

/**
 * Validates and sanitizes MIME types for Gemini multimodal input.
 * Gemini 1.5 Flash supports: image/png, image/jpeg, image/webp, image/heic, image/heif, application/pdf.
 */
function sanitizeMimeType(mimeType) {
    const validTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/heic', 'image/heif', 'application/pdf'];
    if (validTypes.includes(mimeType)) return mimeType;
    
    // Default to image/jpeg if it's a generic application/octet-stream but we suspect it's an image.
    if (mimeType === 'application/octet-stream' || !mimeType) {
        return 'image/jpeg';
    }
    return mimeType;
}

/**
 * Analyzes a blood report IMAGE directly using Gemini Multimodal Vision.
 */
async function analyzeReportImage(mimeType, base64Image, dietType = 'not set') {
    ensureGeminiApiKey();

    const safeMimeType = sanitizeMimeType(mimeType);

    const prompt = `
    You are an expert medical data extraction assistant. I have provided an image of a blood report.
    The user's dietary preference is: ${dietType}.

    1. Extract values for these specific markers if present: 
       Hemoglobin (hb), Vitamin D (vitamin_d), Vitamin B12 (b12), Iron (iron), Ferritin (ferritin), Zinc (zinc), Magnesium (magnesium), Calcium (calcium).
    
    2. For EACH marker, return:
       - "value": the numeric value found (or null if not found)
       - "unit": the unit found (e.g., 'ng/mL', 'g/dL')
       - "min_normal": the minimum normal value (number)
       - "max_normal": the maximum normal value (number)
       - "status": 'normal', 'moderate', or 'critical' 
       - "recommendation": A very short (1 sentence) specific action based on the value.
         IMPORTANT: All recommendations MUST respect the user's dietary preference (${dietType}).
         If the user is vegetarian/vegan, do NOT suggest meat, fish, or poultry. Suggest plant-based alternatives (e.g., lentils, spinach, fortified plant milks, seeds).

    3. Identify "missing_markers": 
       Provide an array of strings naming which of the markers listed above were NOT found in the image.

    4. Calculate an "overall_score" (0-100) based on the markers found.
    
    5. Provide "ai_analysis": A paragraph summarizing results and actionable insights.
       Again, ensure all dietary advice is STRICTLY ${dietType} compatible.

    6. Provide "daily_suggestions": A list of 3-5 specific daily habits or foods to include.
       CRITICAL: These MUST be ${dietType} compliant. No salmon/meat for vegetarians.

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
                        { inlineData: { data: base64Image, mimeType: safeMimeType } },
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
        throw buildGeminiError(error, 'AI Extraction Failed');
    }
}

async function analyzeMealImage(mimeType, base64Image, dietType = 'not set') {
    ensureGeminiApiKey();

    const prompt = `
    You are a nutritional assistant identifying food and estimating caloric/protein content.
    The user's dietary preference is: ${dietType}.

    1. Identify the food in the image.
    2. Provide "clinical_advice" based on the detected food and the user's ${dietType} preference.
       If the user is vegetarian/vegan and you detect meat/fish (like salmon), GENTLY remind them of their preference and suggest a vegetarian alternative (e.g., "I noticed you're eating salmon, but since you're vegetarian, next time you might try Grilled Tofu for a similar protein boost").
    3. If the food IS compliant with ${dietType}, provide supportive advice.

    Return STRICTLY valid JSON ONLY:
    {
        "food_name": "Name",
        "calories": number,
        "protein": number,
        "clinical_advice": "string"
    }
    `;

    try {
        const response = await model.generateContent({
            contents: [
                {
                    role: 'user',
                    parts: [
                        { inlineData: { data: base64Image, mimeType: sanitizeMimeType(mimeType) } },
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
        throw buildGeminiError(error, 'AI Meal Analysis Failed');
    }
}

async function chatWithAssistant(userMessage, healthContext) {
    ensureGeminiApiKey();

    const prompt = `
    You are NutriSense AI, a helpful nutritional assistant.
    User Health Context: ${JSON.stringify(healthContext)}
    User Message: ${userMessage}
    Provide helpful, supportive advice.
    `;
    
    try {
        const response = await model.generateContent(prompt);
        return response.response.text();
    } catch (error) {
        console.error("Gemini Chat Error:", error);
        throw buildGeminiError(error, 'AI Chat Failed');
    }
}

async function generateWeeklyPlan(healthContext) {
    ensureGeminiApiKey();

    const prompt = `
    You are an expert clinical nutritionist AI. Generate a 7-day personalized meal plan.
    User Context: ${JSON.stringify(healthContext)}

    CRITICAL REQUIREMENTS:
    1. Respect Diet Type: If ${healthContext.diet_type} is "vegetarian" or "vegan", NO meat/fish/eggs (as applicable).
    2. Target Deficiencies: If blood reports show low Vitamin D or Iron, include specific foods (e.g., fortified cereals, spinach, lentils).
    3. Structure: Provide Breakfast, Lunch, Snack, and Dinner for each day.
    4. Format: Return STRICTLY valid JSON ONLY.

    Response Structure:
    {
      "weekly_plan": [
        {
          "day": "Monday",
          "meals": {
            "breakfast": { "menu": "string", "calories": number, "protein": "string", "target": "string (e.g. Iron boost)" },
            "lunch": { "menu": "string", "calories": number, "protein": "string", "target": "string" },
            "snack": { "menu": "string", "calories": number, "protein": "string", "target": "string" },
            "dinner": { "menu": "string", "calories": number, "protein": "string", "target": "string" }
          }
        },
        ... (repeat for 7 days)
      ],
      "prescribed_supplements": [
        { "name": "string", "timing": "string" }
      ]
    }
    `;

    try {
        const result = await model.generateContent(prompt);
        let text = result.response.text();
        if (text.includes('```json')) {
            text = text.replace(/```json/g, '').replace(/```/g, '');
        }
        return JSON.parse(text.trim());
    } catch (error) {
        console.error("Plan Generation Error:", error);
        throw buildGeminiError(error, 'Failed to generate plan');
    }
}

module.exports = {
    analyzeReportImage,
    analyzeMealImage,
    chatWithAssistant,
    generateWeeklyPlan
};
