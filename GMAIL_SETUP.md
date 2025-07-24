# Gmail OAuth Setup Instructions

This guide helps you set up Gmail OAuth2 integration for sending emails from your app.

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select an existing one
3. Enable the **Gmail API**:
   - Go to "APIs & Services" → "Library"
   - Search for "Gmail API"
   - Click "Enable"

## Step 2: Create OAuth Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "Create credentials" → "OAuth 2.0 Client IDs"
3. Choose "Web application"
4. Add redirect URI: `http://localhost:3001/callback`
5. Copy the **Client ID** and **Client Secret**

## Step 3: Set Up Environment Variables

1. Copy `.env.example` to `.env`
2. Add your Google OAuth credentials:
   ```
   CLIENT_ID=your_client_id_here.googleusercontent.com
   CLIENT_SECRET=your_client_secret_here
   REDIRECT_URI=http://localhost:3001/callback
   ```

## Step 4: Get Refresh Token

1. Run the auth script:
   ```bash
   node auth.js
   ```

2. Visit: `http://localhost:3001/auth`

3. Click "Authorize Gmail Access"

4. Sign in with your Gmail account

5. Grant the requested permissions

6. Copy the authorization code from the redirect page

7. Visit: `http://localhost:3001/callback?code=YOUR_CODE_HERE`

8. Copy the refresh token and add it to your `.env` file:
   ```
   GMAIL_REFRESH_TOKEN=your_refresh_token_here
   ```

## Step 5: Test the Integration

Once you have the refresh token in your `.env` file, you can test the Gmail integration in your main app by connecting your Gmail account in the Settings page.

## Security Notes

- Keep your refresh token secure - it provides access to your Gmail account
- Never commit your `.env` file to version control
- The refresh token doesn't expire unless explicitly revoked
- You can revoke access anytime in your Google Account settings

## Troubleshooting

- **"Missing environment variables"**: Make sure all variables are set in `.env`
- **"Invalid redirect URI"**: Ensure the redirect URI in Google Console matches exactly
- **"Access denied"**: Make sure Gmail API is enabled in Google Cloud Console
- **"Token exchange failed"**: Try generating a new authorization code