public class ContactSearch {
	public static List <Contact> searchForContacts(String lname, String postalCode)
    {
        Contact [] cntcts = [Select ID, FirstName, LastName From Contact where LastName=:lname AND MailingPostalCode=:postalCode];
            List<Contact> lstcntct = new List<Contact>();
        for(Integer i=0;i<cntcts.size();i++)
        {
           lstcntct.add(cntcts[i]); 
        }
        return lstcntct;
    }
}