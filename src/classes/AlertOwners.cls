public class AlertOwners implements Reports.NotificationAction {

    public void execute(Reports.NotificationActionContext context) {
        Reports.ReportResults results = context.getReportInstance().getReportResults();
        for(Reports.GroupingValue g: results.getGroupingsDown().getGroupings()) {
            FeedItem t = new FeedItem();
            t.ParentId = (Id)g.getValue();
            t.Body = 'This record needs attention. Please view the report.';
            t.Title = 'Needs Attention: '+ results.getReportMetadata().getName();
            t.LinkUrl = '/' + results.getReportMetadata().getId();
            insert t;
        }
    }
}