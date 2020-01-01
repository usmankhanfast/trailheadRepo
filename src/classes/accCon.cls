public with sharing class accCon { 
    @RemoteAction
    public static List<Contact> GetAllContactsByFilter(String searchText)
    {
        String searchString = '%' + searchText + '%';
        List<Contact> contactList = [SELECT FirstName, LastName, Phone, Email, Title, Account.Name FROM Contact where FirstName like :searchString];
        system.debug('-'+contactList);
        return contactList;
    }
}