# Charity Management System

A web application for managing charity operations, including donor management, payment tracking, and beneficiary support.

## Development Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file with Firebase config:
```env
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-domain
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

3. Start development server:
```bash
npm run dev
```

## Production Deployment (Hostinger)

1. Create `.env.production` with production Firebase config

2. Build and package:
```bash
./deploy.sh
```

3. Upload to Hostinger:
- Log in to Hostinger control panel
- Go to File Manager
- Navigate to public_html
- Upload deploy.zip
- Extract the files

4. Configure .htaccess:
```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteCond %{REQUEST_FILENAME} !-l
  RewriteRule . /index.html [L]
</IfModule>
```

## Available Scripts

- `npm run dev` - Development server
- `npm run build` - Production build
- `npm run preview` - Preview build
- `npm run lint` - Run linter
- `npm run typecheck` - Type checking
