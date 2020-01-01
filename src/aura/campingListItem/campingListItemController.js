({
	packItem : function(component, event, helper) {
        var a = component.get("v.item");
        a.Packed__c = true;
		component.set("packField", a);
        var packBtn = event.getSource();
        packBtn.set("v.disabled", true);
	}
})