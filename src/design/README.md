# Paint Brain Components

## Components Included
1. **LoginPage.jsx** - Login page with email/password inputs
2. **ClientListHomepage.jsx** - Client list with search and grid layout

## Installation

Make sure you have Tailwind CSS installed in your project:

```bash
npm install -D tailwindcss
npx tailwindcss init
```

## Usage

1. Copy the component files to your `src/components` directory
2. Update the logo path `/paint-brain-logo.png` to match your public folder structure
3. Add your backend API calls in the appropriate handlers
4. Import and use in your app:

```jsx
import LoginPage from './components/LoginPage';
import ClientListHomepage from './components/ClientListHomepage';
```

## Color Palette
- Black: `#000000` (background)
- Purple: `#a855f7` (primary accent)
- Green: `#22c55e` (success/actions)
- Red: `#ef4444` (photos/alerts)
- Gold/Tan: `#9d8b5a` (secondary text)
- Yellow: `#eab308` (tools)
- Blue: `#3b82f6` (notes)
- Orange: `#ea580c` (estimates)

## Notes
- Both components use React hooks (useState)
- Tailwind CSS is required for styling
- Replace hardcoded data with your API calls
- Add authentication logic to LoginPage handlers
