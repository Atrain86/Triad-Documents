const chokidar = require('chokidar');
const path = require('path');
const { log, readLastLine, appendToFile } = require('./utils');

// Communication file path
const COMM_FILE = path.join(__dirname, '../triad_context/triad_comm_channel.txt');

// Initialize watcher
function startWatcher(sendToGPT) {
    // Create watcher instance
    const watcher = chokidar.watch(COMM_FILE, {
        ignoreInitial: true,
        awaitWriteFinish: {
            stabilityThreshold: 100,
            pollInterval: 100
        }
    });

    // Handle file changes
    watcher.on('change', async () => {
        try {
            // Read the last line (new message)
            const lastLine = await readLastLine(COMM_FILE);
            if (!lastLine) return;

            log(`New message received: ${lastLine}`);

            // Only process messages from Cline
            if (lastLine.startsWith('Cline:')) {
                // Extract the actual message
                const message = lastLine.replace('Cline:', '').trim();

                // Get GPT's response
                const response = await sendToGPT(message);
                if (response) {
                    // Append GPT's response to the communication file
                    const formattedResponse = `GPT: ${response}`;
                    await appendToFile(COMM_FILE, formattedResponse);
                    log('Response sent successfully');
                }
            }
        } catch (error) {
            log(`Error processing message: ${error.message}`, 'ERROR');
        }
    });

    // Handle watcher errors
    watcher.on('error', error => {
        log(`Watcher error: ${error.message}`, 'ERROR');
    });

    // Log when watcher is ready
    watcher.on('ready', () => {
        log('File watcher initialized and ready');
    });

    return watcher;
}

module.exports = {
    startWatcher
};
