require('dotenv').config({ path: '../.env' });
const { OpenAI } = require('openai');
const { log } = require('./utils');
const { startWatcher } = require('./watcher');

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Send message to GPT and get response
async function sendToGPT(message) {
    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [
                {
                    role: "system",
                    content: "You are part of the Triad system, communicating directly with Cline through a local bridge. Keep responses concise and focused on the task at hand."
                },
                {
                    role: "user",
                    content: message
                }
            ],
            temperature: 0.7,
            max_tokens: 150
        });

        const response = completion.choices[0].message.content;
        log(`GPT Response: ${response}`);
        return response;
    } catch (error) {
        log(`Error communicating with GPT: ${error.message}`, 'ERROR');
        return null;
    }
}

// Start the bridge
async function startBridge() {
    log('Starting Triad Bridge...');
    
    try {
        // Test OpenAI connection
        const testResponse = await sendToGPT('Test connection');
        if (testResponse) {
            log('OpenAI API connection successful');
            
            // Start file watcher
            startWatcher(sendToGPT);
            log('Triad Bridge online – watching triad_context/');
        } else {
            log('Failed to connect to OpenAI API', 'ERROR');
        }
    } catch (error) {
        log(`Bridge startup error: ${error.message}`, 'ERROR');
    }
}

// Start the bridge when this file is run directly
if (require.main === module) {
    startBridge();
}

module.exports = {
    sendToGPT
};
