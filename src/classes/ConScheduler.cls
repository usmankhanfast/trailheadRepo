global class ConScheduler Implements Schedulable
{
    global void execute(SchedulableContext sc)
    {
        collectDataForEmail();
    }
    
    public void collectDataForEmail()
    {
        
        String baseUrl = System.URL.getSalesforceBaseUrl().toExternalForm();
    	String subject = System.label.InstanceName;
        
        string htmlBody='<p>Dear '+',</p>';
        
        for(AggregateResult chObjectAR:[SELECT ContactId, Contact.Name FROM ContactHistory where field='email' and CreatedDate=Today group by ContactId, Contact.Name]) 
        {
            String urlCon = baseUrl+'/'+String.valueOf(chObjectAR.get('ContactId'));
            htmlBody += '<div>' +'<a href='+urlCon+'>'+chObjectAR.get('Name') +'</a><br/><div>' ;
        }
        sendEmailToAdmin(htmlBody,subject );
    }
    
    public static void sendEmailToAdmin(String htmlBody, String subject)
    {
        EmailTemplate emailTemplate = [Select Id, Subject, HtmlValue, Body from EmailTemplate where name ='ConatctUs' limit 1]; 
        
        Messaging.SingleEmailMessage semail = new Messaging.SingleEmailMessage();
        semail.setToAddresses(new String[]{'usman.khan@rolustech.net'});
        semail.setsubject(subject);
        semail.setHtmlBody(htmlBody);
        semail.setTemplateId(emailTemplate.Id);
        semail.setTreatTargetObjectAsRecipient(false);
        Messaging.sendEmail(new Messaging.SingleEmailmessage[] {semail});
    }
}