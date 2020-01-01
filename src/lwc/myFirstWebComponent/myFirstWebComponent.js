import { LightningElement, track } from 'lwc';
export default class HelloIteration extends LightningElement {
    @track
    contacts = [
        {
            Id: 1,
            Name: 'Amy Taylor',
            Title: 'VP of Engineering',
        },
        {
            Id: 2,
            Name: 'Michael Jones',
            Title: 'VP of Sales',
        },
        {
            Id: 3,
            Name: 'Jennifer Wu',
            Title: 'CEO',
        },
    ];
    //https://developer.salesforce.com/docs/component-library/tools/playground/Wem8Qw3Ji/2/edit
}