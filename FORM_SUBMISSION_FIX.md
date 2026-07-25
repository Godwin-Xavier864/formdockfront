# 🔧 FORM SUBMISSION FIX GUIDE

## Problem
Form submissions return 202 (accepted) but don't appear in the dashboard immediately.

**Root Cause**: 
1. Submissions are queued in `EnquiryIngestQueue` 
2. A Celery task processes them into the `Enquiry` model
3. Dashboard only queries `Enquiry`, not the queue
4. If Celery isn't running, submissions stay queued forever

---

## Solution 1: Show Pending Enquiries (RECOMMENDED)

Update your `ProjectEnquiryListAPIView` to include pending queue items:

```python
class ProjectEnquiryListAPIView(APIView):
    permission_classes = [EmailVerifiedPermission]
    
    def get(self, request, project_id):
        project = Project.objects.filter(id=project_id, owner=request.user).first()
        if not project:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        
        # Get processed enquiries
        enquiries = Enquiry.objects.filter(project=project).order_by('-created_at')
        
        # Get pending enquiries from queue
        pending_enquiries = EnquiryIngestQueue.objects.filter(
            project=project,
            status=EnquiryIngestQueue.STATUS_PENDING
        ).order_by('-queued_at')
        
        # Apply filters
        category = request.GET.get('category')
        if category:
            enquiries = enquiries.filter(category=category)
            pending_enquiries = pending_enquiries.filter(category=category)
        
        search = request.GET.get('search')
        if search:
            enquiries = enquiries.filter(raw_payload__icontains=search)
            pending_enquiries = pending_enquiries.filter(
                models.Q(payload__icontains=search) | models.Q(raw_payload__icontains=search)
            )
        
        # Format processed enquiries
        data = [
            {
                'id': str(e.id),
                'category': e.category,
                'ip_address': e.ip_address,
                'created_at': e.created_at,
                'raw_payload': None if e.is_locked else e.raw_payload,
                'is_locked': e.is_locked,
                'status': 'processed',
            }
            for e in enquiries[:400]
        ]
        
        # Add pending enquiries
        pending_data = [
            {
                'id': str(e.id),
                'category': e.category or 'general',
                'ip_address': e.ip_address,
                'created_at': e.queued_at,
                'raw_payload': e.payload,
                'is_locked': False,
                'status': 'pending',  # UI can show spinner or different styling
            }
            for e in pending_enquiries[:100]
        ]
        
        # Combine and sort (newest first)
        all_data = pending_data + data
        all_data.sort(key=lambda x: x['created_at'], reverse=True)
        
        return Response(all_data[:500])
```

---

## Solution 2: Synchronous Processing for Testing

If Celery isn't running, process the queue immediately in `FormSubmitAPIView.post()`:

**Original (problematic):**
```python
try:
    process_enquiry_queue_batch.delay()
except Exception:
    # Queue item is persisted; beat/worker can flush later.
    pass
```

**Fixed:**
```python
try:
    # Try async first
    process_enquiry_queue_batch.delay()
except Exception:
    # If Celery fails, process synchronously
    try:
        from core.enquiries.tasks import process_enquiry_queue_batch as task_func
        # Get the actual function to call
        if hasattr(process_enquiry_queue_batch, 'task'):
            # It's a Celery task, get the underlying function
            process_enquiry_queue_batch()  # Call without delay
    except Exception:
        # Queue item is persisted; worker can process later
        pass
```

---

## Solution 3: Frontend Polling (For Better UX)

Update `src/services/apiClient.js` to add a method that polls for new enquiries:

```javascript
async listEnquiriesByStatus(token, projectId, status = null, { category = '', search = '' } = {}) {
    const params = new URLSearchParams()
    if (category) params.set('category', category)
    if (search) params.set('search', search)
    const query = params.toString()
    
    const { response, data } = await this.request(
        `/api/v1/projects/${projectId}/enquiries/${query ? `?${query}` : ''}`,
        { token }
    )
    
    if (!response.ok) return { response, data }
    
    // Filter by status if specified
    const enquiries = Array.isArray(data) ? data : data.results || []
    if (status) {
        return { response, data: enquiries.filter(e => e.status === status) }
    }
    return { response, data: enquiries }
}
```

Update `ProjectDashboard.jsx` to show pending enquiries:

```javascript
// In the Enquiries tab section, add:
const pendingEnquiries = enquiries.filter(e => e.status === 'pending')
const processedEnquiries = enquiries.filter(e => e.status !== 'pending')

<div>
  {pendingEnquiries.length > 0 && (
    <div style={{ 
      backgroundColor: '#fff3e0', 
      padding: '15px', 
      borderRadius: '4px', 
      marginBottom: '20px',
      borderLeft: '4px solid #ff9800'
    }}>
      <strong>⏳ {pendingEnquiries.length} Pending Submissions</strong>
      <p style={{ fontSize: '12px', color: '#999' }}>
        These are being processed. Refresh in a moment to see them move to processed.
      </p>
    </div>
  )}
  
  <h3>Processed Enquiries ({processedEnquiries.length})</h3>
  {/* ... existing enquiry list ... */}
</div>
```

---

## Testing Checklist

1. **Update HTML Form** ✅
   - [ ] Update `PUBLIC_API_KEY` in saastest.html with your project's API key
   - [ ] Make sure you're pointing to correct backend URL

2. **Check Backend** 
   - [ ] Verify Celery worker is running: `celery -A your_project worker -l info`
   - [ ] Or apply Solution 1 to show pending enquiries
   - [ ] Or apply Solution 2 for synchronous processing

3. **Monitor Form Submission**
   - [ ] Open saastest.html in browser
   - [ ] Fill and submit form
   - [ ] Check browser Network tab - should see 202 response
   - [ ] Check dashboard - should see submission immediately (if Celery running)
   - [ ] If not visible, check Django logs for errors

4. **Debug**
   - [ ] Check database: `python manage.py shell`
     ```python
     from core.enquiries.models import EnquiryIngestQueue, Enquiry
     print("Pending:", EnquiryIngestQueue.objects.count())
     print("Processed:", Enquiry.objects.count())
     ```
   - [ ] Check Celery logs for task errors
   - [ ] Verify API key is correct in HTML form

---

## File Changes Summary

### Frontend (saastest.html)
✅ **Already updated** - Now submits to FormDocks API with proper error handling

### Backend (views.py)

**Change 1: Update ProjectEnquiryListAPIView**
- Include pending enquiries from queue
- Show status field to distinguish pending vs processed
- Filter by status if needed

**Change 2: Update FormSubmitAPIView (Optional)**
- Add synchronous fallback if Celery fails
- Ensures submissions are processed even without worker running

---

## Quick Start

1. **Get Your API Key**
   - Login to FormDocks dashboard
   - Go to your project
   - Copy "Form API Key" from Overview tab

2. **Update saastest.html**
   ```javascript
   const PROJECT_API_KEY = 'your-api-key-here'; // ← Paste here
   const API_BASE_URL = 'http://localhost:8000'; // ← Update if needed
   ```

3. **Ensure Celery is Running** (if using async)
   ```bash
   celery -A your_project worker -l info
   ```

4. **Test Submission**
   - Open saastest.html
   - Fill out form
   - Click "Send Message"
   - You should see success message with enquiry ID
   - Check dashboard - should appear in Enquiries tab

---

## Common Issues

### ❌ "Invalid API key" error
- **Cause**: Wrong API key in saastest.html
- **Fix**: Copy correct key from dashboard

### ❌ Form submitted but nothing in dashboard
- **Cause**: Celery not running or ProcessEnquiryQueue failing
- **Fix**: 
  1. Start Celery worker: `celery -A your_project worker`
  2. Or apply Solution 1 to show pending items
  3. Check Django logs: `python manage.py logs`

### ❌ "Plug in Project API Key"
- **Cause**: Template still has placeholder value
- **Fix**: Update `PROJECT_API_KEY` with real key

### ❌ CORS or connection error
- **Cause**: Backend URL wrong or CORS not configured
- **Fix**: 
  1. Verify backend running on correct port
  2. Check CORS settings in Django: ensure `http://localhost:3000` is allowed

---

## Production Recommendations

1. **Always run Celery worker** for asynchronous processing
2. **Implement Solution 1** to show pending items in real-time
3. **Setup Celery Beat** for scheduled queue processing
4. **Monitor queue** - add metrics for pending enquiries
5. **Add timeouts** - process items if stuck for >5 minutes

---

## Support

For more details:
- Check `BACKEND_INTEGRATION.md` for API documentation
- Review `core/enquiries/tasks.py` for queue processing logic
- Check `core/enquiries/models.py` for EnquiryIngestQueue schema
