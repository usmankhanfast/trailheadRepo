import { LightningElement, track } from 'lwc';

export default class HelloWorld extends LightningElement {
    @track greeting = 'World';
    changeHandler(event) {
        //console.log('event.target.value ->'+event.target.value);
        this.greeting = event.target.value;
    }
}