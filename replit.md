# Painting Project Management Application

## Overview
This is a full-stack web application for managing painting projects, offering tools for estimation, photo organization, receipt tracking, and time logging. Its purpose is to streamline operations for painting businesses, providing a comprehensive solution for project oversight from initial contact to invoicing. The application aims to enhance efficiency, improve client communication, and provide detailed financial tracking for painting professionals.

## User Preferences
Preferred communication style: Simple, everyday language.
Brand name: A-Frame Painting
Theme preference: Dark mode by default
Logo: Custom A-frame house structure with paint brush accent
Logo sizing: Homepage logo should use h-14 size with -mt-2 and mb-8 spacing. All logos in library should maintain this same size standard to avoid visual conflicts when switching between logos.

## Archived Design Elements
- **Rainbow Gradient Line**: Horizontal rainbow-colored gradient that stretched across the screen under the logo on the homepage. 
  - **CSS Code**: `<div className="h-1 w-full mb-8" style={{ background: "linear-gradient(to right, #ff6b6b, #4ecdc4, #45b7d1, #96ceb4, #feca57, #ff9ff3, #54a0ff)" }} />`
  - **Colors**: Red, teal, blue, mint green, yellow, pink, light blue
  - **Location**: StreamlinedHomepage.tsx, positioned between logo area and New Client/Schedule buttons
  - **Status**: Temporarily removed (Jan 2025) but preserved for potential future restoration

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query (React Query) for server state management
- **UI Framework**: Radix UI components with shadcn/ui design system
- **Styling**: Tailwind CSS with CSS variables for theming
- **Build Tool**: Vite for fast development and optimized builds
- **Form Handling**: React Hook Form with Zod validation
- **Mobile Responsiveness**: Optimized for iPhone and other mobile devices with responsive layouts and touch-friendly controls.
  - Note: Invoice generator scrolling behavior may appear different in Replit's preview window vs. full URL launch due to iframe constraints. Full URL provides the intended smooth experience.

### Backend Architecture
- **Runtime**: Node.js with Express.js server framework
- **Database ORM**: Drizzle ORM with PostgreSQL dialect
- **File Uploads**: Multer middleware for handling photo and receipt uploads
- **API Design**: RESTful API endpoints for CRUD operations
- **Email System**: Nodemailer with Gmail SMTP and SendGrid fallback for professional email delivery (estimates, invoices)
- **PDF Generation**: HTML-to-PDF conversion for estimates and invoices, supporting attachments.

### Database Design
- **Primary Database**: PostgreSQL (via Neon serverless)
- **Schema Management**: Drizzle Kit for migrations and schema management
- **Key Tables**: Projects, Photos, Receipts, Daily Hours, Users, with defined relationships.

### Core Features
- **Project Management**: Creation, tracking (status, client info), and estimation based on room count.
- **Photo Management**: Upload, organization, and display of project photos with quality compression options.
- **Receipt Tracking**: Upload and management of expense receipts with OCR processing via OpenAI Vision API.
- **Time Tracking**: Logging daily hours with descriptions, integrated into invoicing.
- **Estimation & Invoicing**: Dynamic estimate generation with detailed breakdowns (labor, materials, travel, tax), and professional PDF invoice generation with unified Paint Brain color scheme design consistency. Both estimates and invoices follow a standardized Red → Yellow → Green → Blue → Purple color sequence for section headers, ensuring visual continuity throughout the application.
- **Authentication**: JWT-based system with role-based access control (admin/user) and persistent sessions.
- **Settings**: Centralized configuration for tax, advanced logo positioning (scaling up to 400% and vertical adjustment), invoice numbering, and photo compression quality.
- **Calendar Integration**: Direct integration with a dedicated Google Calendar for scheduling.

## External Dependencies

### Database
- **Neon Database**: Serverless PostgreSQL hosting.

### AI/ML Services
- **OpenAI API**: GPT-4o Vision API for advanced receipt OCR and data extraction.

### UI Components & Libraries
- **Radix UI**: Accessible component primitives.
- **Lucide React**: Icon library.
- **shadcn/ui**: Pre-built component library.
- **Tailwind CSS**: Utility-first CSS framework.
- **html2canvas**: For capturing HTML elements for PDF generation.
- **jsPDF**: For client-side PDF generation.
- **TanStack Query (React Query)**: For server state management.
- **Wouter**: For client-side routing.
- **React Hook Form** with **Zod**: For form validation.
- **dayjs**: For date manipulation in the calendar.
- **Multer**: Node.js middleware for handling `multipart/form-data`.

### Email Services
- **Nodemailer**: For sending emails via SMTP (e.g., Gmail SMTP).
- **SendGrid**: For transactional email delivery (as a fallback or primary).

### Development Tools
- **TypeScript**: For type safety.
- **Vite**: Frontend build tool.
- **ESBuild**: For bundling backend code.
- **PostCSS**: CSS processing.
- **Git**: Version control with feature branch workflow (current: feature/invoice-layout-updates).