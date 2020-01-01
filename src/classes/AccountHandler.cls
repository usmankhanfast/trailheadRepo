public class AccountHandler {
	public static Account insertNewAccount(String str)
    {
        try {
            Account acc = new Account(Name=str);
            insert acc;
            //String myId = acc.Id;
            //ID acctID = acc.Id;

            return acc;
        } catch (DmlException e) {
            return null;
        }
    }
}