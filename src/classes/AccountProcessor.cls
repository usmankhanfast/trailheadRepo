public class AccountProcessor {

    @future
    public static void countContacts(Set<Id> accId)
    {
        List <account> lstAcc = [Select id, Number_of_Contacts__c, (Select id,Name from Contacts) from Account where Id in :accId];
        
        for( Account acc : lstAcc )
      	{
          List<Contact> lstCont = acc.contacts ;
          
          acc.Number_of_Contacts__c = lstCont.size();
      	}
      update lstAcc;
    }
}