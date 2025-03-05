from typing import Optional, Any
from contextlib import contextmanager
import sqlite3
from sqlite3 import Connection, Row
import click
from flask import current_app, g
from flask.cli import with_appcontext
import threading

# Thread-local storage for database connections
_local = threading.local()

class DatabaseError(Exception):
    """Base exception class for database operations"""
    pass

class ConnectionError(DatabaseError):
    """Exception raised for database connection errors"""
    pass

def get_db():
    """Get a database connection for the current thread"""
    if not hasattr(_local, 'db'):
        _local.db = sqlite3.connect(
            current_app.config['DATABASE'],
            detect_types=sqlite3.PARSE_DECLTYPES
        )
        _local.db.row_factory = sqlite3.Row
    
    return _local.db

@contextmanager
def get_db_connection():
    """Context manager for database connections."""
    db = get_db()
    try:
        yield db
    finally:
        close_db()

def close_db(e=None):
    """Close the database connection for the current thread"""
    try:
        db = getattr(_local, 'db', None)
        if db is not None:
            db.close()
            delattr(_local, 'db')
    except Exception as e:
        current_app.logger.error(f"Error closing database connection: {str(e)}")

def init_db():
    """Initialize the database with schema"""
    db = get_db()
    
    with current_app.open_resource('schema.sql') as f:
        db.executescript(f.read().decode('utf8'))

@click.command('init-db')
@with_appcontext
def init_db_command():
    """Clear the existing data and create new tables."""
    init_db()
    click.echo('Initialized the database.')

def execute_query(query: str, params: tuple = ()) -> Optional[list[Row]]:
    """Execute a database query with error handling."""
    try:
        with get_db_connection() as db:
            cursor = db.execute(query, params)
            return cursor.fetchall()
    except sqlite3.Error as e:
        current_app.logger.error(f"Database query error: {e}")
        raise DatabaseError(f"Query execution failed: {e}")

def execute_write_query(query: str, params: tuple = ()) -> Any:
    """Execute a write query (INSERT/UPDATE/DELETE) with error handling."""
    try:
        with get_db_connection() as db:
            cursor = db.execute(query, params)
            db.commit()
            return cursor.lastrowid
    except sqlite3.Error as e:
        current_app.logger.error(f"Database write error: {e}")
        raise DatabaseError(f"Write operation failed: {e}")

def init_app(app: Any) -> None:
    """Register database functions with the Flask app."""
    app.teardown_appcontext(close_db)
    app.cli.add_command(init_db_command)