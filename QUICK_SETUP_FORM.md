# ⚡ QUICK SETUP: Form Submission Testing

## Get Your API Key (2 minutes)

### Via Dashboard (Easiest)
1. Open FormDocks React app
2. Login to your account
3. Click "Projects"
4. Click on your project
5. Look for "Overview" tab
6. Copy the **Form API Key** (looks like: `sk-abc123...`)

### Via Direct Code
If your dashboard has an issue, check your database:
```bash
# In Django shell
python manage.py shell
from core.projects.models import Project
proj = Project.objects.first()
print(proj.public_api_key)  # Your Form API Key
```

---

## Setup (30 seconds)

### Edit saastest.html
Open `public/templates/files/saastest.html` and find this line around line 135:

```javascript
const PROJECT_API_KEY = 'YOUR_FORM_API_KEY_HERE'; // Get this from your FormDocks project dashboard
```

Replace with your actual key:
```javascript
const PROJECT_API_KEY = 'sk-1234567890abcdef'; // Actual key
```

Also make sure the API URL is correct:
```javascript
const API_BASE_URL = 'http://localhost:8000'; // Change if backend is elsewhere
```

---

## Test It (1 minute)

### Option 1: Open in Browser
```bash
# Simply open the HTML file
open public/templates/files/saastest.html

# Or run a simple server
cd public/templates/files
python -m http.server 8001
# Then visit http://localhost:8001/saastest.html
```

### Option 2: Integrate in Your Site
```html
<iframe src="path/to/saastest.html" width="100%" height="600"></iframe>
```

### Test Flow:
1. Open page in browser
2. Fill out the form:
   - Full Name: "John Doe"
   - Email: "john@example.com"  
   - Subject: "Test"
   - Message: "This is a test"
3. Click "Send Message"
4. Should see: **✓ Thank you! Your message has been received.**
5. Check dashboard:
   - Go to your project → Enquiries
   - Should see submission appear (might say "Pending" if Celery processing)

---

## Verify It Worked

### In Dashboard
- [ ] Login to FormDocks
- [ ] Go to Projects → Your Project → Enquiries
- [ ] See your form submission
- [ ] See all your data (name, email, etc.)

### In Django Admin
```bash
python manage.py shell

from core.enquiries.models import Enquiry, EnquiryIngestQueue
print("Processed:", Enquiry.objects.count())
print("Pending:", EnquiryIngestQueue.objects.count())

# See one enquiry
e = Enquiry.objects.latest('created_at')
print(e.raw_payload)  # Should show your form data
```

### In Logs
```bash
# Check Django terminal
# Should see: [26/Mar/2026 14:18:57] "POST /api/forms/submit/ HTTP/1.1" 202 97
```

---

## Common Issues & Fixes

### ❌ "The page says 'Plug in Project API Key'"
**Cause**: You didn't update the key  
**Fix**: 
1. Copy your real API key from dashboard
2. Replace `'YOUR_FORM_API_KEY_HERE'` with actual key
3. Reload page

### ❌ "Error: Invalid API key"
**Cause**: Wrong or expired key  
**Fix**:
1. Go to dashboard → Project → Overview
2. Click "Rotate Key" to generate new one
3. Copy new key
4. Update saastest.html

### ❌ Form submits but nothing appears in dashboard
**Cause**: Celery not running OR backend not showing pending items  
**Fix**: Choose one:
- **Option 1** (Recommended): See `FORM_SUBMISSION_FIX.md` Solution 1
- **Option 2**: Start Celery worker: `celery -A yourproject worker -l info`
- **Option 3**: Wait 5 seconds and refresh dashboard

### ❌ "Network error" or CORS errors
**Cause**: Backend not accessible at `API_BASE_URL`  
**Fix**:
1. Make sure Django backend is running
2. Check it's on port 8000 (or update in code)
3. Verify CORS is enabled in Django settings
4. Try: http://localhost:8000/api/v1/ - should give JSON response

### ❌ Form disabled/not working
**Cause**: JavaScript error or wrong form ID  
**Fix**:
1. Open browser console (F12)
2. Look for red errors
3. Make sure form IDs match:
   - `id="contactForm"` on form
   - `id="name"`, `id="email"`, etc. on inputs

---

## Commands Reference

### Start Backend
```bash
cd path/to/django/project
python manage.py runserver
# Visits http://localhost:8000
```

### Start Celery Worker (for async processing)
```bash
cd path/to/django/project
celery -A yourproject worker -l info
```

### Open Html Form
```bash
# Way 1: Direct file
open public/templates/files/saastest.html

# Way 2: With server
cd public/templates/files
python -m http.server 8001
# Visit http://localhost:8001/saastest.html

# Way 3: From React dev server
# If running Vite, copy URL of the form
```

### Check Database
```bash
python manage.py shell
from core.enquiries.models import Enquiry
Enquiry.objects.filter(project__name='YourProject').count()
```

---

## What Data Gets Collected

When someone submits the form, you get:

```json
{
  "full_name": "John Doe",
  "email": "john@example.com",
  "subject": "Test Subject",
  "message": "The message content",
  "metadata": {
    "page_url": "http://localhost:8001/saastest.html",
    "referrer": "direct",
    "user_agent": "Mozilla/5.0...",
    "timestamp": "2026-03-26T14:18:57.123Z"
  }
}
```

All visible in dashboard under Enquiries tab.

---

## Real-World Usage

### For Your Website
```html
<script>
  // Inject form on your site
  const script = document.createElement('script');
  script.src = 'https://yoursite.com/templates/saastest.html';
  document.body.appendChild(script);
</script>
```

### For Public Forms
1. Host saastest.html on your website
2. It sends data to FormDocks backend
3. You see all submissions in dashboard
4. Great for contact forms, support tickets, feedback, etc.

### For Team
1. Share the API key in documentation
2. Multiple forms can use same key
3. All submissions appear in one dashboard
4. Can export and filter data

---

## Next: More Complex Forms

Once basic form works, you can:

1. **Customize form styling** - Edit CSS in saastest.html
2. **Add more fields** - Add input elements + update JavaScript
3. **Validate data** - Add form.checkValidity() checks
4. **Success redirects** - window.location.href = after success
5. **Integration** - Use form rewrite tool for existing HTML

See `FORM_SUBMISSION_FIX.md` for advanced options.

---

## Support Quick Links

- **API Key Issues**: See "Get Your API Key" above
- **Backend Problems**: See "Common Issues & Fixes"
- **Integration Help**: See `BACKEND_INTEGRATION.md`
- **Full Troubleshooting**: See `FORM_SUBMISSION_FIX.md`

---

## Fastest Test (Copy-Paste)

```bash
# 1. Get your API key (from dashboard)
API_KEY="sk-your-key-here"

# 2. Test with curl
curl -X POST http://localhost:8000/api/forms/submit/ \
  -H "Content-Type: application/json" \
  -d '{
    "project_api_key": "'$API_KEY'",
    "fields": {
      "full_name": "John Doe",
      "email": "john@example.com",
      "subject": "Test",
      "message": "Test message"
    },
    "metadata": {
      "page_url": "http://localhost:8001/saastest.html"
    }
  }'

# Should return 202 with enquiry_id
```

That's it! Your form is now integrated with FormDocks! 🎉
