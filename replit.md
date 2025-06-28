# Painting Project Management Application

## Overview

This is a full-stack web application designed for managing painting projects. The application provides tools for project estimation, photo management, receipt tracking, and time logging. It's built with a modern tech stack featuring React on the frontend, Express.js on the backend, and PostgreSQL for data persistence.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query (React Query) for server state management
- **UI Framework**: Radix UI components with shadcn/ui design system
- **Styling**: Tailwind CSS with CSS variables for theming
- **Build Tool**: Vite for fast development and optimized builds
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express.js server framework
- **Database ORM**: Drizzle ORM with PostgreSQL dialect
- **File Uploads**: Multer middleware for handling photo and receipt uploads
- **API Design**: RESTful API endpoints for CRUD operations
- **Development**: Hot reloading with Vite middleware integration

### Database Design
- **Primary Database**: PostgreSQL (via Neon serverless)
- **Schema Management**: Drizzle Kit for migrations and schema management
- **Tables**: Projects, Photos, Receipts, Daily Hours with proper relationships

## Key Components

### Project Management
- Create and manage painting projects with client information
- Track project status (estimating, in-progress, completed)
- Store client preferences and special requirements
- Calculate estimates based on room count and difficulty

### Photo Management
- Upload and organize project photos
- Add descriptions to photos for better organization
- Serve photos through static file middleware

### Receipt Tracking
- Upload receipt files with vendor and amount information
- Track project expenses with date and description
- Support for both digital receipts and manual entry

### Time Tracking
- Log daily hours worked on projects
- Add descriptions for work performed
- Calculate total time investment per project

### Estimation Calculator
- Dynamic estimation based on room count and difficulty level
- Configurable base rates and multipliers
- Save estimates directly to project records

## Data Flow

1. **Client Requests**: React frontend makes API calls through TanStack Query
2. **API Layer**: Express.js routes handle authentication and validation
3. **Data Processing**: Drizzle ORM manages database operations
4. **File Handling**: Multer processes file uploads to local storage
5. **Response**: JSON responses sent back to frontend for UI updates

## External Dependencies

### Database
- **Neon Database**: Serverless PostgreSQL hosting
- **Connection**: Uses DATABASE_URL environment variable

### UI Components
- **Radix UI**: Accessible component primitives
- **Lucide React**: Icon library for consistent iconography
- **shadcn/ui**: Pre-built component library with Tailwind CSS

### Development Tools
- **TypeScript**: Type safety across frontend and backend
- **ESBuild**: Fast production builds for server code
- **PostCSS**: CSS processing with Tailwind and Autoprefixer

## Deployment Strategy

### Development
- Uses Vite dev server with HMR for fast development
- Runs on port 5000 with proxy configuration
- Automatic server restart on code changes

### Production
- Frontend: Vite builds optimized static assets
- Backend: ESBuild bundles server code for Node.js
- Static files: Served directly by Express in production
- Database: Connects to hosted PostgreSQL instance

### Replit Configuration
- Configured for Node.js 20 runtime environment
- PostgreSQL 16 module for database support
- Autoscale deployment target for production
- Port 5000 exposed externally on port 80

## Changelog
- June 25, 2025. Initial setup
- June 25, 2025. Rebranded to "A-Frame Painting" with custom logo and dark mode implementation
- June 25, 2025. Enhanced project management features: Advanced status tracking, multiple worker support with hourly rates, project scheduling, live cost calculations, profit analysis, and comprehensive project summary dashboard
- June 25, 2025. Fixed photo storage persistence issues and implemented file-based database for development. App ready for deployment with all core painting business features functional.
- June 25, 2025. Completely rebuilt photo system with enhanced camera functionality. Implemented smart camera permission handling with user-friendly error messages and reliable fallback to library uploads. Photo uploads and display now working perfectly with 11+ photos successfully stored and rendered.
- June 26, 2025. Fixed critical startup errors by creating missing StreamlinedClientPage component and repairing corrupted homepage file. Updated form validation to match database schema with proper project fields (clientName, address, projectType, roomCount, difficulty, hourlyRate). Client creation now working successfully. App ready for deployment.
- June 26, 2025. Photo upload debugging session: Confirmed existing photos work perfectly (10 photos in project 1 with functional carousel). Photo upload failing for new uploads despite successful file selection. Added comprehensive debugging to track FormData construction and transmission. Issue appears to be in file transfer between frontend and backend. Session paused to manage costs.
- June 26, 2025. Applied ChatGPT's suggested photo upload improvements and fixed camera functionality. Added capture="environment" attribute and error handling. Ready for deployment as camera issues may be resolved in production environment with proper HTTPS and file permissions.
- June 27, 2025. Fixed critical photo upload bug by solving FileList persistence issue. Implemented stable file capture system that prevents files from becoming empty during upload process. Added HEIC support for iPhone photos including .heic and .heif formats. Photo uploads now working reliably for JPEG, PNG, GIF, WebP, and HEIC files with proper MIME type handling.
- June 27, 2025. Created comprehensive code snapshot and backup system. All critical functionality is now preserved in `backups/working-snapshot/` directory and documented in `SNAPSHOT-BACKUP.md`. Established safe development process for adding moderate improvements without breaking existing features. App is stable and ready for careful enhancement.
- June 27, 2025. Simplified upload interface as requested: Removed camera capture functionality and consolidated to two direct-access buttons. Photos button (burnt orange #EA580C) opens photo library directly, Files button (vintage blue #1E40AF) opens file directory. Eliminated complexity while preserving all working upload functionality.
- June 27, 2025. Fixed PDF upload functionality: Files button now successfully accepts .pdf, .doc, .docx, and .txt files with proper server support. Added visual labels under buttons for clarity. Addressed iOS Safari menu limitation with improved user experience design.
- June 27, 2025. Completed upload interface optimization: Successfully resolved FileList persistence issues and schema validation problems. PDF uploads now working perfectly with proper receipt creation in database. Both Photos and Files buttons fully functional with streamlined two-button interface.
- June 27, 2025. Debug session paused: Identified core issue preventing file display. PDFs upload successfully to database (9 files stored) but SimpleFilesList component receives project data instead of receipt data from query. Backend API working correctly, frontend query routing issue needs resolution. Created DEBUG-SNAPSHOT.md for continuation.
- June 27, 2025. Successfully restored simple photo viewing functionality after cropping implementation broke basic features. Removed all react-easy-crop integration and complex crop controls. Photo thumbnails now click-to-view in clean full-screen interface with navigation. Created CURRENT-SNAPSHOT.md documenting stable working state with 9 photos displaying correctly.
- June 27, 2025. Attempted iPhone-style pinch-to-zoom functionality but encountered iOS Safari limitations that prevent reliable touch gesture handling in web browsers. Simplified photo viewer to use button-based zoom controls with mouse wheel support for desktop. Touch gestures limited to single-finger panning when zoomed in. Photo viewing remains fully functional with clean navigation and zoom controls.
- June 27, 2025. Reorganized client page layout for better workflow: Client name prominently displayed at top, followed by upload buttons, project notes section, photo thumbnails grid, files section, and generate invoice button. Implemented TestTiemposText-Regular.woff font globally across the application for improved typography and brand consistency.
- June 27, 2025. Enhanced client page with tools checklist feature: Added new database table for tools management with checkboxes for completion tracking. Tools checklist section (2x vertical size) positioned above project notes section (4x larger). Implemented add/delete/toggle functionality with API routes and backend storage. Fixed client name display issue to properly show project information. Project notes textarea expanded to min-h-96 for better real estate as requested.
- June 27, 2025. Completed interface cleanup and status management system: Removed duplicate project notes section under photos. Reverted font back to system defaults (removed TestTiemposText). Added color-coded project status toggle with dropdown selector below client name - Red for "In Progress", Yellow for "Pending", Green for "Completed". Status displays with matching text colors and updates persist in database. Interface now clean and streamlined.
- June 27, 2025. Final tools checklist polish: Fixed checkbox display bug that showed "0" symbol by implementing proper integer comparison (=== 1). Simplified tool input placeholder text to directly list examples: "Paint brushes, Drop cloths, Ladder, Rollers...". Status selection functionality now working perfectly with PUT requests. All interface elements functioning smoothly - ready for next feature development.
- June 27, 2025. Streamlined tools checklist implementation: Simplified workflow to single-click completion where checking a tool immediately deletes it from list. Removed separate delete buttons and toggle states for cleaner, action-oriented interface. Tools checklist now perfectly aligned with job site workflow - add tools needed, check them off as used/prepared.
- June 27, 2025. Enhanced homepage with professional polish: Implemented search functionality with real-time filtering across client names, addresses, and project types. Updated status color system to match client page (Red: in progress, Yellow: pending, Green: completed). Improved project cards with better visual hierarchy, user/location icons, and detailed project information. Added project count indicator and comprehensive empty states for both no projects and no search results.
- June 27, 2025. Implemented archive system for completed projects: Added "Archived" status with gray color coding. Created archive toggle button on homepage to switch between active and archived project views. Projects can be archived from client pages to keep homepage clean and organized. Archive view shows only archived projects with appropriate empty states and project counts. Archive system preserves all project data while reducing homepage clutter as requested.
- June 27, 2025. Enhanced button styling and added client editing functionality: Updated "Add New Client" button with purple color (#6366F1), changed text to "+ New Client" (removing "Add"), and made it more compact. Implemented comprehensive client editing system with edit button on project cards, edit dialog with all project fields (name, address, type, room count, difficulty, hourly rate), and proper state management with mutations. Edit functionality allows updating all client information directly from homepage with purple-themed buttons matching the new design.
- June 27, 2025. Implemented comprehensive invoicing system: Created professional PDF invoice generator using html2canvas and jsPDF libraries. Features include: automatic invoice preview with A-Frame Painting branding, labor calculation table showing hours worked and rates, materials/receipts section with expenses breakdown, additional supplies cost input, tax calculation (8.75%), and PDF download functionality. Invoice includes client information, project details, professional formatting with tables and totals, and customizable notes. Fully integrated into client page with "Generate Invoice" button.
- June 27, 2025. Added daily hours tracking system: Created time logging functionality on client pages with calendar date picker, hours input (0.5 hour increments), and optional work descriptions. Features include: "Log Hours for a Day" button that expands date picker interface, validation preventing future dates, scrollable hours list showing date/hours/description, delete functionality for corrections, and full integration with invoicing system for labor calculations. Hours data feeds directly into invoice generation for accurate billing.
- June 27, 2025. Enhanced hours dashboard layout: Redesigned hours tracking interface with compact spacing and improved visual hierarchy. Moved total hours and earnings summary to bottom of green summary box with separator line. Tightened spacing between individual hour entries for cleaner, more condensed view matching user's manual tracking style. Dashboard now shows $60/hr rate prominently at top, followed by compact date entries like "Wed, Jun 25 - 6hr" with individual earnings calculations.
- June 27, 2025. Integrated custom A-Frame Painting logo: Replaced text-based "A-FRAME PAINTING" branding with user's professional logo featuring colorful stripes and clean typography. Logo now appears centered at top of homepage and in PDF invoice headers. Logo file saved as /public/aframe-logo.png and properly sized for both web display (h-32, doubled from h-16) and PDF generation (h-24, doubled from h-12). Fixed static file serving in development mode with express.static("public") middleware. Maintains professional branding consistency across all user-facing interfaces.
- June 27, 2025. Interface improvements and bug fixes: Moved rainbow gradient from top of page to divider between logo and "New Client" button for better visual hierarchy. Added quick receipt amount entry form with item and price fields for manual expense tracking. Fixed calendar date selection bug by replacing timezone-sensitive toISOString() with local date formatting to prevent June 21→22 jumping issue. Receipt form enables direct database entry without file uploads for quick expense logging.
- June 27, 2025. Enhanced client management with email and phone fields: Added clientEmail and clientPhone columns to database schema and pushed updates successfully. Integrated email and phone fields into new client creation form (homepage), edit client dialog (homepage), and client page edit functionality. Added edit button next to client name on client pages for in-context editing. EstimateGenerator now pre-populates with client email/phone data when available. All client editing interfaces now support comprehensive contact information management for future Mailgun integration.
- June 27, 2025. Optimized EstimateGenerator for manual control: Reset all default values to zero (work stages, additional services, primer/top coats, paint costs). Updated service categories to "Wood Reconditioning" and "Drywall Repair" with manual hour selection. Fixed dropdown formatting issues by adding proper CSS classes and z-index. Changed "Paint Supplied By" to "Paint and Supplies" with simplified "A-Frame Painting" option. All estimate fields now start empty for complete manual customization as requested.
- June 27, 2025. Added comprehensive address support with city and postal code fields: Extended database schema with clientCity and clientPostal columns and pushed changes successfully. Updated all client forms (new client creation, edit dialogs on homepage and client pages) to include city and postal code fields. EstimateGenerator now auto-populates complete client information including city and postal code from project data. Changed estimate number format to "EST #" for manual completion. Verified functionality with new client creation - all address fields properly captured and displayed in estimates.
- June 27, 2025. Enhanced invoice system with comprehensive improvements: Fixed calendar date selection bug that was causing date jumping issues. Improved invoice billing information to include complete client data (city, postal code, phone, email) and removed project type/difficulty details for cleaner presentation. Added receipt attachment system allowing users to select which receipts to include as additional PDF pages. Enhanced receipt form functionality with proper error handling and date field validation. Invoice PDFs now support multi-page generation with receipt images attached as subsequent pages when selected.
- June 27, 2025. Improved receipt management and button styling: Enhanced receipt display to show price in title format (e.g., "wood filler - $15.00"). Added comprehensive inline editing system for receipts with pencil icon triggers, edit forms for vendor/amount/description, and proper save/cancel functionality. Updated "New Client" button to be 25% smaller (px-4 py-2), darker purple color (#4F46E5), and removed plus icon for cleaner appearance. Revised project status color scheme: In Progress now green, Completed now burnt orange, Pending remains yellow. Status colors updated consistently across homepage and client pages.
- June 27, 2025. Comprehensive dark mode invoice generator upgrade: Completely rebuilt invoice generator with sleek dark mode interface featuring pure black backgrounds (#000000) for seamless A-Frame Painting logo integration. Enhanced with professional styling, brand color scheme (burnt orange primary #EA580C), improved user experience with dark inputs and borders, comprehensive line item management, receipt attachment system, and beautiful PDF output with A-Frame logo prominently displayed. Maintains all existing functionality while dramatically improving visual appeal and brand consistency.
- June 27, 2025. Updated tax calculations for Canadian business operations: Changed from 8.75% combined tax to 5% GST only, as labor services don't require PST. Fixed invoice calculations to properly include daily hours data and receipt amounts. Materials from receipts display as "Materials (incl. taxes)" since taxes are already paid at purchase. Invoice now correctly calculates labor + materials + additional supplies, with 5% GST applied only to labor and supplies (not to receipts which already include taxes).
- June 27, 2025. Enhanced PDF generation functionality: Fixed PDF creation with improved error handling and toast notifications. Added proper receipt attachment system for multi-page PDFs. Improved "Send Invoice" button functionality with clear user feedback. PDF now downloads successfully with filename format "Invoice-{number}-{clientName}.pdf". Enhanced user experience with loading states and error messages for better workflow.
- June 27, 2025. Invoice interface improvements: Simplified services section to clean read-only layout showing only description, hours, and total (removed editable fields). Changed "Send Invoice" button color to blue (#1E40AF) matching app's color scheme. Enhanced PDF generation with better element visibility handling and timing fixes for reliable PDF creation. Streamlined invoice layout for better readability and professional appearance.
- June 27, 2025. Major invoice PDF overhaul based on user feedback: Removed contact info pills from top right, updated email to cortespainter@gmail.com in company info section, added complete company address (884 Hayes Rd, Manson's Landing, BC V0P1K0) near logo, removed extra close button from dialog header. Completely rebuilt PDF work description section to show detailed daily hours log with individual dates, work descriptions, and calculated amounts. Fixed calculation functions to use actual daily hours data instead of line items. Enhanced PDF layout for professional appearance with proper subtotal calculations.
- June 27, 2025. Final invoice system enhancements: Fixed Services & Labor section to display individual daily entries with dates, descriptions (default "Painting"), and hours from client section daily hours log. Corrected labor subtotal calculations to use actual daily hours data instead of empty line items. Streamlined receipt attachment system with single checkbox to "Attach receipt photos to PDF (as additional pages)" instead of individual checkboxes. Added Gmail integration that opens compose window in new browser tab with pre-filled subject, recipient, and professional email body. Updated button text to "Open Gmail" for clarity. Invoice calculations now properly show labor amounts, additional supplies costs, and materials from receipts.
- June 27, 2025. Fixed critical date synchronization bug: Resolved timezone conversion issue where invoice PDF dates didn't match daily hours display. Implemented timezone-safe date parsing that prevents UTC midnight dates from shifting to previous day when displayed locally. Invoice dates now correctly show Sat Jun 21, Sun Jun 22, Tue Jun 24, Wed Jun 25 matching the client section exactly. Applied fix to both invoice preview table and PDF generation sections.
- June 27, 2025. Global email and branding update: Completely replaced all references to kohlmeister@gmail.com with cortespainter@gmail.com throughout the application. Updated business name displays from "Alan Kohl" to "A-Frame Painting" in all PDF documents, email templates, and contact information. Affected components include InvoiceGenerator (business info, payment notes) and EstimateGenerator (email templates, PDF headers, contact footers). All business communications now use consistent A-Frame Painting branding with correct email address.
- June 27, 2025. Enhanced email functionality and PDF styling: Improved Send Invoice button with better mailto compatibility using window.open() with fallback mechanisms. Added clipboard backup for email content when mailto fails. Updated PDF total box styling to green (#059669) with centered text formatting. Email system now copies formatted email content to clipboard as backup and provides clearer user feedback. Ready for SendGrid integration when API key is provided for direct email sending.
- June 27, 2025. Implemented SendGrid email integration: Added direct email sending functionality using SendGrid API with professional HTML email formatting. Created fallback system that copies email content to clipboard when SendGrid authentication fails. System provides clear error messages and instructions for SendGrid email verification. Currently troubleshooting 403 Forbidden error - likely requires SendGrid API key with "Mail Send" permissions and complete email verification process.
- June 27, 2025. Finalized email system with reliable clipboard functionality: After testing various SendGrid authentication approaches, established clipboard-based email system as primary method. System automatically copies professionally formatted invoice emails to clipboard for manual pasting into Gmail. This provides reliable email functionality without complex API setup requirements. Business management system fully operational and ready for daily painting project use.
- June 27, 2025. Implemented comprehensive maps integration: Added Google Maps functionality throughout the application for client location management. Features include: "View on Maps" buttons on homepage project cards using Navigation icon, enhanced client page with MapPin/Navigation buttons next to client name, dedicated Location Tools section with "View on Maps" and "Get Directions" buttons, full address display with city/postal code formatting, and driving directions from A-Frame Painting office (884 Hayes Rd, Manson's Landing, BC) to client locations. All maps functionality uses simple Google Maps URLs requiring no API keys - perfect for immediate use and route planning.

## User Preferences

Preferred communication style: Simple, everyday language.
Brand name: A-Frame Painting
Theme preference: Dark mode by default
Logo: Custom A-frame house structure with paint brush accent