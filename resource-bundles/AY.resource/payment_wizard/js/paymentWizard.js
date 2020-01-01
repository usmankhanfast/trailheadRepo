app.directive('paymentWizard', function($q, appConfig, remoteActions, resourceUrls, utils, $timeout) {

    var setScopeProperties = function(scope) {
        scope.pages = [
            'newPayment',
            'allocatePayments',
            'payInvoices',
            'payCommissions'
        ];
        scope.page = scope.pages[0];
        scope.primaryBroker = '';
        scope.getNetSuiteData = appConfig.actions.getNetSuiteData;

        scope.unappliedAmount = 0;
        scope.totalPayments = 0;
        scope.appliedPayments = 0;

        scope.newPaymentTemplate = resourceUrls.templateBase + '/new-payment.html';
        scope.allocatePaymentsTemplate = resourceUrls.templateBase + '/allocate-payments.html';
        scope.payInvoicesTableTemplate = resourceUrls.templateBase + '/pay-invoices-table.html';

        scope.appName = appConfig.appName;
        scope.labels = appConfig.labels;
        scope.allPaymentsSelected = false;
        scope.selectedInvoice = null;
        scope.invoiceId = appConfig.invoiceId;
        scope.dealApprovalStatus = appConfig.dealApprovalStatus;
        scope.editingNewPayment = false;
        scope.newPayment = null;
        scope.totalProgress = 0;
        scope.batchStatus = 'Not Started';
        scope.lastBalance = {
            value: 0.0,
            type: 'CURRENCY_TYPE',
            isRequired: false,
            isNillable: null,
            helpText: null,
            displayValue: 0.0
        };
        scope.syncError = null;
        scope.syncDone = false;
        scope.imgLocation = resourceUrls.vfHelperBase + '/img';
        scope.queryBalanceResult = null;
        scope.lastStatus = null;
        scope.process = null;
        scope.workingPayment = null;
        scope.renderWizard = false;
        scope.isApprovedDeal = true;
        utils.setUserLocale(appConfig.paymentWrapper.userLocale);
        populateInvoiceIds(scope);
    };

    var populateInvoiceIds = function(scope) {
        scope.contextInvoiceIds = null;
        if (appConfig.contextInvoiceIds && appConfig.contextInvoiceIds.length >= 15) {
            scope.contextInvoiceIds = appConfig.contextInvoiceIds.split(',');
        }

        if (scope.contextInvoiceIds) {
            scope.renderWizard = true;
        } else {
            scope.renderWizard = false;
        }
    };

    var toggleAllRelatedPayments = function(scope) {
        if (scope.relatedPayments && scope.relatedPayments.length > 0) {
            scope.allPaymentsSelected = !scope.allPaymentsSelected;
            scope.relatedPayments.forEach( function(payment) {
                payment.selected = scope.allPaymentsSelected;
            } );
        }
    };

    var updateRelatedPayments = function(scope, currency, billTo, clearErrorMessage) {
        if (clearErrorMessage) {
            scope.errorMessage = null;
        }
        scope.isLoading = true;
        remoteActions.getRelatedPayments(currency, billTo)
            .then(function(result) {
                scope.isLoading = false;
                if (!result || typeof(result) === "string") {
                    scope.errorMessage = scope.errorMessage || '';
                    scope.errorMessage += ' ' + result;
                    scope.relatedPayments = [];
                } else if (result && result.constructor === Array) {
                    scope.relatedPayments = result;
                } else {
                    scope.relatedPayments = [];
                }

                scope.relatedPayments.forEach( function(pmnt) {
                    pmnt.selected = false; //so it can be watched
                } );
            });
    };

    var watchCurrencyAndBillTo = function(scope) {
        scope.$watch(
            'nsBillTo.value',
            function(newId, oldId) {
                if (newId === oldId) {
                    return;
                }
                updateRelatedPayments(scope, scope.currencyIsoCode.value, newId, true);
            }
        );
        scope.$watch(
            'currencyIsoCode.value',
            function(newId, oldId) {
                if (newId === oldId) {
                    return;
                }
                updateRelatedPayments(scope, newId, scope.nsBillTo.value, true);
            }
        );
    };

    var watchPaymentValue = function(scope) {
        scope.$watch(
            'paymentAmount.value',
            function(newValue, oldValue) {
                if (newValue === oldValue) {
                    return;
                }
                updatePaymentTotalInformation(scope);
            }
        );
    };

    var toggleEditingNewPayment = function($scope) {
        scope.editingNewPayment = !scope.editingNewPayment;
    };

    var toggleIsProcessing = function(scope) {
        scope.isProcessing = !scope.isProcessing;
    };

    var recalculatePaymentTotal = function(scope) {
        updatePaymentTotalInformation(scope);
    };

    var updatePaymentTotalInformation = function(scope) {
        var newPaymentValue = (scope.nsBalance && scope.nsBalance.value) ? scope.nsBalance.value : 0,
            totalSelectedPaymentCredits = 0;

        if (scope.relatedPayments && scope.relatedPayments.constructor === Array) {
            scope.relatedPayments.forEach( function(payment) {
                if (payment.selected && payment.nsBalance && payment.nsBalance.value) {
                    totalSelectedPaymentCredits += payment.nsBalance.value;
                }
            });
        }

        scope.totalSelectedPaymentCredits = totalSelectedPaymentCredits;
        scope.allSelectedPaymentCredits = totalSelectedPaymentCredits + newPaymentValue;
    };

    var handleAllocationClose = function(scope) {
        scope.selectedInvoice = null;
    };

    var updatePaymentWrapperFromScope = function(scope) {
        for (var key in appConfig.paymentWrapper) {
            if (appConfig.paymentWrapper.hasOwnProperty(key)) {
                appConfig.paymentWrapper[key] = angular.copy(scope[key]);
            }
        }
    };

    var updateScopeFromPaymentWrapper = function(scope, paymentWrapper) {
        for (var key in paymentWrapper) {
            if (paymentWrapper.hasOwnProperty(key)) {
                scope[key] = angular.copy(paymentWrapper[key]);
            }
        }
    };

    var combinePaymentList = function(scope, newPayment) {
        scope.selectedPayments = (newPayment) ? [newPayment] : [];
        if (scope.relatedPayments && scope.relatedPayments.length > 0) {
            scope.relatedPayments.forEach( function(pmnt) {
                if (pmnt.selected) {
                    scope.selectedPayments.push(pmnt);
                }
            });
        }
    };

    var gotoStep2WithNewPayment = function(scope, newPayment) {
        if (newPayment) {
            updateScopeFromPaymentWrapper(scope, newPayment);
        }
        combinePaymentList(scope, newPayment);
        scope.totalPayments = newPayment.nsBalance.value;
        scope.currencySymbol = scope.selectedPayments[0].nsBalance.currencySymbol;
        getInvoices(scope);
        scope.page = 'allocatePayments';
    };

    var getInvoices = function(scope) {
        var deferred = $q.defer();
        scope.isLoading = true;
        scope.contextInvoices = null; //may need to change.
        if (scope.invoiceId && scope.invoiceId !== 'null') {
            scope.contextInvoices = [].push(scope.invoiceId);
        }
        var currencyIsoCode = scope.currencyIsoCode.value,
            nsBillTo = scope.nsBillTo.value;

        var includeWriteOffPayments = scope.paymentType.value === 'Write-Off';
        remoteActions.getInvoices(scope.contextInvoiceIds, currencyIsoCode, nsBillTo, includeWriteOffPayments)
            .then(function(result) {
                scope.safeApply(function() {
                    var i = 0;
                    scope.isLoading = false;
                    scope.contextInvoices = (result && result.constructor === Array) ? result : null;
                    if (scope.contextInvoices) {
                        scope.contextInvoiceIds = [];
                        for (i = 0; i < scope.contextInvoices.length; i++) {
                            var contextInvoice = scope.contextInvoices[i];

                            contextInvoice.compId = contextInvoice.saleId;  // the InvoiceAllocations class uses compId, not saleId
                            scope.contextInvoiceIds.push(contextInvoice.id);
                        }
                    }
                    getDefaultAllocations(scope); //may need to move this below following if statement
                    if (scope.contextInvoices.length === 1) {
                        setSelectedInvoice(scope, scope.contextInvoices[0]);
                    }
                });
                deferred.resolve(result);
            });

        return deferred.promise;
    };

    var getDefaultAllocations = function(scope) {
        scope.isLoading = true;
        scope.errorMessage = null;

        remoteActions.getDefaultAllocations(scope.contextInvoiceIds)
            .then(function(result) {
                scope.isLoading = false;
                if (result && result.constructor === Array) {
                    wireChildListsToInvoices(scope, result);
                    initializeDefaultAllocationAmounts(scope);
                }
            });
    };

    var wireChildListsToInvoices = function(scope, allocationWrapperLists) {
        var invoices = scope.contextInvoices;
        var invoiceMap = {};
        invoices.forEach( function(inv) {
            var id = inv.id;
            invoiceMap[id] = inv;
        } );

        allocationWrapperLists.forEach( function(allocationObject) {
            var invoiceId = allocationObject.invoiceId;
            var invoice = invoiceMap[invoiceId];
            if (invoice) {
                invoice.invoiceId = invoiceId;
                invoice.ayBrokers = allocationObject.ayBrokers;
                invoice.clientFeeShare = allocationObject.clientFeeShare;
                invoice.coBrokers = allocationObject.coBrokers;
                invoice.expenses = allocationObject.expenses;
                invoice.primaryBrokerId = allocationObject.primaryBrokerId;
                invoice.taxes = allocationObject.taxes;
                invoice.actualTaxes = allocationObject.actualTaxes;
                initializeInvoicePaymentAmount(invoice, scope);
            }
        } );
    };

    var initializeInvoicePaymentAmount = function(invoice, scope) {
        invoice.paymentAmount = JSON.parse(JSON.stringify( invoice.amountPaid )); //initializing on the front end.
        invoice.paymentAmount.helpText = null;
        watchInvoicePaymentAmountChange(invoice, scope);
    };

    var watchInvoicePaymentAmountChange = function(invoice, scope) {
        scope[invoice.id] = invoice;
        var watchString = invoice.id + '.paymentAmount.value';
        //adding watcher this way because it will be lighter than adding a changeWatcher to the currencyOutput directive.
        scope.$watch(
            watchString,
            function(newValue, oldValue) {
                if (newValue === oldValue) {
                    return;
                }
                handleInvoicePaymentAmountChange(scope, invoice);
            }
        );
    };

    var initializeDefaultAllocationAmounts = function(scope) {
        var totalPaymentValue = scope.selectedPayments[0].nsBalance.value;
        var selectedPaymentWrappers = scope.selectedPayments;
        var invoices = scope.contextInvoices;

        if (invoices) {
            invoices.forEach(function(invoice) {
                if (invoice.realBalanceDue.value < totalPaymentValue) {
                    invoice.paymentAmount.value = invoice.realBalanceDue.value;
                    totalPaymentValue -= invoice.paymentAmount.value;
                } else if (totalPaymentValue > 0) {
                    invoice.paymentAmount.value = totalPaymentValue;
                    totalPaymentValue = 0;
                } else if (totalPaymentValue === 0) {
                    invoice.paymentAmount.value = totalPaymentValue;
                }
            });
            invoices.forEach(function(invoice) {
                handleInvoicePaymentAmountChange(scope, invoice);
                updateInvoiceParentPaymentCalculations(scope, invoice);
                updateInvoiceStatus(invoice, true, false, scope);
                generateSuperExpenses(invoice);
                recalculateAllUnappliedAmount(scope);
            });
        }
    };

    var handleInvoicePaymentAmountChange = function(scope, invoice) {
        invoice.paymentPercent = 0;
        var realBalanceDue = invoice.realBalanceDue.value;
        var paymentAmnt = invoice.paymentAmount.value;
        invoice.paymentPercent = (realBalanceDue && realBalanceDue > 0) ? paymentAmnt / realBalanceDue : 0;
        invoice.balancePercent = (invoice.total.value > 0 && invoice.realBalanceDue.value > 0) ? realBalanceDue / invoice.total.value : 0;

        if (invoice.expenses) {
            initChildAllocationValues(invoice.expenses, invoice);
        }
        if (invoice.ayBrokers) {
            initChildAllocationValues(invoice.ayBrokers, invoice);
            initChildRatios(invoice.ayBrokers, invoice, invoice.expenses);
        }
        if (invoice.clientFeeShare) {
            initChildAllocationValues(invoice.clientFeeShare, invoice);
            initChildRatios(invoice.clientFeeShare, invoice, invoice.expenses);
        }
        if (invoice.coBrokers) {
            initChildAllocationValues(invoice.coBrokers, invoice);
            initChildRatios(invoice.coBrokers, invoice, invoice.expenses);
        }
        if (invoice.taxes) {
            initChildAllocationValues(invoice.taxes, invoice);
        }
        if (invoice.actualTaxes) {
            initChildAllocationValues(
                invoice.actualTaxes,
                invoice,
                invoice.taxes ? getSumOfAllocationAmounts(invoice.taxes) : 0
            );
        }

        handleChildPaymentAmountChange(scope, invoice, true);
    };

    var getSumOfAllocationAmounts = function(allocations) {
        var sum = 0;
        if (allocations.length) {
            allocations.forEach(function(obj) {
                sum += obj.amount.value;
            });
        }
        return sum;
    };

    // if we are off by a penny add or subtract if from the first allocation
    var distributePennyToFirstAllocation = function(allocations, target) {
        var total = 0, diff = 0;
        target = round(target, 2);
        if (allocations.length) {
            allocations.forEach(function(obj) {
                total += obj.amount.value;
            });
            total = round(total, 2);
            diff = round(total - target, 2);
            if (diff === -0.01) {
                allocations[0].amount.value = round(allocations[0].amount.value + 0.01, 2);
            } else if (diff === 0.01) {
                allocations[0].amount.value = round(allocations[0].amount.value - 0.01, 2);
            }
        }
    };

    var initChildAllocationValues = function(childArray, invoice, target) {
        childArray.forEach(function(child) {
            if (child.isTax) {
                child.amount.value = round((child.balance / invoice.paymentAmount.value) * ((invoice.paymentAmount.value / invoice.realBalanceDue.value) * invoice.paymentAmount.value), 2);

                if (round(child.due, 2) === child.amount.value) {
                    child.calculatedBalance = 0;
                } else {
                    child.calculatedBalance = round(child.due - child.amount.value, 2);
                }
            } else {
                child.amount.value = round((invoice.paymentAmount.value / invoice.realBalanceDue.value) * child.due, 2);
            }
        });

        if (target && target > 0) {
            distributePennyToFirstAllocation(childArray, target);
            handleChildPaymentAmountChange(scope, invoice, true);
        }
    };

    var initChildRatios = function(childArray, invoice, subChildArray) {
        childArray.forEach( function(child) {
            if (child.isCommission) {
                subChildArray.forEach( function(subChild) {
                    if (subChild.isExpense && subChild.commissionId === child.commissionId && !subChild.ratio) {
                        subChild.ratio = subChild.due / child.due;
                    }
                });
            }
        });
    };

    var round = function(value, decimals) {
        return Number(Math.round(parseFloat(value)+'e'+decimals)+'e-'+decimals);
    };

    var handleChildPaymentAmountChange = function(scope, invoice, handleAYBrokerRounding) {
        updateInvoiceParentPaymentCalculations(scope, invoice);
        recalculateAllUnappliedAmount(scope);
        var isOverallocated = false;

        if (scope.selectedInvoice && scope.selectedInvoice.clientFeeShare) {
            scope.selectedInvoice.clientFeeShare.forEach( function(clientFee) {
                clientFee.calculatedBalance = round(clientFee.due - clientFee.amount.value, 2);
                if (clientFee.balance < clientFee.amount.value || clientFee.amount.value > clientFee.total) {
                    isOverallocated = true;
                    clientFee.isOverallocated = true;
                } else {
                    clientFee.isOverallocated = false;
                }
                updateChildExpenseCalculations(clientFee, invoice.expenses);
            });
        }
        if (scope.selectedInvoice && scope.selectedInvoice.ayBrokers) {
            scope.selectedInvoice.ayBrokers.forEach( function(ayBroker) {
                ayBroker.calculatedBalance = round(ayBroker.due - ayBroker.amount.value, 2);
                if (ayBroker.balance < ayBroker.amount.value || ayBroker.amount.value > ayBroker.total) {
                    isOverallocated = true;
                    ayBroker.isOverallocated = true;
                } else {
                    ayBroker.isOverallocated = false;
                }
                updateChildExpenseCalculations(ayBroker, invoice.expenses);
            });
        }
        if (scope.selectedInvoice && scope.selectedInvoice.coBrokers) {
            scope.selectedInvoice.coBrokers.forEach( function(coBroker) {
                coBroker.calculatedBalance = round(coBroker.due - coBroker.amount.value, 2);
                if (coBroker.balance < coBroker.amount.value || coBroker.amount.value > coBroker.total) {
                    isOverallocated = true;
                    coBroker.isOverallocated = true;
                } else {
                    coBroker.isOverallocated = false;
                }
                updateChildExpenseCalculations(coBroker, invoice.expenses);
            });
        }

        generateSuperExpenses(invoice);
        updateInvoiceStatus(invoice, handleAYBrokerRounding, isOverallocated, scope);
    };

    var handleChildExpenseAmountChange = function(scope, superExpense, invoice) {
        var isOverallocated = false;
        superExpense.calculatedBalance = superExpense.due - superExpense.amt.value;
        if (superExpense.balance < superExpense.amt.value) {
            isOverallocated = true;
            superExpense.isOverallocated = true;
        } else {
            superExpense.isOverallocated = false;
        }
        updateChildOfSuperExpenseCalculations(superExpense, invoice.expenses);
        updateInvoiceStatus(invoice, false, isOverallocated, scope);
    };

    var updateChildExpenseCalculations = function(parent, childArray) {
        if (childArray) {
            childArray.forEach( function(child) {
                if (child.isExpense && child.commissionId === parent.commissionId && child.ratio !== Infinity) {
                    child.amount.value = round(child.ratio * parent.amount.value, 2);
                    child.amount.value = child.amount.value > child.balance ? child.balance : child.amount.value;
                    if (parent.amount.value <= parent.due && child.amount.value > child.due) {
                        child.amount.value = child.due;
                    }
                    child.calculatedBalance = round(child.due - child.amount.value, 2);
                }
            });
        }
    };

    var updateChildOfSuperExpenseCalculations = function(parent, childArray) {
        if (childArray) {
            childArray.forEach( function(child) {
                if (child.linkingId === parent.id) {
                    child.amount.value = round((((child.balance / parent.balance) * parent.amt.value)), 2);
                }
            });
        }
    };

    var generateSuperExpenses = function(invoice) {

        if (invoice.expenses) {
            if (invoice.superExpenses) {
                invoice.superExpenses = null;
            }

            var ayOTTE = [];
            var otbe = [];
            var sharedOTTE = [];

            invoice.expenses.forEach( function(child) {
                if (child.recordTypeName === 'House') {
                    ayOTTE.push(child);
                }
                if (child.recordTypeName === 'Agent') {
                    otbe.push(child);
                }
                if (child.recordTypeName === 'Deal') {
                    sharedOTTE.push(child);
                }
            });

            if (ayOTTE.length > 0) {
                createSuperExpense('AY OTTE', ayOTTE, invoice);
            }
            if (otbe.length > 0) {
                createSuperExpense('OTBE', otbe, invoice);
            }
            if (sharedOTTE.length > 0) {
                createSuperExpense('Shared OTTE', sharedOTTE, invoice);
            }
        }
    };

    var createSuperExpense = function(type, expenseArray, invoice) {

        if (expenseArray) {
            var superExpense;
            expenseArray.forEach( function(child) {
                if (!superExpense) {
                    superExpense = {
                        total : child.total,
                        balance : child.balance,
                        due : child.due,
                        previousPayment : child.previousPayment,
                        calculatedBalance : child.calculatedBalance,
                        amt : child.amount,
                        type : type,
                        ratio: 1,
                        isOverallocated : false,
                        id : child.commissionId + ' ' + child.type
                    };
                    child.amount.value = round(child.amount.value, 2);
                    child.linkingId = superExpense.id;
                    superExpense = angular.copy(superExpense);
                } else {
                    superExpense.total += child.total;
                    superExpense.balance += child.balance;
                    superExpense.due += child.due;
                    superExpense.previousPayment += child.previousPayment;
                    superExpense.calculatedBalance += child.calculatedBalance;
                    superExpense.amt.value += round(child.amount.value, 2);
                    child.linkingId = superExpense.id;
                }
            });
            superExpense.amt.value = round(superExpense.amt.value, 2);
            superExpense.amt.value = superExpense.amt.value > superExpense.balance ? superExpense.balance : superExpense.amt.value;
            if (!invoice.superExpenses) {
                invoice.superExpenses = [];
            }
            invoice.superExpenses.push(superExpense);
        }
    };

    var updateInvoiceParentPaymentCalculations = function(scope, invoice) {
        var paymentAmount = (invoice.paymentAmount) ? invoice.paymentAmount.value : 0;
        var unallocatedAmount = 0;

        if (invoice.ayBrokers) {
            unallocatedAmount += getChildArrayPaymentTotal(invoice.ayBrokers);
        }
        if (invoice.clientFeeShare) {
            unallocatedAmount += getChildArrayPaymentTotal(invoice.clientFeeShare);
        }
        if (invoice.coBrokers) {
            unallocatedAmount += getChildArrayPaymentTotal(invoice.coBrokers);
        }
        if (invoice.expenses) {
            //unallocatedAmount += getChildArrayPaymentTotal(invoice.expenses); // currently, expenses are allocated in addition to invoice and subtracted via callidus
        }
        if (invoice.taxes) {
            unallocatedAmount += getChildArrayPaymentTotal(invoice.taxes);
        }
        if (invoice.actualTaxes) {
            //unallocatedAmount += getChildArrayPaymentTotal(invoice.actualTaxes); // currently, taxes are allocated in addition to invoice and subtracted via callidus
        }

        invoice.unallocatedAmount = parseFloat((parseFloat(invoice.paymentAmount.value).toFixed(2)) - parseFloat(unallocatedAmount).toFixed(2)).toFixed(2);
    };

    var updateInvoiceStatus = function(invoice, processRounding, isOverallocated, scope) {
        var status = scope.labels.readyAllocationStatus;
        var unallocatedAmount = round(invoice.unallocatedAmount || 0, 2);
        var roundedUnallocatedAmount = round(unallocatedAmount, 2);
        var invoicePaymentAmount = invoice.paymentAmount ? parseFloat(invoice.paymentAmount.value) : null;

        if (processRounding) {
            if (roundedUnallocatedAmount === -0.01) {
                if (invoice.ayBrokers) {
                    invoice.ayBrokers[0].amount.value = round(invoice.ayBrokers[0].amount.value - 0.01, 2);
                    unallocatedAmount = round(unallocatedAmount + 0.01, 2);
                }
            } else if (roundedUnallocatedAmount === 0.01) {
                if (invoice.ayBrokers) {
                    invoice.ayBrokers[0].amount.value = round(invoice.ayBrokers[0].amount.value + 0.01, 2);
                    unallocatedAmount = round(unallocatedAmount - 0.01, 2);
                }
            } else if (roundedUnallocatedAmount === -0.02) {
                if (invoice.ayBrokers) {
                    invoice.ayBrokers[0].amount.value = round(invoice.ayBrokers[0].amount.value - 0.02, 2);
                    unallocatedAmount = round(unallocatedAmount + 0.02, 2);
                }
            } else if (roundedUnallocatedAmount === 0.02) {
                if (invoice.ayBrokers) {
                    invoice.ayBrokers[0].amount.value = round(invoice.ayBrokers[0].amount.value + 0.02, 2);
                    unallocatedAmount = round(unallocatedAmount - 0.02, 2);
                }
            }
        }

        if (invoicePaymentAmount && invoicePaymentAmount >= 0) {
            if (unallocatedAmount > 0) {
                status = scope.labels.unallocatedAllocationStatus;
            }
            if (unallocatedAmount < 0
                || isOverallocated
                || (invoice.balanceDue && invoicePaymentAmount > round((parseFloat(invoice.balanceDue.value) + parseFloat(invoice.trustAmount.value)), 2))
            ) {
                status = scope.labels.overallocatedAllocationStatus;
            }
            if ((scope.paymentAmount && invoicePaymentAmount > parseFloat(scope.paymentAmount.value))
                || (scope.unappliedAmount && scope.unappliedAmount < 0)
            ) {
                status = scope.labels.insufficientFundsAllocationStatus;
            }
            if (!areInvoiceVendorsValid(invoice)) {
                status = scope.labels.vendorIdMissingAllocationStatus;
            }
        }

        invoice.status = status;
        invoice.unallocatedAmount = round(unallocatedAmount, 2);
    };

    var recalculateAllUnappliedAmount = function(scope) {
        var totalPayments = scope.totalPayments, i;
        scope.appliedPayments = 0;
        for (i = 0; i < scope.contextInvoices.length; i++) {
            if (scope.contextInvoices[i].paymentAmount) {
                scope.appliedPayments += +scope.contextInvoices[i].paymentAmount.value;
            }
        }
        scope.unappliedAmount = round(totalPayments - scope.appliedPayments, 2);
    };

    var areInvoiceVendorsValid = function(invoice) {
        var valid = true;

        if (invoice.clientFeeShare) {
            invoice.clientFeeShare.forEach( function(child) {
                // Invalid if nsBillTo is null/blank and total != 0
                if (child.nsBillTo) {
                    if ((child.nsBillTo.value === '' || child.nsBillTo.value === null) && child.total !== 0) {
                        valid = false;
                    }
                }
            } );
        }
        if (invoice.coBrokers) {
            invoice.coBrokers.forEach( function(child) {
                // Invalid if nsBillTo is null/blank and total != 0
                if (child.nsBillTo) {
                    if ((child.nsBillTo.value === '' || child.nsBillTo.value === null) && child.total !== 0) {
                        valid = false;
                    }
                }
            } );
        }

        return valid;
    };

    var getChildArrayPaymentTotal = function(childArray) {
        var tmpNumber,
            tmpTotal = 0;
        childArray.forEach( function(child) {
            tmpNumber = (child.amount && child.amount.value) ? child.amount.value : 0;
            tmpNumber = parseFloat(tmpNumber);
            if (isNaN(tmpNumber)) {
                tmpNumber = 0;
            }
            tmpTotal += 0 + tmpNumber;
        } );
        return round(tmpTotal, 2);
    };

    var clearValuesForStepJumping = function(scope) {
        scope.selectedInvoice = null;
    };

    var setSelectedInvoice = function(scope, invoice) {
        scope.selectedInvoice = invoice;
    };

    var addPaymentWrapperToScope = function(scope, paymentWrapper) {
        appConfig.paymentWrapper = paymentWrapper;
        angular.extend(scope, paymentWrapper);
    };

    var runFrontendSaveValidations = function(scope) {
        var stringToReturn = '';

        var paymentDate = appConfig.paymentWrapper.paymentDate,
            paymentAmount = appConfig.paymentWrapper.paymentAmount,
            paymentType = appConfig.paymentWrapper.paymentType
            nsBillTo = scope.nsBillTo.value;

        if (scope.paymentType.value === 'Write-Off' && (!scope.writeOffReason.value || scope.writeOffReason.value === '')) {
            stringToReturn = appConfig.labels.invalidPaymentWriteOffReason + '<br/>';
        }

        if (scope.paymentType.value === 'Write-Off' && scope.writeOffReason.value === 'Other (Specify)' && (!scope.writeOffExplanation.value || scope.writeOffExplanation.value === '')) {
            stringToReturn = appConfig.labels.invalidPaymentWriteOffExplanation + '<br/>';
        }

        if (paymentAmount.value > 0) {
            if (!paymentDate || paymentDate.value === null) {
                stringToReturn += scope.labels.invalidPaymentDateError + '<br />';
            } else {
                var re = /^\d{1,2}\/\d{1,2}\/\d{4}$/;
                if (!paymentDate.value.match(re)) {
                    stringToReturn += scope.labels.invalidPaymentDateFormatError + '<br />';
                }
            }
            if (!paymentType.value) {
                stringToReturn += scope.labels.paymentTypeRequiredError + '<br />';
            }
        } else {
            stringToReturn += scope.labels.paymentLessThanZeroError + '<br />';
        }

        if (!nsBillTo) {
            stringToReturn += scope.labels.netSuiteBillToRequired + '<br />';
        }

        return stringToReturn;
    };

    var goToOriginatingRecordId = function() {
        if (appConfig.originatingRecordId) {
            window.top.location = '/' + appConfig.originatingRecordId;
        }
    };

    var closeModal = function() {
        scope.isProcessing = false;
        scope.syncDone = false;
        scope.workingPayment = null;
    };

    var setPaymentWrapper = function($scope) {
        var paymentWrapper;
        try {
            paymentWrapper = JSON.parse(appConfig.jsonPaymentWrapper);
            addPaymentWrapperToScope($scope, paymentWrapper);
            updateScopeFromPaymentWrapper($scope, paymentWrapper);
        } catch (ex) {
            $scope.errorMessage = $scope.labels.paymentWizardInitializationError;
        }
    };

    var setPaymentIdToInvoiceRecords = function(scope) {
        if (scope.selectedPayments.length > 0 && scope.contextInvoices) {
            scope.contextInvoices.forEach( function(invoice) {
                invoice.paymentId = scope.selectedPayments[0].id;
            });
        }
    };



    var handleResponseParseException = function(scope, result, err) {
        if (result) {
            var rgx = /,(.*\.?)/g;
            var arr = rgx.exec(result);
            scope.errorMessage = (arr && arr.length) ? arr[1].replace(', ', '').replace(': []', '') : result;
        } else {
            scope.errorMessage = scope.labels.responseError;
        }
    };

    var validateFrontendAllocationSave = function(scope) {
        var errorString = '';
        var totalPaid = 0;
        var paymentsNotReady = false;
        var invoiceWithError = false;
        var iter = 0;
        var field;
        if (scope.selectedPayments.length > 0 && scope.contextInvoices) {
            scope.contextInvoices.forEach( function(invoice) {
                if (invoice.paymentAmount.value > 0) {
                    totalPaid += invoice.paymentAmount.value;
                    if (invoice.status !== scope.labels.readyAllocationStatus) {
                        if (!invoiceWithError) {
                            invoiceWithError = iter;
                        }
                        paymentsNotReady = true;
                    }
                }
                iter += 1;
            });
        }
        // focus on the element that has the messed up payment
        if (invoiceWithError) {
            field = document.querySelectorAll('table.invoiceTable [field="invoice.paymentAmount"] input');
            if (field.length && field[invoiceWithError]) {
                field[invoiceWithError].focus();
            }
        }

        if (scope.paymentAmount && totalPaid > parseFloat(scope.paymentAmount.value)) {
            errorString = scope.labels.invoiceAllocationsOverPaidError;
        }

        if (paymentsNotReady) {
            errorString = scope.labels.invoiceAllocationNotReadyError;
        }

        return errorString;
    };

    var reloadPage = function() {
        window.location.reload();
    };

    var saveAllocations = function(scope) {
        scope.errorMessage = null;
        setPaymentIdToInvoiceRecords(scope);

        var errorMessage = validateFrontendAllocationSave(scope);
        if (errorMessage) {
            scope.errorMessage = errorMessage;
            return;
        }

        scope.isLoading = true;
        remoteActions.saveAllocations(scope.contextInvoices)
            .then(function(result) {
                scope.isLoading = false;
                var response;
                try {
                    response = JSON.parse(result);
                    if (response.error) {
                        scope.errorMessage = response.error;
                    } else {
                        window.top.location = '/' + appConfig.originatingRecordId;
                    }
                } catch (err) {
                    handleResponseParseException(scope, result, err);
                }
            });
    };

    var checkApprovalStatus = function($scope) {
        if (appConfig && appConfig.dealApprovalStatus !== 'Approved' ) {
            $scope.errorMessage = appConfig.labels.dealNotApprovedError;
            $scope.isProcessing = false;
            $scope.isApprovedDeal = false;
        }
    };

    return {
        restrict: 'E',

        controller: function($scope, $timeout) {
            $scope.isLoading = false;

            var paymentWrapper;
            var response;
            var delay = false;
            setPaymentWrapper($scope);
            setScopeProperties($scope);
            watchCurrencyAndBillTo($scope);
            watchPaymentValue($scope);
            updatePaymentTotalInformation($scope); //to initialize props for watching
            checkApprovalStatus($scope);

            if ($scope.nsBillTo && $scope.nsBillTo.value && $scope.currencyIsoCode && $scope.currencyIsoCode.value) {
                updateRelatedPayments($scope, $scope.currencyIsoCode.value, $scope.nsBillTo.value, false);
            }

            $scope.toggleAllRelatedPayments = function() {
                toggleAllRelatedPayments($scope);
            };

            $scope.toggleEditingNewPayment = function() {
                toggleEditingNewPayment($scope);
            };

            var toggleIsProcessing = function() {
                toggleIsProcessing($scope);
            };

            $scope.gotoStep2WithNewPayment = function(payment) {
                gotoStep2WithNewPayment($scope, payment);
            };

            $scope.handleAllocationClose = function() {
                handleAllocationClose($scope);
            };

            $scope.handleChildPaymentAmountChange = function(invoice) {
                handleChildPaymentAmountChange($scope, invoice, true);
            };

            $scope.handleAYChildPaymentAmountChange = function(invoice) {
                handleChildPaymentAmountChange($scope, invoice, false);
            };

            $scope.reloadPage = function() {
                reloadPage($scope);
            };

            $scope.handleChildExpenseAmountChange = function(superExpense, invoice) {
                handleChildExpenseAmountChange($scope, superExpense, invoice);
            };

            $scope.handleCompletion = function() {
                handleChildPaymentAmountChange($scope, invoice);
            };

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

            this.goToOriginatingRecord = function() {
                goToOriginatingRecordId();
            };

            this.closeModal = function() {
                closeModal();
            };

            this.queryBalance = function(payment) {
                $scope.errorMessage = null;
                $scope.isProcessing = true;
                $scope.process = 'Query';
                $scope.syncDone = false;
                $scope.paymentChanged = false;
                $scope.batchStatus = 'Processing';
                $scope.totalProgress = 99.9;
                $scope.lastBalance.value = $scope.lastBalance.value === 0 ? payment.nsBalance.value : $scope.lastBalance.value;
                remoteActions.queryBalance(payment)
                    .then(function(result) {
                        if (result === $scope.labels.invalidPayment) {
                            $scope.errorMessage = result;
                        } else {
                            try {
                                $scope.queryBalanceResult = JSON.parse(result);
                                if (payment.nsBalance.value !== $scope.queryBalanceResult.balance) {
                                    payment.nsBalance.value = $scope.queryBalanceResult.balance;
                                    $scope.paymentChanged = true;
                                    $scope.batchStatus = 'Completed';
                                    $scope.totalProgress = 100;
                                    $scope.workingPayment = payment;
                                } else {
                                    $scope.batchStatus = 'Completed';
                                    $scope.totalProgress = 100;
                                    $scope.isProcessing = false;
                                    $scope.syncDone = true;
                                    gotoStep2WithNewPayment($scope, payment);
                                }
                            } catch (err) {
                                handleResponseParseException($scope, result, err);
                                return;
                            }
                            $scope.syncDone = true;
                        }
                    });
            };

            $scope.checkStatus = function checkStat() {
                if ($scope.batchStatus === 'Completed') {

                    $scope.totalProgress = 100;
                    remoteActions.getLastStatus(response.payment.id)
                        .then(function(result) {
                            var res;

                            try {
                                res = JSON.parse(result);
                                $scope.lastStatus = res.Netsuite_Last_Status__c;
                            } catch (err) {
                                handleResponseParseException($scope, result, err);
                                return;
                            }
                            $scope.syncDone = true;
                        });

                }
                if ($scope.batchStatus === 'Aborted' || $scope.batchStatus === 'Failed') {
                    $scope.totalProgress = 100;
                    $scope.aborted = true;
                    $scope.syncDone = true;
                }
                if ($scope.batchStatus === 'Not Started') {
                    $scope.totalProgress = 30;
                    $scope.syncDone = false;
                }
                if ($scope.batchStatus === 'Holding') {
                    $scope.totalProgress = 40;
                    $scope.syncDone = false;
                }
                if ($scope.batchStatus === 'Queued') {
                    $scope.totalProgress = 60;
                    $scope.syncDone = false;
                }
                if ($scope.batchStatus === 'Preparing') {
                    $scope.totalProgress = 70;
                    $scope.syncDone = false;
                }
                if ($scope.batchStatus === 'Processing') {
                    $scope.totalProgress = 85;
                    $scope.syncDone = false;
                }
                if ((!$scope.lastStatus) && !$scope.batchError) {
                    $scope.isProcessing = false;
                    $scope.syncDone = true;
                    gotoStep2WithNewPayment($scope, response.payment);
                }
                if ($scope.lastStatus === 'Unknown') {
                    remoteActions
                        .getBatchInfo(response.batchId)
                        .then(function(result) {
                            var batch;
                            try {
                                batch = JSON.parse(result);
                                $scope.batchStatus = batch.Status;
                                $scope.syncError = batch.ExtendedStatus;
                            } catch (err) {
                                handleResponseParseException($scope, result, err);
                            }
                        })
                    ;
                    setTimeout(checkStat, 500);
                }
            };

            $scope.recalculatePaymentTotal = function() {
                recalculatePaymentTotal($scope);
            };

            this.gotoPage = function(page) {
                $scope.page = page;
            };

            $scope.setSelectedInvoice = function(invoice) {
                setSelectedInvoice($scope, invoice);
            };

            this.saveAllocations = function() {
                saveAllocations($scope);
            };

            this.save = function(payment) {
                if (!payment) {
                    appConfig.paymentWrapper.nsBalance = appConfig.paymentWrapper.paymentAmount;
                    payment = appConfig.paymentWrapper;
                    updatePaymentWrapperFromScope($scope);
                } else {
                    appConfig.paymentWrapper = payment;
                }
                clearValuesForStepJumping(scope);
                var controller = this;
                $scope.isProcessing = true;
                $scope.errorMessage = null;

                var frontEndValidationMessage = runFrontendSaveValidations($scope);

                if (frontEndValidationMessage) {
                    $scope.isProcessing = false;
                    $scope.errorMessage = frontEndValidationMessage;
                    return;
                }

                if (payment.paymentAmount.value > 0 && !frontEndValidationMessage) {
                    //save new payment then continue
                    remoteActions.save(payment)
                        .then(function(result) {
                            try {
                                response = JSON.parse(result);
                                $scope.batchStatus = 'Not Started';
                                $scope.lastStatus = 'Unknown';
                                $scope.totalProgress = 0;
                                $scope.relatedPayments.push(response.payment);
                                $scope.editingNewPayment = false;
                                $scope.process = 'Status Check';
                                $scope.checkStatus();
                            } catch (err) {
                                handleResponseParseException($scope, result, err);
                            }
                        });
                }
            };

            window.scope = $scope;
            window.remoteActions = remoteActions;
            window.payment = appConfig.paymentWrapper;
        }
    }
})

.directive('paymentButtons', function(resourceUrls) {
    return {
        restrict: 'E',
        require: '^paymentWizard',
        templateUrl: resourceUrls.templateBase + '/payment-buttons.html',
        link: function(scope, element, attrs, paymentWizardController) {
            scope.closeModal = function() {
                paymentWizardController.closeModal();
            };

            scope.cancel = function() {
                paymentWizardController.goToOriginatingRecord();
            };

            scope.queryBalance = function(payment) {
                paymentWizardController.queryBalance(payment);
            };

            scope.save = function(nextPage) {
                paymentWizardController.save(nextPage);
            };

            scope.goto = function(page) {
                paymentWizardController.gotoPage(page);
            };

            scope.saveAllocations = function() {
                paymentWizardController.saveAllocations();
            };
        }
    }
});