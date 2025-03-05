from flask import Blueprint, render_template, request, jsonify
from datetime import datetime, date, timedelta
from ..logger_manager import LoggerManager

log_viewer = Blueprint('log_viewer', __name__)
logger_manager = LoggerManager()

@log_viewer.route('/logs')
def view_logs():
    """Main log viewer page"""
    return render_template('log_viewer.html')

@log_viewer.route('/api/logs/initial')
def get_initial_logs():
    """Get initial logs for page load - returns last 1000 logs from current file"""
    line_count = request.args.get('lineCount', '1000')
    try:
        num_lines = int(line_count)
    except ValueError:
        num_lines = 1000
        
    return jsonify({
        'logs': logger_manager.retrieve_logs(num_lines=num_lines if num_lines > 0 else None, today_only=False)
    })

@log_viewer.route('/api/logs/today')
def get_today_logs():
    """Get logs for today"""
    line_count = request.args.get('lineCount', '10000')
    try:
        num_lines = int(line_count)
    except ValueError:
        num_lines = 10000
        
    logs = []
    
    # Get today's logs from the current file
    current_logs = logger_manager.retrieve_logs(num_lines=num_lines if num_lines > 0 else None, today_only=True)
    if current_logs:
        logs.extend(current_logs)
        
    return jsonify({'logs': logs})

@log_viewer.route('/api/logs/search')
def search_logs():
    """Search logs with filters"""
    keyword = request.args.get('keyword', '')
    start_date_str = request.args.get('start_date')
    end_date_str = request.args.get('end_date')
    severities = request.args.get('severities', '').split(',')
    line_count = request.args.get('lineCount', '10000')
    
    try:
        num_lines = int(line_count)
    except ValueError:
        num_lines = 10000
        
    try:
        if start_date_str:
            start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
        else:
            start_date = date.today() - timedelta(days=7)  # Default to last 7 days
            
        if end_date_str:
            end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
        else:
            end_date = date.today()
            
        if keyword:
            results = logger_manager.search_logs_by_keyword(keyword, start_date, end_date)
        else:
            results = logger_manager.search_logs_by_date_range(start_date, end_date)
            
        # Filter by severity if specified
        if severities and severities[0]:  # Check if not empty string
            for date_str in results:
                results[date_str] = [
                    log for log in results[date_str]
                    if any(f" - {severity} - " in log for severity in severities)
                ]
            
        # If searching includes today and no results for today, add current log file
        if end_date >= date.today() and date.today() >= start_date:
            current_logs = logger_manager.retrieve_logs(num_lines=num_lines if num_lines > 0 else None)
            if current_logs:
                # Filter current logs by severity if needed
                if severities and severities[0]:
                    current_logs = [
                        log for log in current_logs
                        if any(f" - {severity} - " in log for severity in severities)
                    ]
                
                if 'today' in results:
                    results['today'].extend(current_logs)
                else:
                    results['today'] = current_logs

        # Limit total number of lines across all dates if num_lines > 0
        if num_lines > 0:
            total_lines = []
            for date_str, logs in sorted(results.items(), reverse=True):  # Sort by date, newest first
                total_lines.extend(logs)
            
            # Keep only the last num_lines
            if len(total_lines) > num_lines:
                total_lines = total_lines[-num_lines:]
                
                # Rebuild results dictionary with limited lines
                new_results = {}
                for log in total_lines:
                    # Extract date from log line (format: YYYY-MM-DD HH:mm:ss)
                    try:
                        log_date = log.split(' - ')[0].split(' ')[0]
                        if log_date not in new_results:
                            new_results[log_date] = []
                        new_results[log_date].append(log)
                    except (IndexError, ValueError):
                        continue
                        
                results = new_results
            
        return jsonify({'success': True, 'results': results})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}) 