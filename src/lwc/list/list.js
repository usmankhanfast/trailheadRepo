import { LightningElement, track } from 'lwc';
import { bikes } from 'c/data';

export default class List extends LightningElement {
    bikes = bikes;

    handleTileClick(evt) {
        // This component wants to emit a productselected event to its parent
        const event = new CustomEvent('productselected', {
            detail: evt.detail
        });
        console.log('-List-');
        // Fire the event from c-list
        this.dispatchEvent(event);
    }
}