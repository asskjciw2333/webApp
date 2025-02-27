export const ColorSchemes = {
    baseColors: {
        blue: 'rgba(54, 162, 235, %a)',
        red: 'rgba(255, 99, 132, %a)',
        green: 'rgba(75, 192, 192, %a)',
        yellow: 'rgba(255, 206, 86, %a)',
        purple: 'rgba(153, 102, 255, %a)',
        orange: 'rgba(255, 159, 64, %a)'
    },

    themes: {
        default: [
            'rgba(54, 162, 235, %a)',  // blue
            'rgba(255, 99, 132, %a)',  // red
            'rgba(75, 192, 192, %a)',  // green
            'rgba(255, 206, 86, %a)',  // yellow
            'rgba(153, 102, 255, %a)', // purple
            'rgba(255, 159, 64, %a)'   // orange
        ],
        cool: [
            'rgba(54, 162, 235, %a)',  // blue
            'rgba(75, 192, 192, %a)',  // green
            'rgba(153, 102, 255, %a)', // purple
            'rgba(102, 178, 255, %a)', // light blue
            'rgba(127, 255, 212, %a)', // aquamarine
            'rgba(138, 43, 226, %a)'   // blue violet
        ],
        warm: [
            'rgba(255, 99, 132, %a)',  // red
            'rgba(255, 159, 64, %a)',  // orange
            'rgba(255, 206, 86, %a)',  // yellow
            'rgba(255, 127, 80, %a)',  // coral
            'rgba(255, 69, 0, %a)',    // red-orange
            'rgba(255, 140, 0, %a)'    // dark orange
        ]
    },

    currentTheme: 'default',

    setTheme(theme) {
        if (this.themes[theme]) {
            this.currentTheme = theme;
        }
    },

    getColor(index, alpha = 0.8) {
        const colors = this.themes[this.currentTheme];
        const color = colors[index % colors.length];
        return color.replace('%a', alpha);
    },

    getColors(count, alpha = 0.8) {
        return Array.from({ length: count }, (_, i) => 
            this.getColor(i, alpha));
    },

    getFillColor(color, alpha = 0.1) {
        return color.replace(/,[^,]+\)$/, `, ${alpha})`);
    },

    getGradient(ctx, color, startAlpha = 0.8, endAlpha = 0.1) {
        const gradient = ctx.createLinearGradient(0, 0, 0, ctx.canvas.height);
        gradient.addColorStop(0, color.replace('%a', startAlpha));
        gradient.addColorStop(1, color.replace('%a', endAlpha));
        return gradient;
    },

    // Helper method to generate contrasting text color
    getContrastColor(backgroundColor) {
        const rgb = backgroundColor.match(/\d+/g);
        if (!rgb) return '#000000';
        
        const brightness = (parseInt(rgb[0]) * 299 + 
                          parseInt(rgb[1]) * 587 + 
                          parseInt(rgb[2]) * 114) / 1000;
        return brightness > 125 ? '#000000' : '#FFFFFF';
    }
}; 