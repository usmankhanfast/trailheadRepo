public class LightningTreeApexController {  
        
    @auraEnabled
    public static List<Account> getAccounts(String accountname){

        String fnd = accountname + '%';

        return [ select name FROM Account where name like:fnd];
    }
    
    @AuraEnabled  
    public static List<items> getAccountHierarchy(Id accountId) {  
        
        //Wrapper instance  
        List<items> finalWrp = new List<items>();  
        
        //Going upto 2 level only as per SOQL limit  
        for(Account acc : [ Select Id, Name, Type, ParentId, Parent.Name, Parent.Type, Parent.ParentId, Parent.Parent.Name, Parent.Parent.Type From Account Where Id =: accountId]) {  
            
            //populating wrapper  
            List<items> trP1 = new List<items>{new items('Type', 'P1', false, null)};  
                List<items> trP2 = new List<items>{new items('Type2', 'P2', false, trP1)};  
                    finalWrp.add(new items('Type3', 'P3', false, trP2));
            finalWrp.add(new items('Tyoe4', 'P0', false, new List<items>()));
        }             
        
        System.debug('finalWrp:::' + finalWrp);  
        // return wrapper  
        return finalWrp;    
    }  
    
    @AuraEnabled  
    public static String getSearchRes(String searchText) { 
        String searchString = '%' + searchText + '%';
        
        List<Contact> contactList = [SELECT FirstName, LastName, Phone, Email, Title, Account.Name FROM Contact where FirstName like :searchString];
        system.debug('-'+contactList); 
        if(contactList.size()>0)
        {
            system.debug('-'+contactList[0].FirstName);
            return contactList[0].FirstName;
        }
        return 'Nothing';
    }
    
    @AuraEnabled
    public static List<sObject> getSuggestions(String sObjectType, String term, String fieldsToGet, Integer limitSize) {
        // could add in logic to remove possible duplicate fields
        String fields = fieldsToGet.length() > 0 ? ',' + fieldsToGet : ''; 
        String soql = 
            ' SELECT Name, Id ' + String.escapeSingleQuotes(fields) +
            ' FROM '   + String.escapeSingleQuotes(sObjectType) +
            ' WHERE Name Like \'' + String.escapeSingleQuotes(term) + '%\'' +
            ' LIMIT ' + limitSize;
        return Database.query(soql);
    }
    }