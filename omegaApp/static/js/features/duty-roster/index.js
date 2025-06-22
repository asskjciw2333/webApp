import { DutyRosterUI } from './DutyRosterUI.js';

export class DutyRosterFeature {
    constructor() {
        this.ui = null;
    }

    initialize(containerId) {
        this.ui = new DutyRosterUI(containerId);
    }
}
