var CURRENCY_PRECISION = 2; //Setting equal to Percent_Precision since we employ toFixed
var PERCENT_PRECISION = 5;
var COMMISSION_ITEM_QUANTITY_PRECISION = 4;
var LEASE_RECORD_TYPE = 'Lease';
var SALE_RECORD_TYPE = 'Sale';
var INVALID_DATE_STRING = 'Invalid date';
var MONTHLY_BILLING_FREQUENCY = 'Monthly';
var ONE_TIME_BILLING_FREQUENCY = 'One Time';
var APPROVED_STATUS = 'Approved';
var NOT_SUBMITTED_STATUS = 'Not Submitted';
var INTERNAL_BROKER_RECORD_TYPE = 'Internal_Broker';
var CLIENT_FEE_SHARE_RECORD_TYPE = 'Client_Fee_Share';
var EXTERNAL_BROKER_RECORD_TYPE = 'External_Broker';
var DEAL_WIZARD_APP = 'dealWizard';
var EDIT_INVOICE_APP = 'editInvoices';
var EDIT_COMMISSION_ITEMS_APP = 'editCommissionItems';
var EDIT_COMMISSIONS_APP = 'editCommissions';
var LEASE_OTHER_RECORD_TYPE = 'Other';
var MAX_OTT_PROCESSING_ITERATIONS = 20;
var COMMISSION_ITEM_DEFAULT_PERCENT = '0.00000';

app.directive('dealWizard', function($q, appConfig, netSuiteStatusAsync, netSuiteStatusConfig, resourceUrls, remoteActions, invoiceHelper, utils, $timeout) {
    var setTextareaRows = function(field) {
        if (!field) {
            return;
        }

        var minRows = 4,
            rows = 0;

        if (field.value) {
            var lines = field.value.match(/\n/gm);
            if (lines && lines.length) {
                rows = lines.length;
            }
        }

        field.rows = (rows < minRows) ? minRows : rows;
    };

    var convertStringFieldToFieldWrapper = function(object, fieldName, label) {
        if (object) {
            object[fieldName] = {
                label: label,
                value: object[fieldName],
                displayValue: object[fieldName]
            };
        }
    };

    var convertFieldWrappertoStringField = function(object, fieldName) {
        if (object && object[fieldName]) {
            object[fieldName] = object[fieldName].value;
        }
    };

    var setScopeProperties = function(scope) {
        scope.defaultTaxGroup = appConfig.compWrapper.defaultTaxGroup;
        setTextareaRows(scope.billToAddress);

        convertStringFieldToFieldWrapper(scope.propertyDetails, "recordType", "Property Record Type");
        convertStringFieldToFieldWrapper(scope, "recordType", "Deal Type");

        scope.userDateFormat = appConfig.userDateFormat || null;

        scope.maxInvoicesCount = appConfig.defaultInvoiceWrapper ? appConfig.defaultInvoiceWrapper.maxInvoicesCount : 240;
        scope.invoicePaging = scope.maxInvoicesCount;

        scope.pages = [
            'details',
            'commissionItems',
            'parties'
        ];

        if (scope.showRPDealWizard) {
            scope.pages.push('expenses');
            scope.pages.push('invoices');
            scope.pages.push('documents');
        }

        scope.pages.push('summary');
        scope.pages.push('submit');

        scope.page = scope.pages[0];

        scope.submitTemplate = resourceUrls.wizardTemplateBase + '/submit.html';
        scope.documentsTemplate = resourceUrls.wizardTemplateBase + '/documents.html';

        if (scope.pageTemplate) {
            var pageTemplate = (scope.pageTemplate.toLowerCase() === 'consultation') ? 'consultant' : scope.pageTemplate.toLowerCase();

            scope.detailsTemplate = resourceUrls.wizardTemplateBase + '/details-' + pageTemplate + (scope.showRPDealWizard && pageTemplate.toLowerCase() !== 'sale' ? '-rp' : '') + '.html';
            scope.commissionItemsTemplate = (appConfig.appName && !appConfig.isComp && pageTemplate !== 'sale' && pageTemplate !== 'consultant' && pageTemplate !== 'lease')
                ? resourceUrls.wizardTemplateBase + '/commission_items-' + pageTemplate + '-non-comp.html'
                : resourceUrls.wizardTemplateBase + '/commission_items-' + pageTemplate + '.html';
        }
        scope.partiesTemplate = resourceUrls.wizardTemplateBase + '/parties-all.html';
        scope.expensesTemplate = resourceUrls.wizardTemplateBase + '/expenses-all.html';
        scope.approvalsTemplate = resourceUrls.wizardTemplateBase + '/approvals-all.html';
        scope.invoicesTemplate = resourceUrls.wizardTemplateBase + '/invoices-all.html';
        scope.accountingInvoiceTemplate = resourceUrls.wizardTemplateBase + '/accounting_invoice.html';
        scope.proformaInvoiceTemplate = resourceUrls.wizardTemplateBase +
            ((appConfig.appName === EDIT_INVOICE_APP && !appConfig.isComp) ? '/proforma_invoice-non-comp.html' : '/proforma_invoice.html');
        scope.invoiceDefaultsTemplate = resourceUrls.wizardTemplateBase +
            ((appConfig.appName === EDIT_INVOICE_APP && !appConfig.isComp) ? '' : '/invoice_defaults.html');

        scope.displayOTTLeaseTable = checkForOTTLease(scope);
        scope.showConfirmPrimaryBrokerChangeOnPaidInvoices = false;

        scope.mismatchedPropertyTypeField = {
            value: scope.mismatchedPropertyTypeMessage === null ? scope.labels.propertyTypeChanged : scope.labels.updatePropertyType,
            helpText: scope.mismatchedPropertyTypeMessage
        };

        scope.ottErrorMessage = false;
        setApprovalProperties(scope, true);
    };

    var ottLoadingIterations = 0;
    var hideLoaderWhenOTTRendered = function(scope, numMonthlyInvoicesCreated) {
        if (ottLoadingIterations < MAX_OTT_PROCESSING_ITERATIONS
            && numMonthlyInvoicesCreated > 0
            && document.querySelectorAll('#ott-invoices-container tr.ott-invoice-row').length < numMonthlyInvoicesCreated
        ) {
            ottLoadingIterations += 1;
            $timeout(function() {
                hideLoaderWhenOTTRendered(scope, numMonthlyInvoicesCreated);
            }, 1000, scope, numMonthlyInvoicesCreated);
        } else {
            ottLoadingIterations = 0;
            ottInsertCompleted(scope);
        }
    };

    var ottInsertCompleted = function(scope) {
        scope.isLoading = false;
    };

    var buildOTTInvoices = function(scope) {
        var minusOtherConsiderations = 0;
        var numMonthlyInvoicesCreated = 0;

        // create commissions
        for (var j = 0; j < scope.commissionItems.length; j++) {
            var i;
            var item = scope.commissionItems[j];
            var oldItem = scope.initCommissionItems[j];

            // if the amount is overridden, set the amount to the overridden amount so all the math works out
            if (item.overrideCalculations && !isNaN(item.overrideCommissionAmount.value)) {
                item.commissionAmount.value = round(item.overrideCommissionAmount.value, CURRENCY_PRECISION);
            }

            if (scope.ottInvoicesExist()) {
                scope.displayOTTLeaseTable = true;
            }

            // if billing frequency matches but rev rec has changed
            if (oldItem.billingFrequency.value === item.billingFrequency.value
                && oldItem.revenueRecognition.value !== item.revenueRecognition.value) {
                if (scope.visibleAccountingInvoices && scope.visibleAccountingInvoices.length > 0) {
                    for (i = 0; i < scope.visibleAccountingInvoices.length; i++) {
                        if (scope.visibleAccountingInvoices[i].overTheTermCommissionItem.value === item.id && !scope.visibleAccountingInvoices[i].isFlaggedForDelete) {
                            scope.visibleAccountingInvoices[i].recognizeRevenue.value = item.revenueRecognition.value;
                        }
                    }
                }
            }

            // if billing is one time or monthly
            if (item.billingFrequency.value === ONE_TIME_BILLING_FREQUENCY
                || item.billingFrequency.value === MONTHLY_BILLING_FREQUENCY) {
                if (scope.visibleAccountingInvoices && scope.visibleAccountingInvoices.length > 0) {
                    scope.visibleAccountingInvoices.forEach(function(invoice) {
                        if (invoice.overTheTermCommissionItem.value === item.id) {
                            invoice.isFlaggedForDelete = true;
                        }
                    });
                }
            }

            if (item.billingFrequency.value === MONTHLY_BILLING_FREQUENCY && item.recordType === LEASE_RECORD_TYPE) {
                scope.displayOTTLeaseTable = true;

                if (!scope.rentType) {
                    scope.rentType = {value: 'Month'};
                }

                var momentStart = moment(item.startDate.value + " 00:00", scope.userDateFormat + ' hh:mm');
                var momentEnd = moment(item.endDate.value + " 24:00", scope.userDateFormat + ' hh:mm');
                var term = round(momentEnd.diff(momentStart, 'Month', true), CURRENCY_PRECISION);
                var termString = term.toString();
                var commissionAmountDue = parseFloat(item.commissionAmount.value) / term;
                var currentTerm = moment(item.startDate.value + " 00:00", scope.userDateFormat);
                var itemInvoiceMap = []; // map for adjusting invoice totals
                var endTerm;
                var newInvoice;

                for (i = 1; i <= term; i++) {
                    endTerm = moment(currentTerm.format(scope.userDateFormat) + +" 00:00", scope.userDateFormat);
                    newInvoice = createNewInvoice(commissionAmountDue, item, currentTerm.format(scope.userDateFormat), endTerm.add(1, 'Month').format(scope.userDateFormat));
                    currentTerm.add(1, 'Month');
                    scope.invoices.push(newInvoice);
                    itemInvoiceMap.push(newInvoice); // add to list for adjustment later
                }

                var partialTermDays;
                var partialTerm;

                if (termString.indexOf('.00') < 0 && termString.indexOf('.') > 0) {
                    partialTermDays = currentTerm.diff(moment(item.endDate.value + " 00:00", scope.userDateFormat), 'days');
                    partialTerm = term.toString();
                    endTerm = moment(currentTerm.format(scope.userDateFormat) + " 00:00", scope.userDateFormat);
                    endTerm.add(partialTermDays, 'Days');
                    partialTerm = partialTerm.substring(termString.indexOf('.'), termString.length);
                    newInvoice = createNewInvoice(commissionAmountDue * parseFloat(partialTerm), item, currentTerm.format(scope.userDateFormat), endTerm.format(scope.userDateFormat));
                    scope.invoices.push(newInvoice);
                    itemInvoiceMap.push(newInvoice); // add to list for adjustment later
                }

                itemInvoiceMap = adjustInvoiceTotals(itemInvoiceMap, item.commissionAmount.value);
                numMonthlyInvoicesCreated += itemInvoiceMap.length;
            } else if (item.billingFrequency.value === ONE_TIME_BILLING_FREQUENCY && item.recordType === LEASE_RECORD_TYPE) {
                scope.displayOTTLeaseTable = true;
                minusOtherConsiderations += parseFloat(item.commissionAmount.value);
                currentTerm = moment(item.startDate.value + " 00:00", scope.userDateFormat);
                newInvoice = createNewInvoice(item.commissionAmount.value, item, currentTerm.format(scope.userDateFormat), currentTerm.format(scope.userDateFormat));
                scope.invoices.push(newInvoice);
            }
        }

        // delay this so we have time to close overlays since it's so memory intense
        $timeout(function() {
            updateInvoiceClassifications(scope);
            angular.copy(scope.commissionItems, scope.initCommissionItems);
            if (numMonthlyInvoicesCreated > 0) {
                hideLoaderWhenOTTRendered(scope, numMonthlyInvoicesCreated);
            } else {
                ottInsertCompleted(scope);
            }
        }, 500, scope, numMonthlyInvoicesCreated);

        function getItemInvoiceTotal(itemInvoiceMap) {
            var result = 0; // invoice total value to compare item's commission with
            var iInvoice;
            for (var m = itemInvoiceMap.length - 1; m >= 0; m--) {
                // loop item invoices (after the totals are rounded) and add to total
                iInvoice = itemInvoiceMap[m];
                result += parseFloat(iInvoice.commissionAmount.value);
            }

            return result;
        }

        function adjustInvoiceTotals(itemInvoiceMap, itemTotal) {
            // spread the wealth
            itemTotal = parseFloat(itemTotal);
            var n, invoice, checkTotalOffset;
            var commissionOffset = itemTotal - getItemInvoiceTotal(itemInvoiceMap); // get the difference between the totals
            if (commissionOffset > 0) { // add pennies to first invoices going forward
                for (n = 0; n < itemInvoiceMap.length; n++) {
                    invoice = itemInvoiceMap[n];
                    if (commissionOffset > 0) {
                        invoice.commissionAmount.value = parseFloat(invoice.commissionAmount.value) + 0.01;
                        commissionOffset -= .01;
                    }
                    checkTotalOffset = itemTotal - getItemInvoiceTotal(itemInvoiceMap);
                    if (commissionOffset < 0 && checkTotalOffset < 0) {
                        invoice.commissionAmount.value = parseFloat(invoice.commissionAmount.value) - 0.01;
                        break;
                    }
                }
            } else if (commissionOffset < 0) { // subtract pennies from last invoices going backwards
                for (n = itemInvoiceMap.length - 1; n >= 0; n--) {
                    invoice = itemInvoiceMap[n];
                    if (commissionOffset < 0) {
                        invoice.commissionAmount.value = parseFloat(invoice.commissionAmount.value) - 0.01;
                        commissionOffset += .01;
                    }
                    checkTotalOffset = itemTotal - getItemInvoiceTotal(itemInvoiceMap);
                    if (commissionOffset > 0 && checkTotalOffset > 0) {
                        invoice.commissionAmount.value = parseFloat(invoice.commissionAmount.value) + 0.01;
                        break;
                    }
                }
            }

            return itemInvoiceMap;
        }

        function createNewInvoice(commissionAmount, commissionItem, specificInvoiceDate, endDate) {
            var newInvoice = invoiceHelper.createNewInvoice(scope, false);
            newInvoice.description.value = commissionItem.description.value;
            newInvoice.recognizeRevenue.value = commissionItem.revenueRecognition.value;
            newInvoice.commissionPercent.value = null;
            newInvoice.commissionPercentActual.value = null;
            newInvoice.commissionAmount.value = setAsCurrency(commissionAmount);
            newInvoice.commissionAmount.displayValue = setAsCurrency(newInvoice.commissionAmount.value);
            newInvoice.specificInvoiceDate.value = specificInvoiceDate;
            newInvoice.termStartDate.value = specificInvoiceDate;
            newInvoice.termEndDate.value = endDate;
            newInvoice.overTheTermCommissionItem.value = commissionItem.id;
            newInvoice.isProForma = false;
            if (scope.useDefaultForOTTInvoices.value) {
                newInvoice.useDefaultValues.value = true;
                newInvoice.nsBillTo = scope.defaultNetsuiteBillTo;
                newInvoice.aptoBillTo = scope.billTo;
                newInvoice.billToAddress = scope.billToAddress;
                newInvoice.paymentTerms.value = scope.defaultPaymentTerms.value;
                newInvoice.invoiceTemplate.value = scope.defaultInvoiceTemplate.value;
                newInvoice.attention.value = scope.defaultAttention.value;
            }
            return newInvoice;
        }

        cleanUpInvoices(scope);
    };

    var cleanUpInvoices = function(scope) {
        if (scope.invoices && scope.invoices.length > 0) {
            for (i = scope.invoices.length - 1; i >= 0;  i--) {
                var invoice = scope.invoices[i];
                if (!invoice.id && invoice.isFlaggedForDelete) {
                    scope.invoices.splice(i, 1);
                }
            }
        }
    };

    var setApprovalProperties = function(scope, skipToSummary) {
        scope.underReviewMsg = null;
        if ((!scope.approvalStatus || scope.approvalStatus.value === null) && scope.appName === EDIT_INVOICE_APP) {
            scope.approvalStatus.value = scope.isApprovedDeal ? APPROVED_STATUS : NOT_SUBMITTED_STATUS;
        }
        if (!scope.canPerformAdminAdjustments && scope.isCurrentApprover && scope.approvalStatus.value !== NOT_SUBMITTED_STATUS && scope.appName !== DEAL_WIZARD_APP) {
            scope.underReviewMsg = scope.labels.cannotModifyPipelineRecord;
            scope.hideAllSaveButtons = true;
        }
        if (scope.isComp) {

            scope.renderApproval = scope.approvalStatus.value !== APPROVED_STATUS || scope.isCurrentApprover;
            if (!scope.underReviewMsg) {
                scope.underReviewMsg = scope.canPerformAdminAdjustments
                    ? null
                    : scope.isCurrentApprover && scope.approvalStatus.value !== APPROVED_STATUS && scope.showRPDealWizard && scope.approvalStarted && scope.appName === DEAL_WIZARD_APP
                        ? scope.labels.pleaseReview
                        : !scope.isCurrentApprover
                            ? scope.labels.underReview
                            : null
                ;
            }
            scope.isRecordsLocked = false;

            if (scope.underReviewMsg === scope.labels.underReview) {
                scope.hideAllSaveButtons = true;
            }

            if (scope.approvalStatus.value !== NOT_SUBMITTED_STATUS || scope.isPrintMode) {
                if (skipToSummary
                    && (scope.isPrintMode || scope.approvalStatus.value !== 'Under Review by Local Revenue Processor')) {
                    scope.isSummary = true;
                    scope.page = 'summary';
                }

                scope.isRecordsLocked = !scope.showRPDealWizard && !scope.isCurrentApprover;
            }

            scope.approved = scope.approvalStatus.value;
            scope.removeEditLink = scope.approvalStatus.value !== NOT_SUBMITTED_STATUS && scope.appName !== DEAL_WIZARD_APP;
            scope.disabled = !appConfig.appName && ((!scope.showRPDealWizard && scope.isStatusApprovedOrUnderReview) || (!scope.showRPDealWizard && !scope.isCurrentApprover));
            // lock the wizard if the comp is approved or in approval process and the user is not rp or approver
            scope.disableSave = (!scope.showRPDealWizard && scope.isStatusApprovedOrUnderReview) || (!scope.showRPDealWizard && !scope.isCurrentApprover);
            scope.isSubmit = false;
        }
    };

    var checkForOTTLease = function(scope) {
        var i;

        if (scope.recordType.value !== LEASE_RECORD_TYPE) {
            return false;
        }

        if (scope.invoices && scope.invoices.length > 0) {
            for (i in scope.invoices) {
                if (scope.invoices.hasOwnProperty(i)
                    && scope.invoices[i].overTheTermCommissionItem
                    && scope.invoices[i].overTheTermCommissionItem.value !== null
                    && scope.invoices[i].overTheTermCommissionItem.value !== '') {
                    return true;
                }
            }
        }

        return false;
    };

    var checkDocumentValues = function(scope) {

        if (appConfig.appName === EDIT_COMMISSION_ITEMS_APP) {
            return;
        }

        scope.documentStatus = scope.labels.docsIncomplete;

        if (scope.feeAgreement.value && scope.cobrokerAgreement.value && scope.dealAgreements.value && scope.trustEscrowAgreement.value) {
            if (scope.dealTotal < 50000) {
                if (scope.feeAgreement.value === 'Yes'
                || scope.feeAgreement.value === 'MD Approval'
                || scope.feeAgreement.value === 'AYCI CFO Approval') {
                    scope.documentStatus = scope.labels.docsComplete;
                }
            }

            if (scope.dealTotal >= 50000) {
                if ((scope.feeAgreement.value === 'Yes'
                || scope.feeAgreement.value === 'AYCI CFO Approval')
                && scope.dealAgreements.value === 'Yes'
                && (scope.cobrokerAgreement.value === 'Yes'
                    || scope.cobrokerAgreement.value === 'N/A')) {
                    scope.documentStatus = scope.labels.docsComplete;
                }
            }
        }

        scope.setAllRPRequiredFields();
    };

    var watchBillTo = function(scope) {
        scope.$watch(
            'billTo.value',
            function(newAccountId, oldAccountId) {
                if (equals(newAccountId, oldAccountId) || scope.defaultNetsuiteBillTo.formattedAddress) {
                    return;
                }

                if (!newAccountId || newAccountId === '000000000000000') {
                    scope.billToAddress.value = '';
                    return;
                }

                remoteActions.getAccountAddress(newAccountId)
                    .then(function(result) {
                        if (result.error) {
                            scope.errorMessage = result.error;
                        } else if (!hasValue(scope.defaultNetsuiteBillTo.value) || !hasValue(scope.billToAddress.value)) {
                            scope.billToAddress.value = result;
                        }
                    })
                ;
            }
        )
    };

    var watchBroker = function(scope) {
        var unbindWatch = scope.$watch(
            'brokers',
            function(newBrokers, oldBrokers) {
                if (equals(newBrokers, oldBrokers)) {
                    return;
                }
                unbindWatch();
                confirmPrimaryBrokerChange(scope, newBrokers, oldBrokers);
                calculateCommission(scope, newBrokers, oldBrokers);
                setPrimaryBroker(scope);
                setBrokerRequiredFields(newBrokers);
                setHoldbackBrokerOptions(scope);
                setBonusRecipientOptions(scope);
                setBrokerRoleOptions(scope);
                watchBroker(scope);
            },
            true
        );
    };

    var watchPrimaryBroker = function(scope) {
        var unbindWatch = scope.$watch(
            'primaryBroker',
            function(newBroker, oldBroker) {
                if (equals(newBroker, oldBroker)) {
                    return;
                }
                unbindWatch();
                // add other logic here
                watchPrimaryBroker(scope);
            }
        )
    };

    var setRentTypeFieldValidation = function(newRentType, scope) {
        for (var i in scope.commissionItems) {
            if (scope.commissionItems.hasOwnProperty(i)) {
                var commissionItem = scope.commissionItems[i];
                setFieldsValidation(commissionItem, newRentType);
            }
        }
    };

    var setFieldsValidation = function(commissionItem, newRentType) {
        if ((newRentType === 'Amount/Year' || newRentType==='Amount/Month') && !(commissionItem.rateType.displayValue === 'Commission/SF/Period' || commissionItem.rateType.displayValue === 'Commission/SF')) {
            commissionItem.squareFootage.isRequired = false;
        } else {
            commissionItem.squareFootage.isRequired = true;
        }
        commissionItem.quantity.isRequired = true;
        commissionItem.amount.isRequired = true;
    }

    var setRateTypeFieldValidation = function(newCommissionItems, scope, index) {
        if (newCommissionItems.hasOwnProperty(index)) {
            var commissionItem = newCommissionItems[index];
            if (commissionItem.rateType.displayValue === 'Flat Fee') {
                commissionItem.commissionRate.isRequired = true;
                setFieldsValidation(commissionItem, scope.rentType.displayValue);
            } else if (commissionItem.rateType.displayValue === 'Commission/SF') {
                commissionItem.commissionRate.isRequired = true;
                commissionItem.squareFootage.isRequired = true;
            } else if (commissionItem.rateType.displayValue === 'Commission/SF/Period') {
                commissionItem.quantity.isRequired = true;
                commissionItem.squareFootage.isRequired = true;
                commissionItem.commissionRate.isRequired = true;
            } else if (commissionItem.rateType.displayValue === '% of Total') {
                setFieldsValidation(commissionItem, scope.rentType.displayValue);
            }
        }
    };

    var confirmPrimaryBrokerChange = function(scope, newBrokers, oldBrokers) {

        if (scope.ignorePrimaryBrokerChanges === true) {
            scope.ignorePrimaryBrokerChanges = false;
            return;
        }

        var promises = [];
        newBrokers.forEach(function(broker) {
            var promise = remoteActions.getBrokerInfo(broker.broker.value);
            promises.push(promise);
        });

        $q.all(promises).then(function(results) {
            scope.oldBrokers = angular.copy(oldBrokers);

            for (var i = 0; i < newBrokers.length; i++) {
                if (results[i]) {
                    newBrokers[i].subsidiaryId = results[i].subsidiaryId;
                    newBrokers[i].costCenter = results[i].costCenter;
                }
            }

            var newPrimaryBroker = {};
            var oldPrimaryBroker = {};

            newBrokers.forEach(function(broker) {
                if (isValueTrue(broker.primaryBroker.value)) {
                    newPrimaryBroker = broker;
                }
            });

            scope.oldBrokers.forEach(function(broker) {
                if (isValueTrue(broker.primaryBroker.value)) {
                    oldPrimaryBroker = broker;
                }
            });

            var currentInvoices = [];
            scope.invoices.forEach(function(invoice) {
                if (!invoice.isFlaggedForDelete) {
                    currentInvoices.push(invoice);
                }
            });

            if (currentInvoices.length > 0) {
                var invoicesHavePayments = false;
                currentInvoices.forEach(function(invoice) {
                    if (invoice.amountPaid && parseFloat(invoice.amountPaid.value) > 0) {
                        invoicesHavePayments = true;
                    }
                });

                if (oldPrimaryBroker.subsidiaryId && oldPrimaryBroker.subsidiaryId !== null && oldPrimaryBroker.subsidiaryId !== newPrimaryBroker.subsidiaryId) {
                    if (invoicesHavePayments) {
                        scope.showConfirmPrimaryBrokerChangeOnPaidInvoices = true;
                    } else {
                        scope.showConfirmPrimaryBrokerChange = true;
                    }
                }
            }
        });
    };

    var setBrokerRequiredFields = function(newBrokers) {
        if (!newBrokers || !newBrokers.length) {
            return;
        }

        // external brokers needs to have either the brokerContact or the client field set
        newBrokers.forEach(function(broker) {
            broker.brokerContact.isRequired = !broker.client.displayValue;
            broker.client.isRequired = !broker.brokerContact.displayValue;
        });
    };

    function checkIfExistsAndThenAdd(value, collection) {
        var result = false;
        if (collection.length === 0) {
            collection.push(value);
        } else {
            for (var i = 0; i < collection.length; i++) {
                var existingValue = collection[i];
                if (existingValue.indexOf(value) !== -1) {
                    result = true;
                }
            }

            if (result === false) {
                collection.push(value);
            }
        }

        return result;
    }

    var checkForDuplicateBrokers = function(scope) {
        var dupeBrokerResult = false;
        var brokerKeys = [];
        if (scope.brokers && scope.brokers.length) {
            scope.brokers.forEach(function(broker) {
                if (!broker.isFlaggedForDelete) {
                    var brokerContact = broker.brokerContact ? broker.brokerContact.value : undefined;
                    var brokerClient = broker.client ? broker.client.value : undefined;
                    var brokerBroker = broker.broker ? broker.broker.value : undefined;
                    var brokerKey = broker.recordType + brokerContact + brokerClient + brokerBroker;
                    if (checkIfExistsAndThenAdd(brokerKey, brokerKeys)) {
                        dupeBrokerResult = true;
                    }
                }
            });
        }

        return dupeBrokerResult;
    };

    var setBrokerRoleOptions = function(scope) {
        scope.brokers.forEach(function(brokerWrapper) {
            var options = [], i;
            if (brokerWrapper.role && brokerWrapper.role.options.length) {
                for (i = 0; i < brokerWrapper.role.options.length; i++) {
                    if (brokerWrapper.recordType === CLIENT_FEE_SHARE_RECORD_TYPE && brokerWrapper.role.options[i].value === 'Client Fee Share') {
                        options.push(brokerWrapper.role.options[i]);
                    } else if (brokerWrapper.recordType !== CLIENT_FEE_SHARE_RECORD_TYPE && brokerWrapper.role.options[i].value !== 'Client Fee Share') {
                        options.push(brokerWrapper.role.options[i]);
                    }
                }
                brokerWrapper.role.options = options;
            }
        });
    };

    var setHoldbackBrokerOptions = function(scope) {
        var options = [];
        var optionsValues = [];     // array to track values to prevent duplicate entries

        scope.brokers.forEach(function(brokerWrapper) {
            if (brokerWrapper.recordType === INTERNAL_BROKER_RECORD_TYPE && !brokerWrapper.isFlaggedForDelete
                && brokerWrapper.broker && brokerWrapper.broker.displayValue && brokerWrapper.broker.value
                && !optionsValues.includes(brokerWrapper.broker.value.substr(0, 15))) {
                optionsValues.push(brokerWrapper.broker.value.substr(0, 15));
                options.push({
                    displayValue: brokerWrapper.broker.displayValue,
                    value: brokerWrapper.broker.value
                });
            }
        });

        options.sort(function(a, b) {
            return a.displayValue > b.displayValue;
        });

        if (appConfig.defaultHoldbackWrapper) {
            if (equals(options, appConfig.defaultHoldbackWrapper.broker.options)) {
                return;
            }
        } else {
            return;
        }

        appConfig.defaultHoldbackWrapper.broker.options = options;
        $timeout(function() {
            scope.$apply(function() {
                scope.holdbacks.forEach(function(holdback) {
                    if (holdback.broker) {

                        holdback.broker.options = options;

                        if (holdback.broker.value) {
                            for (var i = 0; i < options.length; i++) {
                                if (holdback.broker.value.substr(0, 15) === options[i].value.substr(0, 15)) {
                                    return;
                                }
                            }

                            // if the selected broker is no longer an available option, clear values
                            holdback.broker.displayValue = '';
                            holdback.broker.value = '';
                        }
                    }
                });
            });
        }, 0);
    };

    var setPrimaryBroker = function(scope) {
        var primaryBroker = null;

        for (var i = 0; i < scope.brokers.length; i++) {
            var broker = scope.brokers[i];
            if (!broker.isFlaggedForDelete && isValueTrue(broker.primaryBroker.value)) {
                primaryBroker = broker;
                break;
            }
        }

        if (primaryBroker !== scope.primaryBroker) {
            scope.primaryBroker = primaryBroker;
            if (!scope.previousPrimaryBroker) {
                scope.previousPrimaryBroker = angular.copy(scope.primaryBroker);
            }

            if (scope.primaryBroker) {
                scope.primaryBroker.cachedValues = angular.copy(scope.primaryBroker.broker);
            }
        }
    };

    var setBonusRecipientOptions = function(scope) {
        var subsidiaryIds = [];
        scope.brokers.forEach(function(brokerWrapper) {
            if (!brokerWrapper.isFlaggedForDelete && brokerWrapper.broker && brokerWrapper.broker.value
                && brokerWrapper.subsidiaryId && !subsidiaryIds.includes(brokerWrapper.subsidiaryId)) {
                subsidiaryIds.push(brokerWrapper.subsidiaryId);
            }
        });

        if (subsidiaryIds.length > 0) {
            subsidiaryIds.sort();
            remoteActions.getBonusRecipientOptions(subsidiaryIds)
                .then(function(result) {

                    if (result.error) {
                        scope.errorMessage = result.error;
                        return;
                    }

                    appConfig.defaultHoldbackWrapper.bonusRecipient.options = result;
                    scope.holdbacks.forEach(function(holdback) {
                        holdback.bonusRecipient.options = result;
                        if (result === null || result.length === 0 || !holdback.bonusRecipient.value) {
                            holdback.bonusRecipient.displayValue = null;
                            holdback.bonusRecipient.value = null;
                            return;
                        }

                        for (var i = 0; i < result.length; i++) {
                            if (holdback.bonusRecipient.value.substr(0, 15) === result[i].value.substr(0, 15)) {
                                return;
                            }
                        }

                        // if the selected bonus recipient is no longer an available option, clear values
                        holdback.bonusRecipient.displayValue = null;
                        holdback.bonusRecipient.value = null;
                    });
                });
        } else {
            if (appConfig.defaultHoldbackWrapper !== undefined) {
                appConfig.defaultHoldbackWrapper.bonusRecipient.options = null;
            }
            if (scope.holdbacks !== undefined) {
                scope.holdbacks.forEach(function(holdback) {
                   holdback.bonusRecipient.options = null;
                   holdback.bonusRecipient.displayValue = null;
                   holdback.bonusRecipient.value = null;
               });
            }
        }
    };

    var calculateCommission = function(scope, newBrokers, oldBrokers) {
        var brokerToUpdate;
        var currentDefaultBroker;
        var internalBrokersAllPercent = true;
        var i;
        var newBrokerWrapper;
        var oldBrokerWrapper;

        scope.internalPartyCommission.amount = 0;
        scope.internalPartyCommission.percent = 0;
        scope.ayBrokerAllocation.amount = 0;
        scope.ayBrokerAllocation.percent = 0;
        scope.externalPartyCommission.amount = 0;
        scope.externalPartyCommission.percent = 0;

        if (!newBrokers) {
            newBrokers = [];
        }
        if (!oldBrokers) {
            oldBrokers = [];
        }

        for (i = 0; i < newBrokers.length; i++) {
            newBrokerWrapper = newBrokers[i];
            oldBrokerWrapper = oldBrokers[i];

            //Do not calculate deleted brokers
            if (newBrokerWrapper.isFlaggedForDelete) { continue; }

            if (newBrokerWrapper.recordType === INTERNAL_BROKER_RECORD_TYPE) {
                if (oldBrokerWrapper && isValueTrue(oldBrokerWrapper.primaryBroker.value)) {
                    currentDefaultBroker = newBrokerWrapper;
                }
            } else {
                if (newBrokerWrapper.commissionType === "Percent") {
                    newBrokerWrapper.commissionAmount.value = setAsCurrency((parseFloat(newBrokerWrapper.commissionPercent.value || 0) / 100 * scope.totalCommission.value));
                    newBrokerWrapper.commissionAmount.displayValue = setAsCurrency(newBrokerWrapper.commissionAmount.value);
                } else {
                    newBrokerWrapper.commissionPercent.value = round(((newBrokerWrapper.commissionAmount.value || 0) / scope.totalCommission.value * 100), PERCENT_PRECISION);
                    newBrokerWrapper.commissionPercent.displayValue = newBrokerWrapper.commissionPercent.value.toString();
                }

                newBrokerWrapper.actualPercent = newBrokerWrapper.commissionPercent.value;
                scope.externalPartyCommission.amount += round(newBrokerWrapper.commissionAmount.value || 0, CURRENCY_PRECISION);
            }
        }

        scope.externalPartyCommission.percent = round(((scope.externalPartyCommission.amount / scope.totalCommission.value) * 100), PERCENT_PRECISION);

        var internalBrokers = [];
        var externalBrokers = [];
        for (i = 0; i < newBrokers.length; i++) {
            newBrokerWrapper = newBrokers[i];
            oldBrokerWrapper = oldBrokers[i];

            //Do not calculate deleted brokers
            if (newBrokerWrapper.isFlaggedForDelete) { continue; }

            if (newBrokerWrapper.recordType !== INTERNAL_BROKER_RECORD_TYPE) {
                externalBrokers.push(newBrokerWrapper);
                continue;
            }
            internalBrokers.push(newBrokerWrapper);

            if (isValueTrue(newBrokerWrapper.primaryBroker.value)
                && oldBrokerWrapper
                && !oldBrokerWrapper.primaryBroker.value
                && currentDefaultBroker !== newBrokerWrapper
                && currentDefaultBroker) {
                currentDefaultBroker.primaryBroker.value = false;
            }

            if (newBrokerWrapper.commissionType === "Percent") {
                newBrokerWrapper.commissionAmount.value = setAsCurrency(parseFloat(newBrokerWrapper.commissionPercent.value ? newBrokerWrapper.commissionPercent.value : 0) / 100 * (scope.totalCommission.value - scope.externalPartyCommission.amount));
                newBrokerWrapper.commissionAmount.displayValue = setAsCurrency(newBrokerWrapper.commissionAmount.value);
            } else {
                newBrokerWrapper.commissionPercent.value = round(parseFloat(newBrokerWrapper.commissionAmount.value ? newBrokerWrapper.commissionAmount.value : 0) / (scope.totalCommission.value - scope.externalPartyCommission.amount) * 100, PERCENT_PRECISION);
                newBrokerWrapper.commissionPercent.displayValue = newBrokerWrapper.commissionPercent.value.toString();
            }

            // if there are external brokers then do some match to figure out the actual percent. otherwise the actual percent is the commission percent.
            newBrokerWrapper.actualPercent = (scope.externalPartyCommission.percent > 0)
                ? round(parseFloat(newBrokerWrapper.commissionAmount.value) / scope.totalCommission.value * 100, PERCENT_PRECISION)
                : newBrokerWrapper.commissionPercent.value;

            scope.internalPartyCommission.amount += round(newBrokerWrapper.commissionAmount.value || 0, CURRENCY_PRECISION);
            scope.internalPartyCommission.percent += round(newBrokerWrapper.actualPercent || 0.0, PERCENT_PRECISION);
            scope.ayBrokerAllocation.amount += round(newBrokerWrapper.commissionAmount.value || 0.0, CURRENCY_PRECISION);
            scope.ayBrokerAllocation.percent += round(newBrokerWrapper.commissionPercent.value || 0.0, PERCENT_PRECISION);
        }

        scope.dealTotal = scope.internalPartyCommission.amount + scope.externalPartyCommission.amount;

        scope.internalPartyCommission.amount = round(scope.internalPartyCommission.amount, CURRENCY_PRECISION);
        scope.ayBrokerAllocation.amount = round(scope.ayBrokerAllocation.amount, CURRENCY_PRECISION);
        scope.internalPartyCommission.percent = round(((scope.internalPartyCommission.amount / scope.totalCommission.value) * 100), PERCENT_PRECISION);
        scope.dealTotal = round(scope.dealTotal, CURRENCY_PRECISION);
    };

    var preventPropertyMismatchRecursion = false;
    var watchPropertySold = function(scope) {
        scope.$watch(
            'property.value',
            function(newPropertyId, oldPropertyId) {
                if (newPropertyId === oldPropertyId) {
                    return;
                }
                if (!newPropertyId || newPropertyId === '000000000000000') {
                    scope.propertyDetails.address.value = '';
                    scope.propertyDetails.recordType.value = '';
                    scope.propertyType.value = '';
                    return;
                }
                if (!preventPropertyMismatchRecursion) {
                    preventPropertyMismatchRecursion = true;
                    setMismatchedPropertyTypeFieldLabel(scope, true);
                    scope.mismatchedPropertyTypeField.helpText = '';
                    scope.propertyType.value = '';
                    scope.propertyTypeMismatch = true;
                } else {
                    preventPropertyMismatchRecursion = false;
                }
                remoteActions.getPropertyDetails(newPropertyId).then(function(result) {
                    if (result.error) {
                        scope.errorMessage = result.error;
                    } else {
                        scope.propertyDetails.address.value = result.address.value;
                        scope.propertyDetails.recordType.value = result.recordType;
                        scope.acreage.value = result.acreage.value;
                        scope.squareFootage.value = result.squareFootage.value;
                        if (!scope.squareFootage.value) {
                            scope.squareFootage.value = scope.propertyDetails.squareFootage.value;
                        }
                    }
                });
            }
        )
    };

    var preventSpaceMismatchRecursion = false;
    var watchSpace = function(scope) {
        scope.$watch(
            'space.value',
            function(newSpaceId, oldSpaceId) {
                if (newSpaceId === oldSpaceId) {
                    return;
                }
                if (!newSpaceId || newSpaceId === '000000000000000') {
                    scope.propertyType.value = '';
                    return;
                }
                if (!preventSpaceMismatchRecursion) {
                    preventSpaceMismatchRecursion = true;
                    setMismatchedPropertyTypeFieldLabel(scope, true);
                    scope.mismatchedPropertyTypeField.helpText = '';
                    scope.propertyTypeMismatch = true;
                    scope.propertyType.value = '';
                } else {
                    preventSpaceMismatchRecursion = false;
                }
                remoteActions.getSpaceWrapper(newSpaceId).then(function(result) {
                    if (result) {
                        if (result.error) {
                            scope.errorMessage = result.error;
                        } else {
                            scope.squareFootage.value = result.squareFootage;
                            scope.suiteFloorNumber.value = result.suiteFloorNumber;
                        }
                    }
                });
            }
        );
    };

    var watchCommissionItems = function(scope) {
        scope.$watch(
            'commissionItems',
            function(newCommissionItems, oldCommissionItems) {
                if (equals(newCommissionItems, oldCommissionItems)) {
                    return;
                }

                calculateCommissionItems(scope);
                calculateCommission(scope, scope.brokers, scope.brokers);
                scope.dealTotal = scope.internalPartyCommission.amount + scope.externalPartyCommission.amount;
            }, true
        );
    };

    var updateCompWrapperFromScope = function(scope, doConvertFields) {
        for (var key in appConfig.compWrapper) {
            if (appConfig.compWrapper.hasOwnProperty(key)) {
                appConfig.compWrapper[key] = angular.copy(scope[key]);
            }
        }

        utils.setUserLocale(appConfig.userLocale);
        setVisibleHoldbacks(scope);

        if (doConvertFields === undefined || doConvertFields) {
            convertFieldWrappertoStringField(appConfig.compWrapper, "recordType");
            convertFieldWrappertoStringField(appConfig.compWrapper.propertyDetails, "recordType");
        }

    };

    var setMismatchedPropertyTypeFieldLabel = function(scope, saveState) {
        if (saveState) {
            scope.mismatchedPropertyTypeField.value = scope.labels.propertyTypeChanged;
        } else {
            scope.mismatchedPropertyTypeField.value = scope.labels.updatePropertyType;
        }
    };

    var updateScopeFromCompWrapper = function(scope, compWrapper) {
        setAllFieldsToNotRequired(compWrapper);
        setCommissionItemsRequiredFields(compWrapper);
        setMismatchedPropertyTypeFieldLabel(scope, compWrapper.mismatchedPropertyTypeMessage !== null ? false : true);
        scope.mismatchedPropertyTypeField.helpText = compWrapper.mismatchedPropertyTypeMessage || '';
        for (var key in compWrapper) {
            if (compWrapper.hasOwnProperty(key)) {
                scope[key] = angular.copy(compWrapper[key]);
            }
        }
        invoiceHelper.initFields(scope.invoices);
        convertStringFieldToFieldWrapper(scope.propertyDetails, "recordType", "Property Record Type");
        convertStringFieldToFieldWrapper(scope, "recordType", "Deal Type");
    };

    // angular.equals method and helper methods, adjusted to allow equality based on coercion.
    /* eslint-disable eqeqeq */
    var equals = function(o1, o2) {
        if (o1 == o2) {
            return true;
        }
        if (o1 === null || o2 === null) {
            return (o1 === "" && o2 === null || o1 === null && o2 === "");  // consider null equal to an empty string
        }
        if (o1 !== o1 && o2 !== o2) {   // NaN === NaN
            return true;
        }
        var t1 = typeof o1, t2 = typeof o2, length, key, keySet;
        if (t1 == t2) {
            if (t1 == 'object') {
                if (angular.isArray(o1)) {
                    if (!angular.isArray(o2)) {
                        return false;
                    }
                    if ((length = o1.length) == o2.length) {
                        for (key=0; key<length; key++) {
                            if (!equals(o1[key], o2[key])) {
                                return false;
                            }
                        }
                        return true;
                    }
                } else if (angular.isDate(o1)) {
                    return angular.isDate(o2) && o1.getTime() == o2.getTime();
                } else if (isRegExp(o1) && isRegExp(o2)) {
                    return o1.toString() == o2.toString();
                } else {
                    if (isScope(o1) || isScope(o2) || isWindow(o1) || isWindow(o2) || angular.isArray(o2)) {
                        return false;
                    }
                    keySet = {};
                    for (key in o1) {
                        if (!o1.hasOwnProperty(key) || key.charAt(0) === '$' || angular.isFunction(o1[key])) {
                            continue;
                        }
                        if (!equals(o1[key], o2[key])) {
                            return false;
                        }
                        keySet[key] = true;
                    }
                    for (key in o2) {
                        if (!o2.hasOwnProperty(key)) {
                            continue;
                        }
                        if (!keySet.hasOwnProperty(key) &&
                            key.charAt(0) !== '$' &&
                            o2[key] !== undefined &&
                            !angular.isFunction(o2[key])) {
                                return false;
                        }
                    }
                    return true;
                }
            }
        }
        if (o1 && o2) {
            if (o1.length === 18 && o2.length === 15 || o1.length === 15 && o2.length === 18) { // added logic to test equality of ids
                return o1.substr(0, 15) === o2.substr(0, 15);
            }
            if (o1 === "true" && o2 === true || o1 === "false" && o2 === false
                || o2 === "true" && o1 === true || o2 === "false" && o1 === false) {    // compare string to boolean
                return true;
            }
        }
        return false;
    };

    var isScope = function(obj) {
        return obj && obj.$evalAsync && obj.$watch;
    };

    var isWindow = function(obj) {
        return obj && obj.document && obj.location && obj.alert && obj.setInterval;
    };

    var isRegExp = function(value) {
        return toString.call(value) === '[object RegExp]';
    };
    /* eslint-enable eqeqeq */

    var isScopeChanged = function(scope, compWrapper) {
        for (var key in compWrapper) {
            if (key !== 'approvalMessage'
                && compWrapper.hasOwnProperty(key)
                && !equals(compWrapper[key], scope[key])) {
                return true;
            }
        }

        return false;
    };

    var setAllFieldsToNotRequired = function(wrapper) {
        var holdbackFieldsToIgnore = ['amount', 'type'];
        var fieldsToIgnore = ['brokers', 'holdbacks', 'invoices'];
        for (var key in wrapper) {
            if (!wrapper.hasOwnProperty(key) || fieldsToIgnore.includes(key)) {
                continue;
            }

            if (wrapper.objectName && wrapper.objectName === 'holdbackWrapper' && holdbackFieldsToIgnore.includes(key)) {
                continue;
            }

            if (key === 'isRequired') {
                wrapper[key] = false;
            } else {
                var value = wrapper[key];
                if (value !== null && typeof value === 'object') {
                    setAllFieldsToNotRequired(value);
                }
            }
        }
    };

    var setCommissionItemsRequiredFields = function(wrapper) {
        if (wrapper && wrapper.commissionItems && wrapper.commissionItems.length) {
            for (var i = 0; i < wrapper.commissionItems.length; i++) {
                setCommissionItemsRequiredFields(wrapper.commissionItems[i]);
            }
        } else if (wrapper) {
            if (wrapper.rateType) {
                wrapper.rateType.isRequired = true;
            }
            if (wrapper.description) {
                wrapper.description.isRequired = true;
            }
            if (wrapper.commissionPercent) {
                wrapper.commissionPercent.isRequired = true;
            }
            if (wrapper.startDate && wrapper.recordType === LEASE_RECORD_TYPE) {
                wrapper.startDate.isRequired = true;
            }
            if (wrapper.endDate && wrapper.recordType === LEASE_RECORD_TYPE) {
                wrapper.endDate.isRequired = true;
            }
            if (wrapper.commissionRate) {
                wrapper.commissionRate.isRequired = true;
            }
        }
    };

    var round = function(value, decimals) {
        value = parseFloat(value);
        var threshold = Number(1 + 'e-' + (decimals + 1));
        if (Math.abs(value) < threshold) {
            return 0;
        }
        return Number(Math.round(value+'e'+decimals)+'e-'+decimals);
    };

    var setAsCurrency = function(value) {
        var num = Number(value);
        return isNaN(num) ? value : round(num, CURRENCY_PRECISION).toFixed(2);
    };

    var calculateCommissionItems = function(scope) {
        if (appConfig.appName === EDIT_COMMISSIONS_APP) {
            return;
        }

        scope.totalConsideration.value = 0;
        scope.totalCommission.value = 0;
        scope.totalYears.value = 0;

        scope.commissionItems.forEach(function(item) {
            if (!item.isFlaggedForDelete) {
                var isLease = item.recordType.toLowerCase() === LEASE_RECORD_TYPE.toLowerCase();
                var isSale = item.recordType.toLowerCase() === SALE_RECORD_TYPE.toLowerCase();
                var commissionRate = (item.commissionRate.value === null) ? 0 : item.commissionRate.value;
                var amount = (item.amount.value === null) ? 0 : parseFloat(item.amount.value);
                var quantity = (item.quantity.value === null) ? 0 : parseFloat(item.quantity.value);
                var commissionPercent = (item.commissionPercent.value === null) ? 0 : parseFloat(item.commissionPercent.value);
                var squareFootage = (scope.squareFootage.value === null) ? 0 : parseFloat(scope.squareFootage.value);
                if (isLease) {
                    squareFootage = (item.squareFootage.value === null) ? 0 : parseFloat(item.squareFootage.value);
                } else {
                    item.squareFootage.value = squareFootage;
                }

                var considerationAmount = 0.00;
                if (scope.rentType.value === '$/SF/Year' || scope.rentType.value === '$/SF/Month') {
                    item.total.value = amount * squareFootage * item.quantity.value;
                } else {
                    item.total.value = amount * item.quantity.value;
                }

                if (item.overrideConsiderations) {
                    considerationAmount += isNaN(item.overrideTotal.value)
                        ? 0.00
                        : round(item.overrideTotal.value, CURRENCY_PRECISION);
                } else {
                    considerationAmount = (isLease) ? item.total.value : amount;
                    considerationAmount = isNaN(considerationAmount) ? 0.00 : considerationAmount;
                }

                if (item.rateType.value === 'Flat Fee') {
                    item.commissionAmount.value = commissionRate;
                    item.commissionPercent.value = item.commissionPercent.value === COMMISSION_ITEM_DEFAULT_PERCENT ? item.commissionPercent.value : null; // if it was 0.00000 leave it 0.00000 otherwise make it null to prevent managed package error [clarity-1716]
                } else if (item.rateType.value === '% of Total') {
                    item.commissionAmount.value = considerationAmount * commissionPercent * .01;
                    item.commissionRate.value = null;
                } else if (item.rateType.value === 'Amount/SF') {
                    item.commissionAmount.value = squareFootage * commissionRate;
                    item.commissionPercent.value = item.commissionPercent.value === COMMISSION_ITEM_DEFAULT_PERCENT ? item.commissionPercent.value : null; // if it was 0.00000 leave it 0.00000 otherwise make it null to prevent managed package error [clarity-1716]
                } else if (item.rateType.value === 'Amount/SF/Period') {
                    item.commissionAmount.value = squareFootage * commissionRate * parseFloat(item.quantity.value);
                    item.commissionPercent.value = item.commissionPercent.value === COMMISSION_ITEM_DEFAULT_PERCENT ? item.commissionPercent.value : null; // if it was 0.000000 leave it 0.00000 otherwise make it null to prevent managed package error [clarity-1716]
                }

                item.commissionAmount.value = setAsCurrency(item.commissionAmount.value);
                item.commissionAmount.displayValue = setAsCurrency(item.commissionAmount.value);

                if (item.recordType !== 'Other') {
                    var totalYearsMonthValue = parseFloat(item.quantity.value) + parseFloat(scope.totalYears.value);
                    if (isNumber(totalYearsMonthValue)) {
                        scope.totalYears.value = round(totalYearsMonthValue, CURRENCY_PRECISION);
                    }
                }

                var overrideItemCommissionAmount = isNaN(item.overrideCommissionAmount.value) ? 0 : parseFloat(item.overrideCommissionAmount.value);
                var itemCommissionAmount = isNaN(item.commissionAmount.value) ? 0 : parseFloat(item.commissionAmount.value);

                scope.totalCommission.value += (item.overrideCalculations)
                    ? round(overrideItemCommissionAmount, CURRENCY_PRECISION)
                    : round(itemCommissionAmount, CURRENCY_PRECISION);

                scope.totalConsideration.value += (considerationAmount === null)
                    ? 0.00
                    : round(considerationAmount, CURRENCY_PRECISION);

                if (isLease || isSale) {
                    item.chargeType.value = scope.rentType.value;
                }
            }
        });

        scope.totalCommission.value = round(scope.totalCommission.value, CURRENCY_PRECISION);
        calculateUnbilledGrossCommission(scope);
    };

    function isNumber(value) {
        return typeof value === 'number';
    }

    var calculateUnbilledGrossCommission = function(scope, skipIsAllocationCalculation) {
        var unbilledGrossCommission = scope.totalCommission.value;

        if (scope.invoices !== null) {
            scope.invoices.forEach(function(invoice) {
                if (invoice.isProForma || invoice.isVoided || invoice.isFlaggedForDelete) {
                    // don't sum up proforma or voided invoices
                    return;
                }
                unbilledGrossCommission -= parseFloat(invoice.commissionAmount.value);
            });
        }
        scope.unbilledGrossCommission = round(unbilledGrossCommission, CURRENCY_PRECISION);

        if (!skipIsAllocationCalculation) {
            scope.isAllCommissionAllocated = getIsAllCommissionAllocated(scope);
        }

        return scope.unbilledGrossCommission;
    };

    var addCompWrapperToScope = function(scope, compWrapper) {
        appConfig.compWrapper = compWrapper;
        angular.extend(scope, compWrapper);

        setVisibleHoldbacks(scope);

        if (scope.approvalSteps && scope.approvalSteps.length && scope.approvalSteps[0] && scope.approvalSteps[0].status.value === 'Waiting for Approval') {
            remoteActions.setApprovalToUnderReview(scope.approvalSteps[0].id)
                .then(function(result) {
                    if (result.error) {
                        scope.errorMessage = result.error;
                    } else if (result === scope.labels.approvalStepError) {
                        scope.errorMessage = scope.labels.approvalStepError;
                    } else {
                        var updatedCompWrapper = JSON.parse(result);
                        appConfig.compWrapper = updatedCompWrapper;
                        angular.extend(scope, updatedCompWrapper);
                        setScopeProperties(scope);
                    }
                });
        } else {
            setScopeProperties(scope);
        }

        if (appConfig.appName !== EDIT_INVOICE_APP) {
            setAllFieldsToNotRequired(appConfig.compWrapper);
            setAllFieldsToNotRequired(appConfig.defaultHoldbackWrapper);
            setAllFieldsToNotRequired(appConfig.defaultCommissionItemWrapper);

            setCommissionItemsRequiredFields(appConfig.compWrapper);
            setCommissionItemsRequiredFields(appConfig.defaultCommissionItemWrapper);

            setPrimaryBroker(scope);

            if (appConfig.appName !== EDIT_COMMISSIONS_APP) {
                if (scope.pageTemplate.toLowerCase() === 'lease') {
                    //Watch for rental type changes
                    scope.$watch('rentType', function(newValue) {
                        if (!newValue.value) {
                            return;
                        }

                        //Assuming values have 'Year' or 'Month' somewhere in the value
                        scope.commissionItemTerm = (newValue.value.indexOf('Month') > 0) ? "Months" : "Years";
                        calculateCommissionItems(scope);
                    }, true);
                }
            }

            watchPropertySold(scope);
            watchBroker(scope);
            watchCommissionItems(scope);
            watchSpace(scope);

            if (appConfig.appName !== EDIT_COMMISSIONS_APP) {
                checkDocumentValues(scope);

                scope.$watch(
                    '[feeAgreement,documentUri,dealAgreements,cobrokerAgreement,dealTotal,trustEscrowAgreement]',
                    function() {
                        checkDocumentValues(scope);
                    }, true
                );

                //Watch for commission list changes
                scope.$watch('[commissionItems,squareFootage]', function() {
                    calculateCommissionItems(scope);
                }, true);

                if (scope.showRPDealWizard) {
                    scope.$watch('[commissionItems,invoices,brokers,nsClient]', function() {
                        scope.setAllRPRequiredFields();
                    }, true);
                }
                if (scope.pageTemplate.toLowerCase() === 'lease') {
                    scope.$watch('[rentType]', function() {
                        calculateCommissionItems(scope);
                        scope.commissionItems.forEach(function(item) {
                            scope.calculateLeaseTerm(item);
                        });
                    }, true);
                }
            }
        }

        if (appConfig.appName !== EDIT_COMMISSIONS_APP && appConfig.appName !== EDIT_COMMISSION_ITEMS_APP) {
            watchBillTo(scope);
            invoiceHelper.init(scope, appConfig.defaultInvoiceWrapper);
        }

        if (typeof appConfig.appName !== 'undefined' && scope.approvalStatus && scope.approvalStatus.value === APPROVED_STATUS) {
            scope.isSummary = true;
            scope.page = 'summary';
        }

        setPropertyRequired(scope);
    };

    var setPropertyRequired = function(scope) {
        if (scope.property && (scope.recordType.value === LEASE_RECORD_TYPE || scope.recordType.value === SALE_RECORD_TYPE)) {
            scope.property.isRequired = true;
        }
    };

    var checkInvoicesRPRequiredValues = function(scope) {
        if (!scope || !scope.showRPDealWizard) {
            return;
        }

        if (!scope.invoices || !scope.invoices.length || !getIsAllCommissionAllocated(scope)) {
            scope.invoicesMissingRequired = true;
            return;
        }

        var foundEmptyNSBillTo = false;
        if (scope.invoices && scope.invoices.length > 0) {
            for (i in scope.invoices) {
                if (scope.invoices.hasOwnProperty(i)
                    && scope.invoices[i]
                    && scope.invoices[i].isProForma === false
                    && scope.invoices[i].isFlaggedForDelete === false
                    && scope.invoices[i].nsBillTo
                    && (scope.invoices[i].nsBillTo.displayValue === null || scope.invoices[i].nsBillTo.displayValue === '')) {
                        foundEmptyNSBillTo = true;
                }
            }
        }

        if (foundEmptyNSBillTo) {
            scope.invoicesMissingRequired = true;
        }
    };

    var checkPartiesRPRequiredValues = function(scope) {
        var foundPrimaryBroker = false;
        var i;

        if (!scope || !scope.showRPDealWizard) {
            return;
        }

        if (scope.brokers && scope.brokers.length > 0) {
            for (i in scope.brokers) {
                if (scope.brokers.hasOwnProperty(i)) {
                    var broker = scope.brokers[i];
                    if (broker && broker.isFlaggedForDelete === false && broker.primaryBroker && isValueTrue(broker.primaryBroker.value)) {
                        foundPrimaryBroker = true;
                        break;
                    }
                }
            }
        }

        if (!foundPrimaryBroker) {
            scope.primaryBrokerMissing = true;
            scope.partiesMissingRequired = true;
        }
    };

    var getIsAllCommissionAllocated = function(scope) {
        return Math.abs(scope.unbilledGrossCommission) < 0.005;
    };

    var updateInvoiceClassifications = function(scope, invoices) {
        if (scope.invoices === null) {
            return;
        }

        scope.invoices = invoices || scope.invoices;
        scope.visibleAccountingInvoices = scope.invoices.filter(function(invoice) {
            return !invoice.isProForma && !invoice.isFlaggedForDelete;
        });

        scope.visibleProFormaInvoices = scope.invoices.filter(function(invoice) {
            return invoice.isProForma && !invoice.isFlaggedForDelete;
        });
    };

    var setVisibleHoldbacks = function(scope) {
        if (!scope.holdbacks) {
            return;
        }

        scope.visibleHoldbacks = scope.holdbacks.filter(function(holdback) {
            return !holdback.isFlaggedForDelete;
        });
    };

    var hasValue = function(v) {
        return !(v === null || v === undefined || v === '');
    };

    var isValueTrue = function(v) {
        return v === true || v === 'true';
    };

    return {
        restrict: 'E',

        controller: function($scope, $timeout) {
            var compWrapper;
            var isCompWrapperLoading = true;

            $scope.isFirstLoad = true;
            $scope.totalYears = {
                value: 0
            };

            if (!appConfig.appName || appConfig.appName === DEAL_WIZARD_APP) {
                netSuiteStatusConfig.message = 'Syncing invoices...';
                netSuiteStatusConfig.getStatus = appConfig.actions.getInvoiceStatus;
                netSuiteStatusConfig.type = 'Invoices';
            }

            $scope.$on('future-transaction-date', function() {
                alert('Page Loaded'); // eslint-disable-line no-alert
                $scope.showTransactionDateModal = true;
            });

            remoteActions.getJsonCompWrapper()
                .then(function(result) {
                    if (result.error) {
                        result = result.error;
                    }

                    try {
                        compWrapper = JSON.parse(result);
                    } catch (ex) {
                        $scope.errorMessage = 'Error initializing the deal wizard. An unexpected value was returned by the server.'
                    }

                    addCompWrapperToScope($scope, compWrapper);
                    updateInvoiceClassifications($scope);
                    $scope.isFirstLoad = false;

                    if (!$scope.totalCommission) {
                        $scope.totalCommission = {
                            value: 0
                        }
                    }

                    if ($scope.approvalStatus && $scope.approvalStatus.value === APPROVED_STATUS && !appConfig.appName) {
                        netSuiteStatusAsync.getStatus([$scope.id]).then(function() {
                            $scope.isLoading = false;
                        }, function() {
                            $scope.isLoading = false;
                        });
                    } else {
                        $scope.isLoading = false;
                    }

                    isCompWrapperLoading = true;
                    $timeout(function() {
                        updateCompWrapperFromScope($scope, false);
                        $scope.setAllRPRequiredFields();
                        compWrapper = appConfig.compWrapper;
                        isCompWrapperLoading = false;
                        calculateCommission($scope, $scope.brokers, $scope.brokers);
                        if (scope.appName === DEAL_WIZARD_APP) {
                            $scope.checkPrimaryBrokerSegmentationValues();
                        }

                        $scope.$watch("rentType.displayValue", function(newRentType) {
                            setRentTypeFieldValidation(newRentType, $scope);
                        });

                        if ($scope.isPrintMode) {
                            $scope.$watch("isLoading", function(val) {
                                if (val === false) {
                                    $timeout(function() {
                                        window.print();
                                    }, 2000);
                                }
                            });
                        } else {
                            watchPrimaryBroker($scope);
                        }
                    }, 1000);
                });

            $scope.useDefaultForOTTInvoices = {value:true};
            $scope.isOTTInvoiceSelected = false;
            $scope.selectedOTTInvoice = null;
            $scope.showOTTOverlay = false;
            $scope.isPrintMode = appConfig.isPrintMode;
            $scope.appName = appConfig.appName;
            $scope.isComp = appConfig.isComp;
            $scope.rejectionMessage = null;
            $scope.approvalTitle = null;
            $scope.isLoading = true;
            $scope.externalPartyCommission = {
                'amount': 0.0,
                'percent': 0.0
            };

            $scope.internalPartyCommission = {
                'amount': 0.0,
                'percent': 0.0
            };

            $scope.ayBrokerAllocation = {
                'amount': 0.0,
                'percent': 0.0
            };

            $scope.approvalStatus = {
                value: null
            };

            $scope.enableTaxGroup = function(invoice) {
                return invoiceHelper.enableTaxGroup(invoice);
            };

            $scope.enableDefaultTaxGroup = function() {
                return appConfig.compWrapper.currencyIsoCode !== null && appConfig.compWrapper.currencyIsoCode !== undefined && appConfig.compWrapper.currencyIsoCode !== 'CAD';
            };

            $scope.getNetSuiteData = appConfig.actions.getNetSuiteData;

            $scope.unbilledGrossCommission = 0;
            $scope.isAllCommissionAllocated = true;

            $scope.visibleAccountingInvoices = [];
            $scope.visibleProFormaInvoices = [];

            $scope.labels = appConfig.labels;
            $scope.useInvoiceDefaults = false;
            $scope.approvalStarted = false;
            $scope.renderApproval = false;

            $scope.safeApply = function(fn) {
                var phase = this.$root.$$phase;
                if (phase === '$apply' || phase === '$digest') {
                    if (fn && (typeof(fn) === 'function')) {
                         fn();
                    }
                } else {
                    this.$apply(fn);
                }
            };
            $scope.getImageBase = function() {
                return resourceUrls.vfHelperBase + '/img';
            };

            $scope.setDefaultCommissionPercent = function(e, variable) {
                var el = angular.element(e.target);
                if (el[0].value === '') {
                    variable.displayValue = 0.0;
                    variable.value = 0.0;
                    el[0].value = 0.0;
                    var event = new Event('change');
                    el[0].dispatchEvent(event);
                }
            };

            $scope.setAllRPRequiredFields = function() {
                $scope.detailsMissingRequired = false;
                $scope.documentsMissingRequired = false;
                $scope.invoicesMissingRequired = false;
                $scope.partiesMissingRequired = false;
                $scope.commissionItemsMissingRequired = false;
                $scope.primaryBrokerMissing = false;
                for (key in $scope) {
                    if ($scope.showRPDealWizard) {
                        if (key === 'nsClient' && ($scope[key].displayValue === null || $scope[key].displayValue === '')) {
                            $scope.detailsMissingRequired = true;
                        }

                        if (key === 'transactionDate' && ($scope[key].value === null || $scope[key].value === '')) {
                            $scope.documentsMissingRequired = true;
                        }

                        if ($scope.documentStatus === 'INCOMPLETE') {
                            $scope.documentsMissingRequired = true;
                        }
                    }
                }

                checkPartiesRPRequiredValues($scope);
                checkInvoicesRPRequiredValues($scope);

                var commissionItemFound = false;
                for (var i in $scope.commissionItems) {
                    if ($scope.commissionItems.hasOwnProperty(i)) {
                        var commissionItem = $scope.commissionItems[i];
                        if (commissionItem.isFlaggedForDelete === false) {
                            commissionItemFound = true;
                        }
                    }
                }

                if (!commissionItemFound && $scope.showRPDealWizard) {
                    $scope.commissionItemsMissingRequired = true;
                }
            };

            $scope.setAllRPRequiredFields();

            $scope.calculateCheckLeaseTerm = function(setTerm, item, fieldName, index) {
                setRateTypeFieldValidation($scope.commissionItems, $scope, index);
                var oldValue = ($scope.initCommissionItems[index] === undefined || $scope.initCommissionItems[index][fieldName] === undefined)
                             ? null
                             : $scope.initCommissionItems[index][fieldName].value,
                    newValue = $scope.commissionItems[index][fieldName].value,
                    fieldLabel = $scope.commissionItems[index][fieldName].label;

                if (!appConfig.appName && !$scope.showConfirmLeaseTermChange && oldValue !== newValue && item.id !== null) {
                    if ($scope.approvalStatus.value === APPROVED_STATUS && $scope.hasOverTheTermInvoice === true) {
                        $scope.commissionItems[index][fieldName].value = oldValue;
                        $scope.errorMessage = fieldLabel + ' cannot be changed on an approved deal with over the term invoices. Please void all the invoices before proceeding';
                        return $scope.calculateLeaseTerm(item);
                    }

                    if (setTerm && $scope.initCommissionItems[index].id !== null) {
                        if (scope.invoices) {
                            for (var i = scope.invoices.length - 1; i >= 0; i--) {
                                if (scope.invoices[i].overTheTermCommissionItem
                                    && scope.invoices[i].overTheTermCommissionItem.value !== null
                                    && scope.invoices[i].overTheTermCommissionItem.value !== '') {
                                        $scope.showConfirmLeaseTermChange = true;
                                        break;
                                }
                            }
                        }
                        $scope.editedItemIndex = index;
                        $scope.editedFieldName = fieldName;
                    }
                }

                if (setTerm) {
                    return $scope.calculateLeaseTerm(item);
                }
                return null;
            };

            $scope.calculateLeaseTerm = function(item, forceMonthly) {
                forceMonthly = forceMonthly === true;
                var momentStart = moment(item.startDate.value + " 00:00", $scope.userDateFormat + " hh:mm");
                var momentEnd = moment(item.endDate.value + " 24:00", $scope.userDateFormat + " hh:mm");
                var isMonths = forceMonthly || ($scope.rentType.value && $scope.rentType.value.indexOf('Month') >= 0);
                $scope.commissionItemTerm = isMonths ? "Months" : "Years";
                var selectedOption = $scope.rentType.options.filter(function(option) {
                    return $scope.rentType.value === option.value;
                });
                $scope.rentType.displayValue = (selectedOption[0] !== undefined) ? selectedOption[0].displayValue : '';
                accurateQuantity = round(momentEnd.diff(momentStart, $scope.commissionItemTerm, true), COMMISSION_ITEM_QUANTITY_PRECISION);
                item.quantity.value = accurateQuantity ? accurateQuantity : item.quantity.value;

                if (!$scope.showConfirmLeaseTermChange) {
                    angular.copy($scope.commissionItems, $scope.initCommissionItems);
                }
                if (item.endDate.value === '' || item.endDate.value === null && item.recordType !== 'Other') {
                    item.quantity.value = 0;
                }
                if ((item.startDate.value === '' || item.startDate.value === null) && item.recordType !== 'Other') {
                    item.quantity.value = 0;
                }
                return item.quantity.value;
            };

            $scope.setOTTRequiredFields = function(invoice) {
                invoice.revenueRecognition.isRequired = hasValue(invoice.billingFrequency.value);
            };

            $scope.clearNonOTBEFields = function(holdbackWrapper) {
                if (holdbackWrapper.type.value !== holdbackWrapper.otbeRecordTypeId) {
                    holdbackWrapper.broker.value = undefined;
                    holdbackWrapper.broker.displayValue = undefined;
                    holdbackWrapper.bonus.value = false;
                    holdbackWrapper.bonusRecipient.value = undefined;
                    holdbackWrapper.bonusRecipient.displayValue = undefined;
                }
                holdbackWrapper.broker.isRequired = (holdbackWrapper.type.value === holdbackWrapper.otbeRecordTypeId);
            };

            $scope.clearBonusRecipient = function(holdbackWrapper) {
                if ($scope.isPrintMode) {
                    return;
                }

                if (!holdbackWrapper.bonus.value || !holdbackWrapper.broker.value) {
                    holdbackWrapper.bonusRecipient.value = undefined;
                    holdbackWrapper.bonusRecipient.displayValue = undefined;
                }
                holdbackWrapper.bonusRecipient.isRequired = (holdbackWrapper.bonus.value);
            };

            $scope.addBroker = function(recordType) {

                var newBroker = angular.copy(appConfig.defaultBrokerWrapper);

                if (CLIENT_FEE_SHARE_RECORD_TYPE === recordType && $scope.ayClient) {
                    newBroker.client.displayValue = $scope.ayClient.displayValue;
                    newBroker.client.value = $scope.ayClient.value;
                }

                newBroker.recordType = recordType;
                var defaultRoleType = recordType === INTERNAL_BROKER_RECORD_TYPE ? null : recordType;
                newBroker.role.value = recordType === CLIENT_FEE_SHARE_RECORD_TYPE ? 'Client Fee Share' : defaultRoleType;
                newBroker.commissionAmount.currencyIsoCode = appConfig.compWrapper.currencyIsoCode;
                newBroker.commissionAmount.currencySymbol = appConfig.compWrapper.currencySymbol;
                var brokerFound = false;
                if (!brokersExist()) {
                    newBroker.commissionPercent.value = 100;
                    newBroker.commissionPercent.displayValue = 100;
                    newBroker.commissionType = 'Percent';
                }
                $scope.brokers.push(newBroker);
            };

            var brokersExist = function() {
                var brokerFound = false;
                for (var i = 0; i < $scope.brokers.length; i++) {
                    if (!$scope.brokers[i].isFlaggedForDelete) {
                        brokerFound = true;
                    }
                }
                return brokerFound;
            };

            $scope.deleteBroker = function(wrapper) {
                deleteItemFromList($scope.brokers, wrapper);
                if (!brokersExist()) {
                    $scope.primaryBroker = null;
                }
            };

            $scope.visibleHoldbacks = [];

            $scope.addHoldback = function() {
                var newHoldback = angular.copy(appConfig.defaultHoldbackWrapper);
                $scope.holdbacks.push(newHoldback);

                setVisibleHoldbacks($scope);
            };

            $scope.deleteHoldback = function(wrapper) {
                deleteItemFromList($scope.holdbacks, wrapper);
                setVisibleHoldbacks($scope);
            };

            $scope.filterOtherSale = function(value, index) {
                return value.recordType && ['Other', 'Sale'].indexOf(value.recordType) !== -1 && value.isFlaggedForDelete === false;
            };

            $scope.deleteCommissionItem = function(wrapper) {
                var i;
                var removedCommissionItemIds = [];

                if (wrapper.id && $scope.approvalStatus && $scope.approvalStatus.value === APPROVED_STATUS && $scope.pageTemplate === 'lease' && $scope.displayOTTLeaseTable) {
                    $scope.errorMessage = 'Commission items cannot be deleted on an approved deal with over the term invoices. Please void all the invoices before proceeding.';
                    return;
                }

                deleteItemFromList($scope.commissionItems, wrapper);

                for (i in $scope.commissionItems) {
                    if ($scope.commissionItems.hasOwnProperty(i)) {
                        if ($scope.commissionItems[i].isFlaggedForDelete === true && $scope.commissionItems[i].id !== null) {
                            removedCommissionItemIds.push($scope.commissionItems[i].id);
                        }
                    }
                }

                for (i in $scope.invoices) {
                    if ($scope.invoices.hasOwnProperty(i)) {
                        var invoice = $scope.invoices[i];
                        if (invoice.overTheTermCommissionItem !== undefined && removedCommissionItemIds.indexOf(invoice.overTheTermCommissionItem.value) !== -1) {
                            $scope.deleteInvoice($scope.invoices[i]);
                        }
                    }
                }
                $scope.displayOTTLeaseTable = checkForOTTLease($scope);
                $scope.setAllRPRequiredFields();
            };

            // The newly added commission item start date needs to look for the previous
            // 'Lease' type end date and return that date + 1 day
            var getNewCommissionItemStartDate = function(recordType) {
                if (recordType) {
                    if (recordType === LEASE_RECORD_TYPE) {
                        // Loop over commissionItems finding last enddate that is type lease or sale
                        for (var i = $scope.commissionItems.length - 1; i >= 0; i--) {
                            // Check if item is lease or sale and has an enddate
                            if (($scope.commissionItems[i].recordType === LEASE_RECORD_TYPE) && ($scope.commissionItems[i].isFlaggedForDelete === false) && ($scope.commissionItems[i].endDate && $scope.commissionItems[i].endDate.value)) {
                                try {
                                    // Return new start date
                                    return moment($scope.commissionItems[i].endDate.value, $scope.userDateFormat)
                                                    .add(1, 'days')
                                                    .format($scope.userDateFormat);
                                } catch (ex) {
                                    return null;
                                }
                            }
                        }
                        return null;
                    }
                    return null;
                }
                return null;
            };

            $scope.addCommissionItem = function(recordType) {
                var newCommissionItem = angular.copy(appConfig.defaultCommissionItemWrapper);
                var pageTemplate = $scope.pageTemplate;
                var commissionItemType = (!recordType) ? pageTemplate.toLowerCase() : recordType.toLowerCase();
                newCommissionItem.entryDateUTC.value = new Date().getTime() / 1000;
                newCommissionItem.squareFootage.value = $scope.squareFootage.value;
                setCommissionItemsRequiredFields(newCommissionItem);
                // set values for lease item
                if (commissionItemType === 'lease') {
                    newCommissionItem.squareFootage.value = $scope.squareFootage.value;
                    newCommissionItem.amount.value = $scope.rentRate.value;
                } else {
                    newCommissionItem.type.value = 'Other';
                    newCommissionItem.quantity.value = 1;
                }

                //set record type of commission item
                if (commissionItemType === 'lease') {
                    newCommissionItem.recordType = LEASE_RECORD_TYPE;
                } else if (commissionItemType === 'sale') {
                    newCommissionItem.recordType = SALE_RECORD_TYPE;
                } else {
                   newCommissionItem.recordType = 'Other';
                }

                if (newCommissionItem.recordType === 'Other') {
                    newCommissionItem.rateType.options = [{
                            displayValue: '% of Total',
                            value: '% of Total'
                        }, {
                            displayValue: 'Flat Fee',
                            value: 'Flat Fee'
                        }
                    ];
                }

                // add default values
                if (commissionItemType === 'sale') {
                    newCommissionItem.description.value = null;
                    newCommissionItem.amount.value = String($scope.salePrice.value);
                    newCommissionItem.rateType.value = '% of Total';
                } else {
                    // Function to find the next start date
                    var newStartDate = getNewCommissionItemStartDate(recordType);
                    newCommissionItem.startDate.displayValue = newStartDate;
                    newCommissionItem.startDate.value = newStartDate;
                }

                // Added to resolve angular ng-repeat duplicates error
                // Need to remove this before saving
                newCommissionItem.id = 'TEMPID' + Date.now();

                $scope.commissionItems.push(newCommissionItem);
                $scope.initCommissionItems.push(newCommissionItem);
                $scope.setAllRPRequiredFields();
                angular.copy($scope.commissionItems, $scope.initCommissionItems);
                setRentTypeFieldValidation($scope.rentType.displayValue, $scope);
            };

            $scope.overrideChecked = function(item) {
                // prevent toggling override if on summary pages
                if ($scope.isSummary) {
                    return;
                }
                item.overrideCalculations = !item.overrideCalculations;
                if (item.overrideCalculations) {
                    item.overrideCommissionAmount.value = setAsCurrency(item.commissionAmount.value);
                    item.overrideCommissionAmount.displayValue = setAsCurrency(item.overrideCommissionAmount.value);
                    // prevent nulls on summary page
                    item.overrideCommissionAmount.currencySymbol = item.commissionAmount.currencySymbol;
                }
            };

            $scope.overrideTotalChecked = function(item) {
                item.overrideConsiderations = !item.overrideConsiderations;
                if (item.overrideConsiderations) {
                    item.overrideTotal.value = item.total.value;
                }
            };

            $scope.setAyClient = function(company) {
                $scope.ayClient.displayValue = company.displayValue;
                $scope.ayClient.value = company.value;
            };

            $scope.updatePropertyType = function() {
                $scope.propertyType.value = 'Recalculating...';
                app.save(false, null, false);
            };

            $scope.processOTTInvoices = function() {
                var err = validateOTTInvoices($scope.commissionItems);
                if (err !== true) {
                    $scope.ottErrorMessage = err;
                    return;
                }

                $scope.ottErrorMessage = false;

                // show loader
                $scope.isLoading = true;
                $scope.showOTTOverlay = false;

                // let the page close the overlay and open the loader before we build invoices
                buildOTTInvoices($scope);
                checkHideShowGroup();
            };

            $scope.ottInvoicesExist = function() {
                if ($scope.visibleAccountingInvoices && $scope.visibleAccountingInvoices.length > 0) {
                    for (var i = 0; i < $scope.visibleAccountingInvoices.length; i++) {
                        var invoice = $scope.visibleAccountingInvoices[i];
                        if (invoice.overTheTermCommissionItem.value !== null && !invoice.isFlaggedForDelete) {
                            return true;
                        }
                    }
                }
                return false;
            };

            $scope.itemHasChildOTTInvoices = function(commissionItem) {
                if ($scope.visibleAccountingInvoices && $scope.visibleAccountingInvoices.length > 0) {
                    for (var i = 0; i < $scope.visibleAccountingInvoices.length; i++) {
                        var invoice = $scope.visibleAccountingInvoices[i];
                        if (invoice.overTheTermCommissionItem && invoice.overTheTermCommissionItem.value === commissionItem.id) {
                            return true;
                        }
                    }
                }
                return false;
            };

            $scope.openOTTOverlay = function() {
                $scope.displayOTTLeaseTableOldVal = $scope.displayOTTLeaseTable;
                $scope.displayOTTLeaseTable = false;
                $scope.ottErrorMessage = false;
                angular.copy($scope.commissionItems, $scope.initCommissionItems);
                if (saveNeededForCommissionItems()) {
                    app.save(false, null, false).then(function() {
                        $scope.showOTTOverlay = true;
                    });
                } else {
                    $scope.showOTTOverlay = true;
                }
            };

            var saveNeededForCommissionItems = function() {
                if ($scope.commissionItems && $scope.commissionItems.length > 0) {
                    for (var i = 0; i < $scope.commissionItems.length; i++) {
                        var commissionItem = $scope.commissionItems[i];
                        if (commissionItem.id === null && commissionItem.recordType !== 'Other' && !commissionItem.isFlaggedForDelete) {
                            return true;
                        }
                    }
                }
                return false;
            };

            /* Set the collapse state of ott invoices to what it was before the edit */
            var setOTTInvoiceCollapseState = function(expandedIds, commissionItems) {
                commissionItems.forEach(function(obj) {
                    if (expandedIds.indexOf(obj.id) > -1) {
                        obj.showChildOTTInvoices = true;
                    }
                });
                return null;
            };

            /* Determine which ott invoices are expanded and return an array of those IDs */
            var getExpandedOTTInvoices = function(commissionItems) {
                return commissionItems.map(function(obj) {
                    return obj.showChildOTTInvoices === true ? obj.id : false;
                });
            };

            $scope.closeBulkOTTOverlay = function() {
               var openedInvoiceIds = getExpandedOTTInvoices($scope.commissionItems);
                $scope.displayOTTLeaseTable = $scope.displayOTTLeaseTableOldVal;
                angular.forEach($scope.invoices, function(invoice) {
                    if (invoice.overTheTermCommissionItem.value === $scope.selectedItemId) {
                        invoice.realBalanceDue.value = $scope.originalInvoice.realBalanceDue.value;
                        invoice.useDefaultValues.value = $scope.originalInvoice.useDefaultValues.value ;
                        invoice.dueUpon.value = $scope.originalInvoice.dueUpon.value;
                        invoice.trustAmountPaid.value = $scope.originalInvoice.trustAmountPaid.value ;
                        invoice.isPrinted.value = $scope.originalInvoice.isPrinted.value;
                        invoice.recognizeRevenue.value = $scope.originalInvoice.recognizeRevenue.value;
                        invoice.trustAmount.value = $scope.originalInvoice.trustAmount.value;
                    }
                });
                $scope.selectedItemId = '';
                angular.copy($scope.initCommissionItems, $scope.commissionItems);
                setOTTInvoiceCollapseState(openedInvoiceIds, $scope.commissionItems);
                $scope.showOTTOverlay = false;
                $scope.isOTTInvoiceSelected = false;
                $scope.bulkEditAction = false;
                utils.enableScroll();
            };

            $scope.closeOTTOverlay = function() {
                var openedInvoiceIds = getExpandedOTTInvoices($scope.commissionItems);
                $scope.displayOTTLeaseTable = $scope.displayOTTLeaseTableOldVal;
                angular.copy($scope.initCommissionItems, $scope.commissionItems);
                setOTTInvoiceCollapseState(openedInvoiceIds, $scope.commissionItems);
                $scope.showOTTOverlay = false;
                $scope.isOTTInvoiceSelected = false;
                utils.enableScroll();
            };

            $scope.cancelAndCloseOTTOverlay = function(selectedInvoice) {
                $scope.showOTTOverlay = false;
                $scope.isOTTInvoiceSelected = false;
                if ($scope.visibleAccountingInvoices && $scope.visibleAccountingInvoices.length > 0) {
                    for (var i = 0; i < $scope.visibleAccountingInvoices.length; i++) {
                        var invoice = $scope.visibleAccountingInvoices[i];
                        if (invoice === $scope.originalInvoice) {
                            for (property in $scope.selectedOTTInvoice) {
                                if ($scope.selectedOTTInvoice.hasOwnProperty(property) && invoice.hasOwnProperty(property)) {
                                    invoice[property] = $scope.selectedOTTInvoice[property];
                                }
                            }
                        }
                    }
                }
                calculateUnbilledGrossCommission($scope);
                $scope.bulkEditAction = false;
                utils.enableScroll();
            };

            $scope.editBulkOTTInvoice = function(itemId, bulkinvoices) {
                window.scrollTo(0, 0);
                var editItems = [];
                $scope.selectedItemId = itemId;
                angular.forEach(bulkinvoices, function(indvidualInvoice) {
                    if (itemId === indvidualInvoice.overTheTermCommissionItem.value) {
                        editItems.push(indvidualInvoice);
                    }
                });
                if (editItems.length > 0) {
                    $scope.displayOTTLeaseTableOldVal = $scope.displayOTTLeaseTable;
                    $scope.selectedOTTInvoice = {};
                    $scope.originalInvoice = editItems[0];
                    $scope.isOTTInvoiceSelected = true;
                    $scope.bulkEditAction = true;
                    utils.disableScroll();
                }
            };

            $scope.editOTTInvoice = function(index, item) {
                window.scrollTo(0, 0);
                $scope.displayOTTLeaseTableOldVal = $scope.displayOTTLeaseTable;
                $scope.selectedOTTInvoiceIndex = index;
                $scope.selectedOTTInvoice = {};
                angular.copy(item, $scope.selectedOTTInvoice);
                $scope.originalInvoice = item;
                $scope.isOTTInvoiceSelected = true;
                utils.disableScroll();
            };

            $scope.addInvoice = function(isProForma) {
                $scope.invoices.push(invoiceHelper.createNewInvoice($scope, isProForma));
                checkInvoicesRPRequiredValues($scope);
                $scope.verifyNonBlankBillTos($scope);
                calculateUnbilledGrossCommission($scope);
                updateInvoiceClassifications($scope);
                invoiceHelper.invoices = $scope.invoices;
            };

            $scope.copyInvoice = function(index, invoice) {
                var newInvoice = invoiceHelper.copyInvoice(invoice);
                $scope.invoices.splice(index, 0, newInvoice);
                $scope.verifyNonBlankBillTos($scope);
                calculateUnbilledGrossCommission($scope);
                updateInvoiceClassifications($scope);
                invoiceHelper.invoices = $scope.invoices;
            };

            $scope.deleteBulkInvoice = function(itemId, bulkinvoices) {
                var deleteItems = [];
                angular.forEach(bulkinvoices, function(indvidualInvoice) {
                    if (itemId === indvidualInvoice.overTheTermCommissionItem.value) {
                        deleteItems.push(indvidualInvoice);
                    }
                });
                if (deleteItems.length > 0) {
                    invoiceHelper.deleteBulkInvoice(deleteItems);
                    $scope.verifyNonBlankBillTos($scope);
                    calculateUnbilledGrossCommission($scope);
                    updateInvoiceClassifications($scope);
                }
            };

            $scope.deleteInvoice = function(invoice) {
                invoiceHelper.deleteInvoice(invoice);
                $scope.verifyNonBlankBillTos($scope);
                calculateUnbilledGrossCommission($scope);
                updateInvoiceClassifications($scope);
            };

            $scope.voidBulkInvoice = function(itemId, invoices) {
                var voidItems = [];
                var commInvMap = new Map();
                var unvoidInvMap = new Map();

                angular.forEach(invoices, function(indvidualInvoice) {
                    if (itemId === indvidualInvoice.overTheTermCommissionItem.value) {
                        voidItems.push(indvidualInvoice);
                    }
                });
                angular.forEach($scope.commissionItems, function(commItems) {
                    if (itemId === commItems.id) {
                        commItems.isVoidUnvoid = !commItems.isVoidUnvoid;
                        unvoidInvMap.set(commItems.id, commItems.isVoidUnvoid);
                    }
                });
                 if (voidItems.length > 0) {
                    invoiceHelper.voidBulkInvoice(voidItems, unvoidInvMap);
                    calculateUnbilledGrossCommission($scope);
                }
            };

            $scope.voidInvoice = function(index, invoice) {
                invoiceHelper.voidInvoice(index, invoice);
                calculateUnbilledGrossCommission($scope);
                hideShowGroupVoid(index);
            };

            var hideShowGroupVoid = function(invoice) {
                var voidInvoices = [];
                angular.forEach($scope.invoices, function(singleInvoice) {
                     if (singleInvoice.overTheTermCommissionItem.value === invoice.overTheTermCommissionItem.value) {
                        voidInvoices.push(singleInvoice);
                    }
                });

                var invComId = '';
                var traverseContinue = true;
                var setTrue = false;

                angular.forEach(voidInvoices, function(singleInvoice) {
                    if (traverseContinue) {
                        invComId = singleInvoice.overTheTermCommissionItem.value;
                        if (singleInvoice.isVoided === true) {
                            setTrue = true;
                        } else {
                            setTrue = false;
                            traverseContinue = false;
                        }
                    }
                });

                angular.forEach($scope.commissionItems, function(commItems) {
                    if (invComId === commItems.id) {
                        commItems.isVoidUnvoid = setTrue;
                    }
                });
            }

            var checkHideShowGroup = function() {
                var comMap = new Map();
                angular.forEach($scope.commissionItems, function(commItems) {
                    comMap.set(commItems.id, commItems);
                });
                var invoiceMap = new Map();
                var invoiceIdsMap = new Map();
                var tempInvoices = [];
                var tempIdInvoices = [];
                angular.forEach($scope.invoices, function(singleInvoice) {
                    if (invoiceMap.has(singleInvoice.overTheTermCommissionItem.value)) {
                        tempInvoices = invoiceMap.get(singleInvoice.overTheTermCommissionItem.value);
                        tempInvoices.push(singleInvoice.isVoided);
                    } else {
                        tempInvoices.push(singleInvoice.isVoided);
                    }

                    if (invoiceIdsMap.has(singleInvoice.overTheTermCommissionItem.value)) {
                        tempIdInvoices = invoiceIdsMap.get(singleInvoice.overTheTermCommissionItem.value);
                        tempIdInvoices.push(singleInvoice.id);
                    } else {
                        tempIdInvoices.push(singleInvoice.id);
                    }
                    invoiceIdsMap.set(singleInvoice.overTheTermCommissionItem.value, tempIdInvoices);
                    invoiceMap.set(singleInvoice.overTheTermCommissionItem.value, tempInvoices);
                    tempInvoices = [];
                    tempIdInvoices = [];
                });
                var comFinalMap = new Map();
                var allInvoices = '';
                for (let itemKey of invoiceMap.keys()) {
                    allInvoices = invoiceMap.get(itemKey);
                    for (var i = 0; i<allInvoices.length; i++) {
                        if (allInvoices[i]===true) {
                            comFinalMap.set(itemKey, true);
                        } else {
                            comFinalMap.set(itemKey, false);
                            break;
                        }
                    }
                }

                var comFinalIdMap = new Map();
                var allIdInvoices = '';
                for (let key of invoiceIdsMap.keys()) {
                    allIdInvoices = invoiceIdsMap.get(key);
                    for (var i = 0; i<allIdInvoices.length; i++) {
                        if (allIdInvoices[i]==='' || allIdInvoices[i]===null) {
                            comFinalIdMap.set(key, true);
                        } else {
                            comFinalIdMap.set(key, false);
                            break;
                        }
                    }
                }
                angular.forEach($scope.commissionItems, function(commItems) {
                    if (comFinalMap.has(commItems.id)) {
                        commItems.isComVoided = comFinalMap.get(commItems.id);
                    }
                    if (comFinalIdMap.has(commItems.id)) {
                        commItems.isComSaved = comFinalIdMap.get(commItems.id);
                    }
                });
            }

            $scope.setBillToAddressFromNetsuite = function() {
                $scope.billToAddress.value = $scope.defaultNetsuiteBillTo.formattedAddress;
                $scope.verifyNonBlankBillTos($scope);
            };

            $scope.setInvoiceBillToAddressFromAccount = function(invoice, accountId) {
                if (accountId && (!invoice.useDefaultValues.value || invoice.useDefaultValues.value === 'false') && !invoice.nsBillTo.formattedAddress) {
                    remoteActions.getAccountAddress(accountId)
                        .then(function(result) {
                            if (result.error) {
                                $scope.errorMessage = result.error;
                            } else {
                                invoice.billToAddress.value = result;
                                $scope.verifyNonBlankBillTos($scope);
                            }
                        })
                    ;
                }
            };

            $scope.setInvoiceBillToAddress = function(invoice, address) {
                if (!invoice.useDefaultValues.value) {
                    invoice.billToAddress.value = address;
                    $scope.verifyNonBlankBillTos($scope);
                }
            };

            $scope.setDefaultInvoiceValues = function(invoice) {
                invoiceHelper.setDefaultInvoiceValues(invoice, $scope);
                $scope.verifyNonBlankBillTos($scope);
                calculateUnbilledGrossCommission($scope, false);
            };
            $scope.convertInvoice = function(invoice) {
                invoiceHelper.convertInvoice(invoice, $scope);
                calculateUnbilledGrossCommission($scope);
                updateInvoiceClassifications($scope);
            };
            $scope.calculateCommissionPercent = function(invoice, forceCalculation) {
                invoiceHelper.calculateCommissionPercent(invoice, $scope, forceCalculation);
                calculateUnbilledGrossCommission($scope);
            };
            $scope.calculateCommissionAmount = function(invoice, forceCalculation) {
                invoiceHelper.calculateCommissionAmount(invoice, $scope, forceCalculation);
                calculateUnbilledGrossCommission($scope);
            };

            $scope.arePartyCommissionsAllocated = function() {
                var arePartyCommissionsAllocated = Math.abs($scope.internalPartyCommission.amount + $scope.externalPartyCommission.amount - $scope.totalCommission.value) < 0.005
                $scope.partiesMissingRequired = false;
                if (!arePartyCommissionsAllocated && $scope.showRPDealWizard) {
                    $scope.partiesMissingRequired = true;
                }
                checkPartiesRPRequiredValues($scope);
                return arePartyCommissionsAllocated;
            };

            $scope.confirmLeaseTermChange = function(isConfirmed) {
                if (!isConfirmed) {
                    var newItem = angular.copy($scope.initCommissionItems[$scope.editedItemIndex]);
                    $scope.commissionItems[$scope.editedItemIndex][$scope.editedFieldName] = newItem[$scope.editedFieldName];
                    $scope.calculateLeaseTerm(scope.commissionItems[$scope.editedItemIndex]);
                } else {
                    $scope.commissionItems[$scope.editedItemIndex].revenueRecognition.value = '';
                    $scope.commissionItems[$scope.editedItemIndex].billingFrequency.value = '';
                    $scope.invoices.forEach(function(invoice) {
                        if (invoice.overTheTermCommissionItem.value === $scope.commissionItems[$scope.editedItemIndex].id) {
                            invoice.isFlaggedForDelete = true;
                        }
                    });
                    updateInvoiceClassifications($scope);
                    calculateUnbilledGrossCommission($scope, false);
                    $scope.displayOTTLeaseTable = false;
                }
                $scope.showConfirmLeaseTermChange = false;
                angular.copy($scope.commissionItems, $scope.initCommissionItems);
            };

            $scope.confirmPrimaryBrokerChange = function(isConfirmed) {
                if (isConfirmed) {
                    invoiceHelper.clearNsBillTos($scope);
                } else {
                    $scope.ignorePrimaryBrokerChanges = true;
                    $scope.brokers = $scope.oldBrokers;
                }
                $scope.showConfirmPrimaryBrokerChangeOnPaidInvoices = false;
                $scope.showConfirmPrimaryBrokerChange = false;
            };

            $scope.verifyNonBlankBillTos = function(scope) {
                var anyNsBillTosBlank = false;
                scope.invoices.forEach(function(invoice) {
                    if (!invoice.isFlaggedForDelete && !invoice.isProForma) {
                        if (!invoice.nsBillTo.value || invoice.nsBillTo.value === '') {
                            anyNsBillTosBlank = true;
                        }
                    }
                });

                if (anyNsBillTosBlank) {
                    scope.errorMessage = scope.labels.pleaseIdentifyNsBillTos;
                    scope.hideAllSaveButtons = true;
                } else {
                    if (scope.errorMessage === scope.labels.pleaseIdentifyNsBillTos) {
                        scope.errorMessage = null;
                    }
                    scope.hideAllSaveButtons = false;
                }
            };

            var cachedDeletedItems = [];

            var deleteItemFromList = function(list, item) {
                if (item.id === null || item.id.indexOf('TEMPID') !== -1) {
                    var index = list.indexOf(item);
                    list.splice(index, 1);
                } else {
                    cachedDeletedItems.push(item);
                    item.isFlaggedForDelete = true;
                }
            };

            var restoreDeletedItems = function() {
                cachedDeletedItems.forEach(function(item) {
                    if (item.isDeleteRestoredOnFailure === true) {
                        item.isFlaggedForDelete = false;
                    }
                });
            };

            var validateOTTInvoices = function(commissionItems) {
                var errorMessage = true;
                if (commissionItems.length) {
                    commissionItems.forEach(function(obj) {
                        if (isValueTrue(obj.revenueRecognition.isRequired) && !hasValue(obj.revenueRecognition.value)) {
                            errorMessage = $scope.labels.ottRevRecRequiredError;
                        }
                    });
                }
                return errorMessage;
            };

            var validateHoldbacks = function(holdbacksArray) {
                if (holdbacksArray && holdbacksArray.length) {
                    for (var i = 0; i < holdbacksArray.length; i++) {
                        if (holdbacksArray[i].isFlaggedForDelete !== true) {
                            if (isValueTrue(holdbacksArray[i].type.isRequired) && !hasValue(holdbacksArray[i].type.value)) {
                                return $scope.labels.holdbackRequireTypeError;
                            }
                            if (isValueTrue(holdbacksArray[i].amount.isRequired) && (!hasValue(holdbacksArray[i].amount.value) || parseFloat(holdbacksArray[i].amount.value) <= 0)) {
                                return $scope.labels.holdbackRequireAmountError;
                            }
                        }
                    }
                }
                return true;
            };

            var validateInvoices = function(invoiceArray) {
                var count = invoiceArray.length ? invoiceArray.filter(function(obj) {
                        return !obj.isFlaggedForDelete;
                    }).length : 0;

                if (count > $scope.maxInvoicesCount) {
                    return $scope.labels.invoiceMaxCountExceededError;
                }

                return true;
            };

            var validateCommissionItems = function(commissionItemsArray) {
                if (commissionItemsArray && commissionItemsArray.length) {
                    for (var i = 0; i < commissionItemsArray.length; i++) {
                        if (commissionItemsArray[i].isFlaggedForDelete !== true) {
                            if (isValueTrue(commissionItemsArray[i].description.isRequired) && !hasValue(commissionItemsArray[i].description.value)) {
                                // Not all description fields have been entered
                                return $scope.labels.commissionDetailsError;
                            }
                            if (isValueTrue(commissionItemsArray[i].rateType.isRequired) && !hasValue(commissionItemsArray[i].rateType.value)) {
                                // Not all rateType fields have been entered
                                return $scope.labels.commissionTypeError;
                            }
                            if ((isValueTrue(commissionItemsArray[i].commissionPercent.isRequired) && !hasValue(commissionItemsArray[i].commissionPercent.value))
                                && (isValueTrue(commissionItemsArray[i].commissionRate.isRequired) && !hasValue(commissionItemsArray[i].commissionRate.value))
                            ) {
                                // missing the rate field value
                                return $scope.labels.commissionRateError;
                            }
                            if (commissionItemsArray[i].startDate && commissionItemsArray[i].startDate.value === INVALID_DATE_STRING) {
                                // invalid start date on lease
                                return $scope.labels.commissionDateError;
                            }
                            if (commissionItemsArray[i].startDate && isValueTrue(commissionItemsArray[i].startDate.isRequired)
                                && commissionItemsArray[i].recordType !== LEASE_OTHER_RECORD_TYPE
                                && !hasValue(commissionItemsArray[i].startDate.value)) {
                                // missing start date on lease
                                return $scope.labels.commissionStartDateRequiredError;
                            }
                            if (commissionItemsArray[i].endDate && commissionItemsArray[i].endDate.value === INVALID_DATE_STRING) {
                                // invalid end date on lease
                                return $scope.labels.commissionDateError;
                            }
                            if (commissionItemsArray[i].endDate
                                && commissionItemsArray[i].recordType !== LEASE_OTHER_RECORD_TYPE
                                && isValueTrue(commissionItemsArray[i].endDate.isRequired) && !hasValue(commissionItemsArray[i].endDate.value)) {
                                // missing end date on lease
                                return $scope.labels.commissionEndDateRequiredError;
                            }
                            if (commissionItemsArray[i].quantity
                                && commissionItemsArray[i].recordType !== LEASE_OTHER_RECORD_TYPE
                                && isValueTrue(commissionItemsArray[i].quantity.isRequired) && !hasValue(commissionItemsArray[i].quantity.value)) {
                                return $scope.labels.commissionMonthYearError;
                            }
                            if (commissionItemsArray[i].squareFootage
                                && commissionItemsArray[i].recordType !== LEASE_OTHER_RECORD_TYPE
                                && isValueTrue(commissionItemsArray[i].squareFootage.isRequired) && !hasValue(commissionItemsArray[i].squareFootage.value)) {
                                return $scope.labels.commissionAreaError;
                            }
                            if (commissionItemsArray[i].amount
                                && commissionItemsArray[i].recordType !== LEASE_OTHER_RECORD_TYPE
                                && isValueTrue(commissionItemsArray[i].amount.isRequired) && !hasValue(commissionItemsArray[i].amount.value)) {
                                return $scope.labels.commissionAmountError;
                            }
                        }
                    }
                }
                return true;
            };

            $scope.checkPrimaryBrokerSegmentationValues = function() {
            var id = appConfig.compId;
            if (id) {
                    remoteActions.isSegmentationChangeRequired(JSON.stringify({
                        costCenterId: $scope.costCenterId,
                        departmentId: $scope.departmentId,
                        subsidiaryId: $scope.subsidiaryId,
                        categoryId: $scope.categoryId,
                        primaryBroker: $scope.primaryBroker.broker.value
                    })).then(function(result) {
                        $scope.segmentData = {};
                        if (result) {
                            $scope.segmentData = JSON.parse(result.replace(/&quot;/g, '"'));
                            if ($scope.segmentData.isSegmentationChangeRequired === 'true') {
                                $scope.errorMessageSegmentation = $scope.labels.segmentationMisMatchNotification;
                            }
                        }
                    });
                }
            };
            $scope.applySegmentationChange = function() {
                $scope.isLoading = true;
                var id = appConfig.compId;
                if (id) {
                        $scope.errorMessageSegmentation = null;
                        $scope.isLoading = false;

                        if ($scope.subsidiaryId !== $scope.segmentData.primaryBrokerAccountingSubsidiary) {
                            invoiceHelper.clearNsBillTos($scope);
                        }

                        $scope.primaryBrokerAccountingSubsidiary = $scope.segmentData.primaryBrokerAccountingSubsidiary;
                        $scope.primaryBrokerAccountingCategory = $scope.segmentData.primaryBrokerAccountingCategory;
                        $scope.primaryBrokerAccountingCostCenter = $scope.segmentData.primaryBrokerAccountingCostCenter;
                        $scope.primaryBrokerAccountingDepartment = $scope.segmentData.primaryBrokerAccountingDepartment;

                }
            };

            this.back = function() {
                $scope.navigateTo('summary');
            };

            var app = this;

            this.save = function(doContinue, previousStatus, processForApproval) {
                var deferred = $q.defer();
                $scope.isLoading = true;
                scope.processForApproval = processForApproval;

                invoiceHelper.setProformaCommissionPercentsAndAmounts($scope.invoices, $scope);
                updateCompWrapperFromScope($scope);
                $scope.errorMessage = null;

                var refreshJsonCompWrapper = function(result) {
                    window.scrollTo(0, 0);
                    $scope.isLoading = false;
                    var jsonReturned;

                    if (result.error) {
                        result = result.error;
                    }

                    try {
                        compWrapper = jsonReturned = JSON.parse(result);
                        invoiceHelper.invoices = compWrapper.invoices;

                        $scope.safeApply(function() {
                            updateScopeFromCompWrapper($scope, jsonReturned);
                            updateInvoiceClassifications($scope);
                            setPropertyRequired($scope);
                            isCompWrapperLoading = true;
                            $timeout(function() {
                                updateCompWrapperFromScope($scope, false);
                                compWrapper = appConfig.compWrapper;
                                setApprovalProperties($scope);
                                checkHideShowGroup();
                                isCompWrapperLoading = false;
                            }, 1000);
                        });
                    } catch (err) {
                        $scope.errorMessage = result.replace(/^(.*)?Exception: /, '');

                        if (previousStatus) {
                            $scope.approvalStatus.value = previousStatus;
                        }
                        deferred.reject(result);
                        return;
                    }

                    if (scope.processForApproval) {
                        scope.renderApproval = false;
                    }

                    if (doContinue) {
                        var pageIndex = $scope.pages.indexOf($scope.page);
                        if (pageIndex < $scope.pages.length - 1) {
                            $scope.setPage($scope.pages[pageIndex + 1], false);
                        }
                    }

                    deferred.resolve(result);
                }; // end refresh

                // Check for required commission item descriptions
                var commissionItemsValidated = true, str, n, holdbacksValidated = true, invoicesValidated = true;
                var errors = [];

                if (appConfig.compWrapper.commissionItems) {
                    // Remove any temp ids.  Temp id resolves duplicate ng-repeat error when adding new commission items
                    if (appConfig.compWrapper.commissionItems) {
                        for (var i = appConfig.compWrapper.commissionItems.length - 1; i >= 0; i--) {
                            str = appConfig.compWrapper.commissionItems[i].id;
                            n = str.indexOf("TEMPID");
                            if (n >= 0) {
                                // If temp id exists just set it back to null
                                appConfig.compWrapper.commissionItems[i].id = null;
                            }
                        }
                    }
                    if (appConfig.compWrapper.invoices) {
                        for (var j = appConfig.compWrapper.invoices.length - 1; j >= 0; j--) {
                            var invoice = appConfig.compWrapper.invoices[j];
                            if (invoice.overTheTermCommissionItem) {
                                str = invoice.overTheTermCommissionItem.value;
                                if (str) {
                                    n = str.indexOf("TEMPID");
                                    if (n >= 0) {
                                        // If temp id exists just set it back to null
                                        appConfig.compWrapper.invoices[j].overTheTermCommissionItem.value = null;
                                    }
                                }
                            }
                        }
                    }
                    commissionItemsValidated = validateCommissionItems(appConfig.compWrapper.commissionItems);
                    if (commissionItemsValidated !== true) {
                        errors.push(commissionItemsValidated);
                    }
                }

                /* COMMENTED OUT - Uncommenting this will set all Commissions to "Amount" and force specific numbers,
                                   which can be useful for speeding up penny rounding downstream
                // Set all Commissions to 'Amount' so penny rounding doesn't have to deal with Commission Rounding too
                if (appConfig.compWrapper.brokers && appConfig.compWrapper.brokers.length) {
                    appConfig.compWrapper.brokers.forEach(function(broker) {
                        broker.commissionType = 'Amount';
                    });
                }
                */

                if ($scope.visibleHoldbacks && $scope.visibleHoldbacks.length) {
                    holdbacksValidated = validateHoldbacks($scope.visibleHoldbacks);
                    if (holdbacksValidated !== true) {
                        errors.push(holdbacksValidated);
                    }
                }

                if ($scope.invoices && $scope.invoices.length) {
                    invoicesValidated = validateInvoices($scope.invoices);
                    if (invoicesValidated !== true) {
                        errors.push(invoicesValidated);
                    }
                }

                if (errors.length) {
                    $scope.isLoading = false;
                    $scope.errorMessage = errors.join('<br>');
                    deferred.reject('Error');
                } else {
                    if ($scope.isComp && $scope.recordType.value === LEASE_RECORD_TYPE && $scope.rentType.value === null && $scope.showRPDealWizard && $scope.commissionItems.length >= 1) {
                        $scope.isLoading = false;
                        $scope.errorMessage = $scope.labels.rateTypeRequired;
                        deferred.reject('Error');
                    } else if (checkForDuplicateBrokers($scope)) {
                        $scope.isLoading = false;
                        $scope.errorMessage = scope.labels.dupeBrokersError;
                        deferred.reject('Error');
                    } else {
                        remoteActions.save(appConfig.compWrapper, resourceUrls)
                            .then(function(result) {
                                if (result === 'success') {
                                    cachedDeletedItems.length = 0;
                                    if (scope.approvalStatus && scope.approvalStatus.value === APPROVED_STATUS && (!appConfig.appName || appConfig.appName === DEAL_WIZARD_APP)) {
                                        netSuiteStatusAsync.getStatus([$scope.id]).then(function() {
                                            remoteActions.getJsonCompWrapper().then(refreshJsonCompWrapper);
                                        }, function() {
                                            $scope.isLoading = false;
                                        });
                                    } else {
                                        remoteActions.getJsonCompWrapper().then(refreshJsonCompWrapper);
                                    }
                                } else {
                                    restoreDeletedItems();

                                    $scope.isLoading = false;

                                    if (result.error) {
                                        result = result.error;
                                    }

                                    $scope.errorMessage = result.replace(/^(.*)?Exception: /, '');
                                    scope.newTab.document.write('Something went wrong');
                                    scope.newTab.alert('Your print job cannot be completed. Please resolve the error and reprint the deal: '+$scope.errorMessage);
                                    $scope.errorMessage = $scope.errorMessage.indexOf($scope.labels.unableToObtain) !== -1
                                        ? $scope.labels.recordLock1
                                        + ' ' + $scope.labels.recordLock2
                                        + ' ' + $scope.labels.recordLock3
                                        : $scope.errorMessage;

                                    deferred.reject(result);
                                }
                        });
                    }
                }

                window.scrollTo(0, 0);
                return deferred.promise;
            };

            this.getPage = function() {
                return $scope.page;
            };

            this.setPage = $scope.setPage = function(pageName, doSave) {
                // if we aren't in the deal wizard, the redirect to it
                if ($scope.appName === EDIT_INVOICE_APP) {
                    var idParts = location.search.match(/id=([^&]*)/);
                    var id = (idParts && idParts.length > 0) ? idParts[1] : '';
                    window.top.location = resourceUrls.salesforceBase + 'apex/CustomDealWizard?id=' + id;
                    return;
                }

                var assignPage = function(pageName) {
                    $scope.page = pageName;
                    $scope.isSummary = pageName.indexOf('summary')!==-1;
                };

                if (doSave) {
                    app.save(false)
                        .catch(function() { }) // Do nothing, scope.errorMessage set in save function - but we still want to be able to navigate to a new page
                        .then(function(result) {
                            assignPage(pageName);
                        });
                } else {
                    if (pageName==='invoices') {
                        checkHideShowGroup();
                    }
                    assignPage(pageName);
                }
            };

            this.close = $scope.close = function() {
                if (typeof sforce != "undefined") {
                    sforce.one.back(true);
                } else {
                    var idParts = location.search.match(/id=([^&]*)/);
                    var id = (idParts && idParts.length > 0) ? idParts[1] : '';
                    window.top.location = resourceUrls.salesforceBase + id;
                }
            };

            $scope.setAyClient = function(company) {
                $scope.ayClient.displayValue = company.displayValue;
                $scope.ayClient.value = company.value;
            };

            this.getUserProfileName = function() {
                return $scope.userProfileName;
            };

            window.scope = $scope;

            window.onbeforeunload = function() {
                if (!isCompWrapperLoading && isScopeChanged($scope, compWrapper)) {
                    return 'Warning: If you leave this page, you will lose any unsaved changes.';
                }
                return null;
            };
        }
    }
})

.directive('dealNavigation', function(resourceUrls) {
    return {
        restrict: 'E',

        require: '^dealWizard',

        templateUrl: resourceUrls.wizardTemplateBase + '/deal-navigation.html',

        link: function(scope, element, attrs, dealWizardCtrl) {
            scope.page = dealWizardCtrl.getPage();

            scope.navigateTo = function(pageName) {
                if (scope.disabled && pageName !== 'Summary') {
                    return;
                }
                dealWizardCtrl.setPage(pageName, false);
            };

            getScope = function() {
                return scope;
            };
        }
    }
})

.directive('dealButtons', function(appConfig, netSuiteStatusAsync, netSuiteStatusConfig, resourceUrls, remoteActions) {
    return {
        restrict: 'E',

        require: '^dealWizard',

        templateUrl: resourceUrls.wizardTemplateBase + '/deal-buttons.html',

        link: function(scope, element, attrs, dealWizardCtrl) {
            scope.page = dealWizardCtrl.getPage();
            scope.imageBase = resourceUrls.vfHelperBase + '/img';
            scope.cancel = dealWizardCtrl.close;
            scope.labels = appConfig.labels;

            scope.back = function() {
                dealWizardCtrl.back();
            };

            scope.save = function(doContinue) {
                dealWizardCtrl.save(doContinue, null, false)
                    .then(function() {
                        if (appConfig.closeAfterSave) {
                            scope.cancel();
                        }
                    });
            };

            scope.saveandPrint = function(doContinue, dealId) {
                scope.newTab = window.open('', '_blank');
                scope.newTab.document.write('Loading preview...');
                dealWizardCtrl.save(doContinue, null, false)
                .then(function() {
                    if (appConfig.closeAfterSave) {
                        scope.cancel();
                    }
                    scope.newTab.location.href = window.location.host + 'apex/CustomDealWizard?id=' + dealId+'&print=true';
                });
            };

            scope.reject = function() {
                scope.approvalTitle = scope.labels.rejectDeal;
                scope.rejectionMessage = scope.labels.rejectReason;
            };

            scope.closeModal = function() {
                scope.approvalTitle = null;
                scope.approvalMessage = null;
                scope.rejectionMessage = null;
            };

            scope.submit = function(approved, initialProcessing) {
                dealWizardCtrl.save(false, null, false)
                    .then(function() {
                        var ayBrokersPopulated = true;
                        for (var i = 0; i < scope.holdbacks.length; i++) {
                            var holdback = scope.holdbacks[i];
                            if (!holdback.broker.value && holdback.type.value === holdback.otbeRecordTypeId) {
                                ayBrokersPopulated = false;
                            }
                        }
                        if (ayBrokersPopulated) {
                            if (scope.documentStatus === scope.labels.docsComplete || !scope.showRPDealWizard || !approved) {
                                scope.rejectionMessage = null;
                                scope.rejected = !approved;
                                dealWizardCtrl.save(false, null, true)
                                    .then(function() {
                                        scope.approvalTitle = approved ? scope.labels.approveDeal : scope.labels.rejectDeal;
                                        if (scope.approvalStatus.value !== APPROVED_STATUS) {
                                            if (approved) {
                                                scope.approvalMessage = initialProcessing === false ? scope.labels.youHaveApproved + ' ' + scope.approvalStatus.value
                                                    : scope.labels.brokerSubmissionNotice + ' ' + scope.approvalStatus.value;
                                            } else {
                                                scope.approvalMessage = scope.labels.youHaveRejected + ' ' + scope.approvalStatus.value;
                                            }
                                        } else {
                                            // Setting scope.approvalMessage pops the "Deal Approved" modal.
                                            // Calling netSuiteStatusAsync.getStatus pops the Invoice Sync modal.
                                            // This ordering must be maintained for z-position reasons.
                                            scope.approvalMessage = scope.labels.dealApproved;
                                            netSuiteStatusAsync.getStatus([scope.id]).then(function() {
                                                remoteActions.getJsonCompWrapper().then();
                                            }, function() {
                                                $scope.isLoading = false;
                                            });
                                        }
                                    });
                            } else if (scope.showRPDealWizard) {
                                scope.errorMessage = scope.labels.docsNotComplete;
                            }
                        } else {
                            scope.errorMessage = scope.labels.ayBrokerNeeded;
                        }

                        if (appConfig.closeAfterSave) {
                            scope.cancel();
                        }
                    }
                );
            };
        }
    }
});