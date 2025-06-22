// Central state management for duty roster
export class RosterStateManager {
    static instance = null;
    
    constructor() {
        if (RosterStateManager.instance) {
            return RosterStateManager.instance;
        }
        RosterStateManager.instance = this;
        
        this.members = [];
        this.assignments = [];
        this.constraints = [];
        this.currentDate = new Date();
        this.subscribers = new Map();
        this.lastUpdate = null;
    }

    // Subscribe to state changes
    subscribe(componentId, callback) {
        this.subscribers.set(componentId, callback);
    }

    // Unsubscribe from state changes
    unsubscribe(componentId) {
        this.subscribers.delete(componentId);
    }

    // Notify all subscribers of state changes
    notifySubscribers(changedState) {
        this.lastUpdate = new Date();
        this.subscribers.forEach(callback => callback(changedState));
    }

    // Update members
    async updateMembers() {
        try {
            console.log('Fetching members from server...');
            const response = await fetch('/duty-roster/api/members');
            this.members = await response.json();
            console.log('Received members from server:', this.members);
            this.notifySubscribers({ type: 'members', data: this.members });
            return this.members;
        } catch (error) {
            console.error('Error updating members:', error);
            throw error;
        }
    }

    // Update assignments for a date range
    async updateAssignments(startDate, endDate) {
        try {
            const response = await fetch(
                `/duty-roster/api/assignments?start_date=${startDate.toISOString().split('T')[0]}&end_date=${endDate.toISOString().split('T')[0]}`
            );
            this.assignments = await response.json();
            this.notifySubscribers({ type: 'assignments', data: this.assignments });
            return this.assignments;
        } catch (error) {
            console.error('Error updating assignments:', error);
            throw error;
        }
    }

    // Update constraints
    async updateConstraints() {
        try {
            const response = await fetch('/duty-roster/api/constraints');
            this.constraints = await response.json();
            this.notifySubscribers({ type: 'constraints', data: this.constraints });
            return this.constraints;
        } catch (error) {
            console.error('Error updating constraints:', error);
            throw error;
        }
    }

    // Update member constraints
    async updateMemberConstraints(memberId, constraintData) {
        try {
            // Transform form data to API format
            const constraint = {
                member_id: memberId,
                constraint_type: constraintData.constraint_type,
                day_of_week: constraintData.constraint_type === 'fixed' ? parseInt(constraintData.day_of_week) : null,
                specific_date: constraintData.constraint_type === 'date' ? constraintData.specific_date : null,
                is_available: constraintData.is_available === '1',
                reason: constraintData.reason || ''
            };

            const response = await fetch('/duty-roster/api/constraints', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(constraint)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to save constraint');
            }

            // Update local state
            await this.updateConstraints();
            return true;
        } catch (error) {
            console.error('Error updating member constraints:', error);
            throw error;
        }
    }

    // Delete a constraint
    async deleteConstraint(constraintId) {
        try {
            const response = await fetch(`/duty-roster/api/constraints/${constraintId}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to delete constraint');
            }

            // Update local state after successful deletion
            await this.updateConstraints();
            return true;
        } catch (error) {
            console.error('Error deleting constraint:', error);
            throw error;
        }
    }

    // Delete an assignment for a specific date
    async deleteAssignment(date) {
        try {
            const response = await fetch(`/duty-roster/api/assignments/${date}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to delete assignment');
            }

            // Remove the assignment from local state
            this.assignments = this.assignments.filter(a => a.date !== date);
            this.notifySubscribers({ type: 'assignments', data: this.assignments });
        } catch (error) {
            console.error('Error deleting assignment:', error);
            throw error;
        }
    }

    // Check for assignment conflicts
    checkAssignmentConflicts(date, memberId) {
        // Convert date to YYYY-MM-DD format to ensure consistent comparison
        const normalizedDate = new Date(date);
        const dateStr = normalizedDate.toISOString().split('T')[0];
        
        // Check existing assignments
        const existingAssignment = this.assignments.find(a => a.date === dateStr);
        if (existingAssignment && existingAssignment.member_id !== memberId) {
            return { type: 'assignment', message: 'יש כבר תורן מוגדר לתאריך זה' };
        }

        // Check member constraints
        const memberConstraints = this.constraints.filter(c => c.member_id === memberId);
        
        for (const constraint of memberConstraints) {
            if (constraint.constraint_type === 'date' && constraint.specific_date === dateStr && !constraint.is_available) {
                return { type: 'date_constraint', message: 'התורן אינו זמין בתאריך זה' };
            }
            
            if (constraint.constraint_type === 'fixed' && constraint.day_of_week === normalizedDate.getDay() && !constraint.is_available) {
                return { type: 'day_constraint', message: 'התורן אינו זמין ביום זה בשבוע' };
            }
        }

        return null;
    }    

    isMemberValid(memberId) {
        console.log('Validating member:', memberId);
        console.log('Current members:', this.members);
        console.log('Member ID type:', typeof memberId);
        
        const parsedId = parseInt(memberId);
        console.log('Parsed member ID:', parsedId, 'type:', typeof parsedId);
        
        const member = this.members.find(m => {
            console.log('Comparing with member:', m.id, 'type:', typeof m.id);
            return m.id === parsedId;
        });
        
        if (!member) {
            console.log('Member not found in system');
            throw new Error('חבר צוות לא נמצא במערכת');
        }
        
        console.log('Found member:', member);
          if (member.status !== 'active') {
            console.log('Member is not active');
            throw new Error('חבר הצוות אינו פעיל במערכת');
        }
        
        return true;
    }

    // Add or update assignment
    async updateAssignment(date, memberId, notes = '') {
        console.log('Starting assignment update with:', {
            date: date,
            memberId: memberId,
            notes: notes
        });

        // Validate member first
        try {
            this.isMemberValid(memberId);
            console.log('Member validation passed');
        } catch (error) {
            console.error('Member validation failed:', error);
            throw error;
        }

        const conflict = this.checkAssignmentConflicts(date, memberId);
        if (conflict) {
            throw new Error(conflict.message);
        }

        try {
            const assignmentData = {
                member_id: parseInt(memberId),
                date: date,
                notes: notes || ''
            };

            console.log('Sending assignment data:', assignmentData);

            const response = await fetch('/duty-roster/api/assignments', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(assignmentData)
            });

            if (!response.ok) {
                const contentType = response.headers.get('content-type');
                let errorMessage = 'Failed to save assignment';
                
                if (contentType && contentType.includes('application/json')) {
                    try {
                        const errorData = await response.json();
                        errorMessage = errorData.error || errorMessage;
                    } catch (e) {
                        console.error('Failed to parse error response:', e);
                    }
                } else {
                    // If not JSON, get text of error
                    try {
                        const errorText = await response.text();
                        console.error('Server response:', errorText);
                        if (response.status === 500) {
                            errorMessage = 'Internal server error. Please try again later.';
                        }
                    } catch (e) {
                        console.error('Failed to get error text:', e);
                    }
                }
                
                throw new Error(errorMessage);
            }

            // Try to parse the response
            const result = await response.json();
            console.log('Assignment saved successfully:', result);

            // מוסיף את השיבוץ החדש לרשימה המקומית
            const dateStr = this.formatDate(date);
            const existingIndex = this.assignments.findIndex(a => a.date === dateStr);
            
            if (existingIndex !== -1) {
                // אם כבר קיים שיבוץ ליום הזה, נעדכן אותו
                this.assignments[existingIndex] = {
                    date: dateStr,
                    member_id: parseInt(memberId),
                    notes: notes || ''
                };
            } else {
                // אם לא קיים שיבוץ, נוסיף חדש
                this.assignments.push({
                    date: dateStr,
                    member_id: parseInt(memberId),
                    notes: notes || ''
                });
            }

            // מודיע למאזינים על העדכון
            this.notifySubscribers({ type: 'assignments', data: this.assignments });

            return result;
        } catch (error) {
            console.error('Error saving assignment:', error);
            throw new Error('Failed to save assignment');
        }
    }

    // Helper method to format dates consistently
    formatDate(date) {
        // Set the time to noon to avoid timezone issues
        const normalizedDate = new Date(date);
        normalizedDate.setHours(12, 0, 0, 0);
        return normalizedDate.toISOString().split('T')[0];
    }

    // Get assignments for a specific period
    getAssignmentsForPeriod(startDate, endDate) {
        return this.assignments.filter(assignment => {
            const assignmentDate = new Date(assignment.date);
            return assignmentDate >= startDate && assignmentDate <= endDate;
        });
    }

    // Get constraints for a specific member
    getMemberConstraints(memberId) {
        return this.constraints.filter(constraint => constraint.member_id === memberId);
    }

    // Check if a member is available on a specific date
    isMemberAvailable(memberId, date) {
        return !this.checkAssignmentConflicts(date, memberId);
    }

    // Get a member by ID
    getMember(memberId) {
        return this.members.find(member => member.id === memberId);
    }

    // Get constraints by type (positive/negative) for a specific date
    getDateConstraints(date) {
        // Convert date to YYYY-MM-DD format to ensure consistent comparison
        const normalizedDate = new Date(date);
        const dateStr = normalizedDate.toISOString().split('T')[0];
        const dayOfWeek = normalizedDate.getDay();
        
        const dateConstraints = this.constraints.filter(c => 
            (c.specific_date === dateStr) || 
            (c.day_of_week === dayOfWeek)
        );

        return {
            positive: dateConstraints.filter(c => c.is_available),
            negative: dateConstraints.filter(c => !c.is_available)
        };
    }

    // Start periodic updates
    startPeriodicUpdates(intervalMinutes = 5) {
        setInterval(() => {
            this.updateMembers();
            this.updateConstraints();
            // Update assignments for current month
            const startDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), 1);
            const endDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 0);
            this.updateAssignments(startDate, endDate);
        }, intervalMinutes * 60 * 1000);
    }
}
