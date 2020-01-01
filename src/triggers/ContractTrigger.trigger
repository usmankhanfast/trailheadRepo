trigger ContractTrigger on Contract (before insert) {
    for(Contract ct: trigger.new)
    {
        String des =ct.description; 
        system.debug(des+'-');
    }
}