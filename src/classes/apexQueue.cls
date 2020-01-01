public class apexQueue {
	public void infoQueue()
    {
        /*List<Group> gid = [select Id from Group where Name = 'Test Queue' and type='Queue'];
       	if(gid.size()>0)
        {
            List<GroupMember> gm = [select g.UserOrGroupId From GroupMember g where groupId = :gid];
            System.debug(gid);
            List<Id> ls = new List<Id>();
            for(Integer i=0;i<gm.size();i++)
            {
                ls.add(gm[i].UserOrGroupId);
            }
            
        }*/
    }
    
     public void submitAndProcessApprovalRequest() {
        // Insert an account
        Account a = new Account(Name='Test for Approval 7',annualRevenue=100.0, Type='Prospect', NumberOfEmployees=600);
        insert a;
           
        User user1 = [SELECT Id FROM User WHERE Alias='RUsma'];
       
        List<Group> qid = [select Id from Group where Name = 'Test Queue' and type='Queue'];
       	
         // Create an approval request for the account
        Approval.ProcessSubmitRequest req1 = 
            new Approval.ProcessSubmitRequest();
        req1.setComments('Submitting request for approval.');
        req1.setObjectId(a.id);
        
        // Submit on behalf of a specific submitter
        req1.setSubmitterId(user1.Id); 
         req1.setNextApproverIds(new Id[] {qid[0].id});
        
        // Submit the record to specific process and skip the criteria evaluation
        req1.setProcessDefinitionNameOrId('Approve_New_Account');
        req1.setSkipEntryCriteria(true);
        
        // Submit the approval request for the account
        Approval.ProcessResult result = Approval.process(req1);
        
        // Verify the result
        /*System.assert(result.isSuccess());
        
        System.assertEquals(
            'Pending', result.getInstanceStatus(), 
            'Instance Status'+result.getInstanceStatus());
        
        // Approve the submitted request
        // First, get the ID of the newly created item
        List<Id> newWorkItemIds = result.getNewWorkitemIds();
        
        // Instantiate the new ProcessWorkitemRequest object and populate it
        Approval.ProcessWorkitemRequest req2 = 
            new Approval.ProcessWorkitemRequest();
        req2.setComments('Approving request.');
        req2.setAction('Approve');
         req2.setNextApproverIds(new Id[] {gid[0].id});
        
        // Use the ID from the newly created item to specify the item to be worked
        req2.setWorkitemId(newWorkItemIds.get(0));
        
        // Submit the request for approval
        Approval.ProcessResult result2 =  Approval.process(req2);
        
        // Verify the results
        System.assert(result2.isSuccess(), 'Result Status:'+result2.isSuccess());
        
        System.assertEquals(
            'Approved', result2.getInstanceStatus(), 
            'Instance Status'+result2.getInstanceStatus());*/
    }
}