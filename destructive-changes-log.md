#Destructive Changes

11/19/15 - CLARITY-170:
Removed `Is_Active__c` field on `Tax_Group__c`, replaced with `Is_Inactive__c` field.

11/19/15 - CLARITY-211
Removed validation rule `Cannot_change_HRIS_ID` on Contact.

11/20/15 - CLARITY-208:
Rename `Tax_Group__c.Is_Active__c` to `Tax_Group__c.Is_Inactive__c.`

11/23/15 - CLARITY-210
Deactivate All Approval Processes, Delete Them.

11/23/15 - CLARITY-208
Delete `Tax_Group__c.Is_Active__c`
Delete `Contact.Home_XXXXXX__c`
Delete `Contact.Preferred_Language__c`
Delete `Contact.Language__c`
Delete `Contact.Office_XXXXX__c`
Delete `User.Process_Approval__c`
Delete `User.Local_Revenue_Processor__c`
Delete `User.Revenue_Processor__c`
Delete `Contact.Reapps_Import_Id__c`

12/10/15 - CLARITY-257
Delete `McLabs2__Sale__c.Netsuite_Customer_Id__c`
Delete `NetSuite_Customer_Name__c`

01/07/16 - CLARITY-186
Delete `Account.GST_HST_Tax__c`
Delete `Account.QST_Tax__c`

01/08/16 - Clarity-129
Delete `McLabs2__Invoice__c.GST_HST_Tax__c`
Delete `McLabs2__Invoice__c.GST_HST_Tax_Amount__c`
Delete `McLabs2__Invoice__c.QST_Tax__c`
Delete `McLabs2__Invoice__c.QST_Tax_Amount__c`

01/11/16 - Clarity-311
Delete 'User.Revenue_Processor_Email__c'
Delete 'User.Revenue_Processor_Name__c'

01/12/16 - Unit Test Resolution
Delete `Apto_AY_TEST.cls`

01/14/16 - Unit Test Coverage
Delete `Deal_Transaction_date.trigger`
Delete `AYInvoiceController.cls`
Delete `AY_Apto_Class.cls`
Delete `AY_NetsuiteIdController.cls`
Delete `Apto_staticVar.cls`
Delete `ClarityDealController.cls`
Delete `DealWizardWrapper.cls`
Delete `AYDealSummaryController.cls`
Delete `AY_Deal_Summary.page`
Delete `NetSuiteProxy.cls`
Delete `AYInvoiceChoiceController.cls`
Delete `AY_Messages.cls`
Delete `AY_ContactToNetsuite.cls`
Delete `Sale.cls`
Delete `AYHRUpload.cls`
Delete `ClarityDealController.cls`
Delete `DB_Custom_Property__c.cls`
Delete `DB_Custom_Ownership_A__c.cls`
Delete `DealId.cls`
Delete `McLabs2__Invoice_Template__c.Apex_Component_Name__c`
Delete `AYTemplateSummaryLease.component`
Delete `AYTemplateSummarySale.component`

01/19/16 - CLARITY-246
DELETE `McLabs2__Sale__c.Accounting_Category_Name__c`
DELETE `McLabs2__Sale__c.Accounting_Cost_Center_Name__c`
DELETE `McLabs2__Sale__c.Accounting_Department_Name__c`
DELETE `McLabs2__Sale__c.Accounting_Subsidiary_Name__c`
DELETE `McLabs2__Sale__c.Accounting_Category__c`
DELETE `McLabs2__Sale__c.Accounting_Cost_Center__c`
DELETE `McLabs2__Sale__c.Accounting_Department__c`
DELETE `McLabs2__Sale__c.Accounting_Subsidiary__c`

02/03/16
Delete `AdaptorJE.cls`
Delete `AY_Subsidiary_Refresh` button from Subsidiary layout
Delete `AY_Subsidiary_Refresh` label
Delete `AY_Subsidiary_Refresh.page`
Delete `AYSubsidiaryRefreshController.cls`
Delete `AYToNetSuiteAdaptorTEST`
Delete `AYToNetSuiteAdaptor`

02/05/16
Delete `McLabs2__Invoice__c.Returning_From_NetSuite__c`

02/08/16 - CLARITY-351
Delete `McLabs2__Sale__c.Approval_Date__c`

02/10/16 - CLARITY-327
Delete `McLabs2__Sale__c.NetSuite_Item_Constant__c`

02/15/16 - CLARITY-347
Delete `Edit_Commissions_Deal_Has_Been_Approved.label`

02/15/16 - CLARITY-390
Delete `Allocation__c.Allocation_Percent__c`
Delete `Allocation__c.Payroll_Id__c`
Delete `Allocation__c.Posting_Date_Time__c`
Delete `Allocation__c.Tax_GST_HST__c`
Delete `Allocation__c.Tax_QST__c`
Delete `Allocation__c.Transaction_Id__c`
Delete `RecordType: Allocation__c.Deal_Commission_Allocation`
Delete `RecordType: Allocation__c.Deal_Expense_Allocation`
Delete `RecordType: Allocation__c.Staff_Bonus`

02/29/16
Delete `McLabs2__Sale__c.Page_Template__c`

03/01/16 - CLARITY-455 (this allows for field definition change, all of these will be redeployed)
Delete `Process Invoices` tab
Delete `AY_Process_Invoices.page`
Delete `AY_Templated_Invoice.page`
Delete `AYTemplatedInvoiceController`
Delete `InvoiceTriggerHandler`
Delete `McLabs2__Invoice__c.Wire_Instructions__c`

03/01/16 - CLARITY-437 (this allows for field definition change, all of these will be redeployed)
Delete `NetSuiteInvoiceMapping`
Delete `NetSuiteMapping`
Delete `NetsuiteInvoiceMappingTest`
Delete `NetSuiteQueuedInvoiceService`
Delete `Tax_Group__c.GST_HST_Rate__c`
Delete `Tax_Group__c.PST_Rate__c`
Delete `Tax_Group__c.Rate__c`

03/04/16 - CLARITY-411
Delete `Allocation__c.Accounting_Category_Name__c`
Delete `Allocation__c.Accounting_Category__c`
Delete `Allocation__c.Accounting_Cost_Center_Name__c`
Delete `Allocation__c.Accounting_Cost_Center__c`
Delete `Allocation__c.Accounting_Department_Name__c`
Delete `Allocation__c.Accounting_Department__c`
Delete `Allocation__c.Accounting_Subsidiary_Name__c`
Delete `Allocation__c.Accounting_Subsidiary__c`
Delete `Allocation__c.Deal_Id_Parent__c`
Delete `Allocation__c.Deal_Id__c`
Delete `Allocation__c.Expense_Type__c`

03/23/16
Delete `Account.Return_City__c`
Delete `Account.Return_Country__c`
Delete `Account.Return_Postal_Code__c`
Delete `Account.Return_State__c`
Delete `Account.Return_Street__c`
Delete `McLabs2__Invoice__c.Subsidiary_Return_City__c`
Delete `McLabs2__Invoice__c.Subsidiary_Return_Country__c`
Delete `McLabs2__Invoice__c.Subsidiary_Return_Postal_Code__c`
Delete `McLabs2__Invoice__c.Subsidiary_Return_State__c`
Delete `McLabs2__Invoice__c.Subsidiary_Return_Street__c`

03/30/16
Delete `NSQueuedInvoiceLineItemTriggerHandler.cls`
Delete `NetSuiteQueuedInvoiceLineItemTrigger.trigger`

04/04/16
Delete valdiation `McLabs2__Sale__c.Change_Approval_Status_From_Approved`

04/11/16
Delete `Invoice_has_been_recognized.label`

04/20/16
Delete `UserServiceAdmin`
Delete `Error_Primary_Broker_Is_Frozen.label`

04/22/16
Delete `McLabs2__Invoice__c.ProForma_Accounting_Subsidiary__c`
Delete `Invoice_Printing_ProForma_Accounting_Subsidiary_Required.label`

04/27/16
Delete `McLabs2__Sale__c.Property_Type__c` (field type change, will be recreated)
Delete `NetsuiteSyncStatus.page`
Delete `Approval_Step__c.Deal_Approval_Status__c`

05/03/16
Delete validation rule `McLabs2__Invoice__c.CAD_on_CAN_invoices`

05/06/2016
Delete validation rule `McLabs2__Invoice__c.Edit_Invoice_Not_Allowed`
Delete validation rule `McLabs2__Invoice__c.Unvoid_Invoice`

05/16/2016
Delete validation rule `McLabs2__Invoice__c.Reverse_Revenue_Recognition`

05/17/2016
Delete formula field `McLabs2__Escrow__c.Total_Considerations__c` (will be recreated)
Delete formula field `McLabs2__Listing__c.Total_Considerations__c` (will be recreated)
Delete formula field `McLabs2__Proposal__c.Total_Considerations__c` (will be recreated)
Delete formula field `McLabs2__Sale__c.Total_Considerations__c` (will be recreated)

05/23/2016
Delete validation rule `Edit_Invoice_ProForma_Amount_Not_Allowed`

05/24/2016
Delete `AccountTrigger.trigger`
Delete `AccountTriggerHandler.cls`
Delete `AccountTriggerTest.cls`

06/02/2016
Delete field update for `Update_Square_Footage`

06/17/2016
Delete `NetSuite_Queued_Invoice__c.Posting_Period__c` (will be created as Date instead of DateTime)

06/22/2016
Delete `NSCompanySelectionController.cls`
Delete `NSCompanySelection.page`
Delete `McLabs2__Invoice__c.Netsuite_Customer_Id__c`
Delete `McLabs2__Invoice__c.Netsuite_Customer_Name__c`
Delete `McLabs2__Invoice_Payment__c.Approved_Deal_Change_Amount_Zero`

07/01/2016
Delete Payments tab

10/07/2017
Delete deprecated field `McLabs2__Proposal__c.Deal_Id_Text__c`
Delete deprecated field `McLabs2__Listing__c.Deal_Id_Text__c`
Delete deprecated field `McLabs2__Escrow__c.Deal_Id_Text__c`
Delete deprecated field `McLabs2__Escrow__c.Parent_Deal_ID_Text__c`
Delete deprecated field `McLabs2__Sale__c.Deal_ID_Text__c`
Delete deprecated field `McLabs2__Sale__c.Parent_Deal_ID_Text__c`
Delete deprecated field `McLabs2__Sale__c.Approval_Date__c`
Delete deprecated field `McLabs2__Sale__c.Evidence_of_Svcs_Rendered__c`
Delete deprecated field `McLabs2__Sale__c.Deal_Approval_Status__c`
Delete deprecated field `McLabs2__Invoice__c.Bill_To_Address_1__c`
Delete deprecated field `McLabs2__Invoice__c.Bill_To_Address_2__c`
Delete deprecated field `McLabs2__Invoice__c.Bill_To_Address_3__c`

Delete Approve_Deals.permissionset
Delete Broker_Deal_Wizard.permissionset
Delete Comps.permissionset
Delete Edit_Deal_Commissions.permissionset
Delete Edit_Invoices.permissionset
Delete Finance_Set_Close_Period.permissionset
Delete Manage_Payments.permissionset
Delete Modify_Finance_Settings.permissionset
Delete Process_Invoices.permissionset
Delete RP_Deal_Wizard.permissionset

Delete AY_Deal_Wizard.page

10/08/2017
Delete McLabs2__Invoice__c-AY Over The Term Layout Invoice.layout (should be replaced with one that says Invoice Layout, not Layout Invoice)
Delete McLabs2__Invoice__c-Admin AY Over The Term Layout Invoice.layout (should be replaced with one that says Invoice Layout, not Layout Invoice)

02/26/2019
Removing classes from DeadCodeRemoval merge from 8/20/18
Created destructiveChanges/destructiveChanges.xml



### All future deletes should be added to destructiveChanges.xml instead of this file
