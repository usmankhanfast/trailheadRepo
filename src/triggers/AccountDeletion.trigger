trigger AccountDeletion on Account (before delete) {
	for(Account a : [Select Id from Account Where Id IN (Select AccountId from Opportunity) AND Id IN :Trigger.old])
    {
        Trigger.oldMap.get(a.Id).addError('Cannot delete account with related opportunities.');
    }
}