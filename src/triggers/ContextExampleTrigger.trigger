trigger ContextExampleTrigger on Account (before insert, after insert, after delete) {
IF(Trigger.isInsert)
{
    if(Trigger.isBefore)
    {
        System.debug('Before Insert');
    } else if (Trigger.isDelete)
    {
        System.debug('After Insert');
    }
}
    else if(Trigger.isDelete)
    {
        System.debug('After delete');
    }
}