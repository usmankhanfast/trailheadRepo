import { LightningElement, track } from 'lwc';

export default class HelloWebComponent extends LightningElement {
    @track greeting = 'Trailblazer';
    @track currentDate;

    handleGreetingChange(event) {
        this.greeting = event.target.value;
        this.currentDate = new Date().toDateString();   
    }
    get capitalizedGreeting() {
        return `Hello ${this.greeting.toUpperCase()}!`;
    }
}

//https://developer.salesforce.com/docs/component-library/documentation/lwc/lwc.js_props_getter