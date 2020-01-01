trigger UserTrigger on Account (before insert)
{
    //If check box is true
      Profile profileId = [SELECT Id FROM Profile WHERE Name = 'Standard User' LIMIT 1];
      String org='@rt_sf.com';
      String fname='tester';
      String lname='rt';
      String myAlias = fname+lname;
      String mail = 'test.user1@test.com';
      
    User usr = new User(LastName = lname,
                     FirstName=fname,
                     Alias = myAlias,
                     Email = mail,
                     Username = mail,//myAlias+'@'+org+'sf.com'
                     ProfileId = profileId.id,
                     TimeZoneSidKey = 'GMT',
                     LanguageLocaleKey = 'en_US',
                     EmailEncodingKey = 'UTF-8',
                     LocaleSidKey = 'en_US'
                     );
    insert usr;
    //MethodClass.insertMethod(usr, myAlias, org);
}