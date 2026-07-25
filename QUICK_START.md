# FormDock Frontend - Quick Start Guide

## Installation & Setup

```bash
# Clone or navigate to the project
cd formdock

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

---

## Getting Started

### Step 1: Login or Create Account

1. Navigate to `http://localhost:5173/login`
2. Enter credentials:
   - Username: `demo`
   - Password: `1`
3. Or create a new account at `/signup`

### Step 2: Create a Project

1. Go to `/projects`
2. Click "Create Project"
3. Enter project name and allowed domains
4. Get your API keys from project overview

### Step 3: Explore Public Features

Visit these pages **without logging in**:
- `http://localhost:5173/public/form-submit` - Test form submission
- `http://localhost:5173/public/faq-chat` - Test FAQ chatbot
- `http://localhost:5173/public/cms-reader` - Test CMS reader
- `http://localhost:5173/verify-email` - Test email verification
- `http://localhost:5173/integration-guide` - View API documentation

---

## Common Tasks

### Create & Test a Form Submission

```javascript
// JavaScript example
const apiKey = 'YOUR_PUBLIC_API_KEY';

fetch('http://localhost:8000/api/forms/submit/', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    project_api_key: apiKey,
    fields: {
      name: 'John Doe',
      email: 'john@example.com',
      message: 'Hello FormDock!'
    },
    metadata: {
      page_url: window.location.href,
      user_agent: navigator.userAgent
    }
  })
})
.then(res => res.json())
.then(data => console.log('Success:', data))
.catch(err => console.error('Error:', err));
```

### Ask the FAQ Chatbot

```javascript
// JavaScript example
const faqKey = 'YOUR_FAQ_PUBLIC_API_KEY';

fetch('http://localhost:8000/api/faq/chat/', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    faq_api_key: faqKey,
    question: 'What is your refund policy?',
    metadata: {
      page_url: window.location.href
    }
  })
})
.then(res => res.json())
.then(data => {
  console.log('Answer:', data.answer);
  console.log('Remaining quota:', data.remaining_quota);
})
.catch(err => console.error('Error:', err));
```

### Read CMS Collection

```javascript
// JavaScript example
const apiKey = 'YOUR_PUBLIC_API_KEY';
const collectionSlug = 'faq_items';

const params = new URLSearchParams({
  project_api_key: apiKey,
  page_url: window.location.href,
  limit: 20
});

fetch(`http://localhost:8000/api/collections/public/${collectionSlug}/?${params}`)
  .then(res => res.json())
  .then(data => {
    console.log('Collection:', data.collection);
    console.log('Entries:', data.entries);
  })
  .catch(err => console.error('Error:', err));
```

---

## Backend Configuration

In each page, you can configure the backend URL:

1. Look for "Backend URL" input field
2. Default: `http://localhost:8000`
3. Change if your backend is on a different URL
4. The setting persists within the page session

---

## Dashboard Features

### Projects Page (`/projects`)
- View all your projects
- Create new projects
- Edit project details
- Delete projects
- Manage allowed domains

### Project Overview Tab (`/projects/<id>/overview`)
- View API keys
- Copy API keys to clipboard
- Rotate API keys
- See recent enquiries and FAQ chats
- Check locked enquiry count
- Monitor FAQ usage

### Enquiries Tab (`/projects/<id>/enquiries`)
- Filter by category: spam, enquiry, job, support
- Search enquiries
- View enquiry details and IP addresses
- See locked vs visible enquiries
- View FAQ chats list

### FAQ Tab (`/projects/<id>/faq`)
- Configure FAQ bot settings:
  - Site name
  - Business summary
  - Key points
  - Support contact info
  - Business hours
  - Tone of voice
  - FAQ text
  - Extra context
- Test bot responses in real-time
- Include collections in context for testing

### CMS Tab (`/projects/<id>/cms`)
- Create collections
- Manage collection names
- Add entries with key-value fields
- Edit existing entries
- Delete collections and entries
- Support for JSON values
- Bulk entry upload
- Pagination support

### Analytics Tab (`/projects/<id>/analytics`)
- View daily and monthly stats
- Category distribution charts
- Country distribution maps
- Peak hour analysis
- Paywall status

### Billing Tab (`/projects/<id>/billing`)
- View billing status
- Create billing orders
- Verify payments
- Razorpay checkout integration
- Track active plans

---

## API Keys

### Where to Get Keys

1. Create a project
2. Go to project overview
3. Find "API Keys and Quota Snapshot" section
4. Copy the keys as needed

### Two Types of Keys

| Key Type | Purpose | Usage |
|----------|---------|-------|
| Public API Key | Form submission & CMS reading | `/api/forms/submit/`, CMS read |
| FAQ API Key | FAQ chatbot queries | `/api/faq/chat/` |

### Using API Keys

**Form Submission**:
```javascript
{
  "project_api_key": "pk_xxx...",  // Public API Key
  "fields": { "name": "...", "email": "..." }
}
```

**FAQ Chat**:
```javascript
{
  "faq_api_key": "faq_xxx...",  // FAQ API Key
  "question": "What is your refund policy?"
}
```

---

## Useful Tips

### 💡 Using the Test Pages

- **Form Submit Page**: Test your form integration without coding
- **FAQ Chat Page**: Ask test questions to verify your FAQ configuration
- **CMS Reader Page**: Browse your collections and test public access
- **Email Verify Page**: Get a link from test email or paste token manually
- **Integration Guide**: Copy & paste code examples for your website

### 🔑 API Key Management

- Copy API keys with one click
- Rotate keys anytime (old key becomes invalid)
- Never share your keys in public code
- Use FAQ key only for FAQ endpoint
- Regenerate keys if compromised

### 📊 Monitoring

- Check analytics for traffic patterns
- Monitor FAQ usage against quota
- Track enquiry categories
- View locked enquiries
- Check support messages

### 🛠️ Configuration

- Update FAQ configuration before going live
- Set correct allowed domains
- Configure business hours
- Add custom context for better answers
- Test thoroughly before production

---

## Troubleshooting

### "Backend URL not reachable"
- Check if backend is running on `http://localhost:8000`
- Verify backend is started with `python manage.py runserver`
- Update backend URL in the app

### "Invalid API key"
- Regenerate keys from project overview
- Make sure you're using the correct key type:
  - Public API Key for forms
  - FAQ API Key for chatbot
- Check domain is in allowed list

### "Rate limit exceeded (429)"
- You've exceeded your daily quota
- Wait until next day for reset
- Consider upgrading your plan
- For form-rewrite tool: you've used all 2 rewrites

### "Token expired"
- The JWT token has expired
- Refresh token will be used automatically
- If still failing, login again
- Check localStorage for token storage

### "Email verification failed"
- Token may be invalid or expired
- Request new verification email
- Check backend email configuration
- Verify email address in request

---

## Deployment

### Building for Production

```bash
# Build the app
npm run build

# Output will be in dist/ directory
# Serve with any static file server

# Python
python -m http.server -d dist 8080

# Node.js
npx http-server dist -p 8080

# Or use Netlify, Vercel, etc.
```

### Environment Variables

Create `.env` file:
```
VITE_API_URL=http://localhost:8000
VITE_APP_NAME=FormDock
```

Use in code:
```javascript
const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
```

---

## Development

### Project Structure

```
src/
├── App.jsx              # Main app component with routing
├── App.css              # Global styles
├── main.jsx             # Entry point
├── index.css            # Base styles
└── pages/               # Page components
    ├── PublicFormSubmit.jsx
    ├── PublicFaqChat.jsx
    ├── PublicCmsReader.jsx
    ├── EmailVerification.jsx
    ├── FormRewriteTool.jsx
    └── IntegrationGuide.jsx
```

### Adding New Pages

1. Create component in `src/pages/`
2. Add to imports in `App.jsx`
3. Add route in `parseRoute()` function
4. Add rendering logic in main return
5. Optional: Add navigation link

Example:
```javascript
// In App.jsx
import { MyNewPage } from './pages/MyNewPage'

// In parseRoute()
if (path === '/my-new-page') return { name: 'my-new-page' }

// In return
<nav>
  <button onClick={() => navigate('/my-new-page')}>My Page</button>
</nav>

// Render
{route.name === 'my-new-page' && <MyNewPage />}
```

---

## Commands

```bash
# Development
npm run dev          # Start dev server
npm run prebuild     # Generate template index

# Production
npm run build        # Build for production
npm run preview      # Preview production build

# Code Quality
npm run lint         # Run ESLint

# Pre-commit
npm run prebuild     # Runs before dev/build
```

---

## Need Help?

1. **API Documentation**: Visit `/integration-guide` in the app
2. **Code Examples**: Check example requests in each page
3. **Backend Setup**: Ensure backend is running on `http://localhost:8000`
4. **Issues**: Create a support ticket via `/support` page
5. **Notifications**: Check `/notifications` for system messages

---

## Version Info

- React: 19.2.0
- Vite: 7.3.1
- Created: 2026-03-26
- Status: ✅ Complete & Ready for Use

---

Happy coding! 🚀
