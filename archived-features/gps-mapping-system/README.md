# GPS Mapping System - Archived Components

This directory contains the GPS mapping functionality that was temporarily archived from the main application. These components were working but not quite ready for deployment.

## Archived Components

1. **ClientMap.tsx** - Full-featured map component with custom markers and navigation
2. **EmbeddedClientMap.tsx** - Embedded map view with route planning
3. **SimpleGPSMap.tsx** - Simplified GPS navigation interface
4. **maps.ts** - Utility functions for Google Maps integration

## Features Included

- Mapbox GL JS integration with custom styling
- Real-time GPS location tracking
- Route planning and navigation
- Custom markers with Paint Brain branding
- Geocoding for address conversion
- Google Maps fallback links
- Navigation instructions and distance calculations

## To Restore

When ready to re-integrate this functionality:
1. Copy components back to `client/src/components/`
2. Copy utilities back to `client/src/lib/`
3. Update imports in StreamlinedClientPage.tsx
4. Ensure MAPBOX_ACCESS_TOKEN is configured

## Date Archived
January 21, 2025

## Status
Working in development but needs further testing before deployment