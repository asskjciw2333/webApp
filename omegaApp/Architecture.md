# Project Architecture Documentation

## Overview
This project is a web-based application designed for managing server room infrastructure, specifically focusing on panel mapping and automation tasks. The application provides interfaces for viewing and managing panels across different server rooms, as well as executing various automation tasks.

## Core Components

### 1. Backend Services
- **Flask Application Server**
  - Handles HTTP requests and serves web pages
  - Manages database operations
  - Implements authentication and session management
  - Provides RESTful APIs for frontend interactions
  - Custom error handling and validation
  - Session-based DCIM authentication management

- **Database Layer**
  - SQLite database for storing panel and automation data
  - Tables:
    - `panels`: Stores panel information and metadata
    - `automations`: Tracks automation tasks and their status
    - Support for future migration to more robust databases

### 2. Frontend Components
- **Panel Management Interface**
  - Interactive table view of panels
  - Filtering capabilities by room and rack
  - Real-time panel data editing with validation
  - CSV export functionality with UTF-16LE encoding for Hebrew support
  - Port status monitoring with visual indicators
  - Responsive design for mobile devices

- **Automation Dashboard**
  - Card-based interface for different automation tasks
  - Progress tracking with visual feedback
  - Server firmware update interface with version compatibility checks
  - Password management tools with bookmarklet support
  - Text validation and correction tools
  - Interactive tutorial system (accessible via 'R' key)

### 3. UI/UX Features
- **Notification System**
  - Real-time feedback for user actions
  - Error handling with user-friendly messages
  - Success confirmations
  - RTL (Right-to-Left) support for Hebrew

- **Interactive Elements**
  - Modal dialogs with smooth animations
  - Loading indicators and spinners
  - Responsive buttons with visual feedback
  - Keyboard shortcuts
  - Copy-to-clipboard functionality

### 3. Network Components
- **Panel Network Module**
  - Graph-based network representation using NetworkX
  - Route calculation between panels
  - Connection management based on interface types and classifications
  - Visualization of panel connections

### 4. Integration Services
- **DCIM Integration**
  - Synchronization with external DCIM system
  - Asset search and retrieval
  - Real-time updates of panel information
  - Custom property mapping

## Key Features

### Panel Management
- Panel location tracking
- Interface type management (RJ, MM, SM)
- Classification system (RED, BLACK)
- Port availability tracking
- Destination mapping
- Status monitoring

### Automation Capabilities
- Server firmware updates
- Password management tools
- Progress tracking
- Error handling and logging

### Search and Filter
- Multi-criteria search functionality
- Room and rack-based filtering
- Real-time results updating
- Export capabilities

## Technical Stack

### Backend
- Python/Flask
- SQLite
- NetworkX (for network topology)
- UCS SDK (for server management)
- Custom middleware for DCIM integration

### Frontend
- HTML5/CSS3
- Vanilla JavaScript with modular architecture
- WebSocket (for real-time updates)
- CSS Custom Properties for theming
- Responsive design breakpoints

### External Integrations
- DCIM System
- UCS Central
- UCS Manager

## Data Flow

1. **Panel Data Flow**
   ```
   DCIM System -> Flask Server -> SQLite -> Frontend Display
   Frontend Edit -> Flask Server -> DCIM System + SQLite
   ```

2. **Automation Flow**
   ```
   User Request -> Flask Server -> Automation Module -> Target System
   Status Updates -> WebSocket -> Frontend Display
   ```

## Security Considerations

- Authentication required for all operations
- Classification-based access control
- Secure WebSocket connections
- Input validation and sanitization

## Future Considerations

1. **Scalability**
   - Potential migration to a more robust database
   - Microservices architecture for automation tasks
   - Load balancing for multiple server rooms

2. **Features**
   - Advanced network topology visualization
   - Automated panel connection verification
   - Enhanced reporting capabilities
   - Real-time monitoring dashboard

3. **Integration**
   - Additional automation capabilities
   - Extended DCIM system integration
   - Support for different server management systems

## Notes
Currently, some services are not active in the network, and the interface operates in a limited capacity. The architecture is designed to be modular, allowing for easy activation of services when they become available in the network.

## Development Guidelines
- Modular JavaScript architecture
- CSS naming conventions and component isolation
- Error handling best practices
- Hebrew language support throughout the application
- Mobile-first responsive design approach
- Progressive enhancement for features
