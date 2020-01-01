@isTest
public class TestRestrictContactByName {
	@isTest public static void TestInvalidNamecheck()
    {
        Contact c= new Contact(FirstName='Any', LastName='INVALIDNAME');
        List<Contact> lst = new List<Contact>();
		lst.add(c);
        Test.startTest();
        Database.SaveResult [] result = Database.insert(lst,false);
        Test.stopTest();
        System.assert(!result[0].isSuccess());
        System.assert(result[0].getErrors().size() > 0);
        System.assertEquals('Cannot Create Contact with related opportunities.',
                             result[0].getErrors()[0].getMessage());
    }
}