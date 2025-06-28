// Generate Google Maps link from client address data
export const generateMapsLink = (address: string, city?: string, province?: string, postalCode?: string) => {
  // Combine all address components
  const addressParts = [address, city, province, postalCode].filter(Boolean);
  const fullAddress = addressParts.join(', ');
  
  // Encode for URL
  const encodedAddress = encodeURIComponent(fullAddress);
  
  // Return Google Maps search URL
  return `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
};

// Generate driving directions from A-Frame Painting office to client location
export const generateDirectionsLink = (address: string, city?: string, province?: string, postalCode?: string) => {
  const clientAddressParts = [address, city, province, postalCode].filter(Boolean);
  const clientAddress = clientAddressParts.join(', ');
  const encodedClientAddress = encodeURIComponent(clientAddress);
  
  // A-Frame Painting office address
  const officeAddress = encodeURIComponent('884 Hayes Rd, Manson\'s Landing, BC V0P1K0');
  
  return `https://www.google.com/maps/dir/${officeAddress}/${encodedClientAddress}`;
};

// Copy client location info to clipboard
export const copyLocationInfo = async (address: string, city?: string, province?: string, postalCode?: string) => {
  const addressParts = [address, city, province, postalCode].filter(Boolean);
  const fullAddress = addressParts.join(', ');
  
  try {
    await navigator.clipboard.writeText(fullAddress);
    return true;
  } catch (error) {
    console.error('Failed to copy address to clipboard:', error);
    return false;
  }
};