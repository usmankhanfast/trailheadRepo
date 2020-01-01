public class NewCaseListController {
	public List<Case> getNewCases()
    {
        List<Case> lst = [Select Id, Status from Case where Status='New' ];
        return lst;
    }
}