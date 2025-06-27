# Debug Snapshot - File Display Issue
*Created: June 27, 2025 - 3:57 AM*

## Problem Summary
PDF files upload successfully to database but don't appear in UI file list component.

## Current Status
- **Database**: 9 PDF receipts confirmed stored (IDs 1-9)
- **Backend API**: Working correctly (`GET /api/projects/1/receipts` returns receipt data)
- **Frontend Query**: Receiving wrong data (projects instead of receipts)
- **Upload Process**: Functioning perfectly (files save to database)

## Key Evidence

### Database State (Confirmed Working)
```bash
curl http://localhost:5000/api/projects/1/receipts
# Returns: [{"id":1,"projectId":1,"vendor":"Iris Gildea.pdf",...}, {...}]
```

### Console Debug Output (The Problem)
```
SimpleFilesList - receipts: [{"id":1,"clientName":"","address":"","projectType":"exterior"...}]
```
**Issue**: Query returns project data instead of receipt data

### Server Logs (Backend Working)
```
GET /api/projects/1/receipts 200 in 924ms :: [{"id":1,"projectId":1,"vendor":"I…
```

## Technical Details

### Affected Component
**File**: `client/src/components/StreamlinedClientPage.tsx` (lines 10-25)
```typescript
function SimpleFilesList({ projectId }: { projectId: number }) {
  const { data: receipts = [], isLoading, error } = useQuery<Receipt[]>({
    queryKey: ['/api/projects', projectId, 'receipts'],
  });
  // Component shows nothing because receipts.length === 0 (wrong data type)
}
```

### Query Configuration
- **Query Key**: `['/api/projects', projectId, 'receipts']`
- **Expected Type**: `Receipt[]`
- **Actual Response**: Project objects
- **Cache Invalidation**: `queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'receipts'] });`

## User Workflow That Works
1. User clicks Files button
2. PDF uploads successfully (201 Created)
3. Database stores receipt record
4. Cache invalidation triggered
5. **FAILS**: UI doesn't refresh to show new file

## Attempted Fixes
1. ✅ Fixed cache invalidation key mismatch
2. ✅ Removed debugging console logs
3. ✅ Added loading states and error handling
4. ❌ Query still returns wrong data type

## Next Steps for Resolution
The issue appears to be in the query routing or data fetching layer. The backend endpoint works correctly, but the frontend query receives project data instead of receipt data.

## Files to Investigate
- `client/src/components/StreamlinedClientPage.tsx` (SimpleFilesList query)
- Query client configuration in `client/src/lib/queryClient.ts`
- Possible routing conflict in backend or query key resolution

## Expected Fix
SimpleFilesList should display uploaded PDFs like:
```
Files (9)
📄 Iris Gildea.pdf [View]
📄 Elegant Fabricating_invoice 003.pdf [View]
📄 invoice-mike-2025-06-26.pdf [View]
```