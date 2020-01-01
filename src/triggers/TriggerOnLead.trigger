trigger TriggerOnLead on Lead (before insert) {
    for(Lead l:trigger.new)
    {
        /*if(l.email != trigger.oldMap.get(l.id).email)
{
l.Prior_Email__c = trigger.oldMap.get(l.id).email;
update l;
}*/
        l.Company = 'N/A';
    }
}