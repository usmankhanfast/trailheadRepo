public class AccountUtils {
    
    public static List<Account> accountsByState(String state)
    {
        List<Account> returnAcc = [select id,name from account where Billingstate=:state];
        return returnAcc;
    }
}