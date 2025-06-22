export class DateUtils {
    static getMonthNames() {
        return [
            'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
            'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
        ];
    }

    static getDayNames() {
        return ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
    }

    static isToday(date) {
        const today = new Date();
        today.setHours(12, 0, 0, 0); // Set to noon to avoid timezone issues
        date = new Date(date);
        date.setHours(12, 0, 0, 0);
        return date.getDate() === today.getDate() &&
               date.getMonth() === today.getMonth() &&
               date.getFullYear() === today.getFullYear();
    }
}
