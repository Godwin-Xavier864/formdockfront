# 🔧 Backend Implementation Guide

## The Problem (Technical)

**Backend Flow:**
```
POST /api/forms/submit/ → enqueue_enquiry() → EnquiryIngestQueue
                                          → process_enquiry_queue_batch.delay() (Celery)
                                                    ↓
                                          EnquiryIngestQueue.STATUS_PROCESSED
                                          (moved to Enquiry table)
                                                    ↓
                                          GET /api/v1/projects/{id}/enquiries/ 
                                          (only reads Enquiry, not queue!)
```

**Result**: Submissions sit in queue but dashboard doesn't show them until processed.

---

## Solution 1: Show Pending Queue Items (RECOMMENDED)

### Edit: `core/api/views.py` 

Find `ProjectEnquiryListAPIView` and replace the entire class:

```python
from django.db.models import Q

class ProjectEnquiryListAPIView(APIView):
    permission_classes = [EmailVerifiedPermission]
    
    def get(self, request, project_id):
        project = Project.objects.filter(id=project_id, owner=request.user).first()
        if not project:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        
        # Get processed enquiries from main table
        enquiries_qs = Enquiry.objects.filter(project=project).order_by('-created_at')
        
        # Get PENDING enquiries from the queue
        pending_qs = EnquiryIngestQueue.objects.filter(
            project=project,
            status=EnquiryIngestQueue.STATUS_PENDING
        ).order_by('-queued_at')
        
        # Apply category filter
        category = request.GET.get('category')
        if category:
            enquiries_qs = enquiries_qs.filter(category=category)
            pending_qs = pending_qs.filter(category=category)
        
        # Apply search filter
        search = request.GET.get('search')
        if search:
            search_term = search.strip()
            # Search in processed enquiries
            enquiries_qs = enquiries_qs.filter(raw_payload__icontains=search_term)
            # Search in pending queue
            pending_qs = pending_qs.filter(
                Q(payload__icontains=search_term) | 
                Q(raw_payload__icontains=search_term)
            )
        
        # Format PROCESSED enquiries
        processed_data = [
            {
                'id': str(e.id),
                'category': e.category,
                'ip_address': e.ip_address,
                'created_at': e.created_at,
                'raw_payload': None if e.is_locked else e.raw_payload,
                'is_locked': e.is_locked,
                'status': 'processed',  # Mark as processed
            }
            for e in enquiries_qs[:400]
        ]
        
        # Format PENDING enquiries
        pending_data = [
            {
                'id': str(e.id),
                'category': e.category or 'general',
                'ip_address': e.ip_address,
                'created_at': e.queued_at,  # Use queue timestamp
                'raw_payload': e.payload,  # Use queue payload
                'is_locked': False,
                'status': 'pending',  # Mark as pending
            }
            for e in pending_qs[:100]
        ]
        
        # Combine both lists and sort by date (newest first)
        all_enquiries = pending_data + processed_data
        all_enquiries.sort(key=lambda x: x['created_at'], reverse=True)
        
        # Return combined list (limit to 500 total)
        return Response(all_enquiries[:500])
```

#### Changes Made:
1. ✅ Queries both `Enquiry` and `EnquiryIngestQueue`
2. ✅ Adds `status` field ("pending" or "processed")
3. ✅ Filters work on both tables
4. ✅ Sorts by date correctly
5. ✅ Frontend can display pending differently

### Benefits:
- ✅ Users see submissions immediately
- ✅ Visual feedback during processing
- ✅ No database migration needed
- ✅ Works with OR without Celery

---

## Solution 2: Synchronous Processing (For Development)

### Edit: `core/api/views.py` → `FormSubmitAPIView.post()`

Find this section (around line 240):

**Original (async only):**
```python
        queued_item = enqueue_enquiry(...)
        try:
            process_enquiry_queue_batch.delay()  # Async task
        except Exception:
            # Queue item is persisted; beat/worker can flush later.
            pass

        return Response({...}, status=status.HTTP_202_ACCEPTED)
```

**Updated (with async fallback):**
```python
        queued_item = enqueue_enquiry(...)
        
        # Try async first
        processed_successfully = False
        try:
            process_enquiry_queue_batch.delay()
            processed_successfully = True
        except Exception as async_error:
            # Celery not available, try synchronous
            try:
                # Import the actual task function
                from core.enquiries.tasks import process_enquiry_queue_batch as queue_processor
                
                # Call synchronously (no .delay())
                result = queue_processor()
                processed_successfully = True
            except Exception as sync_error:
                # Both failed, queue is persisted
                import logging
                logger = logging.getLogger(__name__)
                logger.warning(
                    f"Failed to process queue for project {project.id}: "
                    f"Async: {async_error}, Sync: {sync_error}"
                )
        
        # Return response (same as before)
        return Response(
            {
                'success': True,
                'enquiry_id': queued_item.id,
                'locked': queued_item.is_locked,
                'queued': True,
                'processed': processed_successfully,  # Let frontend know
            },
            status=status.HTTP_202_ACCEPTED,
        )
```

#### Benefits:
- ✅ Forms process instantly in development
- ✅ Falls back gracefully if Celery fails
- ✅ Great for testing without workers
- ❌ Not recommended for production (too slow)

---

## Solution 3: Async Processing Best Practice (Production)

Keep your current code BUT ensure Celery is running:

### 1. Start Celery Worker
```bash
# Terminal 1: Django server
python manage.py runserver

# Terminal 2: Celery worker
celery -A yourproject worker -l info

# Terminal 3 (optional): Celery beat for scheduled tasks
celery -A yourproject beat -l info
```

### 2. Ensure Task Exists
Check `core/enquiries/tasks.py`:
```python
from celery import shared_task

@shared_task
def process_enquiry_queue_batch():
    """Process all pending enquiries in queue"""
    from core.enquiries.models import EnquiryIngestQueue
    # ... processing logic
    return {"processed": count}
```

### 3. Configure Celery in settings.py
```python
# settings.py
CELERY_BROKER_URL = os.getenv('CELERY_BROKER_URL', 'redis://localhost:6379/0')
CELERY_RESULT_BACKEND = os.getenv('CELERY_RESULT_BACKEND', 'redis://localhost:6379/0')
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = 'UTC'

# Beat schedule
from celery.schedules import crontab
CELERY_BEAT_SCHEDULE = {
    'process-enquiry-queue': {
        'task': 'core.enquiries.tasks.process_enquiry_queue_batch',
        'schedule': crontab(minute='*/5'),  # Every 5 minutes
    },
}
```

### Benefits:
- ✅ Scalable (async processing)
- ✅ Fast response times (202 accepted immediately)
- ✅ Handles high volume
- ✅ Production-ready

---

## Recommended Implementation

### For Development:
Use **Solution 1** + **Solution 3**
```python
# core/api/views.py
class ProjectEnquiryListAPIView(APIView):
    # Use Solution 1 code above
    # Shows pending items from queue
    # ...

# core/enquiries/tasks.py  
@shared_task
def process_enquiry_queue_batch():
    # Regular Celery task processing
    # ...
```

### For Production:
Use **Solution 1** + proper Celery setup
- Start Celery worker on separate machine
- Use Redis/RabbitMQ broker
- Monitor task queue health
- Set up alerting for stuck tasks

---

## Testing Your Changes

### After applying Solution 1:

```bash
# 1. Submit a form
curl -X POST http://localhost:8000/api/forms/submit/ \
  -H "Content-Type: application/json" \
  -d '{
    "project_api_key": "sk-your-key",
    "fields": {"name": "Test", "email": "test@example.com"}
  }'
# Returns: {"success": true, "enquiry_id": "xxx"}

# 2. Check it appears immediately
curl http://localhost:8000/api/v1/projects/{project_id}/enquiries/ \
  -H "Authorization: Bearer $TOKEN"
# Should show enquiry with "status": "pending"

# 3. If running Celery, wait ~1-2 seconds
# Enquiry moves to "status": "processed"

# 4. Check database
python manage.py shell
from core.enquiries.models import Enquiry, EnquiryIngestQueue
print("Pending:", EnquiryIngestQueue.objects.count())
print("Processed:", Enquiry.objects.count())
```

---

## Full File: Updated ProjectEnquiryListAPIView

Here's the complete class to copy-paste:

```python
class ProjectEnquiryListAPIView(APIView):
    """
    List enquiries for a project (both pending and processed)
    
    The API now shows enquiries from both:
    1. EnquiryIngestQueue (pending, status='pending')
    2. Enquiry table (processed, status='processed')
    
    This provides real-time feedback to users about their submissions.
    """
    permission_classes = [EmailVerifiedPermission]
    
    def get(self, request, project_id):
        project = Project.objects.filter(id=project_id, owner=request.user).first()
        if not project:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        
        # Processed enquiries
        enquiries_qs = Enquiry.objects.filter(project=project).order_by('-created_at')
        
        # Pending enquiries (from queue)
        pending_qs = EnquiryIngestQueue.objects.filter(
            project=project,
            status=EnquiryIngestQueue.STATUS_PENDING
        ).order_by('-queued_at')
        
        # Filter by category
        category = request.GET.get('category')
        if category:
            enquiries_qs = enquiries_qs.filter(category=category)
            pending_qs = pending_qs.filter(category=category)
        
        # Filter by search term
        search = request.GET.get('search')
        if search:
            search_term = search.strip()
            enquiries_qs = enquiries_qs.filter(raw_payload__icontains=search_term)
            pending_qs = pending_qs.filter(
                models.Q(payload__icontains=search_term) | 
                models.Q(raw_payload__icontains=search_term)
            )
        
        # Build response with processed enquiries
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
            for e in enquiries_qs[:400]
        ]
        
        # Add pending enquiries from queue
        pending_data = [
            {
                'id': str(e.id),
                'category': e.category or 'general',
                'ip_address': e.ip_address,
                'created_at': e.queued_at,
                'raw_payload': e.payload,
                'is_locked': False,
                'status': 'pending',
            }
            for e in pending_qs[:100]
        ]
        
        # Combine lists
        all_data = pending_data + data
        
        # Sort by date (newest first)
        all_data.sort(key=lambda x: x['created_at'], reverse=True)
        
        return Response(all_data[:500])
```

---

## What Changed vs Original

| Aspect | Original | Updated |
|--------|----------|---------|
| **Data Source** | Only `Enquiry` table | `Enquiry` + `EnquiryIngestQueue` |
| **Status Field** | None | 'pending' or 'processed' |
| **Queue Visibility** | Hidden | Visible |
| **User Feedback** | Long delay | Immediate |
| **Breaking Changes** | N/A | None - backward compatible |

---

## Rollback Plan

If something goes wrong:

```python
# Just revert to original
class ProjectEnquiryListAPIView(APIView):
    permission_classes = [EmailVerifiedPermission]
    
    def get(self, request, project_id):
        project = Project.objects.filter(id=project_id, owner=request.user).first()
        if not project:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        
        enquiries = Enquiry.objects.filter(project=project).order_by('-created_at')
        
        category = request.GET.get('category')
        if category:
            enquiries = enquiries.filter(category=category)
        
        search = request.GET.get('search')
        if search:
            enquiries = enquiries.filter(raw_payload__icontains=search)
        
        data = [
            {
                'id': str(e.id),
                'category': e.category,
                'ip_address': e.ip_address,
                'created_at': e.created_at,
                'raw_payload': None if e.is_locked else e.raw_payload,
                'is_locked': e.is_locked,
            }
            for e in enquiries[:500]
        ]
        return Response(data)
```

---

## Monitoring

After applying the fix, monitor:

```python
# Check queue processing
from core.enquiries.models import EnquiryIngestQueue, Enquiry
from django.utils import timezone

pending = EnquiryIngestQueue.objects.filter(
    status=EnquiryIngestQueue.STATUS_PENDING,
    queued_at__lt=timezone.now() - timedelta(minutes=5)
).count()

if pending > 100:
    print("⚠️ Large queue detected - check Celery worker")

processed_today = Enquiry.objects.filter(
    created_at__date=timezone.now().date()
).count()
print(f"✓ {processed_today} submissions processed today")
```

---

## Summary

| Step | Action | Time |
|------|--------|------|
| 1 | Copy updated `ProjectEnquiryListAPIView` code | 2 min |
| 2 | Test with form submission | 1 min |
| 3 | Verify appears in dashboard | 1 min |
| 4 | Start Celery (optional) | 1 min |
| **Total** | **Full integration** | **~5 min** |

You're done! 🎉
