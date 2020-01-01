trigger caseAlert on Case (after update, after insert) {    
    
    for(Case cs : Trigger.New)  
    {
        // Instantiating a notification
        Messaging.PushNotification msg = 
            new Messaging.PushNotification();

        // Assembling the necessary payload parameters for Apple.
        // Apple params are: 
        // (<alert text>,<alert sound>,<badge count>,
        // <free-form data>)
        // This example doesn't use badge count or free-form data.
        // The number of notifications that haven't been acted
        // upon by the intended recipient is best calculated
        // at the time of the push. This timing helps
        // ensure accuracy across multiple target devices.
        Map<String, Object> payload = 
            Messaging.PushNotificationPayload.apple(
                'Case ' + cs.CaseNumber + ' status changed to: ' 
                + cs.Status, '', null, null);

        // Adding the assembled payload to the notification
        msg.setPayload(payload);

        // Getting recipient users
        String userId1 = cs.OwnerId;
        String userId2 = cs.LastModifiedById;

        // Adding recipient users to list
        Set<String> users = new Set<String>();
        users.add(userId1);
        users.add(userId2);                       

        // Sending the notification to the specified app and users.
        // Here we specify the API name of the connected app.  
        msg.send('Energy_Consultations', users);
    }
    system.debug('-Rand-');
    if(trigger.isInsert && Trigger.isAfter)
    {
        List<Case> childCases = new List<Case> ();   
        for(Case parent: Trigger.new ) 
        {  
            Case child = new Case(ParentId = parent.Id, Subject = parent.Subject);
            childCases.add(child); 
        } 
        system.debug('-before-'+childCases);
        insert childCases;
        system.debug('-after-'+childCases);
    }
}