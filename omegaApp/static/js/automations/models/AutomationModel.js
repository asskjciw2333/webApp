export class AutomationModel {
    constructor(id, serverName) {
        this.id = id;
        this.server_name = serverName;
        this.progress = 0;
        this.status = 'pending';
        this.message = '';
        this.error = null;
        this.created_at = new Date().toISOString();
        this.display = true;
    }

    update(data) {
        Object.assign(this, data);
    }

    isRunning() {
        return this.status === 'running';
    }

    isCompleted() {
        return this.status === 'completed';
    }

    isFailed() {
        return this.status === 'failed';
    }

    get statusText() {
        switch(this.status) {
            case 'running':
                return 'בתהליך';
            case 'completed':
                return 'הושלם';
            case 'failed':
                return 'נכשל';
            case 'pending':
                return 'ממתין';
            default:
                return this.status;
        }
    }

    get isActive() {
        return this.status === 'running' || this.status === 'pending';
    }
} 