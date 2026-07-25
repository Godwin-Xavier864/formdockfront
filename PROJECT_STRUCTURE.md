# FormDock Frontend - Project Structure Reference

## Complete Project Structure

```
formdock/
├── 📄 PROJECT FILES
│   ├── package.json                  # Dependencies
│   ├── package-lock.json            # Locked versions
│   ├── vite.config.js               # Vite configuration
│   ├── eslint.config.js             # ESLint rules
│   ├── index.html                   # HTML entry point
│   ├── API.txt                      # API documentation
│   ├── README.md                    # Original README
│   │
│   ├── 📋 NEW DOCUMENTATION (ADDED)
│   ├── IMPLEMENTATION_SUMMARY.md   # This file
│   ├── FRONTEND_COMPLETE.md        # Complete feature docs
│   └── QUICK_START.md              # Quick start guide
│
├── 📁 src/                          # Source code
│   ├── App.jsx                      # ✏️ UPDATED - Main app with routing
│   ├── App.css                      # ✏️ UPDATED - Global styles (+350 lines)
│   ├── main.jsx                     # React entry point
│   ├── index.css                    # Base CSS
│   ├── AdvancedApiPanel.jsx         # Existing component
│   │
│   └── 📁 pages/                    # ✨ NEW PAGES FOLDER
│       ├── PublicFormSubmit.jsx     # ✨ NEW - Form submission UI
│       ├── PublicFaqChat.jsx        # ✨ NEW - FAQ chatbot
│       ├── PublicCmsReader.jsx      # ✨ NEW - CMS content reader
│       ├── EmailVerification.jsx    # ✨ NEW - Email verification
│       ├── FormRewriteTool.jsx      # ✨ NEW - AI form rewriting
│       └── IntegrationGuide.jsx     # ✨ NEW - Developer docs
│
├── 📁 public/                       # Static files
│   └── templates/                   # Template files
│       └── index.json
│
├── 📁 scripts/                      # Build scripts
│   └── generate-template-index.mjs
│
├── 📁 dist/                         # Build output (generated)
│
├── 📁 node_modules/                 # Dependencies (generated)
│
└── .github/                         # GitHub files
    .gitignore                       # Git ignore rules
```

---

## New Components Added

### 1. PublicFormSubmit.jsx
```
Path: src/pages/PublicFormSubmit.jsx
Lines: ~367
Purpose: Public form submission interface
Route: /public/form-submit
Features:
  - API key configuration
  - Standard fields (name, email, message)
  - Custom fields support
  - Metadata capture
  - Response display
Auth Required: No
```

### 2. PublicFaqChat.jsx
```
Path: src/pages/PublicFaqChat.jsx
Lines: ~272
Purpose: FAQ chatbot interface
Route: /public/faq-chat
Features:
  - Question input
  - Chat history
  - Collection inclusion
  - Quota tracking
  - Response display
Auth Required: No
```

### 3. PublicCmsReader.jsx
```
Path: src/pages/PublicCmsReader.jsx
Lines: ~250
Purpose: CMS collection reader
Route: /public/cms-reader
Features:
  - Collection selection by slug
  - Pagination support
  - Entry browsing
  - Field display
Auth Required: No
```

### 4. EmailVerification.jsx
```
Path: src/pages/EmailVerification.jsx
Lines: ~140
Purpose: Email verification workflow
Route: /verify-email
Features:
  - Token input
  - URL param extraction
  - Verification
  - Success feedback
Auth Required: No
```

### 5. FormRewriteTool.jsx
```
Path: src/pages/FormRewriteTool.jsx
Lines: ~260
Purpose: AI form rewriting tool
Route: /tools/form-rewrite
Features:
  - HTML input
  - Groq AI rewriting
  - Download option
  - Quota tracking
Auth Required: Yes (JWT)
```

### 6. IntegrationGuide.jsx
```
Path: src/pages/IntegrationGuide.jsx
Lines: ~480
Purpose: Developer documentation
Route: /integration-guide
Features:
  - Form submission examples
  - FAQ chat examples
  - CMS reader examples
  - Authentication guide
  - Error handling
Auth Required: No
```

---

## Modified Files

### App.jsx Changes
**Location**: src/App.jsx

**Additions**:
- 6 new component imports (lines 2-7)
- New routes in parseRoute(): 
  - /verify-email
  - /public/form-submit
  - /public/faq-chat
  - /public/cms-reader
  - /tools/form-rewrite
  - /integration-guide
- Updated auth check to allow public routes
- Rendering logic for new pages
- Navigation buttons for new pages
- Public pages quick menu

**Lines Added**: ~165

### App.css Changes
**Location**: src/App.css

**Additions**:
- Public page wrapper styles (.public-form-submit, etc.)
- Code block styling (.code-block, .code-example)
- Form field layouts (.field-grid)
- Chart/bar styles (.bar-row, .bar-fill)
- Entry card grid (.entries-grid, .entry-card)
- FAQ/chat styling (.faq-answer, .chat-item)
- Form controls (input, textarea, button styles)
- Responsive adjustments

**Lines Added**: ~350

---

## Routes Summary

### Routes Structure

**Authentication Routes**
```
/ → /login
/signup
/verify-email
```

**Dashboard Routes (Protected)**
```
/projects
/projects/<id>
/projects/<id>/overview
/projects/<id>/enquiries
/projects/<id>/faq
/projects/<id>/cms
/projects/<id>/analytics
/projects/<id>/billing
/notifications
/support
/account
/tools/form-rewrite
/integration-guide
```

**Public Routes (No Auth)**
```
/public/form-submit
/public/faq-chat
/public/cms-reader
/verify-email (can be used by anyone)
```

---

## Component Hierarchy

```
App
├── Route: /login, /signup
│   └── renderAuthPage()
├── Route: /verify-email
│   └── EmailVerification
├── Route: /public/*
│   ├── PublicFormSubmit
│   ├── PublicFaqChat
│   └── PublicCmsReader
├── Route: /integration-guide
│   └── IntegrationGuide
└── Route: Authenticated
    ├── Route: /projects
    │   └── renderProjectsPage()
    ├── Route: /projects/<id>/<tab>
    │   └── renderProjectPage()
    │       ├── renderOverviewTab()
    │       ├── renderEnquiriesTab()
    │       ├── renderFaqTab()
    │       ├── renderCmsTab()
    │       ├── renderAnalyticsTab()
    │       └── renderBillingTab()
    ├── Route: /notifications
    │   └── renderNotificationsPage()
    ├── Route: /support
    │   └── renderSupportPage()
    ├── Route: /tools/form-rewrite
    │   └── FormRewriteTool
    └── Route: /account
        └── renderAccountPage()
```

---

## State Management

### App.jsx State Variables (Added)
```javascript
// Public page states are managed within each component
// App.jsx handles:
- path: Current page path
- baseUrl: Backend URL
- accessToken: JWT access token
- refreshToken: JWT refresh token
- me: Current user
- projects: Projects list
- ... (existing states)
```

### Component Local States
```javascript
PublicFormSubmit:
  - apiKey, pageUrl, formFields, customFields
  - status, error, busy, response, baseUrl

PublicFaqChat:
  - apiKey, pageUrl, question, includeCollections
  - status, error, busy, response, chatHistory, baseUrl

PublicCmsReader:
  - apiKey, collectionSlug, pageUrl, limit, page
  - status, error, busy, response, entries, baseUrl

EmailVerification:
  - token, status, error, busy, result, baseUrl

FormRewriteTool:
  - accessToken, projectId, htmlInput
  - status, error, busy, result, baseUrl
```

---

## Styling Classes Reference

### New CSS Classes Added

```css
/* Page Wrappers */
.public-form-submit
.public-faq-chat
.public-cms-reader
.email-verification
.form-rewrite-tool
.integration-guide

/* Code Display */
.code-block          /* Dark theme code blocks */
.code-example        /* Light theme code samples */

/* Form Layout */
.field-grid          /* 3-column grid with gaps */

/* Charts & Analytics */
.bar-row             /* Individual bar item */
.bar-label           /* Bar label text */
.bar-track           /* Bar background track */
.bar-fill            /* Bar filled portion */
.three-col           /* 3-column metrics grid */

/* CMS Content */
.entries-grid        /* Auto-fill grid for entries */
.entry-card          /* Individual entry card */
.entry-fields        /* Entry fields display */

/* Chat/FAQ */
.faq-answer          /* FAQ answer styling */
.chat-item           /* Chat message item */
.chat-question       /* Question styling */
.chat-answer         /* Answer background */

/* Status */
.verification-result /* Success message */
.text-muted          /* Muted text */

/* Navigation */
.public-pages-nav    /* Public pages quick access menu */

/* Utilities */
.empty               /* Empty state text */
.toc                /* Table of contents */
```

---

## API Integration Points

### Auth Endpoints
```
POST /api/auth/register/
POST /api/auth/token/
POST /api/auth/token/refresh/
GET /api/auth/email/verify/?token=
```

### User Endpoints
```
GET /api/v1/me/
DELETE /api/v1/me/
```

### Project Endpoints
```
GET /api/v1/projects/
POST /api/v1/projects/
GET /api/v1/projects/<id>/
PATCH /api/v1/projects/<id>/
DELETE /api/v1/projects/<id>/
GET /api/v1/projects/<id>/overview/
POST /api/v1/projects/<id>/rotate-key/
POST /api/v1/projects/<id>/rotate-faq-key/
```

### Enquiry Endpoints
```
GET /api/v1/projects/<id>/enquiries/
GET /api/v1/projects/<id>/faq-chats/
```

### FAQ Endpoints
```
GET /api/v1/projects/<id>/faq-config/
PUT /api/v1/projects/<id>/faq-config/
POST /api/v1/projects/<id>/faq/ask/
POST /api/faq/chat/
```

### CMS Endpoints
```
GET /api/v1/projects/<id>/collections/
POST /api/v1/projects/<id>/collections/
GET /api/v1/projects/<id>/collections/<id>/
PATCH /api/v1/projects/<id>/collections/<id>/
DELETE /api/v1/projects/<id>/collections/<id>/
GET /api/v1/projects/<id>/collections/<id>/entries/
POST /api/v1/projects/<id>/collections/<id>/entries/
PATCH /api/v1/projects/<id>/collections/<id>/entries/<id>/
DELETE /api/v1/projects/<id>/collections/<id>/entries/<id>/
GET /api/collections/public/<slug>/
```

### Analytics & Billing
```
GET /api/v1/projects/<id>/analytics/
GET /api/v1/projects/<id>/billing/
POST /api/v1/projects/<id>/billing/order/
POST /api/v1/projects/<id>/billing/verify/
```

### Tools
```
POST /api/v1/tools/form-rewrite/
```

### System
```
GET /api/v1/notifications/
GET /api/v1/support/
POST /api/v1/support/
```

### Public APIs
```
POST /api/forms/submit/
POST /api/faq/chat/
GET /api/collections/public/<slug>/
```

---

## Development Workflow

### Edit Existing Page
1. Edit component file in `src/pages/`
2. Component auto-reloads in dev server
3. No need to rebuild

### Add New Page
1. Create component in `src/pages/NewPage.jsx`
2. Import in `App.jsx`
3. Add route in `parseRoute()`
4. Add rendering logic
5. Add navigation link

### Update Styling
1. Edit `src/App.css`
2. Styles auto-update in browser
3. Responsive breakpoints already configured

### Test Public API
1. Navigate to `/public/form-submit` (etc.)
2. No login required
3. Test with API keys from dashboard

### Deploy
```bash
npm run build
# Output in dist/ folder
# Deploy to any static host
```

---

## Important Notes

### Backend Configuration
- Default: http://localhost:8000
- Configurable in each public page
- Change if backend on different URL

### API Keys
- **Public Key**: Use for forms and CMS reading
- **FAQ Key**: Use only for FAQ chatbot
- Never expose refresh tokens
- Rotate keys periodically

### Rate Limiting
- Form submissions: Queue-based (Celery)
- FAQ chats: Redis-backed limiter
- Form rewrite: Hard quota of 2/user
- Exceeded: Returns 429 status

### Data Persistence
- Tokens: Stored in localStorage
- State: Stored in component/app state
- Collections: Persisted in backend DB
- Analytics: Server-side aggregation

---

## Troubleshooting References

### 404 Page Errors
- Check route in `parseRoute()`
- Verify component import
- Check rendering logic in return

### Component Not Showing
- Verify route parsing
- Check component export
- Validate rendering condition
- Check console for errors

### Styling Issues
- Check CSS class names
- Verify responsive breakpoints
- Clear browser cache
- Check CSS specificity

### API Errors
- Verify backend URL
- Check API key validity
- Inspect response in Network tab
- Review error message

---

## File Statistics

```
Total Lines of Code: ~2,284
New Components: 6 files
Updated Files: 2 files
Documentation: 3 guides
CSS Classes Added: 50+
Routes Added: 6
Components: 6 new exports
API Endpoints: 42 integrated
```

---

## Maintenance Tips

### Regular Maintenance
- Test all routes monthly
- Update package dependencies
- Review and update API docs
- Monitor error logs

### Performance
- Use Chrome DevTools
- Profile component renders
- Monitor bundle size
- Check network requests

### Security
- Rotate API keys regularly
- Update token expiry settings
- Monitor for suspicious activity
- Keep dependencies updated

---

## Links & References

- **Vite Docs**: https://vitejs.dev/
- **React Docs**: https://react.dev/
- **API Docs**: In-app at `/integration-guide`
- **Styling**: See QUICK_START.md

---

## Support Resources

1. **QUICK_START.md** - Getting started
2. **FRONTEND_COMPLETE.md** - Feature details
3. **IMPLEMENTATION_SUMMARY.md** - Overview
4. **Integration Guide** - In-app at `/integration-guide`
5. **Code Comments** - Throughout source

---

**Generated**: 2026-03-26  
**Status**: ✅ Complete  
**Ready for**: Production & Maintenance

