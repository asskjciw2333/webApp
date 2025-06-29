# Duty Roster System – Files and Changes

להלן רשימת כל הקבצים שנוספו או שונו עבור מערכת התורנויות (duty_roster), כולל תיאור קצר של כל שינוי/הוספה:

---

## Backend (Python)

- **omegaApp/duty_roster.py**
  - קובץ backend עיקרי. כולל API מלא לניהול תורנויות, חברי צוות, אילוצים, שיבוץ אוטומטי, ייצוא לאאוטלוק, איזון עומסים, ועוד.

- **omegaApp/__init__.py**
  - הוספת import ורישום blueprint של duty_roster לאפליקציה הראשית.

---

## Templates (HTML)

- **omegaApp/templates/duty_roster/index.html**
  - תבנית ראשית לממשק התורנויות. טוענת את רכיבי ה-JS ומציגה את ה-UI.

- **omegaApp/templates/base.html**
  - הוספת קישור ל"ניהול תורנויות" בתפריט הניווט הראשי.

---

## CSS (עיצוב)

- **omegaApp/static/css/duty-roster.css**
  - עיצוב מלא לממשק התורנויות: לוח שנה, רשימת חברי צוות, אילוצים, כפתורים, מודלים, ועוד.

---

## JavaScript – צד לקוח (Frontend)

- **omegaApp/static/js/features/duty-roster/DutyRosterUI.js**
  - רכיב ה-UI הראשי. ניהול תצוגה, דיאלוגים, טעינת נתונים, אירועים, אינטגרציה עם state.

- **omegaApp/static/js/features/duty-roster/services/RosterStateManager.js**
  - ניהול מצב מרכזי (state): חברים, שיבוצים, אילוצים, עדכונים תקופתיים.

- **omegaApp/static/js/features/duty-roster/dialogs/MemberDialog.js**
  - דיאלוגים לניהול חברי צוות (הוספה, עריכה, מחיקה).

- **omegaApp/static/js/features/duty-roster/dialogs/ConstraintDialog.js**
  - דיאלוגים לניהול אילוצים (הוספה, עריכה, מחיקה).

- **omegaApp/static/js/features/duty-roster/dialogs/DialogManager.js**
  - ניהול דיאלוגים כללי (מודלים).

- **omegaApp/static/js/features/duty-roster/components/CalendarView.js**
  - תצוגת לוח שנה של התורנויות, כולל אינטראקציה עם שיבוצים ואילוצים.

- **omegaApp/static/js/features/duty-roster/components/MembersList.js**
  - תצוגת רשימת חברי צוות, כולל כפתורי עריכה/מחיקה/הגדרת אילוצים.

- **omegaApp/static/js/features/duty-roster/modals.js**
  - מודלים (טפסים) לשיבוץ תורן, ניהול אילוצים, הוספת/עריכת חבר צוות.

- **omegaApp/static/js/features/duty-roster/utils/NotificationManager.js**
  - ניהול התראות למשתמש (הודעות הצלחה/שגיאה).

- **omegaApp/static/js/features/duty-roster/utils/DateUtils.js**
  - פונקציות עזר לתאריכים (שמות חודשים/ימים, בדיקת היום הנוכחי).

- **omegaApp/static/js/features/duty-roster/help.js**
  - תוכן עזרה למשתמש (הסברים, שאלות נפוצות, דוגמאות).

- **omegaApp/static/js/features/duty-roster/index.js**
  - קובץ כניסה ראשי ל-features של התורנויות.

- **omegaApp/static/js/duty-roster-init.js**
  - אתחול המערכת בדף (טעינת DutyRosterUI).

---

## הערות נוספות

- **שינויים במסד הנתונים**: נוספו טבלאות חדשות (team_members, duty_assignments, member_constraints, workload_history) – לא מוצגים כאן, אך קיימים ב-sql/migrations.
- **שינויים ב-README.md**: יש לעדכן תיעוד בהתאם.

---

לכל קובץ יש תיעוד פנימי נוסף (docstrings, comments) במידת הצורך. 