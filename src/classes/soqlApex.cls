public class soqlApex {

    public void getRelated()
    {
        List<Account> lstAcc = [Select Id, Name, (Select Id, Name from Contacts), 
                                (Select Id, Name from Opportunities) from Account];
        List<Contact> lstCon = new List<Contact>();
        List<Opportunity> lstOpp = new List<Opportunity>();
        List<Account> lstac = new List<Account>();
        system.debug('--');
        for(Account a:lstAcc)
        {
            if(a.Opportunities.size()>0)
            {
                lstCon.add(a.Contacts);
            }
            if(a.Opportunities.size()>0)
            {
                lstOpp.add(a.Opportunities);
            }
            lstac.add(a);
        }
        for(Contact con:lstCon)
        {
            system.debug(con.Name);
        }
        
    }
}