@isTest
public class Test_conscheduler {
    public static testMethod void testschedule() {
        Contact con = new Contact();
        con.lastName = '12';
        con.Email = 't@1t.com';
        insert con;
        
        con.Email = 't@t.com';
        update con;
           
        Test.StartTest();
        ConScheduler sh1 = new ConScheduler();
        
        String sch = '0 0 23 * * ?'; 
        system.schedule('Test Email Update', sch, sh1); 
        Test.stopTest(); 
    }
}