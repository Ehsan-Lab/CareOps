# CareOps Charity Management System

A comprehensive web application for managing charity operations, including donor management, payment tracking, beneficiary support, and financial management.

## Features

- 🏦 **Treasury Management**
  - Multiple categories with real-time balance tracking
  - Transaction history and audit trail
  - Category-based financial management

- 💝 **Donor Management**
  - Donor profiles and history
  - Donation tracking and categorization
  - Automated receipt generation

- 👥 **Beneficiary Management**
  - Profile management with status tracking
  - Payment scheduling and history
  - Support status monitoring

- 💰 **Payment System**
  - One-time and recurring payments
  - Multiple payment frequencies
  - Status tracking (Pending/Completed/Cancelled)
  - Automatic treasury updates

- 🍲 **Feeding Rounds**
  - Round creation and management
  - Allocation tracking
  - Distribution workflow
  - Detailed reporting

## Technology Stack

- **Frontend**: React with TypeScript
- **UI Framework**: Tailwind CSS
- **State Management**: React Query & Zustand
- **Backend**: Firebase (Firestore)
- **Authentication**: Firebase Auth
- **Deployment**: Firebase Hosting

## Development Setup

1. Clone the repository:
```bash
git clone https://github.com/MoatazFarid/CareOps.git
cd CareOps
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file with Firebase config:
```env
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-domain
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

4. Start development server:
```bash
npm run dev
```

## Production Deployment

### Firebase Deployment

1. Install Firebase CLI:
```bash
npm install -g firebase-tools
```

2. Login to Firebase:
```bash
firebase login
```

3. Initialize Firebase:
```bash
firebase init
```

4. Build and deploy:
```bash
npm run build
firebase deploy
```

### Manual Deployment (Hostinger)

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

- `npm run dev` - Start development server
- `npm run build` - Create production build
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript checks
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Generate test coverage report

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the Creative Commons Attribution-NonCommercial 4.0 International License - see the [LICENSE.md](LICENSE.md) file for details. This means you can freely use and adapt the software for non-commercial purposes, as long as you provide appropriate attribution.

## Support

For support, please open an issue in the GitHub repository or contact the development team.

## Acknowledgments

- All the contributors who have helped with code, bug reports, and suggestions
- The open-source community for the amazing tools and libraries
- Our users for their valuable feedback and support
