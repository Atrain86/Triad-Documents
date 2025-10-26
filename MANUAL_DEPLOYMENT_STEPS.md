# Manual Render Deployment Steps for Triad-Documents

Due to GitHub connectivity issues, follow these steps to deploy the Triad-Documents service manually via the Render dashboard.

## Preparation

1. Ensure you have:
   - Access to the Render dashboard
   - Your Triad-Documents code repository locally at `/Users/atrain/Documents/AI_LOCAL/Triad-Documents`
   - Required environment variables and secrets

## Deployment Steps

### 1. Create a New Web Service in Render

1. **Log in to Render Dashboard**
   - Go to [https://dashboard.render.com/](https://dashboard.render.com/)
   - Sign in with your credentials

2. **Create New Web Service**
   - Click the "New +" button in the top right corner
   - Select "Web Service" from the dropdown menu

3. **Choose Deployment Method**
   - Select "Deploy from existing image" or "Upload files directly"
   - If using the upload option, create a ZIP archive of your local repository:
     ```bash
     cd /Users/atrain/Documents/AI_LOCAL/Triad-Documents
     zip -r triad-documents.zip .
     ```

### 2. Configure Deployment Settings

1. **Basic Settings**
   - Name: `triad-documents`
   - Region: Select appropriate region (closest to your users)
   - Instance Type: `Starter` (or appropriate plan)

2. **Build & Runtime Settings**
   - Environment: `Node`
   - Build Command: `npm run build`
   - Start Command: `node dist/index.js`
   - Auto-Deploy: Disabled

3. **Set Environment Variables**
   - Add the following environment variables:
     - `PORT`: 5002
     - `NODE_ENV`: production
     - `GOOGLE_SERVICE_ACCOUNT`: (Copy JSON from existing services)
   - Alternatively, link to 'triad-shared-secrets' environment group if available

4. **Advanced Options**
   - Custom Domain (Optional): `docs.paintbrain.app`

### 3. Create and Monitor

1. **Create Service**
   - Review all settings
   - Click "Create Web Service"

2. **Monitor Deployment**
   - Watch the build logs in real-time
   - Look for "Server running on port 5002" message
   - Note the generated Render URL (e.g., triad-documents.onrender.com)

## Testing the Deployment

1. **Verify Endpoint**
   - Access the `/api/ping` endpoint: `https://[your-render-url]/api/ping`
   - Expected response: `{ "message": "Server is alive" }`

2. **Verify Integration**
   - Test integration with PaintBrain7 and IDEA-HUB
   - Update any service references to use the new Render URL

## Troubleshooting

- **Build Failures**: Check build logs for errors in npm dependencies or TypeScript compilation
- **Runtime Errors**: Examine logs for any startup errors
- **API Issues**: Verify environment variables and network configurations

---

Last Updated: October 26, 2025
