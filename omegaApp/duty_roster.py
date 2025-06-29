from flask import (
    Blueprint, flash, g, redirect, render_template, request, url_for, jsonify, Response
)
import sqlite3
from datetime import datetime, timedelta
from .db import get_db, DatabaseError
from calendar import monthrange

bp = Blueprint('duty_roster', __name__, url_prefix='/duty-roster')

@bp.route('/')
def index():
    """Show the duty roster interface"""
    return render_template('duty_roster/index.html')

@bp.route('/api/members', methods=['GET'])
def get_members():
    """Get all team members"""
    try:
        db = get_db()
        members = db.execute(
            'SELECT * FROM team_members WHERE status = "active" ORDER BY name'
        ).fetchall()
        return jsonify([dict(member) for member in members])
    except sqlite3.Error as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/api/members', methods=['POST'])
def add_member():
    """Add a new team member"""
    data = request.get_json()
    if not data or 'name' not in data or 'employee_number' not in data:
        return jsonify({'error': 'Name and employee number are required'}), 400
    
    try:
        db = get_db()
        color = data.get('color', '#3498db')  # Use default color if not provided
        cursor = db.execute(
            'INSERT INTO team_members (name, employee_number, color) VALUES (?, ?, ?)',
            (data['name'], data['employee_number'], color)
        )
        db.commit()
        return jsonify({
            'id': cursor.lastrowid, 
            'name': data['name'], 
            'employee_number': data['employee_number'],
            'color': color
        }), 201
    except sqlite3.Error as e:
        if 'UNIQUE constraint failed' in str(e):
            return jsonify({'error': 'Employee number already exists'}), 400
        return jsonify({'error': str(e)}), 500

@bp.route('/api/members/<int:id>', methods=['DELETE'])
def delete_member(id):
    """Delete (deactivate) a team member and remove all their constraints and assignments"""
    try:
        db = get_db()
        
        # First check if member exists
        member = db.execute('SELECT id FROM team_members WHERE id = ?', (id,)).fetchone()
        if not member:
            return jsonify({'error': 'Member not found'}), 404
        
        # Delete all constraints for this member
        db.execute('DELETE FROM member_constraints WHERE member_id = ?', (id,))
        
        # Delete all duty assignments for this member
        db.execute('DELETE FROM duty_assignments WHERE member_id = ?', (id,))
        
        # Delete workload history for this member
        db.execute('DELETE FROM workload_history WHERE member_id = ?', (id,))
        
        # Finally, deactivate the member
        db.execute('UPDATE team_members SET status = "inactive" WHERE id = ?', (id,))
        
        db.commit()
        return jsonify({'message': 'Member deactivated and all associated data deleted successfully'}), 200
    except sqlite3.Error as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/api/members/<int:id>', methods=['PUT'])
def update_member(id):
    """Update a team member"""
    data = request.get_json()
    if not data or 'name' not in data or 'employee_number' not in data:
        return jsonify({'error': 'Name and employee number are required'}), 400

    try:
        db = get_db()
        color = data.get('color', '#3498db')  # Use default color if not provided
        db.execute(
            'UPDATE team_members SET name = ?, employee_number = ?, color = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            (data['name'], data['employee_number'], color, id)
        )
        db.commit()
        return jsonify({
            'id': id,
            'name': data['name'],
            'employee_number': data['employee_number'],
            'color': color
        })
    except sqlite3.Error as e:
        if 'UNIQUE constraint failed' in str(e):
            return jsonify({'error': 'Employee number already exists'}), 400
        return jsonify({'error': str(e)}), 500

@bp.route('/api/constraints', methods=['GET'])
def get_constraints():
    """Get constraints for all members or a specific member"""
    member_id = request.args.get('member_id')
    try:
        db = get_db()
        if member_id:
            constraints = db.execute(
                '''SELECT c.*, m.name as member_name 
                   FROM member_constraints c 
                   JOIN team_members m ON c.member_id = m.id 
                   WHERE c.member_id = ? AND m.status = "active"''',
                (member_id,)
            ).fetchall()
        else:
            constraints = db.execute(
                '''SELECT c.*, m.name as member_name 
                   FROM member_constraints c 
                   JOIN team_members m ON c.member_id = m.id 
                   WHERE m.status = "active"'''
            ).fetchall()
        return jsonify([dict(constraint) for constraint in constraints])
    except sqlite3.Error as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/api/constraints', methods=['POST'])
def add_constraint():
    """Add a new constraint for a team member"""
    data = request.get_json()
    required_fields = ['member_id', 'constraint_type', 'is_available']
    if not all(field in data for field in required_fields):
        return jsonify({'error': 'Missing required fields'}), 400

    if data['constraint_type'] == 'fixed' and 'day_of_week' not in data:
        return jsonify({'error': 'day_of_week is required for fixed constraints'}), 400
    elif data['constraint_type'] == 'date' and 'specific_date' not in data:
        return jsonify({'error': 'specific_date is required for date constraints'}), 400

    try:
        db = get_db()
        
        # Check if member exists and is active
        member = db.execute(
            'SELECT id FROM team_members WHERE id = ? AND status = "active"',
            (data['member_id'],)
        ).fetchone()
        
        if not member:
            return jsonify({'error': 'Invalid or inactive member ID'}), 400
        
        cursor = db.execute(
            '''INSERT INTO member_constraints 
               (member_id, constraint_type, day_of_week, specific_date, is_available, reason)
               VALUES (?, ?, ?, ?, ?, ?)''',
            (data['member_id'], data['constraint_type'],
             data.get('day_of_week'), data.get('specific_date'),
             data['is_available'], data.get('reason'))
        )
        db.commit()
        return jsonify({'id': cursor.lastrowid}), 201
    except sqlite3.Error as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/api/constraints/<int:id>', methods=['DELETE'])
def delete_constraint(id):
    """Delete a constraint and remove associated duty assignments if it was a positive availability constraint"""
    try:
        db = get_db()
        
        # First get the constraint details
        constraint = db.execute(
            '''SELECT member_id, constraint_type, specific_date, day_of_week, is_available 
               FROM member_constraints WHERE id = ?''', 
            (id,)
        ).fetchone()
        
        if not constraint:
            return jsonify({'error': 'Constraint not found'}), 404

        if constraint['is_available']:
            if constraint['specific_date']:
                # If it was a positive date-specific constraint,
                # remove the duty assignment for that specific date and member
                db.execute(
                    'DELETE FROM duty_assignments WHERE member_id = ? AND date = ?',
                    (constraint['member_id'], constraint['specific_date'])
                )
            elif constraint['day_of_week'] is not None:
                # If it was a positive weekly constraint,
                # remove all future assignments for this member on that day of week
                current_date = datetime.now().strftime('%Y-%m-%d')
                db.execute(
                    '''DELETE FROM duty_assignments 
                       WHERE member_id = ? 
                       AND strftime('%w', date) = ? 
                       AND date >= ?''',
                    (constraint['member_id'], str(constraint['day_of_week']), current_date)
                )
            
        # Now delete the constraint
        db.execute('DELETE FROM member_constraints WHERE id = ?', (id,))
        db.commit()
        return jsonify({'message': 'Constraint and associated assignments deleted successfully'}), 200
    except sqlite3.Error as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/api/assignments', methods=['GET'])
def get_assignments():
    """Get duty assignments for a date range"""
    start_date = request.args.get('start_date', datetime.now().strftime('%Y-%m-%d'))
    end_date = request.args.get('end_date', 
                              (datetime.strptime(start_date, '%Y-%m-%d') + timedelta(days=30)).strftime('%Y-%m-%d'))

    try:
        db = get_db()
        assignments = db.execute(
            '''SELECT a.*, m.name as member_name 
               FROM duty_assignments a 
               JOIN team_members m ON a.member_id = m.id 
               WHERE a.date BETWEEN ? AND ? AND m.status = "active"
               ORDER BY a.date''',
            (start_date, end_date)
        ).fetchall()
        return jsonify([dict(assignment) for assignment in assignments])
    except sqlite3.Error as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/api/assignments', methods=['POST'])
def add_assignment():
    """Add or update a duty assignment"""
    try:
        data = request.get_json()
        if not data or 'member_id' not in data or 'date' not in data:
            return jsonify({'error': 'member_id and date are required'}), 400

        db = get_db()
        
        # Check if member exists and is active
        member = db.execute(
            'SELECT id FROM team_members WHERE id = ? AND status = "active"',
            (data['member_id'],)
        ).fetchone()
        
        if not member:
            return jsonify({'error': 'Invalid or inactive member ID'}), 400

        try:
            # Try to insert new assignment
            db.execute(
                '''INSERT INTO duty_assignments (member_id, date, notes)
                   VALUES (?, ?, ?)''',
                (data['member_id'], data['date'], data.get('notes', ''))
            )
            db.commit()
            return jsonify({'message': 'Assignment added successfully'}), 201
        
        except sqlite3.IntegrityError:
            # Update existing assignment if date already exists
            db.execute(
                '''UPDATE duty_assignments 
                   SET member_id = ?, notes = ?, updated_at = CURRENT_TIMESTAMP 
                   WHERE date = ?''',
                (data['member_id'], data.get('notes', ''), data['date'])
            )
            db.commit()
            return jsonify({'message': 'Assignment updated successfully'}), 200
            
    except sqlite3.Error as e:
        return jsonify({'error': f'Database error: {str(e)}'}), 500
    except Exception as e:
        return jsonify({'error': f'Unexpected error: {str(e)}'}), 500

@bp.route('/api/assignments/<string:date>', methods=['DELETE'])
def delete_assignment(date):
    """Delete a duty assignment"""
    try:
        db = get_db()
        db.execute('DELETE FROM duty_assignments WHERE date = ?', (date,))
        db.commit()
        return jsonify({'message': 'Assignment deleted successfully'}), 200
    except sqlite3.Error as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/api/assignments/delete-range', methods=['POST'])
def delete_assignments_range():
    """Delete all assignments in a given month range"""
    data = request.get_json()
    month = data.get('month')  # format: YYYY-MM
    months = int(data.get('months', 1))
    if not month or months < 1:
        return jsonify({'error': 'month and months are required'}), 400
    try:
        db = get_db()
        year, start_month = map(int, month.split('-'))
        for i in range(months):
            m = start_month + i
            y = year + (m - 1) // 12
            m = (m - 1) % 12 + 1
            first_day = f"{y}-{str(m).zfill(2)}-01"
            last_day = f"{y}-{str(m).zfill(2)}-{monthrange(y, m)[1]}"
            db.execute('DELETE FROM duty_assignments WHERE date BETWEEN ? AND ?', (first_day, last_day))
        db.commit()
        return jsonify({'message': 'Assignments deleted successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/api/roster', methods=['GET'])
def get_roster():
    """Get the duty roster for a specific date range"""
    start_date = request.args.get('start_date', 
                                datetime.now().strftime('%Y-%m-%d'))
    days = int(request.args.get('days', 7))
    
    try:
        start = datetime.strptime(start_date, '%Y-%m-%d')
        end = start + timedelta(days=days)
        
        db = get_db()
        roster = db.execute(
            '''SELECT r.*, m.name as member_name 
               FROM duty_assignments r 
               JOIN team_members m ON r.member_id = m.id 
               WHERE date BETWEEN ? AND ? AND m.status = "active"
               ORDER BY date''',
            (start_date, end.strftime('%Y-%m-%d'))
        ).fetchall()
        
        return jsonify([dict(duty) for duty in roster])
    except sqlite3.Error as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/api/roster', methods=['POST'])
def assign_duty():
    """Manually assign a duty to a team member"""    
    data = request.get_json()
    required_fields = ['member_id', 'date']
    if not all(field in data for field in required_fields):
        return jsonify({'error': 'Missing required fields'}), 400

    try:
        db = get_db()
        
        # Check if member exists and is active
        member = db.execute(
            'SELECT id FROM team_members WHERE id = ? AND status = "active"',
            (data['member_id'],)
        ).fetchone()
        
        if not member:
            return jsonify({'error': 'Invalid or inactive member ID'}), 400
        
        # Check if date is already assigned
        existing = db.execute(
            'SELECT id FROM duty_assignments WHERE date = ?',
            (data['date'],)
        ).fetchone()
        
        if existing:
            db.execute(
                'UPDATE duty_assignments SET member_id = ? WHERE date = ?',
                (data['member_id'], data['date'])
            )
        else:
            db.execute(
                'INSERT INTO duty_assignments (member_id, date) VALUES (?, ?)',
                (data['member_id'], data['date'])
            )
        
        db.commit()
        return jsonify({'message': 'Duty assigned successfully'}), 201
    except sqlite3.Error as e:
        return jsonify({'error': str(e)}), 500

def is_member_available(db, member_id, date):
    """Check if a member is available for duty on a specific date"""
    date_obj = datetime.strptime(date, '%Y-%m-%d')
    day_of_week = date_obj.weekday()
    
    # Check permanent constraints (weekday-based)
    permanent_constraint = db.execute(
        'SELECT constraint_type FROM member_constraints '
        'WHERE member_id = ? AND weekday = ? AND date IS NULL',
        (member_id, day_of_week)
    ).fetchone()
    
    if permanent_constraint and permanent_constraint['constraint_type'] == 'NEGATIVE':
        return False
    
    # Check date-specific constraints
    date_constraint = db.execute(
        'SELECT constraint_type FROM member_constraints '
        'WHERE member_id = ? AND date = ?',
        (member_id, date)
    ).fetchone()
    
    if date_constraint and date_constraint['constraint_type'] == 'NEGATIVE':
        return False
    
    return True

def get_workload_stats(db, member_id, date_str):
    """Get workload statistics for a member"""
    month = datetime.strptime(date_str, '%Y-%m-%d').strftime('%Y-%m')
    stats = db.execute(
        '''SELECT duty_count
           FROM workload_history
           WHERE member_id = ? AND month = ?''',
        (member_id, month)
    ).fetchone()
    
    return stats['duty_count'] if stats else 0

def update_workload_history(db, member_id, date_str):
    """Update workload history for a member"""
    month = datetime.strptime(date_str, '%Y-%m-%d').strftime('%Y-%m')
    
    try:
        # Try to insert new record
        db.execute(
            '''INSERT INTO workload_history (member_id, month, duty_count, last_duty_date)
               VALUES (?, ?, 1, ?)''',
            (member_id, month, date_str)
        )
    except sqlite3.IntegrityError:
        # Update existing record
        db.execute(
            '''UPDATE workload_history 
               SET duty_count = duty_count + 1,
                   last_duty_date = ?
               WHERE member_id = ? AND month = ?''',
            (date_str, member_id, month)
        )

def get_positive_constraints(db, date_str):
    """Get members that must be assigned on a specific date"""
    return db.execute(
        '''SELECT c.member_id 
           FROM member_constraints c
           JOIN team_members m ON c.member_id = m.id
           WHERE (c.specific_date = ? OR 
                 (c.constraint_type = 'fixed' AND c.day_of_week = strftime('%w', ?)))
           AND c.is_available = 1
           AND m.status = "active"''',
        (date_str, date_str)
    ).fetchall()

def get_negative_constraints(db, date_str):
    """Get members that cannot be assigned on a specific date"""
    return db.execute(
        '''SELECT c.member_id 
           FROM member_constraints c
           JOIN team_members m ON c.member_id = m.id
           WHERE (c.specific_date = ? OR 
                 (c.constraint_type = 'fixed' AND c.day_of_week = strftime('%w', ?)))
           AND c.is_available = 0
           AND m.status = "active"''',
        (date_str, date_str)
    ).fetchall()

def auto_schedule_duties(db, start_date_str, last_day_str):
    """
    Automatically schedule duties for a date range with improved workload balancing
    """
    try:
        start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
        end_date = datetime.strptime(last_day_str, '%Y-%m-%d').date()
        schedule = {}

        # Get all active members
        active_members = db.execute(
            'SELECT id FROM team_members WHERE status = "active"'
        ).fetchall()
        member_ids = [m['id'] for m in active_members]

        if not member_ids:
            raise ValueError('No active team members found')

        # Calculate number of days between start and end (inclusive)
        delta = end_date - start_date
        num_days = delta.days + 1

        for i in range(num_days):
            current_date = start_date + timedelta(days=i)
            date_str = current_date.strftime('%Y-%m-%d')
            
            # Skip if already assigned
            existing = db.execute(
                'SELECT id FROM duty_assignments WHERE date = ?',
                (date_str,)
            ).fetchone()
            
            if not existing:
                # First check positive constraints
                required_members = get_positive_constraints(db, date_str)
                if required_members:
                    # If there are multiple required members, choose the one with least workload
                    candidates = [m['member_id'] for m in required_members]
                    chosen_member = min(
                        candidates,
                        key=lambda m: get_workload_stats(db, m, date_str)
                    )
                else:
                    # Get members who are not restricted by negative constraints
                    restricted_members = {m['member_id'] for m in get_negative_constraints(db, date_str)}
                    available_members = [m for m in member_ids if m not in restricted_members]
                    
                    if not available_members:
                        schedule[date_str] = None  # No available members
                        continue
                    
                    # Choose member with least workload
                    chosen_member = min(
                        available_members,
                        key=lambda m: get_workload_stats(db, m, date_str)
                    )
                
                # Assign duty and update workload history
                db.execute(
                    'INSERT INTO duty_assignments (member_id, date) VALUES (?, ?)',
                    (chosen_member, date_str)
                )
                update_workload_history(db, chosen_member, date_str)
                schedule[date_str] = chosen_member

        db.commit()
        return schedule
    except Exception as e:
        db.rollback()
        raise e

@bp.route('/api/roster/auto-schedule', methods=['POST'])
def auto_schedule():
    """Automatically schedule duties for a month range"""
    data = request.get_json()
    month = data.get('month')  # format: YYYY-MM
    months = int(data.get('months', 1))
    if not month or months < 1:
        return jsonify({'error': 'month and months are required'}), 400
    try:
        db = get_db()
        
        # Clean up constraints from inactive members before scheduling
        db.execute(
            '''DELETE FROM member_constraints 
               WHERE member_id IN (
                   SELECT id FROM team_members WHERE status = "inactive"
               )'''
        )
        
        year, start_month = map(int, month.split('-'))
        all_assignments = []
        for i in range(months):
            m = start_month + i
            y = year + (m - 1) // 12
            m = (m - 1) % 12 + 1
            first_day = f"{y}-{str(m).zfill(2)}-01"
            
            # Get month range and verify
            month_range_result = monthrange(y, m)
            last_day_num = month_range_result[1]
            last_day = f"{y}-{str(m).zfill(2)}-{last_day_num}"
            
            schedule = auto_schedule_duties(db, first_day, last_day)
            for date, member_id in schedule.items():
                if member_id is not None:
                    member = db.execute('SELECT name FROM team_members WHERE id = ?', (member_id,)).fetchone()
                    all_assignments.append({'date': date, 'member_id': member_id, 'member_name': member['name'] if member else 'Unknown'})
                else:
                    all_assignments.append({'date': date, 'member_id': None, 'member_name': 'No available members'})
        return jsonify({'message': 'Duties scheduled successfully', 'assignments': all_assignments}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/api/constraints/cleanup', methods=['POST'])
def cleanup_inactive_constraints():
    """Clean up constraints from inactive members"""
    try:
        db = get_db()
        
        # Delete constraints from inactive members
        result = db.execute(
            '''DELETE FROM member_constraints 
               WHERE member_id IN (
                   SELECT id FROM team_members WHERE status = "inactive"
               )'''
        )
        
        # Delete assignments from inactive members
        assignments_result = db.execute(
            '''DELETE FROM duty_assignments 
               WHERE member_id IN (
                   SELECT id FROM team_members WHERE status = "inactive"
               )'''
        )
        
        # Delete workload history from inactive members
        workload_result = db.execute(
            '''DELETE FROM workload_history 
               WHERE member_id IN (
                   SELECT id FROM team_members WHERE status = "inactive"
               )'''
        )
        
        db.commit()
        
        return jsonify({
            'message': 'Cleanup completed successfully',
            'constraints_deleted': result.rowcount,
            'assignments_deleted': assignments_result.rowcount,
            'workload_records_deleted': workload_result.rowcount
        }), 200
    except sqlite3.Error as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/api/export/outlook', methods=['GET'])
def export_to_outlook():
    """Export duty roster assignments to iCalendar format for Outlook import"""
    start_date = request.args.get('start_date', datetime.now().strftime('%Y-%m-%d'))
    end_date = request.args.get('end_date', 
                              (datetime.strptime(start_date, '%Y-%m-%d') + timedelta(days=30)).strftime('%Y-%m-%d'))
    
    try:
        db = get_db()
        assignments = db.execute(
            '''SELECT a.*, m.name as member_name, m.employee_number
               FROM duty_assignments a 
               JOIN team_members m ON a.member_id = m.id 
               WHERE a.date BETWEEN ? AND ? AND m.status = "active"
               ORDER BY a.date''',
            (start_date, end_date)
        ).fetchall()
        
        # Generate iCalendar content
        ics_content = generate_ics_content(assignments)
        
        # Create response with proper headers for file download
        response = Response(ics_content, mimetype='text/calendar')
        response.headers['Content-Disposition'] = f'attachment; filename=duty_roster_{start_date}_to_{end_date}.ics'
        response.headers['Content-Type'] = 'text/calendar; charset=utf-8'
        
        return response
        
    except sqlite3.Error as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/api/export/outlook/month', methods=['GET'])
def export_to_outlook_by_month():
    """Export duty roster assignments to iCalendar format for a month range"""
    month = request.args.get('month')  # format: YYYY-MM
    months = int(request.args.get('months', 1))
    
    if not month or months < 1:
        return jsonify({'error': 'month and months are required'}), 400
    
    try:
        db = get_db()
        year, start_month = map(int, month.split('-'))
        all_assignments = []
        
        for i in range(months):
            m = start_month + i
            y = year + (m - 1) // 12
            m = (m - 1) % 12 + 1
            first_day = f"{y}-{str(m).zfill(2)}-01"
            
            # Get month range and verify
            month_range_result = monthrange(y, m)
            last_day_num = month_range_result[1]
            last_day = f"{y}-{str(m).zfill(2)}-{last_day_num}"
            
            # Get assignments for this month
            assignments = db.execute(
                '''SELECT a.*, m.name as member_name, m.employee_number
                   FROM duty_assignments a 
                   JOIN team_members m ON a.member_id = m.id 
                   WHERE a.date BETWEEN ? AND ? AND m.status = "active"
                   ORDER BY a.date''',
                (first_day, last_day)
            ).fetchall()
            
            all_assignments.extend(assignments)
        
        # Generate iCalendar content
        ics_content = generate_ics_content(all_assignments)
        
        # Create response with proper headers for file download
        response = Response(ics_content, mimetype='text/calendar')
        response.headers['Content-Disposition'] = f'attachment; filename=duty_roster_{month}_{months}_months.ics'
        response.headers['Content-Type'] = 'text/calendar; charset=utf-8'
        
        return response
        
    except sqlite3.Error as e:
        return jsonify({'error': str(e)}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def generate_ics_content(assignments):
    """Generate iCalendar content from duty assignments"""
    ics_lines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//OmegaApp//Duty Roster//HE',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'X-WR-CALNAME:תורנויות צוות',
        'X-WR-CALDESC:תורנויות צוות - יוצא אוטומטית מהמערכת'
    ]
    
    for assignment in assignments:
        # Convert sqlite3.Row to dict if needed
        if hasattr(assignment, 'keys'):
            assignment_dict = dict(assignment)
        else:
            assignment_dict = assignment
            
        # Convert date to datetime for the event
        event_date = datetime.strptime(assignment_dict['date'], '%Y-%m-%d')
        start_datetime = event_date.replace(hour=8, minute=0, second=0)  # Start at 8:00 AM
        end_datetime = event_date.replace(hour=20, minute=0, second=0)   # End at 8:00 PM
        
        # Format dates for iCalendar (local time format without Z suffix)
        start_str = start_datetime.strftime('%Y%m%dT%H%M%S')
        end_str = end_datetime.strftime('%Y%m%dT%H%M%S')
        created_str = datetime.now().strftime('%Y%m%dT%H%M%SZ')
        
        # Create unique ID for the event
        event_uid = f"duty-{assignment_dict['date']}-{assignment_dict['member_id']}@omegaapp.local"
        
        # Escape special characters in description and summary
        description = f"תורן: {assignment_dict['member_name']}"
        if assignment_dict.get('notes'):
            description += f"\\nהערות: {assignment_dict['notes']}"
        
        summary = f"תורן - {assignment_dict['member_name']}"
        
        # Add event to calendar
        ics_lines.extend([
            'BEGIN:VEVENT',
            f'UID:{event_uid}',
            f'DTSTART:{start_str}',
            f'DTEND:{end_str}',
            f'DTSTAMP:{created_str}',
            f'SUMMARY:{summary}',
            f'DESCRIPTION:{description}',
            'CATEGORIES:תורנויות',
            'PRIORITY:5',
            'STATUS:CONFIRMED',
            'TRANSP:OPAQUE',
            'END:VEVENT'
        ])
    
    ics_lines.append('END:VCALENDAR')
    
    return '\r\n'.join(ics_lines)
