# PaintBrain Feature & Functionality Report

**Last Updated:** January 2026  
**Application Version:** Production Recovery Build  
**Purpose:** Comprehensive technical blueprint for rebuilding PaintBrain from scratch

---

## 1. Overview

### Application Purpose
PaintBrain is a comprehensive project management application designed specifically for painting contractors. It provides end-to-end tools for managing clients, tracking projects, documenting work with photos, managing receipts and expenses, generating professional estimates and invoices, tracking labor hours, and navigating to client locations.

### Core Technology Stack

**Frontend:**
- **React 18.3.1** with TypeScript for type-safe component development
- **Vite 5.4.19** as the build tool and development server
- **Wouter 3.3.5** for client-side routing (lightweight React Router alternative)
- **TanStack Query v5** (formerly React Query) for server state management and caching
- **Tailwind CSS 3.4.17** with custom design system for styling
- **Shadcn/ui** component library for consistent UI elements

**Backend:**
- **Express 4.21.2** server with TypeScript
- **PostgreSQL** (Neon-backed) for persistent data storage
- **Drizzle ORM 0.39.1** for type-safe database operations
- **Multer 2.0.1** for file upload handling
- **JWT (jsonwebtoken 9.0.2)** for authentication

**External Services:**
- **OpenAI GPT-4o Vision API** for receipt OCR and data extraction
- **Tesseract.js 6.0.1** as fallback OCR for receipt processing
- **Mapbox GL 3.14.0** for interactive maps and location visualization
- **Google Calendar API** for scheduling integration
- **SendGrid / Gmail** for transactional emails (estimates, invoices)

**Document Generation:**
- **html2canvas 1.4.1** for DOM-to-canvas conversion
- **jsPDF 3.0.2** for client-side PDF generation

**File Processing:**
- **Sharp 0.34.2** for server-side image compression and manipulation
- Client-side canvas API for photo compression before upload

### Project Structure

```
paintbrain-app/
├── client/                      # Frontend React application
│   ├── src/
│   │   ├── components/         # React components
│   │   │   ├── ui/            # Shadcn UI components (button, card, dialog, etc.)
│   │   │   ├── admin/         # Admin dashboard components
│   │   │   ├── auth/          # Login and auth forms
│   │   │   └── settings/      # Settings and configuration pages
│   │   ├── pages/             # Route-level page components
│   │   ├── contexts/          # React contexts (AuthContext)
│   │   ├── hooks/             # Custom React hooks
│   │   ├── lib/               # Utility libraries (queryClient, imageCompression, maps)
│   │   └── utils/             # Utility functions
│   ├── index.css              # Global styles and CSS variables
│   └── vite.config.ts         # Vite configuration
├── server/                     # Backend Express server
│   ├── routes/                # API route modules
│   ├── uploads/               # File storage (photos, receipts)
│   ├── db.ts                  # Database connection
│   ├── storage.ts             # Data access layer
│   ├── routes.ts              # Main routes file
│   ├── auth.ts                # Authentication logic
│   ├── email.ts               # Email sending logic
│   ├── visionReceiptHandler.ts # OpenAI Vision receipt processing
│   └── imageProcessing.ts     # Server-side image manipulation
├── shared/                     # Shared types and schemas
│   └── schema.ts              # Drizzle database schemas and Zod validation
└── package.json               # Dependencies and scripts
```

---

## 2. Authentication & Login Flow

### Login System
**File:** `client/src/components/auth/LoginForm.tsx`

**Features:**
- Simple email + password authentication
- JWT token-based session management
- Hardcoded admin credentials for testing:
  - Email: `admin@paintbrain.com` or `cortespainter@gmail.com`
  - Password: `brain`
- Token stored in localStorage after successful login
- AuthContext provides user state globally

**Validation:**
- Email format validation
- Required field checks
- Error messages displayed inline

**Visual Design:**
- Dark theme login page with Paint Brain branding
- Purple accent colors (#8B5FBF)
- Smooth transitions on button hover
- Loading spinner during authentication

**Backend Endpoint:**
- `POST /api/auth/login`
- Returns: `{ token: string, user: UserObject }`

### AuthContext
**File:** `client/src/contexts/AuthContext.tsx`

**Provides:**
- `user` object with id, email, name, role
- `login(email, password)` function
- `logout()` function
- `isAuthenticated` boolean state
- Token persistence across page refreshes

**Usage Pattern:**
```typescript
const { user, isAuthenticated, login, logout } = useAuth();
```

### Login Gate Component
**File:** `client/src/components/LoginGate.tsx`

**Behavior:**
- Wraps entire app to require authentication
- Shows login form if not authenticated
- Automatically redirects to homepage after login
- No flash of unauthenticated content

---

## 3. Dashboard & Navigation

### Homepage / Dashboard
**Files:** 
- `client/src/pages/Projects.tsx`
- `client/src/components/StreamlinedHomepage.tsx`

**Layout:**
- Grid of client project cards (responsive: 1 col mobile, 2 col tablet, 3 col desktop)
- Each card shows:
  - Client avatar/photo (circular, 56px diameter)
  - Client name (truncated if too long)
  - Last updated date
  - Project statistics: Hours worked, Receipt count, Total expenses
  - Project ID badge
- Dark background (#000) with gray-900 cards
- Skeleton loading states while data fetches

**Navigation:**
- Clicking a client card opens `StreamlinedClientPage` for that project
- Back button returns to homepage
- Uses Wouter's `useLocation` hook for routing

**State Management:**
- TanStack Query for fetching projects: `useQuery({ queryKey: ['/api/projects'] })`
- Loading states with animated skeleton screens
- Error handling with user-friendly error messages

**API Integration:**
- `GET /api/projects` returns array of projects
- Each project includes computed stats (hours, receipts, totalAmount)

### Routing System
**File:** `client/src/App.tsx`

**Routes:**
- `/` - Homepage (Projects grid)
- `/projects/:id` - Individual project detail page
- `/map` - Mapbox location map
- `/dashboard` - Admin dashboard
- `/404` - Not found page

**Router:** Wouter (lightweight, ~1.2KB)
```typescript
<Route path="/" component={Projects} />
<Route path="/projects/:id" component={(params) => <StreamlinedClientPage projectId={params.id} />} />
```

---

## 4. Client Management Features

### Database Schema
**File:** `shared/schema.ts`

**Projects Table:**
```typescript
- id: serial (auto-increment)
- userId: integer (foreign key)
- client_name: text
- address: text
- client_city: text
- client_postal: text
- client_email: text
- client_phone: text
- project_type: text
- room_count: integer
- difficulty: text
- status: text (default: 'initial-contact')
- estimate: real
- notes: text
- client_preferences: text
- special_requirements: text
- status_details: text
- scheduled_start_date: timestamp
- scheduled_end_date: timestamp
- hourly_rate: real
- helper_rate: real
- created_at: timestamp
```

**Related Tables:**
- **photos:** id, projectId, filename, originalName, mimeType, size, createdAt
- **receipts:** id, projectId, vendor, amount, description, filename, date
- **dailyHours:** id, projectId, date, painterHours, helperHours, notes
- **toolsChecklist:** id, projectId, item, isChecked

### Client Detail Page
**File:** `client/src/components/StreamlinedClientPage.tsx`

**Core Features:**
1. **Client Information Section**
   - Edit mode toggle
   - Inline editing of: name, address, city, postal code, email, phone
   - Project details: type, room count, difficulty, hourly rate
   - Save/cancel buttons for edits

2. **Photo Management**
   - Drag-and-drop photo grid
   - Long-press to enter selection mode
   - Multi-select with checkboxes
   - Bulk delete selected photos
   - Sortable gallery using `react-sortablejs`
   - Tap photo to open full-screen carousel
   - Client-side compression before upload (see Section 5)

3. **Tools Checklist**
   - Collapsible section
   - Add/remove tools
   - Checkbox to mark items complete
   - Persisted to database

4. **Daily Hours Tracking**
   - Date picker for selecting work day
   - Hours input
   - Description field
   - Automatic calculation of labor costs
   - Display as list of entries

5. **Project Notes**
   - Textarea for free-form notes
   - Auto-save on blur
   - Markdown not supported (plain text only)

6. **Receipts & Expenses**
   - Upload receipt images or PDFs
   - OCR extraction using OpenAI Vision API
   - Edit vendor, amount, description inline
   - Delete receipts
   - View original receipt files

7. **Action Buttons**
   - Generate Estimate (opens `EstimateGenerator` dialog)
   - Generate Invoice (opens `InvoiceGenerator` dialog)
   - Map navigation to client address
   - Calendar integration

**Collapsible Sections:**
- All sections start collapsed by default
- Click header to expand/collapse
- State persisted during session (not to localStorage)
- Smooth CSS transitions

**Menu Customization:**
- Drag-to-reorder sections using `ReactSortable`
- State saved in component state (not persisted across refreshes)

### CRUD Operations

**Create Project:**
- `POST /api/projects`
- Validates with Zod schema (`insertProjectSchema`)
- Returns created project with ID

**Read Projects:**
- `GET /api/projects` - List all
- `GET /api/projects/:id` - Single project

**Update Project:**
- `PUT /api/projects/:id`
- Partial updates supported
- Validates changes before saving

**Delete Project:**
- `DELETE /api/projects/:id`
- Cascades to related photos, receipts, hours, tools

**TanStack Query Pattern:**
```typescript
const { data: project } = useQuery<Project>({
  queryKey: [`/api/projects/${projectId}`],
});

const updateMutation = useMutation({
  mutationFn: async (updates) => apiRequest(`/api/projects/${id}`, 'PUT', updates),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}`] });
  },
});
```

---

## 5. Photo & Media Handling

### Photo Upload Flow

**Components:**
- `client/src/components/camera-upload.tsx`
- `client/src/components/simplified-upload.tsx`
- `client/src/components/unified-upload.tsx`

**Upload Process:**
1. User selects photos (camera or file picker)
2. **Client-side compression** before upload (see Compression section)
3. FormData object created with compressed images
4. Upload to `POST /api/projects/:projectId/photos`
5. Server saves to `uploads/photos/` directory
6. Database record created with metadata
7. Query cache invalidated to refresh UI

**Supported Formats:**
- JPEG, PNG, WebP, HEIC
- HEIC automatically converted to JPEG on server

### Image Compression

**File:** `client/src/lib/imageCompression.ts`

**Compression Formula for Client Photos:**

```typescript
// User-configurable compression levels (stored in localStorage)
levels = {
  low: {
    maxWidth: 1200,
    maxHeight: 800,
    quality: 0.6,
    format: 'jpeg'
  },
  medium: { // Default
    maxWidth: 1920,
    maxHeight: 1080,
    quality: 0.8,
    format: 'jpeg'
  },
  high: {
    maxWidth: 2400,
    maxHeight: 1600,
    quality: 0.9,
    format: 'jpeg'
  },
  original: null // No compression
}
```

**Compression Formula for Receipts:**

```typescript
// Fixed compression for receipts (balance between file size and OCR quality)
{
  maxWidth: 1920,
  maxHeight: 1080,
  quality: 0.7,
  format: 'jpeg'
}
```

**Server-Side Receipt Compression (OpenAI Vision):**

**File:** `server/visionReceiptHandler.ts`

```typescript
// Aggressive compression to minimize OpenAI API token costs
const compressedBuffer = await sharp(imageBuffer)
  .resize(600, null, { // Max 600px width
    withoutEnlargement: true,
    fit: 'inside'
  })
  .greyscale() // Remove color data (receipts are mostly B&W text)
  .jpeg({ 
    quality: 60,
    progressive: true
  })
  .toBuffer();

// Ultra-compression if file still > 200KB
if (compressedBuffer.length > 200000) {
  finalBuffer = await sharp(imageBuffer)
    .resize(400, null)
    .greyscale()
    .jpeg({ quality: 45 })
    .toBuffer();
}
```

**Compression Process:**
1. Create off-screen canvas element
2. Load image into Image object
3. Calculate aspect-ratio-preserving dimensions
4. Draw image to canvas at new size
5. Convert canvas to Blob using `canvas.toBlob(quality)`
6. Create new File from Blob
7. Report compression ratio (percentage reduced)

**Progress Tracking:**
```typescript
{
  isCompressing: boolean,
  currentFile: number,
  totalFiles: number,
  originalSize: number,
  compressedSize: number
}
```

### Photo Carousel
**File:** `client/src/components/PhotoCarousel.tsx`

**Features:**
1. **Full-Screen Viewing**
   - Overlay dialog (z-index: 9999)
   - Black semi-transparent backdrop
   - Close button (X icon)

2. **Swipe Navigation**
   - Touch: Swipe left/right to navigate
   - Mouse: Click-drag to navigate
   - Keyboard: Arrow keys
   - Threshold: 100px swipe distance required

3. **Pinch-to-Zoom**
   - Two-finger pinch gesture
   - Scale range: 0.5x to 5x
   - Smooth animation using `requestAnimationFrame`
   - Pan when zoomed (with bounds to prevent over-panning)
   - Double-tap to toggle zoom (1x ↔ 2.5x)

4. **Photo Navigation**
   - Previous/Next buttons
   - Disabled when at start/end of gallery
   - Photo counter (e.g., "3 / 12")

5. **Delete Function**
   - Trash icon button
   - Confirmation not required (instant delete)
   - Calls `onDelete(photoId)` callback
   - Carousel closes after deletion

**Smooth Animations:**
- CSS transforms for hardware acceleration
- `transform: translateX()` for swipe
- `transform: scale() translate()` for zoom/pan
- `transition: transform 0.3s ease-out`

**Touch Event Handling:**
```typescript
handleTouchStart() // Detect single tap vs double tap vs pinch
handleTouchMove()  // Track gesture type and update transforms
handleTouchEnd()   // Apply snap or reset based on gesture
```

### Photo Grid
**File:** `client/src/components/clean-photo-grid.tsx`

**Layout:**
- CSS Grid with auto-fit columns
- Responsive: 2-4 columns based on screen width
- Square aspect ratio for all thumbnails
- Gap between items: 12px

**Sortable Functionality:**
- Uses `react-sortablejs` library
- Drag-and-drop to reorder photos
- Persists order to backend on drop
- Visual feedback during drag (lifted shadow effect)

**Selection Mode:**
- Long-press (500ms) to activate selection mode
- Checkboxes appear on all photos
- Tap to toggle selection
- Bulk delete button when items selected
- Exit selection mode by clicking "Cancel" or deleting all

**Lazy Loading:**
- Images loaded with `loading="lazy"` attribute
- Placeholder while loading (gray background)
- Error fallback for broken images

---

## 6. Receipt Processing, OCR, and Data Extraction

### Receipt Upload Flow

**User Interaction:**
1. User clicks "Upload Receipt" button
2. File picker or camera opens
3. User selects image or PDF receipt
4. File uploaded to server

**Server Processing:**
1. File saved to `uploads/receipts/` directory
2. If PDF: Filename analyzed by OpenAI to extract vendor/amount
3. If Image: Sent to OpenAI Vision API for OCR
4. Extracted data saved to database
5. Response returned to client

### OpenAI Vision Receipt Processing

**File:** `server/visionReceiptHandler.ts`

**Process:**

1. **Image Compression**
   - Resize to max 600px width (preserves aspect ratio)
   - Convert to greyscale (receipts are mostly B&W)
   - JPEG quality: 60%
   - Ultra-compress to 400px / 45% quality if file > 200KB

2. **API Call**
   - Model: `gpt-4o` (not mini, to avoid rate limits)
   - Max tokens: 500
   - Temperature: 0.1 (deterministic output)
   - Image sent as base64 data URL

3. **Prompt Engineering**
```
Extract ONLY these 3 items:
1. Business name (vendor) - clean name only, remove addresses/store numbers
2. Total amount paid - number only
3. Date of purchase - YYYY-MM-DD format

Examples of clean vendor names:
- "Shell Canada #1234" → "Shell"
- "McDonald's Restaurant #5678" → "McDonald's"
```

4. **Response Parsing**
```json
{
  "vendor": "Shell",
  "amount": 45.67,
  "items": [],
  "date": "2024-12-15",
  "confidence": 0.9
}
```

5. **Data Cleaning**
   - Remove store numbers, addresses, extra text from vendor
   - Parse date into YYYY-MM-DD format
   - Expand abbreviations in item names
   - Remove SKU codes and prices from items

### Tesseract.js Fallback OCR

**File:** `client/src/utils/receiptProcessing.ts`

**Used When:**
- OpenAI API fails
- User preference for offline processing
- Cost-saving mode

**Process:**
1. Run Tesseract.js on image
2. Extract raw text
3. Parse using regex patterns:
   - Currency amounts: `/\$?\d{1,3}(?:,\d{3})*(?:\.\d{2})?/g`
   - Dates: Various formats (MM/DD/YYYY, YYYY-MM-DD)
   - Vendor: First few lines of text

**Smart Amount Selection:**
```typescript
// Look for "total", "amount due", "balance" keywords
// Select amount closest to these keywords
// Fallback: Choose largest amount
```

**Manual Selection Mode:**
- Triggered when multiple similar amounts detected
- User presented with list of found amounts
- Click to select correct total

### Receipt Editing

**Features:**
- Inline editing of vendor, amount, description
- Date picker for purchase date
- Save/cancel buttons
- TanStack Query mutation for updates
- Optimistic UI updates

**Validation:**
- Amount must be numeric
- Vendor name required
- Date in valid format

---

## 7. Document Generation (Estimates & Invoices)

### Estimate Generator
**File:** `client/src/components/EstimateGenerator.tsx`

**Features:**

1. **Estimate Details**
   - Project title
   - Date (default: today, editable)
   - Calendar picker for date selection

2. **Services & Labor**
   - Default stages: Prep, Priming, Painting
   - Custom services: Add/remove stages
   - For each service: Name, Hours, Hourly Rate
   - Auto-calculated subtotals

3. **Paint Materials**
   - Price per gallon
   - Number of gallons
   - Number of coats
   - Auto-calculated materials cost

4. **Additional Services**
   - Power Washing, Drywall Repair, Wood Reconditioning
   - Add custom services
   - Hours and rates for each

5. **Additional Labor (Crew)**
   - Default mode: Single worker with total hours
   - Custom mode: Multiple workers with individual hours/rates
   - Toggle between modes

6. **Custom Supplies**
   - Item name, quantity, price per unit
   - Auto-calculated line totals

7. **Travel Costs**
   - Distance (km)
   - Number of trips
   - Rate per km
   - Auto-calculated travel total

8. **Material Markup**
   - Optional percentage markup on materials
   - Applied to paint + custom supplies
   - Toggle on/off

9. **Tax Calculation**
   - Global tax configuration (Settings page)
   - Supports: GST, PST, HST, Sales Tax, VAT
   - Country-specific tax rules (CA, US, UK, AU)
   - Auto-calculated based on subtotal

**Calculations:**
```
Labor Cost = Σ(hours × rate) for all services
Materials Cost = (gallons × price × coats) + custom supplies
Markup = Materials Cost × (markup% / 100)
Subtotal = Labor + Materials + Markup + Travel
Tax = Subtotal × (tax% / 100)
Total = Subtotal + Tax
```

**Collapsible Sections:**
- All sections collapsible to reduce visual clutter
- Expand/collapse with smooth animations
- State not persisted (resets on close)

**Persistence:**
- All form data saved to localStorage
- Auto-loads previous values on open
- Date always resets to today (not saved)

**Logo Integration:**
- Displays user's uploaded logo (or default A-Frame logo)
- Logo visibility controlled by Settings

**PDF Generation:**
1. Render estimate to hidden div (`printRef`)
2. Use `html2canvas` to capture div as image
3. Create PDF with `jsPDF`
4. Embed canvas image in PDF
5. Download or attach to email

**Email Integration:**
- Email message textarea (with default template)
- Auto-save custom message to localStorage
- "Reset to Default" button
- Calls `POST /api/send-estimate-email`
- Attaches PDF to email

### Invoice Generator
**File:** `client/src/components/InvoiceGenerator.tsx`

**Features:**

1. **Invoice Number**
   - Auto-incrementing from localStorage
   - Format: 346, 347, 348...
   - Increments after email/download
   - Editable before sending

2. **Client & Business Info**
   - Pre-populated from project data
   - Editable before generating
   - Business logo displayed

3. **Line Items from Hours**
   - Auto-populated from `dailyHours` table
   - Each entry: Description, Date, Hours, Rate, Total
   - Editable quantities and rates

4. **Receipts/Materials Section**
   - Auto-populated from `receipts` table
   - Each entry: Vendor, Amount, Description
   - Toggle individual receipts on/off
   - Material markup option (percentage)

5. **Tax Calculation**
   - Uses global tax settings
   - Option to mark as "Taxes Included" (no additional tax)
   - Or calculate tax on subtotal

6. **Payment Instructions**
   - Customizable message
   - Default: "Send e-transfer to cortespainter@gmail.com"

**Invoice Number Persistence:**
```typescript
// Load
const nextNumber = localStorage.getItem('nextInvoiceNumber') || '346';

// Increment after send/download
localStorage.setItem('nextInvoiceNumber', (currentNumber + 1).toString());
```

**Calculations:**
```
Labor Total = Σ(hours × rate)
Materials Total = Σ(receipt amounts)
Material Markup = Materials Total × (markup% / 100)
Subtotal = Labor + Materials + Markup
Tax = Subtotal × (tax% / 100) // if not "taxes included"
Grand Total = Subtotal + Tax
```

**PDF Generation:**
- Same process as Estimate Generator
- Larger font sizes for readability
- Professional invoice formatting

**Email with Receipt Attachments:**
```
POST /api/send-invoice-email
Body: {
  projectId,
  invoiceNumber,
  clientEmail,
  message,
  includeReceipts: boolean
}
```
- Attaches invoice PDF
- Optionally attaches all receipt images/PDFs
- Uses SendGrid or Gmail API

---

## 8. Visual & UX Design System

### Color Palette

**File:** `client/src/index.css`

**CSS Variables:**
```css
:root {
  --background: 0 0% 0%;          /* Pure black */
  --foreground: 0 0% 100%;        /* White text */
  --card: 0 0% 6%;                /* Dark gray cards */
  --card-foreground: 0 0% 98%;    /* Off-white text */
  --primary: 139 59% 64%;         /* Paint Brain purple */
  --primary-foreground: 0 0% 98%; /* White on purple */
  --muted: 0 0% 15%;              /* Muted gray */
  --muted-foreground: 0 0% 64%;   /* Muted text */
  --border: 0 0% 20%;             /* Border gray */
}

body {
  background-color: #000 !important;
  color: #fff !important;
}
```

**Brand Colors (from replit.md):**
- Purple: #8B5FBF
- Orange: #D4A574
- Green: #6A9955
- Red: #E53E3E
- Blue: #3182CE
- Yellow: #ECC94B

**Usage Pattern:**
- Dark background (#000) for entire app
- Gray-900 (#111) for cards and panels
- Gray-800 borders
- Purple accent for primary actions
- Green for success states
- Red for delete/warning actions

### Typography

**Font:**
- System font stack (no custom fonts loaded)
- `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, ...`

**Sizes:**
- Page titles: `text-2xl` (24px)
- Card titles: `text-lg` (18px)
- Body text: `text-base` (16px)
- Small labels: `text-sm` (14px)
- Tiny text: `text-xs` (12px)

**Weights:**
- Headings: `font-bold` (700)
- Subheadings: `font-semibold` (600)
- Body: `font-normal` (400)
- Labels: `font-medium` (500)

### Layout Patterns

**Card Component:**
```tsx
<Card className="bg-zinc-900 border-zinc-800">
  <CardHeader>
    <CardTitle className="text-zinc-100">Title</CardTitle>
  </CardHeader>
  <CardContent>
    {content}
  </CardContent>
</Card>
```

**Grid Layouts:**
```css
grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4
```

**Spacing:**
- Section gaps: `space-y-6`
- Card padding: `p-4`
- Button gaps: `gap-2`

**Borders:**
- Card borders: `border border-zinc-800`
- Rounded corners: `rounded-lg` (8px) or `rounded-2xl` (16px)

### Shadcn UI Components

**Installed Components:**
- Button, Card, Input, Textarea, Label
- Dialog (modals)
- Select, Checkbox, Switch, Slider
- Tabs, Accordion, Collapsible
- Toast (notifications)
- Calendar, DatePicker
- Dropdown Menu, Context Menu
- Tooltip, Popover
- Progress, Skeleton (loading states)

**Customization:**
- All components use CSS variables from index.css
- Dark mode by default (no light mode toggle)
- Consistent hover/focus states

---

## 9. Animations, Smooth Scrolling & Transitions

### Photo Carousel Animations

**Swipe Gesture:**
```css
transform: translateX(${dragOffset}px);
transition: transform 0.3s ease-out;
```

**Zoom Transform:**
```css
transform: scale(${scale}) translate(${translateX}px, ${translateY}px);
transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
```

**Pinch-to-Zoom:**
- Uses `requestAnimationFrame` for smooth 60fps animation
- Calculates scale based on distance between two touch points
- Prevents jank by batching DOM updates

### Loading States

**Skeleton Screens:**
```tsx
<div className="animate-pulse rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
  <div className="h-14 w-14 rounded-full bg-zinc-800" />
  <div className="h-4 w-1/2 bg-zinc-800 rounded mb-2" />
  <div className="h-3 w-1/3 bg-zinc-800 rounded" />
</div>
```

**Spinner:**
```tsx
<div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
```

### Button Transitions

**Hover Effects:**
```css
transition: background-color 0.2s ease-in-out, color 0.2s ease-in-out;
```

**Disabled States:**
```css
opacity: 0.5;
cursor: not-allowed;
pointer-events: none;
```

### Collapsible Section Animations

**Height Transition:**
```css
max-height: 0;
overflow: hidden;
transition: max-height 0.3s ease-in-out;

/* Expanded */
max-height: 2000px;
```

**Chevron Rotation:**
```css
transform: rotate(0deg);
transition: transform 0.2s ease;

/* Expanded */
transform: rotate(180deg);
```

### Toast Notifications

**Library:** Shadcn Toast (built on Radix UI)

**Animation:**
- Slide in from bottom-right
- Auto-dismiss after 3-5 seconds
- Swipe to dismiss gesture

**Usage:**
```typescript
toast({
  title: "Success",
  description: "Project updated successfully",
  duration: 3000,
});
```

### Smooth Scrolling

**Native CSS:**
```css
html {
  scroll-behavior: smooth;
}
```

**Programmatic Scrolling:**
```typescript
element.scrollIntoView({ behavior: 'smooth', block: 'center' });
```

---

## 10. Maps, Navigation & Calendar Integration

### Mapbox Integration

**File:** `client/src/pages/MapPage.tsx`

**Features:**
- Interactive map centered on Cortes Island, BC
- Markers for client locations
- Dark mode map style
- Click marker to see client details
- "Get Directions" button

**Map Configuration:**
```typescript
new mapboxgl.Map({
  container: mapRef.current,
  style: 'mapbox://styles/mapbox/dark-v10',
  center: [-123.0093, 50.0596], // Cortes Island
  zoom: 9,
});
```

**Token Handling:**
- Token stored on server (environment variable)
- Fetched via `GET /api/mapbox-token`
- Never exposed to client-side code

**Navigation Links:**

**File:** `client/src/lib/maps.ts`

```typescript
// Open Google Maps with directions
generateDirectionsLink(address: string) {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
}

// Open Google Maps to view location
generateMapsLink(address: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}
```

### Google Calendar Integration

**File:** `client/src/components/StreamlinedClientPage.tsx`

**Function:** `openWorkCalendar()`

**Features:**
1. **View A-Frame Work Calendar**
   - Opens isolated calendar view (dark mode)
   - Calendar ID: `6b990af5658408422c42677572f2ef19740096a1608165f15f59135db4f2a981@group.calendar.google.com`
   - Week view by default

2. **Create Event for Client**
   - Pre-fills event with client name and address
   - Links to A-Frame work calendar
   - Opens in new tab for user to confirm

**Calendar URL Structure:**
```
// View calendar
https://calendar.google.com/calendar/embed?src={CALENDAR_ID}&ctz=America/Vancouver&mode=WEEK&bgcolor=%23000000

// Create event
https://calendar.google.com/calendar/render?action=TEMPLATE&text={EVENT_TITLE}&location={ADDRESS}&cid={CALENDAR_ID}
```

### Dark Mode Calendar
**File:** `client/src/components/DarkModeCalendar.tsx`

**Features:**
- Custom-styled calendar component
- Dark theme to match app
- Date picker for scheduling
- Highlights selected dates
- Month/year navigation

---

## 11. Settings & Configuration

### Settings Page
**File:** `client/src/components/settings/SettingsPage.tsx`

**Sections:**

1. **Logo Management**
   - Upload custom business logo
   - Separate logos for: Homepage, Documents (estimates/invoices), Emails
   - Logo visibility toggles
   - Preview before saving

2. **Tax Configuration**
   **File:** `client/src/components/settings/TaxConfiguration.tsx`
   - Country selector (CA, US, UK, AU)
   - Tax inputs based on country:
     - Canada: GST, PST, HST
     - USA: Sales Tax, State Tax
     - UK: VAT
     - Australia: GST
   - Saved to localStorage
   - Used globally in estimates and invoices

3. **Gmail Integration**
   **File:** `client/src/components/settings/GmailIntegration.tsx`
   - OAuth setup for sending emails via Gmail
   - Alternative to SendGrid
   - Credential management

4. **Photo Compression Settings**
   - Radio buttons: Low, Medium, High, Original
   - Saved to localStorage (`photoCompressionLevel`)
   - Applied to future photo uploads

5. **Email Templates**
   - Default estimate email message
   - Default invoice email message
   - Edit and save custom templates

### Admin Dashboard
**File:** `client/src/components/admin/AdminDashboard.tsx`

**Features:**
- View all users
- Token usage analytics (OpenAI API costs)
- User management (add/remove users)
- System health metrics

---

## 12. Data Storage, Database, and API Logic

### Database Schema Summary

**Tables:**
1. `users` - User accounts (id, email, passwordHash, name)
2. `projects` - Client projects (main table)
3. `photos` - Project photos
4. `receipts` - Expense receipts
5. `dailyHours` - Labor hours tracking
6. `toolsChecklist` - Project tool checklists
7. `userLogos` - Custom uploaded logos
8. `logoLibrary` - Shared logo templates
9. `tokenUsage` - OpenAI API usage tracking

**Database Type:** PostgreSQL (Neon-hosted)

**ORM:** Drizzle ORM with Zod validation

**Schema File:** `shared/schema.ts`

### API Endpoints

**Authentication:**
- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/register` - Create new account
- `GET /api/auth/me` - Get current user

**Projects:**
- `GET /api/projects` - List all projects
- `POST /api/projects` - Create project
- `GET /api/projects/:id` - Get single project
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

**Photos:**
- `GET /api/projects/:projectId/photos` - List photos
- `POST /api/projects/:projectId/photos` - Upload photos (multipart/form-data)
- `DELETE /api/photos/:id` - Delete photo

**Receipts:**
- `GET /api/projects/:projectId/receipts` - List receipts
- `POST /api/projects/:projectId/receipts` - Upload receipt with OCR
- `PUT /api/receipts/:id` - Update receipt data
- `DELETE /api/receipts/:id` - Delete receipt

**Hours:**
- `GET /api/projects/:projectId/hours` - List daily hours
- `POST /api/projects/:projectId/hours` - Add hours entry
- `PUT /api/hours/:id` - Update hours entry
- `DELETE /api/hours/:id` - Delete hours entry

**Tools:**
- `GET /api/projects/:projectId/tools` - List tools
- `POST /api/projects/:projectId/tools` - Add tool
- `PUT /api/tools/:id` - Toggle tool checked state
- `DELETE /api/tools/:id` - Delete tool

**Documents:**
- `POST /api/send-estimate-email` - Email estimate PDF
- `POST /api/send-invoice-email` - Email invoice PDF with receipts

**Settings:**
- `GET /api/users/:userId/logo` - Get user logo
- `POST /api/users/:userId/logo` - Upload logo
- `GET /api/users/:userId/logos/:type` - Get type-specific logo (documents, emails)

**Maps:**
- `GET /api/mapbox-token` - Get Mapbox access token

### Error Handling

**Backend:**
```typescript
try {
  // operation
} catch (error) {
  console.error('Error details:', error);
  res.status(500).json({ error: 'User-friendly message' });
}
```

**Frontend:**
```typescript
useMutation({
  mutationFn: async () => { /* ... */ },
  onError: (error) => {
    toast({
      title: "Error",
      description: error.message || "Operation failed",
      variant: "destructive",
    });
  },
});
```

**TanStack Query Retry:**
- Automatic retry on network failures
- Exponential backoff
- Max 3 retries

---

## 13. Known Bugs, Quirks & Historical Issues

### Past Destruction Events

**1. Original App Destruction (~1 month before September 2025)**
- Cause unknown from available documentation
- Required "forensic mission" to recover
- Led to establishing backup procedures

**2. White Page Issue (September 23, 2025)**
- **Symptom:** Entire app showed blank white page
- **Cause:** Missing CSS variables (--background, --foreground)
- **Fix:** Added CSS variables to `client/src/index.css` with `!important` overrides
- **Resolution:** Fully restored, verified working in Replit, Render, and Netlify

**3. Cross-Platform Deployment Failures (August 28, 2025)**
- **Symptom:** App worked in Replit (macOS) but failed on Render (Linux)
- **Causes:**
  1. Case-sensitivity: `Button.tsx` vs `button.tsx` - Linux is case-sensitive
  2. Alias misconfiguration: Root tsconfig had `@/*: ["src/*"]` but source was in `/client/src/*`
  3. Wrong build context: Vite ran from root instead of /client
  4. Fragmented recovery: Files restored one-by-one instead of wholesale
- **Fixes:**
  1. Normalized all UI files to lowercase
  2. Fixed tsconfig.json paths
  3. Updated package.json scripts to `cd client && npm run build`
  4. Restored entire component folders from snapshots

### Current Known Issues

1. **Invoice Number Edge Case**
   - If user closes dialog before sending, number is still incremented
   - Workaround: Manual editing of localStorage value

2. **Photo Sorting Persistence**
   - Drag-to-reorder photos works but order not saved to database
   - Resets on page refresh

3. **Large File Uploads**
   - Files > 50MB rejected by Multer
   - No client-side validation before upload
   - User only sees error after upload completes

4. **Calendar Integration**
   - Google Calendar requires manual OAuth each time
   - No persistent calendar connection

5. **Mobile Camera on iOS**
   - HEIC format not supported by all browsers
   - Requires server-side conversion

6. **Receipt OCR Accuracy**
   - Handwritten receipts fail OCR
   - Faded/crumpled receipts have low accuracy
   - Manual editing always available as fallback

### Lessons Learned

1. **Always Test Cross-Platform**
   - Case-sensitivity differs between macOS and Linux
   - Test deployments on target platform before considering done

2. **Configuration Consistency**
   - Path aliases must match actual directory structure
   - Build scripts must run from correct directory

3. **Wholesale Recovery Over Piecemeal**
   - Restore entire folders from backups
   - Avoid "whack-a-mole" with individual missing files

4. **CSS Variable Importance**
   - Missing CSS variables cause silent failures (white page)
   - Always use `!important` for critical variables

5. **Branch Safety**
   - Work on feature branches for risky changes
   - Keep main branch stable and deployable

---

## 14. Notes for Future Rebuild

### Most Stable Components

**Ready to Reuse As-Is:**
1. `shared/schema.ts` - Database schema is well-defined
2. `server/routes.ts` - API routes are comprehensive
3. `client/src/lib/imageCompression.ts` - Compression logic is solid
4. `client/src/components/ui/*` - Shadcn components are stable
5. `server/visionReceiptHandler.ts` - OCR logic works well

### Areas for Improvement

**Refactoring Needed:**
1. **StreamlinedClientPage.tsx (1548 lines)**
   - Break into smaller components: PhotoSection, ReceiptsSection, HoursSection
   - Extract custom hooks: usePhotoSelection, useReceiptEditing

2. **InvoiceGenerator.tsx (2624 lines)**
   - Separate invoice data from presentation
   - Create reusable LineItemsTable component
   - Extract calculation logic to utility functions

3. **EstimateGenerator.tsx (1622 lines)**
   - Same issues as InvoiceGenerator
   - Consider shared InvoiceEstimateBase component

**Modernization Opportunities:**
1. Replace localStorage with IndexedDB for larger data
2. Add service worker for offline support
3. Implement WebSockets for real-time updates (multi-user)
4. Add unit tests (currently zero test coverage)
5. Add E2E tests with Playwright
6. Migrate to React Server Components (if moving to Next.js)

### Critical Dependencies

**Do Not Change:**
- Drizzle ORM schema (breaking changes require migration)
- Photo/receipt file paths (existing uploads rely on current structure)
- Invoice numbering system (localStorage key name)

**Safe to Upgrade:**
- React, TanStack Query, Vite (follow semantic versioning)
- Shadcn components (copy-paste updates)
- Tailwind CSS (check for breaking changes in config)

### Build & Deploy Checklist

**Before Deploying:**
1. ✅ Run `npm run check` (TypeScript compilation)
2. ✅ Test photo upload and compression
3. ✅ Test receipt OCR (both OpenAI and Tesseract)
4. ✅ Generate sample estimate and invoice PDFs
5. ✅ Verify email sending works
6. ✅ Check Mapbox map loads
7. ✅ Test on mobile device (real device, not just Chrome DevTools)
8. ✅ Verify database migrations applied
9. ✅ Check all environment variables set
10. ✅ Test login/logout flow

**Environment Variables Required:**
```
DATABASE_URL
OPENAI_API_KEY
MAPBOX_ACCESS_TOKEN
SENDGRID_API_KEY (or GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET)
JWT_SECRET
NODE_ENV=production
```

### Performance Optimization Opportunities

1. **Image Lazy Loading:**
   - Already implemented on homepage grid
   - Could add to carousel thumbnails

2. **Code Splitting:**
   - InvoiceGenerator and EstimateGenerator could be lazy-loaded
   - Reduces initial bundle size by ~200KB

3. **Database Indexing:**
   - Add index on `projects.userId` for faster queries
   - Add index on `photos.projectId`, `receipts.projectId`

4. **API Response Caching:**
   - TanStack Query already caches, but could increase `staleTime`
   - Add HTTP cache headers on static endpoints

5. **PDF Generation Optimization:**
   - Pre-render invoice/estimate templates
   - Cache rendered canvases

### Security Considerations

**Already Implemented:**
1. JWT token authentication
2. Password hashing (bcrypt)
3. SQL injection prevention (Drizzle ORM parameterized queries)
4. File upload size limits
5. CORS configuration

**Needs Improvement:**
1. Add rate limiting on API endpoints
2. Add CSRF protection
3. Validate file types more strictly (magic number check, not just extension)
4. Add Content Security Policy headers
5. Sanitize user input in notes/descriptions (prevent XSS)
6. Add audit logging for sensitive operations

### Backup Strategy

**Current Approach:**
- Manual snapshots before major changes
- Git commits with detailed messages
- Replit automatic backups

**Recommended Improvements:**
1. Automated daily database backups to external storage
2. Backup uploaded files (photos, receipts) to S3 or similar
3. Version control for database schema changes
4. Documented rollback procedures

---

## 15. Technology Decisions & Rationale

### Why Wouter Instead of React Router?
- **Size:** 1.2KB vs 12KB
- **Simplicity:** Minimal API, easy to understand
- **Performance:** No extra overhead for SPA routing
- **Trade-off:** Less features (no route guards, nested routes limited)

### Why TanStack Query v5?
- **Automatic caching** - Reduces API calls significantly
- **Background refetching** - Keeps data fresh without user action
- **Optimistic updates** - Instant UI feedback
- **DevTools** - Excellent debugging experience
- **Trade-off:** Learning curve for mutation patterns

### Why Drizzle ORM?
- **Type safety** - Auto-generated types from schema
- **Lightweight** - Smaller than Prisma or TypeORM
- **SQL-like syntax** - Easy to understand queries
- **Trade-off:** Less mature than Prisma, fewer features

### Why Tailwind CSS?
- **Utility-first** - Rapid UI development
- **Consistency** - Design system enforced through classes
- **Tree-shaking** - Only used classes in production bundle
- **Dark mode** - Built-in dark mode support
- **Trade-off:** HTML can look cluttered

### Why Shadcn/ui Instead of Material-UI?
- **Customizable** - Copy-paste components, full control
- **Lightweight** - No runtime library overhead
- **Radix UI primitives** - Accessible by default
- **Trade-off:** No comprehensive theming system

### Why OpenAI Vision for OCR?
- **Accuracy** - Much better than Tesseract for receipts (90% vs 60%)
- **Context understanding** - Can infer vendor from logos
- **No training required** - Works out of the box
- **Trade-off:** Cost per image ($0.002-0.005), requires internet

### Why Client-Side PDF Generation?
- **No server load** - PDFs generated in browser
- **Instant** - No network round-trip
- **Privacy** - Sensitive invoice data stays client-side
- **Trade-off:** Larger bundle size, limited PDF features

### Why Mapbox Instead of Google Maps?
- **Cost** - Free tier more generous
- **Customization** - Easier to style dark mode maps
- **Performance** - Faster load times
- **Trade-off:** Smaller ecosystem of plugins

---

## 16. Typical User Workflows

### Workflow 1: New Client Project

1. User clicks "New Project" on homepage
2. Fills in client name, address, contact info
3. Clicks "Save"
4. Project card appears on homepage
5. Clicks card to open detail page
6. Takes photos of house/rooms with camera
7. Photos auto-compress and upload
8. Adds tools to checklist (ladders, brushes, etc.)
9. Creates estimate using EstimateGenerator
10. Emails estimate to client

### Workflow 2: Daily Work Logging

1. User opens client project
2. Goes to "Daily Hours" section
3. Clicks "Add Hours"
4. Selects today's date
5. Enters hours worked (e.g., 8)
6. Adds description ("Painted living room")
7. Saves entry
8. Uploads receipt from hardware store
9. Receipt OCR extracts: "Home Depot - $45.67"
10. User edits description: "Primer for living room"

### Workflow 3: Invoice Generation & Payment

1. User opens completed project
2. Reviews all daily hours entries (total: 32 hours)
3. Reviews all receipts (total: $567.89)
4. Clicks "Generate Invoice"
5. Invoice auto-populates with hours and receipts
6. User adds 15% material markup
7. Reviews total: $2,487.89
8. Customizes email message
9. Clicks "Email Invoice"
10. Invoice PDF + receipt attachments sent to client

### Workflow 4: Estimate Revision

1. Client requests quote revision (lower price)
2. User opens project, clicks "Generate Estimate"
3. Previous estimate data auto-loads from localStorage
4. User reduces hours for "Painting" stage (40 → 32 hours)
5. Recalculates: New total $2,100 (was $2,600)
6. Downloads PDF for client review
7. Client approves via email
8. User marks project as "Approved"

---

## 17. Compression Settings Summary

### Client Photo Compression Levels

**Low Compression:**
- Max Width: 1200px
- Max Height: 800px
- JPEG Quality: 60%
- Use Case: Storage-constrained environments

**Medium Compression (Default):**
- Max Width: 1920px
- Max Height: 1080px
- JPEG Quality: 80%
- Use Case: Balanced quality and file size

**High Compression:**
- Max Width: 2400px
- Max Height: 1600px
- JPEG Quality: 90%
- Use Case: Professional documentation, print quality

**Original (No Compression):**
- No resizing or quality reduction
- Use Case: Archival, legal documentation

### Receipt Compression

**Client-Side (Before Upload):**
- Max Width: 1920px
- Max Height: 1080px
- JPEG Quality: 70%
- Purpose: Reduce upload time

**Server-Side (For OpenAI Vision):**
- **Standard Compression:**
  - Max Width: 600px
  - Greyscale conversion
  - JPEG Quality: 60%
  - Progressive encoding

- **Ultra Compression (if > 200KB):**
  - Max Width: 400px
  - Greyscale conversion
  - JPEG Quality: 45%
  - Purpose: Minimize OpenAI API token costs

**Compression Ratios Achieved:**
- Client photos: 60-85% reduction (depending on level)
- Receipts for OCR: 85-95% reduction (typical 3MB → 150KB)

---

## Conclusion

This document serves as a complete technical blueprint for rebuilding PaintBrain. It captures:

- ✅ Every feature and interaction
- ✅ All compression formulas and settings
- ✅ Technology stack and dependencies
- ✅ API endpoints and database schema
- ✅ Visual design system and animations
- ✅ Known bugs and historical issues
- ✅ Typical user workflows
- ✅ Lessons learned from production incidents

**Next Steps for Rebuild:**
1. Set up fresh React + Vite + TypeScript project
2. Copy `shared/schema.ts` for database schema
3. Implement authentication first
4. Build homepage and project list
5. Implement photo upload with compression
6. Add receipt OCR integration
7. Build estimate and invoice generators
8. Deploy to Render or Netlify
9. Test all features thoroughly
10. Monitor for edge cases

**Critical Success Factors:**
- Maintain dark theme consistency
- Test compression ratios match specifications
- Verify OpenAI Vision integration works end-to-end
- Ensure cross-platform compatibility (macOS dev, Linux production)
- Keep invoice numbering system intact
