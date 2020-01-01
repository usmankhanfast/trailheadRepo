import { LightningElement, api } from 'lwc';
import ursusResources from '@salesforce/resourceUrl/ursus_park';

export default class BearTile extends LightningElement {
    @api bear;
    //We added a bear property decorated with @api. This exposes the bear property to any parent component.
	appResources = {
		bearSilhouette: ursusResources +'/img/standing-bear-silhouette.png',
    };
    
    handleOpenRecordClick() {
        const selectEvent = new CustomEvent('bearview', {
            bubbles: true,
            detail: this.bear.Id
        });
        this.dispatchEvent(selectEvent);
    }
}