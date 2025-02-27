export class WebSocketService {
    constructor(wsBaseUrl, onUpdateCallback) {
        this.wsBaseUrl = wsBaseUrl;
        this.onUpdateCallback = onUpdateCallback;
        this.socket = null;
        this.reconnectAttempts = 0;
        this.reconnectInterval = 3000;
        this.isUserDisconnected = false;
        this.maxReconnectAttempts = 5;
    }

    async connect(instanceId) {
        if (this.isUserDisconnected) {
            console.log("User has disconnected. Not attempting to reconnect.");
            return;
        }

        return new Promise((resolve, reject) => {
            this.socket = new WebSocket(`${this.wsBaseUrl}/ws/${instanceId}`);

            this.socket.onopen = () => {
                console.log('WebSocket connected');
                this.reconnectAttempts = 0;
                resolve();
            };

            this.socket.onmessage = (event) => {
                const update = JSON.parse(event.data);
                this.handleUpdate(update);
            };

            this.socket.onclose = (event) => {
                console.error(`WebSocket (${instanceId}) closed, code=${event.code}, reason=${event.reason}`);
                this._reconnectWebSocket(instanceId);
            };

            this.socket.onerror = (error) => {
                console.error('WebSocket error:', error);
                reject(error);
            };
        });
    }

    handleUpdate(update) {
        if (update.type === 'update' && this.onUpdateCallback) {
            this.onUpdateCallback(update.instance_id, update.message);
        }
    }

    async sendStartMessage(instanceId, automationType) {
        if (this.socket?.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({ 
                command: 'start', 
                instance_id: instanceId, 
                automation_type: automationType 
            }));
        } else {
            throw new Error('WebSocket is not open');
        }
    }

    disconnect() {
        this.isUserDisconnected = true;
        if (this.socket) {
            this.socket.close();
        }
        console.log('User initiated disconnect. WebSocket connection closed.');
    }

    _reconnectWebSocket(instanceId) {
        if (this.isUserDisconnected) return;
        
        this.reconnectAttempts++;
        if (this.reconnectAttempts > this.maxReconnectAttempts) {
            console.error('Max reconnection attempts reached');
            this.onUpdateCallback(instanceId, {
                status: 'failed',
                error: 'נכשל החיבור לשרת. נא לרענן את העמוד',
                progress: 0
            });
            return;
        }
        
        console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
        setTimeout(() => this.connect(instanceId), this.reconnectInterval * this.reconnectAttempts);
    }
} 