import { RequestHandler } from 'express';
import fetch from 'node-fetch';

/**
 * Configuration for the IDEA-HUB proxy
 */
interface IdeaHubProxyConfig {
  targetUrl: string;
  pathPrefix: string;
}

/**
 * Create middleware that proxies requests to the IDEA-HUB service
 * 
 * @param config Configuration for the proxy
 * @returns Express middleware function
 */
export function createIdeaHubProxy(config: IdeaHubProxyConfig): RequestHandler {
  const { targetUrl, pathPrefix } = config;
  
  if (!targetUrl) {
    throw new Error('IDEA_HUB_URL environment variable must be set for proxy');
  }
  
  return async (req, res, next) => {
    // Only proxy requests that match the specified prefix
    if (!req.path.startsWith(pathPrefix)) {
      return next();
    }
    
    try {
      // Construct the target URL by replacing the prefix
      const targetPath = req.path.replace(new RegExp(`^${pathPrefix}`), '');
      const url = new URL(targetPath, targetUrl);
      
      // Add query parameters
      Object.entries(req.query).forEach(([key, value]) => {
        url.searchParams.append(key, value as string);
      });
      
      console.log(`📡 Proxying request to IDEA-HUB: ${url.toString()}`);
      
      // Forward the request to the target server
      const response = await fetch(url.toString(), {
        method: req.method,
        headers: {
          'Content-Type': req.get('Content-Type') || 'application/json',
          'Authorization': req.get('Authorization') || '',
          'X-Forwarded-For': req.ip,
          'X-Forwarded-Host': req.hostname,
          'X-Forwarded-Proto': req.protocol,
        },
        body: ['GET', 'HEAD'].includes(req.method) ? undefined : JSON.stringify(req.body),
      });
      
      // Return the response from the target server
      const data = await response.text();
      
      // Set the same status code
      res.status(response.status);
      
      // Set the response headers
      response.headers.forEach((value, key) => {
        res.setHeader(key, value);
      });
      
      // Send the response body
      return res.send(data);
    } catch (error) {
      console.error('❌ Proxy error:', error);
      return res.status(502).json({
        error: 'Failed to proxy request to IDEA-HUB service',
        details: error.message,
      });
    }
  };
}
