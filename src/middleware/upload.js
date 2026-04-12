const multer = require('multer');

// Store files in memory buffer primarily.
// Since Tesseract on free tier can process buffers directly and Gemini handles Base64 image inputs perfectly.
const storage = multer.memoryStorage();

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

module.exports = upload;
