// Environment variable injection for client-side access
// This creates a global variable for Mapbox token access

export const injectMapboxToken = () => {
  const token = process.env.MAPBOX_ACCESS_TOKEN;
  if (token) {
    return `
      <script>
        window.MAPBOX_ACCESS_TOKEN = '${token}';
      </script>
    `;
  }
  return '';
};