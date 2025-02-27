from omegaApp.logger_manager import LoggerManager
from flask import Blueprint, render_template, current_app

bp = Blueprint("automations", __name__, url_prefix="/automations")
logger = LoggerManager().get_logger()




@bp.route("/")
def index():
    cards = [
        {"id": 1, "name": "עדכון שרת", "description": "שרתי CISCO תחת Central"},
        {
            "id": 2,
            "name": "קיצור דרך לסיסמאות",
            "description": "הוספת סימניה בדפדפן שבלחיצה פותחת רשימת סיסמאות נפוצות",
        },
        {
            "id": 3,
            "name": "בדיקת טקסט",
            "description": "בדיקת שגיאות ושיפור קל של תחביר",
        },
    ]
    return render_template("automations/index.html", cards=cards)

automations = {}




class TranslationManager:
    def __init__(self):
        self._translations = {}
        self._translations_lower = {}  # מילון חדש לחיפוש case-insensitive
        self._is_initialized = False

    def get_translation(self, room_name):
        """Get translation for a room name"""
        if not room_name:
            return room_name

        # חיפוש case-insensitive
        return self._translations.get(
            room_name,  # קודם מנסה למצוא בדיוק
            self._translations.get(
                self._translations_lower.get(
                    room_name.lower(), room_name
                ),  # אם לא נמצא, מחפש ב-lower
                room_name,  # אם עדיין לא נמצא, מחזיר את המקור
            ),
        )

    def initialize_translations(self, _):
        """Initialize translations from ENV file"""
        if self._is_initialized:
            return

        logger.info("Initializing room translations from ENV...")
        try:
            # קריאת התרגומים מקובץ ENV
            translations_str = current_app.config.get("ROOM_NAMES", "")
            if translations_str:
                pairs = translations_str.split(",")
                for pair in pairs:
                    eng, heb = pair.split(":")
                    eng = eng.strip()
                    heb = heb.strip()
                    self._translations[eng] = heb
                    self._translations_lower[eng.lower()] = (
                        eng  # שמירת המיפוי מ-lower למקורי
                    )

            logger.info(f"Loaded {len(self._translations)} translations from ENV")
            self._is_initialized = True

        except Exception as e:
            logger.error(f"Failed to initialize translations from ENV: {e}")
            self._translations = {}
            self._translations_lower = {}

    def refresh_translations(self):
        """Reset translations to allow reinitialization"""
        self._translations = {}
        self._translations_lower = {}
        self._is_initialized = False

translation_manager = TranslationManager()

__all__ = ["translation_manager"]
