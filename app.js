require('dotenv').config();
const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
    model: 'models/gemini-2.0-flash',  // Corrected model name
    generationConfig: {
        temperature: 0.5,
    }
});

const upload = multer({ dest: 'uploads/' });
const PORT = 3000;

const imageToGenerativePart = (filePath) => ({
    inlineData: {
        data: fs.readFileSync(filePath).toString('base64'),
        mimeType: 'image/png',
    },
})

app.post('/generate-text', async (req, res) => {
    const { prompt } = req.body;
    try {
        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text();

        res.json({ generatedText: text });
    } catch (error) {
        console.error('Error generating text:', error);
        res.status(500).json({ error: 'Failed to generate text' });
    }
});

app.post('/generate-from-image', upload.single('image'), async (req, res) => {
    const prompt = req.body.prompt || 'Describe the image';

    if (!req.file) {
        return res.status(400).json({ error: 'No image file uploaded' });
    }

    try {
        const image = imageToGenerativePart(req.file.path);
        const result = await model.generateContent([prompt, image]);
        const response = result.response;
        res.json({ output: response.text() });
    } catch (error) {
        console.error('Error processing image:', error);
        res.status(500).json({ error: error.message });
    } finally {
        // Clean up uploaded file
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
    }
});

app.post('/generate-from-document', upload.single('document'), async (req, res) => {
    const filePath = req.file.path;
    const buffer = fs.readFileSync(filePath);
    const base64Data = buffer.toString('base64');
    const mimeType = req.file.mimetype;

    try {
        const documentPart = {
            inlineData: {
                data: base64Data,
                mimeType: mimeType
            }
        };

        const result = await model.generateContent([
            'Analyze this document:',
            documentPart
        ]);

        const response = result.response;
        res.json({ output: response.text() });
    } catch (error) {
        console.error('Document processing error:', error);
        res.status(500).json({
            error: error.message,
            supportedDocs: ['application/pdf', 'text/plain']
        });
    } finally {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);  // Fixed typo from unlinksync to unlinkSync
        }
    }
});

app.post('/generate-from-audio', upload.single('audio'), async (req, res) => {
    try {
        // Validate audio file exists
        if (!req.file) {
            return res.status(400).json({ error: 'No audio file uploaded' });
        }

        // Read and encode audio file
        const audioBuffer = fs.readFileSync(req.file.path);
        const base64Audio = audioBuffer.toString('base64');

        // Create audio part with correct MIME type
        const audioPart = {
            inlineData: {
                data: base64Audio,
                mimeType: req.file.mimetype  // Fixed typo from mineType to mimeType
            }
        };

        // Generate content with Gemini
        const result = await model.generateContent([
            'Transcribe and analyze this audio:',
            audioPart
        ]);

        const response = result.response;
        res.json({
            transcript: response.text(),
            audioFormat: req.file.mimetype
        });

    } catch (error) {
        console.error('Audio processing error:', error);
        res.status(500).json({
            error: error.message,
            supportedFormats: ['audio/mpeg', 'audio/wav', 'audio/webm']
        });
    } finally {
        if (req.file?.path && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
    }
});


app.listen(PORT, () => {
    console.log(`Server is running on port http://localhost:${PORT}`);
});