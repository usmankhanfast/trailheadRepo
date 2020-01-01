public class MethodClass {
	public static void insertMethod(User u, String alias, String org)
    {
        try {
            insert u;
        } catch(DMLException e) {
            Integer randNumber = integer.ValueOf(Math.rint(Math.random()*100));
            u.Username = alias+randNumber+org;
            insertMethod(u, alias, org);
        }
    }
}