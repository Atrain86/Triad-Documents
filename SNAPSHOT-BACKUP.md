# Code Snapshot - Working Version
**Date**: June 27, 2025, 2:20 AM  
**Status**: Fully functional painting project management app

## What's Working Perfectly:
✓ Photo uploads (camera + library) with HEIC support
✓ Project creation and management
✓ Database connectivity (PostgreSQL via Neon)
✓ File storage and serving
✓ Receipt tracking
✓ Time logging
✓ Dark mode theming
✓ Responsive design

## Critical Files - DO NOT MODIFY:
- `server/db.ts` - Database configuration (fixed WebSocket issues)
- `client/src/components/simple-camera.tsx` - Photo upload functionality
- `server/routes.ts` - API endpoints (especially photo upload route)
- `server/storage.ts` - Database operations
- `shared/schema.ts` - Database schema

## Safe to Modify (with backups):
- UI styling and layout components
- New feature components (in separate files)
- Configuration files
- Documentation

## Backup Commands for Key Files:
```bash
# Before making ANY changes, run:
cp server/db.ts server/db.ts.backup
cp client/src/components/simple-camera.tsx client/src/components/simple-camera.tsx.backup
cp server/routes.ts server/routes.ts.backup
cp server/storage.ts server/storage.ts.backup
```

## Current App URL Structure:
- Main app: `/` (homepage with projects)
- Project view: `/project/:id` (client page)
- Photo uploads: Working via FormData to `/api/projects/:id/photos`
- File serving: `/uploads/[filename]`

## Database Schema (STABLE):
- projects table: id, clientName, address, projectType, roomCount, difficulty, hourlyRate
- photos table: id, projectId, filename, originalName, description, uploadedAt
- receipts table: id, projectId, filename, vendor, amount, description, uploadedAt
- dailyHours table: id, projectId, date, hours, description

## Key Technical Solutions:
1. **Photo Upload Fix**: Convert FileList to Array immediately prevents file clearing
2. **Database Connection**: Proper WebSocket configuration for Neon serverless
3. **File Handling**: HEIC support with proper MIME types
4. **Error Handling**: Non-crashing error boundaries

## Version Control Strategy:
- Any new features should be built as separate components
- Test new features in isolation before integration
- Always backup working files before modifications
- Use feature flags to safely enable/disable new functionality

## Deployment Ready:
- Server runs on port 5000
- All dependencies installed
- Database schema pushed
- File uploads working
- Photo carousel functional