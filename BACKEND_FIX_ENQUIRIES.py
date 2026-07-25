# BACKEND FIX: ProjectEnquiryListAPIView
# 
# Issue: Form submissions are queued in EnquiryIngestQueue but the dashboard 
# only shows Enquiry objects after the Celery task processes them.
#
# Solution: Include pending enquiries from the queue in the response

# Replace the ProjectEnquiryListAPIView with this version:

class ProjectEnquiryListAPIView(APIView):
    permission_classes = [EmailVerifiedPermission]
    
    def get(self, request, project_id):
        project = Project.objects.filter(id=project_id, owner=request.user).first()
        if not project:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        
        # Get processed enquiries
        enquiries = Enquiry.objects.filter(project=project).order_by('-created_at')
        
        # Get pending enquiries from the queue
        pending_enquiries = EnquiryIngestQueue.objects.filter(
            project=project,
            status=EnquiryIngestQueue.STATUS_PENDING
        ).order_by('-queued_at')
        
        category = request.GET.get('category')
        if category:
            enquiries = enquiries.filter(category=category)
            pending_enquiries = pending_enquiries.filter(category=category) if hasattr(pending_enquiries, 'filter') else []
        
        search = request.GET.get('search')
        if search:
            enquiries = enquiries.filter(raw_payload__icontains=search)
            # Search in pending queue
            if search:
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
        
        # Add pending enquiries (limit to avoid too many items)
        pending_data = [
            {
                'id': str(e.id),
                'category': e.category or 'general',
                'ip_address': e.ip_address,
                'created_at': e.queued_at,
                'raw_payload': e.payload,
                'is_locked': False,
                'status': 'pending',  # Mark as pending so UI can show different styling
            }
            for e in pending_enquiries[:100]
        ]
        
        # Combine and sort by date (most recent first)
        all_data = pending_data + data
        all_data.sort(key=lambda x: x['created_at'], reverse=True)
        
        return Response(all_data[:500])


# ALTERNATIVE APPROACH: Process queue synchronously for immediate visibility
# 
# If you want submissions to appear immediately without Celery, modify FormSubmitAPIView:

# In FormSubmitAPIView.post() method, replace the Celery call with:

        queued_item = enqueue_enquiry(
            project=project,
            payload=fields,
            metadata=metadata,
            ip_address=ip_address,
            country='',
            city='',
            is_locked=is_locked,
        )
        
        # Process immediately for instant UI feedback (RECOMMENDED FOR TESTING)
        try:
            # Try async first
            process_enquiry_queue_batch.delay()
        except Exception:
            # If Celery isn't running, process synchronously
            try:
                from core.enquiries.tasks import process_enquiry_queue_batch as process_sync
                # Call the task function directly (synchronously)
                if hasattr(process_enquiry_queue_batch, 'run'):
                    process_enquiry_queue_batch.run()
                else:
                    # Call the underlying function
                    process_sync()
            except Exception as sync_error:
                # Queue item is persisted; process later
                pass
        
        return Response(
            {'success': True, 'enquiry_id': queued_item.id, 'locked': queued_item.is_locked, 'queued': True},
            status=status.HTTP_202_ACCEPTED,
        )
