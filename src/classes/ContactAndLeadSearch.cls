public class ContactAndLeadSearch {
	public static List<List<SObject>> searchContactsAndLeads(String param)
    {
       List<List<SObject>> searchList = [Find :param IN NAME FIELDS Returning Contact(FirstName, LastName), Lead(FirstName, LastName)];
        return searchList;
    }
}