// Mapbox token configuration
// This file handles the Mapbox access token from environment variables

export const getMapboxToken = (): string => {
  // Try multiple sources for the token
  const token = 
    import.meta.env.VITE_MAPBOX_ACCESS_TOKEN ||
    (window as any).MAPBOX_ACCESS_TOKEN ||
    process.env.MAPBOX_ACCESS_TOKEN ||
    '';
    
  if (!token) {
    console.warn('Mapbox access token not found. Map functionality will be limited.');
  }
  
  return token;
};

// Inject token into window for components that need it
if (typeof window !== 'undefined') {
  const token = getMapboxToken();
  if (token) {
    (window as any).MAPBOX_ACCESS_TOKEN = token;
  }
}