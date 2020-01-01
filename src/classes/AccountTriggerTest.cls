@istest
public class AccountTriggerTest {
    @istest
    public static void m1()
    {
        List<Account> accList = new List<Account>();
        for(integer i=0;i<200;i++)
        {
            Account acc = new Account(name='abc', ShippingState='C', BillingState='CA');
            accList.add(acc);
        }
        insert accList;
    }

}