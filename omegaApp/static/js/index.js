import { Tutorial } from './tutorial.js';

document.addEventListener('DOMContentLoaded', () => {
    const tutorial = new Tutorial();
    
    // Show tutorial on first visit
    if (!localStorage.getItem('tutorialShown')) {
        tutorial.start();
    }
}); 