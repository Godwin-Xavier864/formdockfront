# Analytics Debugging Guide

## Issue: 171-byte Response

The API returns a 200 status but only 171 bytes, which indicates the response data is either empty or contains a minimal error message.

## Debugging Steps

### 1. Check Backend Logs
Look at your Django server output for these log messages:
- `[ANALYTICS] Starting analytics_summary for project {project.id}`
- `[ANALYTICS] Analytics generated successfully. Total size: {bytes} bytes`
- `[ANALYTICS ERROR]` - if there's an exception
- `[ANALYTICS TRACEBACK]` - if there's an error

### 2. Check Browser Console (DevTools)
1. Open DevTools (F12)
2. Go to Console tab
3. Look for these logs when you click Analytics tab:
   - `Analytics response: { status: 200, ok: true, data: {...}, dataType: 'object', keys: [list of keys] }`
   - This will show you exactly what's being received

### 3. Check Network Tab (DevTools) 
1. Open DevTools → Network tab
2. Click Analytics tab in dashboard  
3. Find the request: `GET /api/v1/projects/{...}/analytics/`
4. Click it and check:
   - **Status**: Should be 200
   - **Size**: Should be much larger than 171 bytes (10KB+)
   - **Response**: Should show full JSON with all the data

### 4. Verify Database Data
If you see empty analytics, you probably need data in the database:
```python
# In Django shell or management command:
from core.enquiries.models import Enquiry
from core.projects.models import Project

project = Project.objects.first()  # or your project ID
enquiry_count = Enquiry.objects.filter(project=project).count()
print(f"Total enquiries for project: {enquiry_count}")
```

## Common Issues & Solutions

### Issue: "No analytics data available" message
**Cause**: No form submissions or FAQ chats exist for the project  
**Solution**: Submit at least one form or create one FAQ chat first

### Issue: 171 bytes response but analytics not showing
**Cause**: Response is likely `{}` (empty dict) or an error  
**Solution**: 
1. Check the Network tab response body
2. Look at backend logs for [ANALYTICS ERROR] messages
3. Verify project ID is correct

### Issue: Charts not rendering but data shows
**Cause**: Data structure issue or frontend rendering bug  
**Solution**:
1. Check browser console for JavaScript errors
2. Verify data keys match expected format:
   ```
   {
     summary: {...},
     per_day: {labels: [...], counts: [...]},
     per_month: {labels: [...], counts: [...]},
     category_counts: {...},
     etc...
   }
   ```

## Quick Test

1. **Backend Test**: Visit in browser/curl:
   ```
   GET /api/v1/projects/{projectId}/analytics/
   ```
   Should return full JSON with all keys

2. **Frontend Test**: Click Analytics tab
   - Should show "Loading analytics..."
   - Then show summary cards with numbers
   - Then show charts below

3. **Check data size**:
   - Valid response: 5KB - 50KB+
   - 171 bytes: Likely error or empty response

## Still Having Issues?

Check the Django server terminal for the `[ANALYTICS]` log messages.  
They will tell you exactly what's happening inside the analytics_summary function.

The format will be:
```
[ANALYTICS] Starting analytics_summary for project {uuid}
[ANALYTICS] Analytics generated successfully. Total size: {bytes} bytes, Keys: [...]
```

If you see `[ANALYTICS ERROR]`, copy that error message and traceback for debugging.
