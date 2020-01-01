@isTest
private class testClass {
    @testsetup
    static void setup()
    {
        List<account> accIns = new List<account>();
        for(integer i=0;i<2;i++)
        {
            accIns.add(new Account(name='MyTestAcc'+i, phone='333-678'+i));
        }
        insert accIns;
    } 
    
    @isTest
    static void t1()
    {
        Account acc = [select id,name,phone from account where name='MyTestAcc0' limit 1];   
        acc.phone = '888-1515';
        update acc;
        
        Account acc1 = [select id,name,phone from account where name='MyTestAcc1' limit 1];   
        acc1.phone = '999-1515';
        update acc1;        
    }
    
    @isTest
    static void t2()
    {
        Account acc = [select id,name,phone from account where name='MyTestAcc1' limit 1];   
        acc.phone = '999-2525';
        update acc;
    }
    
    @isTest
    static void t3()
    {
        Account acc1 = [select id,name,phone from account where name='MyTestAcc0' limit 1]; 
        Account acc2 = [select id,name,phone from account where name='MyTestAcc1' limit 1];
        
        system.debug(acc1.Phone+acc2.phone);
    }
}