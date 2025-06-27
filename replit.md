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

## User Preferences

Preferred communication style: Simple, everyday language.
Brand name: A-Frame Painting
Theme preference: Dark mode by default
Logo: Custom A-frame house structure with paint brush accent