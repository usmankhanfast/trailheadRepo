public class items {  
     
   @AuraEnabled  
   public string label { get; set; }  
     
   @AuraEnabled  
   public string name { get; set; }  
     
   @AuraEnabled  
   public Boolean expanded { get; set; }  
     
   @AuraEnabled  
   public List<items> items { get; set; }  
     
   public items( String name, String label, Boolean expanded, List<items> items) {  
     this.label = label;  
     this.name = name;  
     //this.expanded = expanded;  
     this.items = items;   
   }  
 }