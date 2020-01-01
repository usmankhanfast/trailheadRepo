public class StringArrayTest {
	public static List<String> generateStringArray(Integer n)
    {
        List<String> str = new List<String>();
        String test = 'Test ';
        for (Integer i=0;i<n;i++) {
            str.add(test+i);
            //System.debug(str[i]);
        }
        return str;
    }
}