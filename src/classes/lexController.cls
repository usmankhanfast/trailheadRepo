public class lexController {
    public List<Project__c> Selectedmeters {get; set;}
    public String parentID {get;set;}
    
    public lexController(ApexPages.StandardSetController sdController) {
        String ids=Apexpages.currentPage().getParameters().get('id');
		 system.debug(ids);
        parentID = ids;
        
        Selectedmeters = sdController.getRecords();
        system.debug('GetSelected '+ sdController.getSelected().size()+ ' - '+ sdController.getSelected());
    }
    
    public PageReference callFunction(){
        system.debug(Selectedmeters.size()+' Done '+ Selectedmeters);
        PageReference pageRef = new PageReference('/'+parentID);
        system.debug('pageRef '+ pageRef.getUrl());
            return pageRef;
    }
}