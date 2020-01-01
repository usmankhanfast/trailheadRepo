trigger ClosedOpportunityTrigger on Opportunity (after insert, after update) {
    List<Task> lstTask = new List<Task>();
	for(Opportunity opp_1:[Select Id from Opportunity Where Id IN :Trigger.New AND StageName='Closed Won'])
    {
        lstTask.add(new Task(Subject='Follow Up Test Task', WhatId=opp_1.Id ));
    }
    if(lstTask.size()>0)
    {
        insert lstTask;
    }
}