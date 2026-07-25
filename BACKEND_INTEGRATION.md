# Backend Integration Guide

## Overview

This document describes the complete backend integration for the FormDocks React application. The application now includes comprehensive support for all Django REST backend features including form submissions, FAQ chat, project management, billing, and content management.

## Architecture

### API Client (`src/services/apiClient.js`)
- Centralized API client class for all backend endpoints
- Handles authentication tokens, request/response parsing, and error handling
- Supports both authenticated and public API endpoints
- Automatically includes Bearer token in Authorization header for authenticated requests

### React Hooks (`src/services/useApi.js`)
- Custom React hooks for API calls with loading and error states
- Helper functions for parsing API errors and list responses
- Integrates with apiClient for seamless API consumption

### Page Components
- **ProjectsListPage**: List, create, and manage projects
- **ProjectDashboard**: Complete project management with all tabs (overview, enquiries, FAQ, CMS, analytics, billing)
- **AccountPage**: User account settings and account deletion
- **NotificationsPage**: Display system notifications
- **SupportPage**: Submit and view support messages

## Implemented Features

### 1. Authentication
- **Register**: `/api/auth/register/` - Create new user account
- **Login**: `/api/auth/token/` - Obtain access and refresh tokens
- **Token Refresh**: `/api/auth/token/refresh/` - Refresh expired access tokens
- **Email Verification**: `/api/auth/verify-email/` - Verify user email address
- **Get Current User**: `/api/v1/me/` - Fetch current user information

### 2. Project Management
- **List Projects**: `/api/v1/projects/` - Get all user's projects
- **Create Project**: `/api/v1/projects/` - Create new project
- **Get Project**: `/api/v1/projects/{id}/` - Get project details
- **Update Project**: `/api/v1/projects/{id}/` - Update project settings
- **Delete Project**: `/api/v1/projects/{id}/` - Delete project
- **Get Project Overview**: `/api/v1/projects/{id}/overview/` - Get overview stats

### 3. API Key Management
- **Rotate Form API Key**: `/api/v1/projects/{id}/rotate-key/` - Generate new form submission API key
- **Rotate FAQ API Key**: `/api/v1/projects/{id}/rotate-faq-key/` - Generate new FAQ API key

### 4. Enquiries (Form Submissions)
- **List Enquiries**: `/api/v1/projects/{id}/enquiries/` - Get form submissions with filtering
  - Filter by category: `?category=general|spam`
  - Search in payloads: `?search=text`
- **Throttling**: Form submissions are throttled per IP address

### 5. FAQ Configuration & Chat
- **Get FAQ Config**: `/api/v1/projects/{id}/faq-config/` - Fetch FAQ configuration
- **Update FAQ Config**: `/api/v1/projects/{id}/faq-config/` - Update FAQ settings
  - Fields: site_name, business_summary, key_points, support_email, support_phone, business_hours, tone, faqs_text, extra_context
- **Ask FAQ (for project owners)**: `/api/v1/projects/{id}/faq-ask/` - Get AI-generated FAQ answers
- **List FAQ Chats**: `/api/v1/projects/{id}/faq-chats/` - Get chat message history
  - Filter by blocked status: `?blocked=true|false`
  - Search in questions/answers: `?search=text`
- **Public FAQ Chat**: `/api/faq/chat/` - Public endpoint for FAQ chat (no auth required)

### 6. Collections (CMS)
- **List Collections**: `/api/v1/projects/{id}/collections/` - Get all collections
- **Create Collection**: `/api/v1/projects/{id}/collections/` - Create new collection
- **Get Collection**: `/api/v1/projects/{id}/collections/{cid}/` - Get collection details
- **Update Collection**: `/api/v1/projects/{id}/collections/{cid}/` - Update collection name
- **Delete Collection**: `/api/v1/projects/{id}/collections/{cid}/` - Delete collection

### 7. Collection Entries
- **List Entries**: `/api/v1/projects/{id}/collections/{cid}/entries/` - Get collection entries with pagination
  - Supports limit parameter: `?limit=20`
- **Create Entry**: `/api/v1/projects/{id}/collections/{cid}/entries/` - Add new entry
- **Update Entry**: `/api/v1/projects/{id}/collections/{cid}/entries/{eid}/` - Modify entry data
- **Delete Entry**: `/api/v1/projects/{id}/collections/{cid}/entries/{eid}/` - Remove entry
- **Public Collection Read**: `/api/public/collections/{slug}/` - Read collection publicly (no auth)
  - Parameters: `project_api_key`, `limit`, `page_url`

### 8. Analytics
- **Get Analytics**: `/api/v1/projects/{id}/analytics/` - Get project analytics and statistics

### 9. Billing & Payments
- **Billing Overview**: `/api/v1/projects/{id}/billing/` - Get billing information and available plans
- **Create Order**: `/api/v1/projects/{id}/billing/order/` - Create Razorpay payment order
  - Parameters: `plan_id`, `client_request_id` (optional)
- **Verify Payment**: `/api/v1/projects/{id}/billing/verify/` - Verify and activate subscription
  - Parameters: `payment_id`, `razorpay_order_id`, `razorpay_payment_id`, `razorpay_signature`

### 10. Public Form Submission
- **Submit Form**: `/api/forms/submit/` - Public form submission endpoint
  - Parameters: `project_api_key`, `fields`, `metadata`
  - Throttled per IP address
  - Returns: `success`, `enquiry_id`, `locked`, `queued`

### 11. Notifications
- **List Notifications**: `/api/v1/notifications/` - Get active system notifications
  - Cached responses for performance
  - Filtered by publish_at and expires_at

### 12. Support Messages
- **List Support Messages**: `/api/v1/support/` - Get user's support messages
- **Create Support Message**: `/api/v1/support/` - Submit new support request
  - Parameters: `subject`, `message`

### 13. HTML Rewrite Tool
- **Rewrite HTML**: `/api/v1/html-rewrite/` - Rewrite HTML forms with API integration
  - Parameters: `project_id`, `html_input`
  - Returns: `rewritten_html`, `tries_left`

## Usage Examples

### Basic API Call
```javascript
import { apiClient } from './services/apiClient'

// Get projects
const { response, data } = await apiClient.listProjects(accessToken)
if (response.ok) {
  console.log(data)
}
```

### Using API Client in Components
```javascript
import { useState, useEffect } from 'react'
import { apiClient } from '../services/apiClient'

export function MyComponent({ accessToken, projectId }) {
  const [enquiries, setEnquiries] = useState([])

  useEffect(() => {
    async function loadEnquiries() {
      const { response, data } = await apiClient.listEnquiries(
        accessToken, 
        projectId,
        { category: '', search: '' }
      )
      if (response.ok) {
        setEnquiries(Array.isArray(data) ? data : data.results || [])
      }
    }
    loadEnquiries()
  }, [accessToken, projectId])

  return (
    <div>
      {enquiries.map(e => (
        <div key={e.id}>{e.category}</div>
      ))}
    </div>
  )
}
```

## Authentication Flow

1. **Login/Register**: Call `login()` or `register()` to get access and refresh tokens
2. **Store Tokens**: Access token is stored in localStorage as `formdock_access_token`
3. **Make Requests**: Include access token in Authorization header
4. **Token Refresh**: When 401 error received, refresh token using refresh token
5. **Auto-retry**: Failed requests with 401 are automatically retried with new token

## Error Handling

The API client provides comprehensive error handling:

```javascript
const { response, data, error } = await apiClient.listProjects(accessToken)

if (!response.ok) {
  console.error('Error:', data.detail || data.error || 'Unknown error')
}
```

## Configuration

API base URL is configured in `src/config.js`:
```javascript
export const API_BASE_URL = 'http://localhost:8000'
```

Change this to point to your backend server.

## Rate Limiting

The application respects backend rate limits:
- Form submissions: Limited per IP per time window
- FAQ chats: Limited per IP per time window
- Public CMS reads: Limited per IP per time window
- Internal operations: Various scoped limits

## Billing Integration

The billing system integrates with Razorpay for payment processing:

1. User selects a plan
2. Frontend creates an order via `/api/v1/projects/{id}/billing/order/`
3. Backend returns Razorpay order details
4. Frontend opens Razorpay payment modal
5. After successful payment, verify payment via `/api/v1/projects/{id}/billing/verify/`
6. Backend activates subscription

## Performance Optimizations

- **Caching**: Notification responses are cached
- **Pagination**: Collection entries support pagination with limit parameter
- **Throttling**: API endpoints have built-in throttling

## Next Steps

1. **Environment Configuration**: Update API_BASE_URL in config.js for your backend
2. **Test Authentication**: Verify login/register flow works
3. **Test Project Features**: Create a project and test all dashboard tabs
4. **Configure Billing**: Set up Razorpay keys in backend for payment processing
5. **Deploy**: Deploy both frontend and backend to production

## Troubleshooting

### 401 Unauthorized
- Check if access token is valid
- Ensure token is correctly stored in localStorage
- Try refreshing the page to trigger token refresh

### CORS Errors
- Ensure backend is running on the URL specified in config.js
- Check backend CORS configuration allows frontend origin

### API Timeouts
- Check network connectivity
- Verify backend server is running
- Check for slow database queries causing delays

## Support

For issues or questions about the backend integration:
1. Check the error messages in browser console
2. Review the API response data
3. Verify backend is configured correctly
4. Check backend logs for detailed error information
