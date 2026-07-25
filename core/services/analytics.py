"""
Analytics service for project metrics and insights
"""
from datetime import datetime, timedelta
from django.utils import timezone
from django.db.models import Count, Q
from collections import defaultdict
import json

from core.enquiries.models import Enquiry, FaqChatMessage
from core.billing.models import ProjectSubscription


def analytics_summary(project):
    """
    Generate comprehensive analytics summary for a project.
    Returns metrics on form submissions, FAQ chats, and other activities.
    """
    try:
        print(f"[ANALYTICS] Starting analytics_summary for project {project.id}")
        now = timezone.now()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        # ===== FORM SUBMISSIONS ANALYTICS =====
        total_enquiries = Enquiry.objects.filter(project=project).count()
        locked_enquiries = Enquiry.objects.filter(project=project, is_locked=True).count()
        today_enquiries = Enquiry.objects.filter(project=project, created_at__gte=today_start).count()
        month_enquiries = Enquiry.objects.filter(project=project, created_at__gte=month_start).count()
        
        spam_count = Enquiry.objects.filter(project=project, category=Enquiry.CATEGORY_SPAM).count()
        
        # ===== FAQ ANALYTICS =====
        total_faq_chats = FaqChatMessage.objects.filter(project=project).count()
        today_faq_chats = FaqChatMessage.objects.filter(
            project=project,
            is_blocked_by_quota=False,
            created_at__gte=today_start
        ).count()
        month_faq_chats = FaqChatMessage.objects.filter(
            project=project,
            is_blocked_by_quota=False,
            created_at__gte=month_start
        ).count()
        blocked_faq_chats = FaqChatMessage.objects.filter(
            project=project,
            is_blocked_by_quota=True
        ).count()
        
        # ===== CATEGORY BREAKDOWN =====
        category_counts = defaultdict(int)
        for enquiry in Enquiry.objects.filter(project=project).values('category').annotate(count=Count('id')):
            category_counts[enquiry['category'] or 'general'] = enquiry['count']
        
        # ===== HOURLY DISTRIBUTION =====
        hourly_counts = defaultdict(int)
        peak_hour = None
        peak_hour_count = 0
        
        for enquiry in Enquiry.objects.filter(project=project):
            hour = enquiry.created_at.hour
            hourly_counts[hour] += 1
            if hourly_counts[hour] > peak_hour_count:
                peak_hour_count = hourly_counts[hour]
                peak_hour = hour
        
        # ===== COUNTRY / IP TRACKING =====
        country_counts = defaultdict(int)
        ip_counts = defaultdict(int)
        
        for enquiry in Enquiry.objects.filter(project=project).values('country', 'ip_address'):
            country = enquiry.get('country', 'unknown') or 'unknown'
            country_counts[country] += 1
            ip = enquiry.get('ip_address', 'unknown') or 'unknown'
            ip_counts[ip] += 1
        
        unique_ips = len(ip_counts)
        
        # ===== PER-DAY TREND =====
        per_day_labels = []
        per_day_counts = []
        
        for i in range(30, 0, -1):
            day = (now - timedelta(days=i)).date()
            day_start = timezone.make_aware(datetime.combine(day, datetime.min.time()))
            day_end = timezone.make_aware(datetime.combine(day, datetime.max.time()))
            
            count = Enquiry.objects.filter(
                project=project,
                created_at__gte=day_start,
                created_at__lte=day_end
            ).count()
            
            per_day_labels.append(day.strftime('%m-%d'))
            per_day_counts.append(count)
        
        # ===== PER-MONTH TREND =====
        per_month_labels = []
        per_month_counts = []
        
        for i in range(11, -1, -1):
            month_date = (now - timedelta(days=30*i)).date()
            month_start_iter = datetime(month_date.year, month_date.month, 1)
            month_end_iter = datetime(
                month_date.year if month_date.month < 12 else month_date.year + 1,
                month_date.month + 1 if month_date.month < 12 else 1,
                1
            ) - timedelta(days=1)
            
            month_start_aware = timezone.make_aware(datetime.combine(month_start_iter.date(), datetime.min.time()))
            month_end_aware = timezone.make_aware(datetime.combine(month_end_iter.date(), datetime.max.time()))
            
            count = Enquiry.objects.filter(
                project=project,
                created_at__gte=month_start_aware,
                created_at__lte=month_end_aware
            ).count()
            
            per_month_labels.append(month_date.strftime('%Y-%m'))
            per_month_counts.append(count)
        
        # ===== SUBSCRIPTION/BILLING =====
        subscription = ProjectSubscription.objects.filter(project=project).first()
        is_paywalled = subscription and subscription.is_active() if subscription else False
        
        # ===== RESPONSE TIME / ENGAGEMENT =====
        avg_response_length = 0
        faq_chats = FaqChatMessage.objects.filter(project=project, is_blocked_by_quota=False)
        if faq_chats.exists():
            total_length = sum(len(chat.answer or '') for chat in faq_chats)
            avg_response_length = int(total_length // faq_chats.count()) if faq_chats.count() > 0 else 0
        
        # Build response dict with proper types
        result = {
            'summary': {
                'total_enquiries': int(total_enquiries),
                'today_enquiries': int(today_enquiries),
                'month_enquiries': int(month_enquiries),
                'locked_enquiries': int(locked_enquiries),
                'spam_count': int(spam_count),
                'total_faq_chats': int(total_faq_chats),
                'today_faq_chats': int(today_faq_chats),
                'month_faq_chats': int(month_faq_chats),
                'blocked_faq_chats': int(blocked_faq_chats),
                'unique_ip_addresses': int(unique_ips),
            },
            'per_day': {
                'labels': per_day_labels,
                'counts': per_day_counts,
            },
            'per_month': {
                'labels': per_month_labels,
                'counts': per_month_counts,
            },
            'category_counts': dict(sorted(category_counts.items())),
            'country_counts': dict(sorted(country_counts.items(), key=lambda x: x[1], reverse=True)[:15]),
            'hourly_distribution': {str(k): int(v) for k, v in sorted(hourly_counts.items())},
            'peak_hour': f"{peak_hour:02d}:00" if peak_hour is not None else "N/A",
            'peak_hour_count': int(peak_hour_count),
            'paywalled': bool(is_paywalled),
            'avg_faq_response_length': int(avg_response_length),
            'engagement': {
                'enquiries_to_faq_ratio': float(round(total_enquiries / total_faq_chats, 2)) if total_faq_chats > 0 else 0.0,
                'faq_block_rate': float(round((blocked_faq_chats / (blocked_faq_chats + month_faq_chats) * 100), 2)) if (blocked_faq_chats + month_faq_chats) > 0 else 0.0,
            },
            'generated_at': now.isoformat(),
        }
        
        print(f"[ANALYTICS] Analytics generated successfully. Total size: {len(str(result))} bytes, Keys: {list(result.keys())}")
        return result
    
    except Exception as e:
        # Return error response with details
        import traceback
        error_msg = str(e)
        tb = traceback.format_exc()
        print(f"[ANALYTICS ERROR] {error_msg}")
        print(f"[ANALYTICS TRACEBACK] {tb}")
        return {
            'error': True,
            'message': error_msg,
            'summary': {
                'total_enquiries': 0,
                'today_enquiries': 0,
                'month_enquiries': 0,
                'locked_enquiries': 0,
                'spam_count': 0,
                'total_faq_chats': 0,
                'today_faq_chats': 0,
                'month_faq_chats': 0,
                'blocked_faq_chats': 0,
                'unique_ip_addresses': 0,
            },
            'per_day': {'labels': [], 'counts': []},
            'per_month': {'labels': [], 'counts': []},
            'category_counts': {},
            'country_counts': {},
            'hourly_distribution': {},
            'peak_hour': 'N/A',
            'peak_hour_count': 0,
            'paywalled': False,
            'avg_faq_response_length': 0,
            'engagement': {'enquiries_to_faq_ratio': 0.0, 'faq_block_rate': 0.0},
            'generated_at': timezone.now().isoformat(),
        }
