/* eslint-disable no-console */
import { LightningElement, api, wire } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import {getRecord, getFieldValue, updateRecord} from 'lightning/uiRecordApi';
import { refreshApex } from '@salesforce/apex';
import myAccountFields from '@salesforce/schema/Account.Name';
const accField = [myAccountFields];

export default class UpdateAcc extends LightningElement {
    @api recordId;
    @wire(getRecord, {recordId: '$recordId', fields: accField})
    myAcc;
    //onchange={handleNameChange
    get accountName() {
        //Doc of getFieldValue https://developer.salesforce.com/docs/component-library/documentation/lwc/lwc.reference_get_field_value
        return getFieldValue(this.myAcc.data, myAccountFields);
    }

    handleMyClick() {
        const fields = {};
        fields[myAcc.fieldApiName] = this.template.querySelector("[data-field='Name']").value;
        alert('button is clicked');

        const recordInput = { fields };

        updateRecord(recordInput)
            .then(() => {
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Success',
                        message: 'Contact updated',
                        variant: 'success'
                    })
                );
                // Display fresh data in the form
                return refreshApex(this.contact);
            })
            .catch(error => {
                console.log('Error->'+ error.body);
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Error creating record',
                        message: 'Could not update',
                        variant: 'error'
                    })
                );
            });
    }
}