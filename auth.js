const express = require('express');
const { google } = require('googleapis');
const dotenv = require('dotenv');
const open = require('open');

// Load environment variables
dotenv.config();

const app = express();
const port = 3001; // Using different port to avoid conflicts

// Gmail API scopes
const SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.readonly',
];

// Check for required environment variables
if (!process.env.CLIENT_ID || !process.env.CLIENT_SECRET || !process.env.REDIRECT_URI) {
  console.error('❌ Missing required environment variables:');
  console.error('   CLIENT_ID, CLIENT_SECRET, REDIRECT_URI');
  console.error('   Please add them to your .env file');
  process.exit(1);
}

// OAuth2 client setup
const oAuth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  process.env.REDIRECT_URI
);

// Step 1: Generate and display authorization URL
app.get('/auth', (req, res) => {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent', // Forces refresh token to be returned
    scope: SCOPES,
  });
  
  console.log('\n🔗 Authorization URL generated:');
  console.log(authUrl);
  console.log('\n📋 Instructions:');
  console.log('1. Copy the above URL and paste it in your browser');
  console.log('2. Sign in with your Gmail account');
  console.log('3. Grant the requested permissions');
  console.log('4. Copy the authorization code from the redirect page');
  console.log('5. Visit: http://localhost:3001/callback?code=YOUR_CODE_HERE');
  
  res.send(`
    <h2>Gmail OAuth Authorization</h2>
    <p>Click the link below to authorize Gmail access:</p>
    <a href="${authUrl}" target="_blank" style="
      display: inline-block;
      padding: 12px 24px;
      background-color: #4285f4;
      color: white;
      text-decoration: none;
      border-radius: 4px;
      font-family: Arial, sans-serif;
    ">Authorize Gmail Access</a>
    
    <h3>After authorization:</h3>
    <ol>
      <li>Copy the authorization code from the redirect page</li>
      <li>Visit: <code>http://localhost:3001/callback?code=YOUR_CODE_HERE</code></li>
    </ol>
  `);
});

// Step 2: Handle authorization callback
app.get('/callback', async (req, res) => {
  const { code } = req.query;
  
  if (!code) {
    return res.status(400).send(`
      <h2>Missing Authorization Code</h2>
      <p>Please provide the authorization code in the URL:</p>
      <code>http://localhost:3001/callback?code=YOUR_CODE_HERE</code>
    `);
  }
  
  try {
    console.log('\n🔄 Exchanging authorization code for tokens...');
    
    // Exchange authorization code for tokens
    const { tokens } = await oAuth2Client.getToken(code);
    
    // Get user email for verification
    oAuth2Client.setCredentials(tokens);
    const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });
    const profile = await gmail.users.getProfile({ userId: 'me' });
    const userEmail = profile.data.emailAddress;
    
    console.log('✅ Authorization successful!');
    console.log('📧 Gmail account:', userEmail);
    console.log('🔑 Refresh token obtained');
    
    // Display the refresh token
    res.send(`
      <h2>✅ Gmail Authorization Successful!</h2>
      <p><strong>Email:</strong> ${userEmail}</p>
      <p><strong>Refresh Token:</strong></p>
      <textarea readonly style="
        width: 100%;
        height: 100px;
        font-family: monospace;
        font-size: 12px;
        border: 1px solid #ccc;
        padding: 8px;
        background-color: #f5f5f5;
      ">${tokens.refresh_token}</textarea>
      
      <h3>Next Steps:</h3>
      <ol>
        <li>Copy the refresh token above</li>
        <li>Add it to your .env file as: <code>GMAIL_REFRESH_TOKEN=${tokens.refresh_token}</code></li>
        <li>You can now close this window and stop the auth server (Ctrl+C)</li>
      </ol>
      
      <p><em>Keep this refresh token secure - it allows access to your Gmail account!</em></p>
    `);
    
    // Also log to console for easy copying
    console.log('\n📋 Add this to your .env file:');
    console.log(`GMAIL_REFRESH_TOKEN=${tokens.refresh_token}`);
    console.log('\n🛑 You can now stop this server (Ctrl+C)');
    
  } catch (error) {
    console.error('❌ Error during token exchange:', error.message);
    res.status(500).send(`
      <h2>❌ Authorization Failed</h2>
      <p>Error: ${error.message}</p>
      <p>Please try the authorization process again.</p>
    `);
  }
});

// Root route with instructions
app.get('/', (req, res) => {
  res.send(`
    <h1>Gmail OAuth Setup</h1>
    <p>This tool helps you get a Gmail refresh token for your app.</p>
    <p><a href="/auth">Start Authorization Process</a></p>
    
    <h3>Environment Variables Required:</h3>
    <ul>
      <li>CLIENT_ID: ${process.env.CLIENT_ID ? '✅ Set' : '❌ Missing'}</li>
      <li>CLIENT_SECRET: ${process.env.CLIENT_SECRET ? '✅ Set' : '❌ Missing'}</li>
      <li>REDIRECT_URI: ${process.env.REDIRECT_URI ? '✅ Set' : '❌ Missing'}</li>
    </ul>
  `);
});

// Start the server
app.listen(port, () => {
  console.log('🚀 Gmail OAuth Setup Server Started');
  console.log(`📍 Server running at: http://localhost:${port}`);
  console.log('🎯 Visit: http://localhost:3001/auth to begin authorization');
  console.log('\n📝 Environment variables status:');
  console.log(`   CLIENT_ID: ${process.env.CLIENT_ID ? '✅ Set' : '❌ Missing'}`);
  console.log(`   CLIENT_SECRET: ${process.env.CLIENT_SECRET ? '✅ Set' : '❌ Missing'}`);
  console.log(`   REDIRECT_URI: ${process.env.REDIRECT_URI ? '✅ Set' : '❌ Missing'}`);
  
  if (!process.env.CLIENT_ID || !process.env.CLIENT_SECRET || !process.env.REDIRECT_URI) {
    console.log('\n⚠️  Please add the missing environment variables to your .env file first!');
  }
});