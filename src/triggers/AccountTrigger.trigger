trigger AccountTrigger on Account (before insert, after insert) {
    
    if(trigger.isBefore && trigger.isInsert)
    {
       AccountTriggerHandler.CreateAccounts(trigger.new);
    }
	
    if(trigger.isAfter && trigger.isInsert)
    {
        List<Id>accountIds = new List<Id>();
        for(Account acc:trigger.new)
        {
            accountIds.add(acc.id);
        }
       AccountTriggerHandler.CreateCustomerInQB(accountIds, null);
    }
}