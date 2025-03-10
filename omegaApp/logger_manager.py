import logging
import logging.handlers
import os
import json
import logging.config
from typing import List, Optional
from datetime import datetime, date, timedelta
from shutil import copy2


class LoggerManager:
    _instance = None

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self, log_dir: str = 'logs', log_file: str = 'application.log', 
                 log_level: int = logging.DEBUG, console_output: bool = True,
                 config_file: str = None):
        if not hasattr(self, 'logger'):
            # Create logs directory if it doesn't exist
            os.makedirs(log_dir, exist_ok=True)
            
            self.log_dir = log_dir
            self.log_file = os.path.join(log_dir, log_file)
            self.log_level = log_level
            
            if config_file:
                self._setup_from_config(config_file)
            else:
                self._setup_default_logger(console_output)

    def _setup_from_config(self, config_file: str) -> None:
        """Setup logging using a JSON configuration file"""
        try:
            config_path = os.path.join(os.path.dirname(__file__), 'config', config_file)
            with open(config_path, 'r') as f:
                config = json.load(f)
                
            # Update file paths to be relative to log_dir
            if 'handlers' in config:
                for handler in config['handlers'].values():
                    if 'filename' in handler:
                        handler['filename'] = os.path.join(self.log_dir, os.path.basename(handler['filename']))
            
            logging.config.dictConfig(config)
            self.logger = logging.getLogger('agent')
            
        except Exception as e:
            print(f"Error loading logging config: {str(e)}")
            # Fallback to default logging
            self._setup_default_logger(True)

    def _setup_default_logger(self, console_output: bool) -> None:
        """Setup default logging configuration"""
        self.logger = logging.getLogger('ApplicationLogger')
        self.logger.setLevel(self.log_level)
        
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s')

        # Console handler
        if console_output:
            console_handler = logging.StreamHandler()
            console_handler.setLevel(logging.INFO)
            console_handler.setFormatter(formatter)
            self.logger.addHandler(console_handler)

        # Timed rotating file handler - rotates at midnight each day
        self._setup_file_handler()

    def _setup_file_handler(self) -> None:
        """Setup the timed rotating file handler"""
        # Get current date for log file name
        current_date = datetime.now().strftime('%Y-%m-%d')
        log_file = self.log_file + f'.{current_date}'
        
        handler = logging.handlers.TimedRotatingFileHandler(
            log_file,
            when='midnight',
            interval=1,
            backupCount=30,
            encoding='utf-8'
        )
        handler.setLevel(self.log_level)
        handler.setFormatter(logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'))
        
        self.logger.addHandler(handler)

    def check_rotation(self) -> None:
        """Check if log file needs rotation"""
        current_date = datetime.now().date()
        
        for handler in self.logger.handlers:
            if isinstance(handler, logging.handlers.TimedRotatingFileHandler):
                if (handler.rolloverAt and 
                    datetime.fromtimestamp(handler.rolloverAt).date() <= current_date):
                    handler.doRollover()

    def get_logger(self) -> logging.Logger:
        """Get the logger instance"""
        # Check rotation before returning logger
        self.check_rotation()
        return self.logger

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        for handler in self.logger.handlers:
            handler.close()
            self.logger.removeHandler(handler)

    @property
    def log_file_path(self) -> Optional[str]:
        return os.path.abspath(self.log_file) if os.path.exists(self.log_file) else None

    def retrieve_logs(self, num_lines: int = 10000, today_only: bool = True) -> List[str]:
        """
        Retrieve log entries.
        
        Args:
            num_lines: Maximum number of lines to retrieve
            today_only: If True, only return logs from today
            
        Returns:
            List of log lines
        """
        if not os.path.exists(self.log_file):
            return []

        today = datetime.now().date()
        today_str = today.strftime("%Y-%m-%d")

        with open(self.log_file, 'r', encoding='utf-8') as f:
            if not today_only:
                return f.readlines()[-num_lines:]
            
            # Filter only today's logs
            all_lines = f.readlines()
            today_logs = []
            
            for line in all_lines:
                try:
                    # Extract date from log line (format: YYYY-MM-DD HH:mm:ss)
                    log_date_str = line.split(' - ')[0].split(' ')[0]
                    if log_date_str == today_str:
                        today_logs.append(line)
                except (IndexError, ValueError):
                    continue  # Skip malformed lines
                    
            return today_logs[-num_lines:] if num_lines else today_logs

    def get_all_log_files(self) -> List[str]:
        """Returns a list of all log files in the logs directory."""
        if not os.path.exists(self.log_dir):
            return []
        
        return sorted([
            f for f in os.listdir(self.log_dir) 
            if f.startswith(os.path.basename(self.log_file))
        ], reverse=True)  # Newest first

    def get_logs_by_date(self, target_date: date) -> List[str]:
        """
        Retrieve all logs for a specific date.
        
        Args:
            target_date: The date to get logs for (datetime.date object)
            
        Returns:
            List of log lines for that date
        """
        date_str = target_date.strftime("%Y-%m-%d")
        # Try both formats - the old .log. and the current format
        possible_names = [
            f"{os.path.basename(self.log_file)}.{date_str}",
            f"{os.path.basename(self.log_file)}_{date_str}"
        ]
        
        for log_file_name in possible_names:
            log_file_path = os.path.join(self.log_dir, log_file_name)
            if os.path.exists(log_file_path):
                with open(log_file_path, 'r', encoding='utf-8') as f:
                    return f.readlines()
        
        return []

    def search_logs_by_date_range(self, start_date: date, end_date: date) -> dict[str, List[str]]:
        """
        Search logs between two dates (inclusive).
        
        Args:
            start_date: Start date to search from
            end_date: End date to search to
            
        Returns:
            Dictionary with dates as keys and log lines as values
        """
        results = {}
        current_date = start_date
        
        while current_date <= end_date:
            logs = self.get_logs_by_date(current_date)
            if logs:  # Only include dates that have logs
                results[current_date.strftime("%Y-%m-%d")] = logs
            current_date = date.fromordinal(current_date.toordinal() + 1)
            
        return results

    def search_logs_by_keyword(self, keyword: str, start_date: Optional[date] = None, 
                             end_date: Optional[date] = None) -> dict[str, List[str]]:
        """
        Search for a keyword in logs, optionally within a date range.
        
        Args:
            keyword: The text to search for
            start_date: Optional start date to limit search
            end_date: Optional end date to limit search
            
        Returns:
            Dictionary with dates as keys and matching log lines as values
        """
        if start_date is None:
            start_date = date.today()
        if end_date is None:
            end_date = date.today()
            
        results = {}
        logs_by_date = self.search_logs_by_date_range(start_date, end_date)
        
        for date_str, logs in logs_by_date.items():
            matching_lines = [line for line in logs if keyword.lower() in line.lower()]
            if matching_lines:  # Only include dates with matching lines
                results[date_str] = matching_lines
                
        return results

    def _rotate_file(self, source: str, dest: str) -> None:
        """Custom rotator that handles Windows file locking better"""
        import os
        import time
        
        max_attempts = 5
        for i in range(max_attempts):
            try:
                # First try to copy the file instead of moving it
                if os.path.exists(source):
                    # Make copy of source to dest
                    copy2(source, dest)
                    
                    # Now try to truncate the source file
                    with open(source, 'w') as f:
                        f.truncate(0)
                    
                    return
                    
            except OSError as e:
                if i == max_attempts - 1:  # Last attempt
                    raise e
                # Exponential backoff: 100ms, 200ms, 400ms, 800ms
                time.sleep(0.1 * (2 ** i))
                
        raise OSError(f"Failed to rotate log file after {max_attempts} attempts")
