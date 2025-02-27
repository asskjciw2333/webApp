from jira import JIRA
from flask import current_app
import os
from datetime import datetime
from ..logger_manager import LoggerManager

logger = LoggerManager().get_logger()

# Define Epic categories
HARDWARE_EPICS = {
    'CISCO': 'תקלות חומרה CISCO',
    'HP': 'תקלות חומרה HP',
    'DELL': 'תקלות חומרה DELL',
    'IBM': 'תקלות חומרה IBM',
    'SWITCH': 'תקלה במתג',
    'INFRASTRUCTURE': 'תקלות תשתית',
    'ROUTER': 'תקלה בנתב'
}

class JiraIntegration:
    def __init__(self, config=None):
        self.config = config or {}
        self.jira = None
        self.initialize_jira()

    def initialize_jira(self):
        """Initialize JIRA client with credentials"""
        try:
            # Get credentials from environment or config
            jira_server = os.getenv('JIRA_SERVER') or self.config.get('JIRA_SERVER')
            jira_email = os.getenv('JIRA_EMAIL') or self.config.get('JIRA_EMAIL')
            jira_api_token = os.getenv('JIRA_API_TOKEN') or self.config.get('JIRA_API_TOKEN')

            if not all([jira_server, jira_email, jira_api_token]):
                logger.error("Missing JIRA credentials")
                return

            self.jira = JIRA(
                server=jira_server,
                basic_auth=(jira_email, jira_api_token)
            )
        except Exception as e:
            logger.error(f"Failed to initialize JIRA client: {str(e)}")

    def get_or_create_epic(self, project_key, epic_name):
        """Get existing epic or create a new one"""
        try:
            # Search for existing epic
            jql = f'project = {project_key} AND issuetype = Epic AND summary ~ "{epic_name}"'
            epics = self.jira.search_issues(jql)
            
            if epics:
                return epics[0]
            
            # Create new epic if not found
            epic_dict = {
                'project': {'key': project_key},
                'summary': epic_name,
                'issuetype': {'name': 'Epic'},
            }
            
            return self.jira.create_issue(fields=epic_dict)
        except Exception as e:
            logger.error(f"Failed to get/create epic: {str(e)}")
            return None

    def create_issue(self, summary, description, project_key, hardware_type=None, issue_type='Incident'):
        """Create a new JIRA incident and link it to appropriate epic"""
        try:
            if not self.jira:
                raise Exception("JIRA client not initialized")

            # Always create as Incident type
            issue_dict = {
                'project': {'key': project_key},
                'summary': summary,
                'description': description,
                'issuetype': {'name': 'Incident'},
            }
            
            # Create the incident
            new_issue = self.jira.create_issue(fields=issue_dict)
            
            # Link to appropriate epic if hardware type is provided
            if hardware_type and hardware_type.upper() in HARDWARE_EPICS:
                epic_name = HARDWARE_EPICS[hardware_type.upper()]
                epic = self.get_or_create_epic(project_key, epic_name)
                if epic:
                    # Link issue to epic
                    self.jira.add_issues_to_epic(epic.id, [new_issue.id])
            
            # Ensure proper URL construction
            jira_url = f"{self.jira.server_url.rstrip('/')}/browse/{new_issue.key}"
            
            return {
                'success': True,
                'issue_key': new_issue.key,
                'issue_id': new_issue.id,
                'url': jira_url
            }
        except Exception as e:
            logger.error(f"Failed to create JIRA issue: {str(e)}")
            return {'success': False, 'error': str(e)}

    def get_current_user(self):
        """Get current user information using JIRA API"""
        try:
            if not self.jira:
                raise Exception("JIRA client not initialized")
            
            user = self.jira.myself()
            return {
                'success': True,
                'user': {
                    'accountId': user.accountId,
                    'displayName': user.displayName,
                    'emailAddress': user.emailAddress,
                    'active': user.active,
                    'timeZone': user.timeZone,
                    'locale': user.locale
                }
            }
        except Exception as e:
            logger.error(f"Failed to get current user: {str(e)}")
            return {'success': False, 'error': str(e)}

    def get_user_projects(self):
        """Get projects accessible by the current user"""
        try:
            if not self.jira:
                raise Exception("JIRA client not initialized")
            
            # Get all accessible projects for the user
            projects = self.jira.projects()
            
            return {
                'success': True,
                'projects': [{
                    'key': project.key,
                    'name': project.name,
                    'id': project.id,
                    'projectTypeKey': project.projectTypeKey,
                    'simplified': project.simplified,
                    'style': project.style
                } for project in projects]
            }
        except Exception as e:
            logger.error(f"Failed to get user projects: {str(e)}")
            return {'success': False, 'error': str(e)}

    def get_user_groups(self):
        """Get groups that the current user belongs to"""
        try:
            if not self.jira:
                raise Exception("JIRA client not initialized")
            
            # Get current user's account ID
            user = self.jira.myself()
            
            # Get user's groups
            groups = self.jira.user_groups(user.accountId)
            
            return {
                'success': True,
                'groups': [{
                    'name': group.name,
                    'groupId': group.groupId if hasattr(group, 'groupId') else None
                } for group in groups]
            }
        except Exception as e:
            logger.error(f"Failed to get user groups: {str(e)}")
            return {'success': False, 'error': str(e)}

    def get_user_permissions(self, project_key=None):
        """Get permissions for the current user, optionally for a specific project"""
        try:
            if not self.jira:
                raise Exception("JIRA client not initialized")
            
            permissions = self.jira.my_permissions(projectKey=project_key)
            
            return {
                'success': True,
                'permissions': permissions.permissions
            }
        except Exception as e:
            logger.error(f"Failed to get user permissions: {str(e)}")
            return {'success': False, 'error': str(e)}

    def get_issue(self, issue_key):
        """Get JIRA issue details"""
        try:
            if not self.jira:
                raise Exception("JIRA client not initialized")

            issue = self.jira.issue(issue_key)
            return {
                'success': True,
                'key': issue.key,
                'summary': issue.fields.summary,
                'description': issue.fields.description,
                'status': issue.fields.status.name,
                'created': issue.fields.created,
                'updated': issue.fields.updated,
                'assignee': issue.fields.assignee.displayName if issue.fields.assignee else None,
                'priority': issue.fields.priority.name if issue.fields.priority else None
            }
        except Exception as e:
            logger.error(f"Failed to get JIRA issue: {str(e)}")
            return {'success': False, 'error': str(e)}

    def search_team_issues(self, project_key, jql_extra=''):
        """Search for team's JIRA issues"""
        try:
            if not self.jira:
                raise Exception("JIRA client not initialized")

            jql = f"project = {project_key} {jql_extra}".strip()
            issues = self.jira.search_issues(jql)
            
            return {
                'success': True,
                'issues': [{
                    'key': issue.key,
                    'summary': issue.fields.summary,
                    'status': issue.fields.status.name,
                    'created': issue.fields.created,
                    'priority': issue.fields.priority.name if issue.fields.priority else None
                } for issue in issues]
            }
        except Exception as e:
            logger.error(f"Failed to search JIRA issues: {str(e)}")
            return {'success': False, 'error': str(e)}

    def update_issue_status(self, issue_key, transition_name):
        """Update JIRA issue status"""
        try:
            if not self.jira:
                raise Exception("JIRA client not initialized")

            issue = self.jira.issue(issue_key)
            self.jira.transition_issue(issue, transition_name)
            return {'success': True}
        except Exception as e:
            logger.error(f"Failed to update JIRA issue status: {str(e)}")
            return {'success': False, 'error': str(e)} 