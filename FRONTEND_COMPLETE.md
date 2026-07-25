# FormDock Frontend - Complete Integration Guide

## Overview

This is a comprehensive React + Vite frontend application for FormDock that includes both authenticated dashboard and public-facing pages for handling form submissions, FAQ chatbots, and CMS content management.

## New Frontend Pages Created

### 1. **Public Form Submission** (`/public/form-submit`)
📍 Location: `src/pages/PublicFormSubmit.jsx`

**Purpose**: Allows visitors to submit enquiries directly to your FormDock project.

**Features**:
- Configure API key and backend URL
- Add standard fields (name, email, message)
- Add custom fields dynamically
- Automatic metadata capture (page URL, referrer, user agent)
- Real-time API response display
- Form validation

**API Endpoint Used**: `POST /api/forms/submit/`

**Usage Example**:
```html
<form id="contact-form">
  <input type="text" name="name" required />
  <input type="email" name="email" required />
  <textarea name="message"></textarea>
  <button type="submit">Send</button>
</form>
```

---

### 2. **Public FAQ Chatbot** (`/public/faq-chat`)
📍 Location: `src/pages/PublicFaqChat.jsx`

**Purpose**: Interactive FAQ chatbot powered by Groq LLM for visitors to ask questions.

**Features**:
- API key and configuration management
- Question input with textarea
- Include CMS collections in context
- Chat history tracking
- Response with remaining quota display
- Test mode indicator

**API Endpoint Used**: `POST /api/faq/chat/`

**Quota Information**:
- Test mode: 50 chats/day per project
- Paid plan: varies by subscription
- Global limit: 100,000 chats/day

**Usage Example**:
```javascript
const response = await fetch('http://localhost:8000/api/faq/chat/', {
  method: 'POST',
  body: JSON.stringify({
    faq_api_key: 'FAQ_KEY',
    question: 'What is your refund policy?'
  })
});
```

---

### 3. **Public CMS Reader** (`/public/cms-reader`)
📍 Location: `src/pages/PublicCmsReader.jsx`

**Purpose**: Display CMS collection data publicly on websites.

**Features**:
- Load collections by slug
- Pagination support (limit & page)
- Display collection metadata
- Browse all entries with field data
- Domain validation enforcement
- API key security

**API Endpoint Used**: `GET /api/collections/public/<slug>`

**Query Parameters**:
- `project_api_key`: Your public API key (required)
- `page_url`: Current page URL
- `limit`: Results per page (1-100, default: 20)
- `page`: Page number (default: 1)

---

### 4. **Email Verification** (`/verify-email`)
📍 Location: `src/pages/EmailVerification.jsx`

**Purpose**: Verify user email addresses after registration.

**Features**:
- Automatic token extraction from URL params
- Manual token input field
- Verify button with loading state
- Success/error feedback
- Link to login page

**API Endpoint Used**: `GET /api/auth/email/verify/?token=...`

**How it works**:
1. User receives verification email after signup
2. User clicks link or pastes token
3. Token is verified
4. Email is marked as verified in the system

---

### 5. **Form AI Rewrite Tool** (`/tools/form-rewrite`)
📍 Location: `src/pages/FormRewriteTool.jsx`

**Features**:
- Requires JWT authentication
- Configure backend URL and access token
- Input HTML form code
- Rewrite using Groq AI
- View rewritten HTML
- Download as file
- Use as input for next rewrite

**API Endpoint Used**: `POST /api/v1/tools/form-rewrite/`

**Quota**:
- Maximum 2 rewrites per user (hard quota)
- Status 429 when limit exhausted

**Request Format**:
```json
{
  "project_id": "uuid",
  "html_input": "<!DOCTYPE html>..."
}
```

---

### 6. **Integration Guide** (`/integration-guide`)
📍 Location: `src/pages/IntegrationGuide.jsx`

**Purpose**: Comprehensive documentation for developers on using FormDock APIs.

**Sections**:
- Form submission examples (HTML + JavaScript)
- FAQ chatbot integration
- CMS collection reader examples
- Authentication & JWT tokens
- Error handling
- Status codes & error responses
- Code examples for all major endpoints

---

## Authentication & Public Pages

### Public Routes (No Auth Required)
- `/login` - User login
- `/signup` - User registration
- `/verify-email` - Email verification
- `/public/form-submit` - Form submission tool
- `/public/faq-chat` - FAQ chatbot
- `/public/cms-reader` - CMS reader
- `/integration-guide` - Developer documentation

### Protected Routes (Auth Required)
- `/projects` - Project listing
- `/projects/<id>/<tab>` - Project management
- `/notifications` - System notifications
- `/support` - Support messages
- `/tools/form-rewrite` - AI form rewriting (paid feature)
- `/account` - User account settings

---

## Component Structure

```
src/
├── pages/               # New page components
│   ├── PublicFormSubmit.jsx
│   ├── PublicFaqChat.jsx
│   ├── PublicCmsReader.jsx
│   ├── EmailVerification.jsx
│   ├── FormRewriteTool.jsx
│   └── IntegrationGuide.jsx
├── App.jsx              # Main app with routing
├── App.css              # Styling (updated)
└── main.jsx
```

---

## Navigation

### Authenticated Dashboard
The authenticated dashboard now includes:
- Main navigation with new tools
- Public pages quick access menu
- Form Rewrite tool link
- Integration guide link
- Public pages section showing:
  - Form Submit
  - FAQ Chat
  - CMS Reader
  - Email Verify

---

## API Integration Summary

### All Integrated Endpoints

| Feature | Method | Endpoint | Auth Required |
|---------|--------|----------|---|
| Register | POST | `/api/auth/register/` | No |
| Login | POST | `/api/auth/token/` | No |
| Refresh Token | POST | `/api/auth/token/refresh/` | No |
| Email Verify | GET | `/api/auth/email/verify/?token=...` | No |
| Submit Form | POST | `/api/forms/submit/` | No |
| FAQ Chat | POST | `/api/faq/chat/` | No |
| CMS Reader | GET | `/api/collections/public/<slug>` | No |
| Form Rewrite | POST | `/api/v1/tools/form-rewrite/` | Yes |
| Project Management | GET/POST/PATCH/DELETE | `/api/v1/projects/` | Yes |
| Project Overview | GET | `/api/v1/projects/<id>/overview/` | Yes |
| Enquiries | GET | `/api/v1/projects/<id>/enquiries/` | Yes |
| FAQ Config | GET/PUT | `/api/v1/projects/<id>/faq-config/` | Yes |
| FAQ Ask | POST | `/api/v1/projects/<id>/faq/ask/` | Yes |
| Collections | GET/POST/PATCH/DELETE | `/api/v1/projects/<id>/collections/` | Yes |
| Entries | GET/POST/PATCH/DELETE | `/api/v1/projects/<id>/collections/<id>/entries/` | Yes |
| Analytics | GET | `/api/v1/projects/<id>/analytics/` | Yes |
| Billing | GET/POST | `/api/v1/projects/<id>/billing/` | Yes |
| Notifications | GET | `/api/v1/notifications/` | Yes |
| Support Messages | GET/POST | `/api/v1/support/` | Yes |
| Account | GET/DELETE | `/api/v1/me/` | Yes |

---

## Styling

New CSS classes added for public pages:
- `.public-form-submit` - Form submission page wrapper
- `.public-faq-chat` - FAQ chat page wrapper
- `.public-cms-reader` - CMS reader wrapper
- `.email-verification` - Email verification wrapper
- `.form-rewrite-tool` - Form rewrite tool wrapper
- `.integration-guide` - Integration guide wrapper
- `.code-block` - Dark code blocks
- `.code-example` - Light code examples
- `.faq-answer` - FAQ answer styling
- `.chat-item` - Chat message styling
- `.verification-result` - Success message styling
- `.entries-grid` - Entry card grid layout
- `.entry-card` - Individual entry card styling

---

## How to Run

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

The app will be available at `http://localhost:5173` (or the Vite default port).

---

## Environment Configuration

The backend URL is configurable in each page:
- Default: `http://localhost:8000`
- Configurable via input fields on each page
- Persists in component state

For authentication:
- JWT tokens stored in localStorage
- Access token: `formdock_access_token`
- Refresh token: `formdock_refresh_token`

---

## Features Implemented

✅ Public form submission with field validation  
✅ Interactive FAQ chatbot with chat history  
✅ CMS collection reader with pagination  
✅ Email verification workflow  
✅ AI-powered form rewriting tool  
✅ Complete developer documentation  
✅ JWT authentication & token refresh  
✅ Project management dashboard  
✅ Enquiry filtering and display  
✅ Analytics visualization with charts  
✅ Billing integration with Razorpay  
✅ Support ticket system  
✅ User account management  
✅ Notifications system  
✅ Mini CMS with collections and entries  
✅ FAQ configuration and testing  

---

## Error Handling

All components include:
- Validation for required fields
- Error message display
- Loading state management (busy flag)
- HTTP status code handling
- 429 rate limit handling
- Automatic token refresh on 401
- User-friendly error messages

---

## Security Features

- JWT authentication with refresh tokens
- Public API keys for form submission
- Domain validation enforcement
- Allowed domains list management
- Session management
- Secure token storage in localStorage
- CORS-compliant fetch requests

---

## Browser Support

- Modern browsers with ES6 support
- Fetch API support
- localStorage support
- CSS Grid & Flexbox support

---

## Future Enhancements

- Real-time WebSocket support for notifications
- Export functionality for analytics
- Bulk import/export for entries
- Custom branding options
- API rate limiting dashboard
- Advanced filtering and search
- User roles and permissions
- Audit logging
- Backup and recovery tools

---

## Support

For issues or questions:
1. Check the Integration Guide at `/integration-guide`
2. Review API documentation in the app
3. Submit support ticket via `/support` page
4. Check notifications at `/notifications`

---

**Created**: 2026-03-26  
**Version**: 1.0.0  
**Built with**: React 19.2 + Vite 7.3
