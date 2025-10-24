# A-Frame Painting - Project Management System

A comprehensive painting business management web application designed to streamline project tracking, financial management, and workflow optimization.

## Features

- **Project Management**: Track client projects with detailed information
- **Photo System**: Upload and organize project photos with smart camera integration
- **Receipt Tracking**: Scan and store receipts with expense calculation
- **Time Logging**: Track daily hours with worker rates and cost calculation
- **Estimation Calculator**: Generate project estimates based on room count and difficulty
- **Profit Analysis**: Real-time cost and profit tracking
- **Dark Mode**: Professional dark theme with A-Frame branding

## Tech Stack

- **Frontend**: React 18 + TypeScript
- **Backend**: Node.js + Express
- **Database**: PostgreSQL with Drizzle ORM
- **UI**: Radix UI + Tailwind CSS
- **Build**: Vite

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
DATABASE_URL=your_postgresql_url
```

3. Push database schema:
```bash
npm run db:push
```

4. Start development server:
```bash
npm run dev
```

## Project Structure

- `client/` - React frontend application
- `server/` - Express backend API
- `shared/` - Shared types and schemas
- `uploads/` - File storage for photos and receipts

## Key Components

- **Photo Management**: Smart camera access with fallback to file upload
- **Receipt Scanner**: Upload receipts with vendor and amount tracking
- **Hours Tracker**: Log daily work hours with descriptions
- **Project Summary**: Comprehensive dashboard with profit analysis

Built for A-Frame Painting business operations.