# תוכנית שדרוג לסוכן אוטונומי

## מצב קיים
המערכת כרגע כוללת:
- זיהוי כוונות (Intents) באמצעות מודל שפה
- מיפוי פעולות (Actions) דינמי מתוך קובץ הגדרות
- יכולת לבצע פעולות API בהתאם לכוונות המשתמש
- תמיכה בהיסטוריית שיחה
- תמיכה בסוגי תגובות שונים (צ'אט רגיל, פעולות)

## שדרוגים נדרשים

### 1. הרחבת יכולות הניתוח של המודל
- הוספת יכולת לנתח את תוצאות ה-API ולהחליט על הפעולה הבאה
- תמיכה בשרשור פעולות מרובות
- זיהוי תלויות בין פעולות
- שיפור היכולת לשאול שאלות הבהרה מהמשתמש

### 2. ניהול מצב (State Management)
- הוספת מנגנון לניהול מצב השיחה והפעולות
- מעקב אחר פעולות שבוצעו ותוצאותיהן
- שמירת הקשר בין פעולות קשורות

### 3. מנגנון קבלת החלטות
- הוספת פונקציונליות לניתוח תוצאות ביניים
- יכולת לקבל החלטות על סמך מספר תוצאות
- זיהוי מצבי שגיאה וטיפול בהם

### 4. שיפור האינטראקציה
- הוספת עדכוני סטטוס מפורטים
- שיפור המשוב למשתמש
- תמיכה בביטול/שינוי פעולות באמצע תהליך

## תוכנית מימוש

### שלב 1: הרחבת ChatManager
```python
class ChatManager:
    async def analyze_results(self, results: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze API results and determine next steps"""
        pass
        
    async def execute_action_chain(self, actions: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Execute a chain of related actions"""
        pass
        
    async def validate_dependencies(self, action: Dict[str, Any]) -> bool:
        """Check if all dependencies are met before executing an action"""
        pass
```

### שלב 2: הוספת ConversationState
```python
class ConversationState:
    def __init__(self):
        self.current_intent = None
        self.executed_actions = []
        self.action_results = {}
        self.pending_questions = []
        
    def add_action_result(self, action: str, result: Dict[str, Any]) -> None:
        pass
        
    def get_context_for_next_action(self) -> Dict[str, Any]:
        pass
```

### שלב 3: שדרוג מערכת קבלת ההחלטות
1. הרחבת הפרומפט למודל השפה לכלול:
   - ניתוח תוצאות API
   - זיהוי תלויות
   - החלטה על פעולות המשך
   
2. הוספת תבניות להחלטות נפוצות:
   - בקשת מידע נוסף מהמשתמש
   - חזרה על פעולה שנכשלה
   - בחירת פעולה חלופית

### שלב 4: עדכון ממשק המשתמש
1. הוספת עדכוני סטטוס מפורטים
2. תצוגת תהליך קבלת ההחלטות
3. אפשרויות אינטראקציה מתקדמות

## דוגמה לתהליך מורכב
```
User: "אני רוצה לשדרג את כל השרתים בחדר שרתים A"

Agent:
1. חיפוש שרתים בחדר A
2. ניתוח תוצאות החיפוש
3. בדיקת תאימות שדרוג לכל שרת
4. תעדוף השדרוגים
5. הרצת שדרוגים ברצף
6. מעקב אחר התקדמות
7. טיפול בשגיאות במידת הצורך
```

## שלבי פיתוח
1. מימוש ConversationState
2. שדרוג ChatManager
3. עדכון תבניות Prompts
4. הרחבת הממשק
5. בדיקות ואינטגרציה