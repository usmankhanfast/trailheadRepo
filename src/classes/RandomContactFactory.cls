public class RandomContactFactory {
	public static List<Contact> generateRandomContacts(Integer num, String lname)
    {
        List<Contact> lstContact = new List<Contact>();
		for(Integer i=0;i<num;i++)
        {
            Contact con = new Contact(FirstName='Test'+i,LastName = lname);
            lstContact.add(con);
        }
        return lstContact;
    }
}