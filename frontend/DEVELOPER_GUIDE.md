# Developer Guide - College Fest Management Frontend

## Quick Start for Developers

### Setup
```bash
cd frontend
npm install
cp .env.example .env.local  # Configure your API URL
npm run dev
```

## Common Development Tasks

### 1. Adding a New Page

```typescript
// Create: app/my-page/page.tsx
'use client';

import { useAuth } from '@/contexts/AuthContext';

export default function MyPage() {
  const { user } = useAuth();

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1>My New Page</h1>
    </div>
  );
}
```

### 2. Adding a New API Endpoint

```typescript
// Add to: lib/api/mymodule.ts
import apiClient from './client';

export const myApi = {
  getData: async () => {
    const response = await apiClient.get('/my-endpoint');
    return response.data;
  },

  postData: async (data: any) => {
    const response = await apiClient.post('/my-endpoint', data);
    return response.data;
  },
};
```

### 3. Creating a New Component

```typescript
// Create: components/ui/MyComponent.tsx
import React from 'react';
import { cn } from '@/lib/utils/cn';

interface MyComponentProps {
  title: string;
  className?: string;
}

const MyComponent: React.FC<MyComponentProps> = ({ title, className }) => {
  return (
    <div className={cn('p-4 bg-white rounded-lg', className)}>
      <h2>{title}</h2>
    </div>
  );
};

export default MyComponent;
```

### 4. Adding a New Type

```typescript
// Add to: types/index.ts
export interface MyNewType {
  id: string;
  name: string;
  createdAt: Date;
}
```

### 5. Protected Route

```typescript
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function ProtectedPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, isLoading, router]);

  if (isLoading || !user) {
    return <div>Loading...</div>;
  }

  return <div>Protected Content</div>;
}
```

### 6. Role-Based Component

```typescript
'use client';

import { useAuth } from '@/contexts/AuthContext';
import Button from '@/components/ui/Button';

export default function RoleBasedComponent() {
  const { user, hasRole } = useAuth();

  return (
    <div>
      {/* Show to all authenticated users */}
      {user && <p>Hello, {user.firstName}</p>}

      {/* Show only to organizers and admins */}
      {hasRole(['organizer', 'admin']) && (
        <Button>Create Event</Button>
      )}

      {/* Show only to admins */}
      {hasRole(['admin']) && (
        <Button>Manage Users</Button>
      )}
    </div>
  );
}
```

## Code Style Guide

### Component Structure
```typescript
// 1. Imports
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';

// 2. Types/Interfaces
interface Props {
  title: string;
}

// 3. Component
const MyComponent: React.FC<Props> = ({ title }) => {
  // 4. Hooks
  const { user } = useAuth();
  const [state, setState] = useState();

  // 5. Effects
  useEffect(() => {
    // logic
  }, []);

  // 6. Handlers
  const handleClick = () => {
    // logic
  };

  // 7. Render
  return (
    <div>{title}</div>
  );
};

// 8. Export
export default MyComponent;
```

### Naming Conventions
- **Components**: PascalCase (e.g., `UserProfile.tsx`)
- **Files**: kebab-case for non-components (e.g., `api-client.ts`)
- **Functions**: camelCase (e.g., `fetchUserData`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `API_BASE_URL`)
- **Types/Interfaces**: PascalCase (e.g., `UserProfile`)

### File Organization
```
component-name/
├── ComponentName.tsx        # Main component
├── ComponentName.types.ts   # Types (if complex)
├── ComponentName.styles.ts  # Styles (if needed)
└── index.ts                 # Export
```

## Common Patterns

### API Call with Loading & Error

```typescript
'use client';

import { useState, useEffect } from 'react';
import { eventsApi } from '@/lib/api/events';
import { useToast } from '@/components/ui/Toast';

export default function EventsList() {
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setIsLoading(true);
        const data = await eventsApi.getEvents();
        setEvents(data.docs);
      } catch (error: any) {
        showToast('error', error.message || 'Failed to fetch events');
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvents();
  }, []);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      {events.map(event => (
        <div key={event._id}>{event.title}</div>
      ))}
    </div>
  );
}
```

### Form Handling

```typescript
'use client';

import { useState } from 'react';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

export default function MyForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // API call
      showToast('success', 'Form submitted successfully!');
    } catch (error: any) {
      showToast('error', error.message || 'Submission failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        name="name"
        label="Name"
        value={formData.name}
        onChange={handleChange}
        required
      />
      <Input
        name="email"
        type="email"
        label="Email"
        value={formData.email}
        onChange={handleChange}
        required
      />
      <Button type="submit" isLoading={isSubmitting}>
        Submit
      </Button>
    </form>
  );
}
```

### Modal Usage

```typescript
'use client';

import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';

export default function ModalExample() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>
        Open Modal
      </Button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Modal Title"
        description="Modal description"
      >
        <div>Modal content goes here</div>
        <div className="mt-4 flex gap-2">
          <Button onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button variant="primary">
            Confirm
          </Button>
        </div>
      </Modal>
    </>
  );
}
```

## Styling Guide

### TailwindCSS Classes
```typescript
// Good: Use Tailwind utility classes
<div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-md">

// Better: Use cn() for conditional classes
<div className={cn(
  'flex items-center justify-between p-4',
  isActive ? 'bg-primary-50' : 'bg-white',
  className
)}>

// Custom classes (avoid when possible)
<div className="my-custom-class">
```

### Responsive Design
```typescript
// Mobile first approach
<div className="text-sm md:text-base lg:text-lg">
  Responsive text
</div>

// Grid layouts
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {items.map(item => <div key={item.id}>{item.name}</div>)}
</div>
```

## Testing Tips

### Manual Testing Checklist
- [ ] Test all user roles
- [ ] Test responsive design (mobile, tablet, desktop)
- [ ] Test loading states
- [ ] Test error states
- [ ] Test form validation
- [ ] Test navigation
- [ ] Test authentication flow

### Browser Testing
- Chrome DevTools (F12)
- Network tab for API calls
- Console for errors
- React DevTools extension

## Debugging

### Common Issues & Solutions

#### Issue: "Cannot find module '@/...' "
**Solution**: Check `tsconfig.json` paths configuration

#### Issue: API calls fail with CORS error
**Solution**:
1. Ensure backend CORS is configured
2. Check `NEXT_PUBLIC_API_URL` in `.env.local`
3. Restart both servers

#### Issue: Authentication not working
**Solution**:
1. Clear localStorage: `localStorage.clear()`
2. Check JWT token in DevTools > Application > Local Storage
3. Verify backend is running

#### Issue: Styles not applying
**Solution**:
1. Check TailwindCSS configuration
2. Ensure classes are in content paths
3. Restart dev server

## Performance Tips

### 1. Use React.memo for expensive components
```typescript
const ExpensiveComponent = React.memo(({ data }) => {
  // expensive rendering
  return <div>{/* ... */}</div>;
});
```

### 2. Lazy load heavy components
```typescript
const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <div>Loading...</div>
});
```

### 3. Optimize images
```typescript
import Image from 'next/image';

<Image
  src="/image.jpg"
  alt="Description"
  width={500}
  height={300}
  priority={false}
/>
```

## Git Workflow

### Branch Naming
- `feature/feature-name` - New features
- `fix/bug-name` - Bug fixes
- `refactor/description` - Code refactoring
- `docs/description` - Documentation

### Commit Messages
```
feat: Add event registration form
fix: Resolve login authentication issue
refactor: Improve API client error handling
docs: Update README with setup instructions
style: Format code with prettier
```

## Environment Variables

### Development (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

### Production
```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api
```

## Useful Commands

```bash
# Development
npm run dev                 # Start dev server
npm run build              # Build for production
npm start                  # Start production server

# Code Quality
npm run lint               # Run linter
npm run lint:fix           # Fix linting issues

# Cleanup
rm -rf .next               # Clear build cache
rm -rf node_modules        # Remove dependencies
npm install                # Reinstall dependencies
```

## Resources

### Documentation
- [Next.js Docs](https://nextjs.org/docs)
- [React Docs](https://react.dev)
- [TailwindCSS Docs](https://tailwindcss.com)
- [TypeScript Docs](https://www.typescriptlang.org/docs)

### Tools
- [React DevTools](https://react.dev/learn/react-developer-tools)
- [Redux DevTools](https://github.com/reduxjs/redux-devtools)
- [VS Code](https://code.visualstudio.com/)

### Extensions (VS Code)
- ESLint
- Prettier
- Tailwind CSS IntelliSense
- TypeScript and JavaScript Language Features

## Best Practices

1. **Always use TypeScript**: Type safety prevents bugs
2. **Handle errors**: Always catch and display errors
3. **Show loading states**: Improve user experience
4. **Validate inputs**: Both client and server side
5. **Write reusable components**: DRY principle
6. **Use meaningful names**: Code should be self-documenting
7. **Keep components small**: Single responsibility principle
8. **Test different roles**: RBAC is critical
9. **Mobile first**: Design for mobile, enhance for desktop
10. **Document complex logic**: Help future developers

## Getting Help

1. Check this guide
2. Review existing code examples
3. Check the main README
4. Review component documentation
5. Check browser console for errors
6. Review API documentation

---

Happy coding! 🚀
