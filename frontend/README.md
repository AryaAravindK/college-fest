# College Fest Management System - Frontend

A comprehensive Next.js frontend application for managing college events, clubs, and student activities with role-based access control.

## Features

### Core Functionality
- **Authentication**: JWT-based authentication with support for local login
- **Role-Based Access Control (RBAC)**: Five user roles (public, student, organizer, faculty, admin)
- **Event Management**: Browse, create, and manage college events
- **Club Management**: Join and explore college clubs
- **User Profiles**: Manage personal information and preferences
- **Dashboard**: Role-specific dashboards with relevant statistics
- **Responsive Design**: Mobile-first approach with TailwindCSS

### User Roles & Permissions

#### Public
- View limited event information
- Browse public content

#### Student
- Register for events (individual/team)
- View registered events
- Join clubs
- Access certificates

#### Organizer
- Create and manage events
- View event registrations
- Manage club activities

#### Faculty
- Access academic event features
- Monitor student participation

#### Admin
- Full system access
- User management
- Content moderation
- System analytics

## Tech Stack

- **Framework**: Next.js 15.5.4 (App Router)
- **Language**: TypeScript
- **Styling**: TailwindCSS 4.x with custom design system
- **State Management**: React Context API
- **HTTP Client**: Axios
- **Form Handling**: React Hook Form with Zod validation
- **Icons**: Lucide React

## Project Structure

```
frontend/
├── app/                          # Next.js app directory
│   ├── auth/                    # Authentication pages
│   │   ├── login/
│   │   └── register/
│   ├── dashboard/               # Dashboard page
│   ├── events/                  # Event pages
│   ├── clubs/                   # Club pages
│   ├── profile/                 # User profile
│   ├── admin/                   # Admin panel
│   ├── layout.tsx               # Root layout
│   ├── page.tsx                 # Home page
│   └── globals.css              # Global styles
├── components/                  # React components
│   ├── ui/                      # Reusable UI components
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Input.tsx
│   │   ├── Modal.tsx
│   │   └── Toast.tsx
│   └── layout/                  # Layout components
│       └── Navbar.tsx
├── contexts/                    # React contexts
│   └── AuthContext.tsx         # Authentication context
├── lib/                         # Utility functions
│   ├── api/                     # API client modules
│   │   ├── client.ts           # Axios configuration
│   │   ├── auth.ts
│   │   ├── events.ts
│   │   ├── registrations.ts
│   │   ├── users.ts
│   │   └── dashboard.ts
│   └── utils/
│       └── cn.ts               # Class name utility
├── types/                       # TypeScript types
│   └── index.ts                # Type definitions
├── public/                      # Static assets
├── .env.local                  # Environment variables
├── next.config.ts              # Next.js configuration
├── tailwind.config.ts          # TailwindCSS configuration
├── tsconfig.json               # TypeScript configuration
└── package.json                # Dependencies

```

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Backend API running (see Backend/README.md)

### Installation

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
Create a `.env.local` file:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

4. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:3000`

### Build for Production

```bash
npm run build
npm start
```

## API Integration

The frontend communicates with the backend through RESTful API endpoints:

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/users/profile` - Get user profile

### Events
- `GET /api/events` - List events (with filters)
- `GET /api/events/:slug` - Get event details
- `POST /api/events` - Create event (organizer/admin)
- `PUT /api/events/:slug` - Update event
- `DELETE /api/events/:slug` - Delete event

### Registrations
- `POST /api/registrations` - Register for event
- `GET /api/registrations/:id` - Get registration details
- `POST /api/registrations/:id/cancel` - Cancel registration

### Dashboard
- `GET /api/dashboards/stats` - Get dashboard statistics

## Key Components

### Authentication Context (`contexts/AuthContext.tsx`)
Manages user authentication state, JWT tokens, and role-based permissions.

### API Client (`lib/api/client.ts`)
Centralized Axios instance with:
- Request interceptors for JWT tokens
- Response interceptors for error handling
- Automatic token refresh
- Redirect on 401 errors

### UI Components
Reusable components following a consistent design system:
- **Button**: Multiple variants and sizes
- **Card**: Content containers with header/footer
- **Input**: Form inputs with validation
- **Modal**: Overlay dialogs
- **Toast**: Notification system

## Role-Based Access Control

The application implements RBAC through:

1. **Authentication Context**: `hasRole()` method checks user permissions
2. **Route Protection**: Pages check authentication before rendering
3. **Component-Level**: Conditional rendering based on roles
4. **API-Level**: Backend validates permissions for all requests

Example:
```typescript
const { user, hasRole } = useAuth();

if (hasRole(['admin', 'organizer'])) {
  // Show admin/organizer features
}
```

## Styling

### TailwindCSS Configuration
- Custom color palette with primary colors
- Responsive breakpoints
- Custom animations
- Utility classes for common patterns

### Design Principles
- Mobile-first responsive design
- Consistent spacing (8px grid)
- Clear visual hierarchy
- Accessible color contrasts
- Loading states for async operations
- Error handling with user feedback

## State Management

### Local State
- React useState for component-level state
- Form state with controlled components

### Global State
- Auth Context for user authentication
- Toast Context for notifications

## Security Considerations

1. **JWT Storage**: Tokens stored in localStorage (consider httpOnly cookies for production)
2. **XSS Protection**: Input sanitization and validation
3. **CSRF Protection**: Backend CSRF tokens
4. **Secure Routes**: Protected routes redirect to login
5. **API Security**: All requests include authentication tokens

## Performance Optimizations

- Code splitting with Next.js App Router
- Image optimization with Next.js Image component
- Lazy loading for heavy components
- Memoization for expensive computations
- Static generation for public pages

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Available Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm start        # Start production server
npm run lint     # Run ESLint
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API base URL | `http://localhost:5000/api` |

## Contributing

1. Follow TypeScript best practices
2. Use functional components with hooks
3. Implement proper error handling
4. Write accessible HTML
5. Follow the existing code structure
6. Test responsive design on multiple devices

## Future Enhancements

- [ ] Social login (Google, Facebook, LinkedIn)
- [ ] Real-time notifications with WebSockets
- [ ] Advanced search and filtering
- [ ] Event calendar view
- [ ] Certificate generation and download
- [ ] Payment integration
- [ ] Club-specific features
- [ ] Analytics dashboard
- [ ] Multi-language support
- [ ] Dark mode

## Troubleshooting

### Common Issues

1. **API Connection Failed**
   - Verify backend is running
   - Check `NEXT_PUBLIC_API_URL` in `.env.local`
   - Ensure CORS is configured on backend

2. **Build Errors**
   - Clear `.next` folder: `rm -rf .next`
   - Reinstall dependencies: `rm -rf node_modules && npm install`

3. **Authentication Issues**
   - Clear localStorage
   - Check JWT token validity
   - Verify backend authentication endpoints

## License

ISC

## Support

For issues and questions, please create an issue in the repository.
