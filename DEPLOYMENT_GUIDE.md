# Triad-Documents Deployment Guide

This guide provides step-by-step instructions for deploying the Triad-Documents service to Render.com as a web service.

## Prerequisites

- A GitHub account with access to the Atrain86/Triad-Documents repository
- A Render.com account
- Access to the Triad-Documents repository's environment variables and secrets

## Repository Details

- **Name**: Triad-Documents
- **Structure**: A Node.js/TypeScript project providing shared Google API services
- **Main Files**:
  - `index.ts` - Main entry point
  - `common/googleAPI/index.ts` - Consolidated Google API service implementation
  - `package.json` - Project dependencies and scripts
  - `tsconfig.json` - TypeScript configuration
  - `render.yaml` - Render deployment configuration

## Deployment Steps

### 1. GitHub Repository Setup

1. Ensure the repository exists at GitHub.com/Atrain86/Triad-Documents
2. Verify that the main branch contains all necessary files:
   - package.json (with build script)
   - tsconfig.json
   - index.ts
   - common/googleAPI/index.ts
   - render.yaml

### 2. Render Deployment

1. **Log in to Render Dashboard**
   - Go to [https://dashboard.render.com/](https://dashboard.render.com/)
   - Sign in with your Render account

2. **Create New Web Service**
   - Click the "New +" button in the top right corner
   - Select "Web Service" from the dropdown menu

3. **Connect to GitHub Repository**
   - Choose "GitHub" as your deployment option
   - Search for and select "Atrain86/Triad-Documents"
   - Click "Connect"

4. **Configure Deployment Settings**
   - Name: `triad-documents`
   - Environment: `Node`
   - Region: Select appropriate region (typically closest to users)
   - Branch: `main`
   - Build Command: `npm run build`
   - Start Command: `node dist/index.js`
   - Instance Type: `Starter` (or appropriate plan)

5. **Set Environment Variables**
   - Add the following environment variables:
     - `PORT`: 5002
     - `NODE_ENV`: production
     - `GOOGLE_SERVICE_ACCOUNT`: (Copy JSON from other services)
   - Alternatively, link to the 'triad-shared-secrets' environment group if available

6. **Advanced Options**
   - Auto-Deploy: Set to Disabled (per render.yaml)
   - Add custom domain: `docs.paintbrain.app` (if available)

7. **Create Web Service**
   - Review all settings
   - Click "Create Web Service"

### 3. Monitor Deployment

1. **Watch Build Logs**
   - Monitor the build and deployment logs in real-time
   - Ensure that the npm build process completes successfully
   - Look for successful TypeScript compilation
   - Watch for the "Server running on port 5002" message

2. **Note Service URL**
   - Upon successful deployment, note the service URL (e.g., triad-documents.onrender.com)
   - This URL will be needed for integration with other services

### 4. Verify Deployment

1. **Service Health Check**
   - Access the service URL to verify that it's responding
   - If a health check endpoint exists, use it to confirm service status

2. **Test Integration**
   - Verify that PaintBrain7 and IDEA-HUB can successfully connect to the service
   - Test Google API integration functionality

### 5. Post-Deployment Tasks

1. **Update Service References**
   - Update any configuration in other services that need to reference Triad-Documents
   - Ensure environment variables are properly synchronized across services

2. **Monitor Performance**
   - Set up monitoring and alerts for the service
   - Watch for any issues with Google API integration

## Troubleshooting

- **Build Failures**: Check npm dependencies and TypeScript errors
- **Runtime Errors**: Examine Render logs for details
- **Connection Issues**: Verify environment variables and network configuration

## Maintenance

- **Updates**: Push changes to the main branch and manually deploy when ready
- **Scaling**: Adjust Render plan as needed for increased traffic
- **Monitoring**: Regularly check logs for errors or performance issues

## Support

For any deployment issues, contact:
- Render Support: https://render.com/support
- Project Team: [Contact information]

---

Last updated: October 26, 2025
