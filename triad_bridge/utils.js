const fs = require('fs');
const path = require('path');

// Timestamp helper
const getTimestamp = () => {
    return new Date().toISOString();
};

// Logging helper
const log = (message, type = 'INFO') => {
    const timestamp = getTimestamp();
    const logMessage = `[${timestamp}] [${type}] ${message}\n`;
    
    // Log to console
    console.log(logMessage);
    
    // Append to log file
    fs.appendFileSync(
        path.join(__dirname, 'triad_bridge.log'),
        logMessage,
        'utf8'
    );
};

// File helper
const readLastLine = async (filePath) => {
    try {
        const content = await fs.promises.readFile(filePath, 'utf8');
        const lines = content.split('\n').filter(Boolean);
        return lines[lines.length - 1];
    } catch (error) {
        log(`Error reading file ${filePath}: ${error.message}`, 'ERROR');
        return null;
    }
};

// File append helper
const appendToFile = async (filePath, content) => {
    try {
        await fs.promises.appendFile(filePath, content + '\n', 'utf8');
        return true;
    } catch (error) {
        log(`Error appending to file ${filePath}: ${error.message}`, 'ERROR');
        return false;
    }
};

module.exports = {
    getTimestamp,
    log,
    readLastLine,
    appendToFile
};
