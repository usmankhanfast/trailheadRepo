app.service('remoteActions', function($q, appConfig) {

    var getJsonInvoiceCounts = function(startDate, endDate, subsidiaryName, subsidiaryId) {
        var deferred = $q.defer();

        Visualforce.remoting.Manager.invokeAction(
            appConfig.actions.getJsonInvoiceCounts,
            startDate,
            endDate,
            subsidiaryName,
            subsidiaryId,
            function(result, event) {
                if (result !== null) {
                    deferred.resolve(result);
                } else if (event.type === 'exception') {
                    deferred.resolve(JSON.stringify({error: event.message}));
                } else if (event.message) {
                    if (event.message.indexOf(appConfig.labels.userLoggedOutMatch) !== -1 || event.message.indexOf(appConfig.labels.userLoggedOutSessionInvalid) !== -1) {
                        window.alert(appConfig.labels.userLoggedOut); // eslint-disable-line
                        deferred.resolve(appConfig.labels.userLoggedOut);
                    }
                }
            },
            {escape: false}
        );

        return deferred.promise;
    };

    var getJsonInvoicesWrapper = function(startDate, endDate, subsidiaryName, subsidiaryId, filterBy, pageNumber, orderBy) {
        var deferred = $q.defer();

        Visualforce.remoting.Manager.invokeAction(
            appConfig.actions.getJsonInvoicesWrapper,
            startDate,
            endDate,
            subsidiaryName,
            subsidiaryId,
            filterBy,
            pageNumber,
            orderBy,
            function(result, event) {
                if (result !== null) {
                    deferred.resolve(result);
                } else if (event.type === 'exception') {
                    deferred.resolve(JSON.stringify({error: event.message}));
                } else if (event.message) {
                    if (event.message.indexOf(appConfig.labels.userLoggedOutMatch) !== -1 || event.message.indexOf(appConfig.labels.userLoggedOutSessionInvalid) !== -1) {
                        window.alert(appConfig.labels.userLoggedOut); // eslint-disable-line
                        deferred.resolve(appConfig.labels.userLoggedOut);
                    }
                }
            },
            {escape: false}
        );

        return deferred.promise;
    };

    var getJsonInvoicesWrapperByIds = function(invoicesWrapper) {
        var deferred = $q.defer();

        var invoiceIds = invoicesWrapper.map(function(invoice) {
            return invoice.id;
        });

        Visualforce.remoting.Manager.invokeAction(
            appConfig.actions.getJsonInvoicesWrapperByIds,
            invoiceIds,
            function(result, event) {
                if (result !== null) {
                    deferred.resolve(result);
                } else if (event.type === 'exception') {
                    deferred.resolve(JSON.stringify({error: event.message}));
                } else if (event.message) {
                    if (event.message.indexOf(appConfig.labels.userLoggedOutMatch) !== -1 || event.message.indexOf(appConfig.labels.userLoggedOutSessionInvalid) !== -1) {
                        window.alert(appConfig.labels.userLoggedOut); // eslint-disable-line
                        deferred.resolve(appConfig.labels.userLoggedOut);
                    }
                }
            },
            {escape: false}
        );

        return deferred.promise;
    };

    var save = function(invoicesWrapper) {
        var deferred = $q.defer();

        Visualforce.remoting.Manager.invokeAction(
            appConfig.actions.save,
            window.btoa(encodeURIComponent(JSON.stringify(invoicesWrapper))),
            function(result, event) {
                if (result !== null) {
                    deferred.resolve(result);
                } else if (event.type === 'exception') {
                    deferred.resolve(JSON.stringify({error: event.message}));
                } else if (event.message) {
                    if (event.message.indexOf(appConfig.labels.userLoggedOutMatch) !== -1 || event.message.indexOf(appConfig.labels.userLoggedOutSessionInvalid) !== -1) {
                        window.alert(appConfig.labels.userLoggedOut); // eslint-disable-line
                        deferred.resolve(appConfig.labels.userLoggedOut);
                    }
                }
            },
            {escape: false}
        );

        return deferred.promise;
    };

    return {
        getJsonInvoicesWrapper: getJsonInvoicesWrapper,
        getJsonInvoicesWrapperByIds: getJsonInvoicesWrapperByIds,
        getJsonInvoiceCounts: getJsonInvoiceCounts,
        save: save
    };
})
.directive('processInvoices', function($q, appConfig, resourceUrls, remoteActions, utils) {
    var originalInvoices;

    // helper method to return only invoices that have changed. this prevents unnecessary
    // validation errors from being thrown for invoices that the user isn't trying to modify.
    var getChangedInvoices = function(invoices) {
        if (!originalInvoices || !originalInvoices.length) {
            return invoices;
        }

        var didInvoiceChange = function(newInvoice, oldInvoice) {
            return (oldInvoice === null
                || newInvoice.estimatedInvoiceDate.value !== oldInvoice.estimatedInvoiceDate.value
                || newInvoice.specificInvoiceDate.value !== oldInvoice.specificInvoiceDate.value
                || newInvoice.recognizeRevenue.value !== oldInvoice.recognizeRevenue.value
                || newInvoice.readyForPrint !== oldInvoice.readyForPrint);
        };

        return invoices.filter(function(newInvoice, i) {
            var oldInvoice = originalInvoices.length > i && originalInvoices[i] || null;
            return didInvoiceChange(newInvoice, oldInvoice);
        });
    };

    var setScopeProperties = function(scope) {
        scope.invoicesTemplate = resourceUrls.templateBase + '/invoices.html';
        scope.userDateFormat = appConfig.userDateFormat || null;
        utils.setUserLocale(appConfig.userLocale);
    };

    var setDateDirection = function(invoice) {
        if (invoice.estimatedInvoiceDate && invoice.estimatedInvoiceDate.value !== null) {
            invoice.dateDirection = '->';
        } else {
            invoice.dateDirection = '<-';
        }
    };

    var addInvoicesWrapperToScope = function(scope, invoicesWrapper, subsidiaryName) {
        appConfig.invoicesWrapper = invoicesWrapper;
        scope.subsidiarySelected = {Name: subsidiaryName};
        scope.invoices = invoicesWrapper;
        if (invoicesWrapper.length >= appConfig.constants.maxInvoices) {
            scope.warningMessage = appConfig.labels.maxInvoicesMessage;
            invoicesWrapper.pop();
        }
        angular.extend(scope, invoicesWrapper);
        scope.setPageLabel();
        setDateDirectionOnAllInvoices(scope);
        setScopeProperties(scope);
    };

    var setDateDirectionOnAllInvoices = function(scope) {
        if (scope.invoices) {
            scope.invoices.forEach(function(invoice) {
                setDateDirection(invoice);
            });
        }
    };

    var searchAccountsLastResult = null;

    var searchAccounts = function(searchText) {
        var deferred = $q.defer();
        Visualforce.remoting.Manager.invokeAction(appConfig.actions.searchAccounts,
            searchText,
            function(result, event) {
                if (result !== null) {
                    searchAccountsLastResult = result;
                    deferred.resolve(result);
                } else if (event.type === 'exception') {
                    deferred.resolve(JSON.stringify({error: event.message}));
                } else if (event.message) {
                    if (event.message.indexOf(appConfig.labels.userLoggedOutMatch) !== -1 || event.message.indexOf(appConfig.labels.userLoggedOutSessionInvalid) !== -1) {
                        window.alert(appConfig.labels.userLoggedOut); // eslint-disable-line
                        deferred.resolve(appConfig.labels.userLoggedOut);
                    }
                }
            }
        );
        return deferred.promise;
    };

    return {
        restrict: 'E',

        controller: function($scope, $timeout) {
            var pollProcessingInvoicesTimeoutPromise;
            var pollingInProgress = false;
            var pollProcessingInvoices = function() {
                if (pollProcessingInvoicesTimeoutPromise) {
                    $timeout.cancel(pollProcessingInvoicesTimeoutPromise);
                }
                pollProcessingInvoicesTimeoutPromise = $timeout(function() {
                    var invoiceIdToInvoiceMap = {};
                    var processingInvoices;

                    if (!$scope.invoices || !$scope.invoices.length) {
                        return;
                    }

                    if ($scope.isLoading || pollingInProgress) {
                        pollProcessingInvoices();
                        return;
                    }

                    processingInvoices = $scope.invoices.filter(function(invoice) {
                        invoiceIdToInvoiceMap[invoice.id] = invoice;
                        return true;
                    });

                    if (!processingInvoices.length) {
                        return;
                    }

                    pollingInProgress = true;

                    remoteActions
                        .getJsonInvoicesWrapperByIds(processingInvoices)
                        .then(function(result) {
                            var polledInvoices = [];
                            try {
                                polledInvoices = JSON.parse(result);
                            } catch (ex) {
                                // do nothing, poll will try again in 5 seconds
                            }
                            if (polledInvoices.length) {
                                polledInvoices.forEach(function(invoice) {
                                    var scopeInvoice = invoiceIdToInvoiceMap[invoice.id];

                                    // only update the invoice if the incoming invoice change date doesn't match the current change date or the processing status doesn't match
                                    if (invoice.lastModifiedDate !== scopeInvoice.lastModifiedDate ||
                                        invoice.isProcessing !== scopeInvoice.isProcessing) {
                                        scopeInvoice.sentToServer = false;
                                        scopeInvoice.statusUri = invoice.statusUri;
                                        scopeInvoice.error = invoice.error;
                                        scopeInvoice.canUpdate = invoice.canUpdate;
                                        scopeInvoice.isProcessing = invoice.isProcessing;
                                        scopeInvoice.estimatedInvoiceDate = invoice.estimatedInvoiceDate;
                                        scopeInvoice.specificInvoiceDate = invoice.specificInvoiceDate;
                                        scopeInvoice.recognizeRevenue = invoice.recognizeRevenue;
                                        scopeInvoice.readyForPrint = invoice.readyForPrint;
                                        scopeInvoice.validationErrors = invoice.validationErrors;
                                        scopeInvoice.isPrinted = invoice.isPrinted;
                                        scopeInvoice.lastModifiedDate = invoice.lastModifiedDate;

                                        for (var i = 0; i < originalInvoices.length; i++) {
                                            if (originalInvoices[i].id === invoice.id) {
                                                originalInvoices[i] = angular.copy(invoice);
                                                break;
                                            }
                                        }
                                    }
                                });
                            }
                            setDateDirectionOnAllInvoices(scope);
                            pollingInProgress = false;
                            pollProcessingInvoices();
                        })
                    ;
                }, 5000);
            };

            var setInvoiceToProcessing = function(obj) {
                obj.isProcessing = true;
                obj.canUpdate = false;
                if ($scope.processingImg) {
                    obj.statusUri = $scope.processingImg;
                }
            };

            $scope.setPageLabel = function() {
                if ($scope.page === 'INVOICE_DATES') {
                    $scope.selectedPageLabel = appConfig.labels.invoiceDates;
                } else if ($scope.page === 'REVENUE_RECOGNITION') {
                    $scope.selectedPageLabel = appConfig.labels.revenueRecognition;
                } else if ($scope.page === 'PRINT_INVOICES') {
                    $scope.selectedPageLabel = appConfig.labels.printInvoices;
                } else if (scope.page === 'REPRINT_INVOICES') {
                    $scope.selectedPageLabel = appConfig.labels.rePrintInvoices;
                }
            };

            $scope.navigateTo = function(pageName) {
                if ($scope.page !== pageName) {
                    $scope.page = pageName;
                    $scope.checkForSaveBeforeNewSearch(1);
                }
                $scope.setPageLabel();
            };

            $scope.setTotalInvoices = function() {
                if ($scope.page === 'REVENUE_RECOGNITION') {
                    $scope.totalInvoices.value = $scope.revenueRecognitionCount;
                } else if ($scope.page === 'PRINT_INVOICES') {
                    $scope.totalInvoices.value = $scope.printInvoicesCount;
                } else if ($scope.page === 'REPRINT_INVOICES') {
                    $scope.totalInvoices.value = $scope.rePrintInvoicesCount;
                } else {
                    $scope.totalInvoices.value = $scope.invoiceDatesCount
                }
            };

            $scope.pageChanged = function() {
                $scope.checkForSaveBeforeNewSearch($scope.currentPage.value);
            };

            $scope.getOrderBy = function() {
                return $scope.predicate + ($scope.reverseOrder ? ' DESC' : ' ASC');
            };

            $scope.searchInvoices = function(startDate, endDate, subsidiaryName, pageNumber) {
                var deferred = $q.defer()
                    , errorFound = false
                    , subsidiaryId = null
                    , orderBy = $scope.getOrderBy()
                    , filterBy = $scope.page
                ;

                if (!pageNumber || pageNumber === null) {
                    pageNumber = 1;
                }
                $scope.currentPage.value = pageNumber;

                $scope.isLoading = true;
                $scope.errorMessage = '';

                if (searchAccountsLastResult && searchAccountsLastResult.length === 1) {
                    subsidiaryName = searchAccountsLastResult[0].Name;
                }

                if (searchAccountsLastResult && searchAccountsLastResult.length && subsidiaryName) {
                    searchAccountsLastResult.forEach(function(obj) {
                        if (obj.Name === subsidiaryName) {
                            subsidiaryId = obj.Id;
                        }
                    });
                }

                if (endDate === null || endDate === '') {
                    $scope.errorMessage += 'Error: End Date is required to search.</br>';
                    errorFound = true;
                }

                var re = /^\d{1,2}\/\d{1,2}\/\d{4}$/;
                if (!endDate.match(re)) {
                    $scope.errorMessage += 'Error: Invalid End Date supplied.';
                    if ($scope.userDateFormat) {
                        $scope.errorMessage += ' Please enter a date in the format of ' + scope.userDateFormat + '.<br/>';
                    }
                    errorFound = true;
                }

                if (startDate !== '' && !startDate.match(re)) {
                    $scope.errorMessage += 'Error: Invalid Start Date supplied.';
                    if ($scope.userDateFormat) {
                        $scope.errorMessage += ' Please enter a date in the format of ' + scope.userDateFormat + '.<br/>';
                    }
                    errorFound = true;
                }

                if (errorFound) {
                    $scope.isLoading = false;
                    return deferred.promise;
                }

                if (subsidiaryName === null) {
                    subsidiaryName = '';
                }

                if (startDate === null) {
                    startDate = '';
                }

                if (endDate === null) {
                    endDate = '';
                }

                if (subsidiaryId === null) {
                    if ($scope.defaultSubsidiary && $scope.defaultSubsidiary.Name === subsidiaryName && $scope.defaultSubsidiary.Id !== null) {
                        subsidiaryId = $scope.defaultSubsidiary.Id;
                    } else {
                        subsidiaryId = '';
                    }
                }

                remoteActions
                    .getJsonInvoiceCounts(startDate, endDate, subsidiaryName, subsidiaryId)
                    .then(function(result) {
                        var counts;
                        try {
                            counts = JSON.parse(result);
                        } catch (ex) {
                            counts = {};
                        }
                        $scope.invoiceDatesCount = counts.invoiceDatesCount || 0;
                        $scope.revenueRecognitionCount = counts.revenueRecognitionCount || 0;
                        $scope.printInvoicesCount = counts.printInvoicesCount || 0;
                        $scope.rePrintInvoicesCount = counts.rePrintInvoicesCount || 0;
                        $scope.setTotalInvoices();
                    })
                ;
                remoteActions
                    .getJsonInvoicesWrapper(startDate, endDate, subsidiaryName, subsidiaryId, filterBy, pageNumber, orderBy)
                    .then(function(result) {
                        var invoicesWrapper;
                        $scope.errorMessage = null;
                        try {
                            invoicesWrapper = JSON.parse(result);
                        } catch (ex) {
                            invoicesWrapper = {
                                'error': 'Error initializing the invoice processing. An unexpected value was returned by the server.'
                            };
                        }
                        if (invoicesWrapper.error) {
                            $scope.errorMessage = invoicesWrapper.error;
                            $scope.isLoading = false;
                            $scope.resetToLastPosition();
                            addInvoicesWrapperToScope($scope, [], subsidiaryName);
                            pollProcessingInvoices();
                        } else {
                            $scope.history = {
                                tab: filterBy,
                                currentPage: pageNumber
                            };
                            addInvoicesWrapperToScope($scope, invoicesWrapper, subsidiaryName);
                            $scope.navigateTo($scope.page);
                            $timeout(function() {
                                $scope.isLoading = false;
                                pollProcessingInvoices();
                            }, 1000);
                            originalInvoices = angular.copy(invoicesWrapper);
                            deferred.resolve(result);
                        }
                    })
                ;
                return deferred.promise;
            };

            $scope.switchDateValue = function(invoice) {
                if (invoice.dateDirection === '->') {
                    invoice.dateDirection = '<-';
                    invoice.specificInvoiceDate.value = invoice.estimatedInvoiceDate.value;
                    invoice.estimatedInvoiceDate.value = null;
                } else {
                    invoice.dateDirection = '->';
                    invoice.estimatedInvoiceDate.value = invoice.specificInvoiceDate.value;
                    invoice.specificInvoiceDate.value = null;
                }
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

            $scope.searchAccounts = function(searchText) {
                return searchAccounts(searchText)
                    .then(function(results) {
                        if (results === null) {
                            return [];
                        }
                        return results.map(function(result) {
                            return result;
                        });
                    })
                ;
            };

            $scope.resetToLastPosition = function() {
                $scope.page = $scope.history.tab;
                $scope.currentPage.value = $scope.history.currentPage;
            };

            $scope.getSortClass = function(column) {
                var classes = '';
                if (column === $scope.predicate && $scope.reverseOrder) {
                    classes = 'sort-by asc';
                } else if (column === $scope.predicate && !$scope.reverseOrder) {
                    classes = 'sort-by desc';
                }
                return classes;
            };

            $scope.save = function(subsidiaryName) {
                var deferred = $q.defer();

                var changedInvoices = getChangedInvoices($scope.invoices);
                if (!changedInvoices || !changedInvoices.length) {
                    deferred.resolve([]);
                } else {
                    changedInvoices.forEach(function(obj) {
                        setInvoiceToProcessing(obj);
                    });
                    $scope.isLoading = true;
                    $scope.errorMessage = null;
                    remoteActions
                        .save(changedInvoices)
                        .then(function(result) {
                            if (result === 'Success') {
                                scope.searchInvoices($scope.startDate.value, $scope.endDate.value, subsidiaryName);
                                deferred.resolve(result);
                            } else if (result.includes('Success')) {
                                $scope.isLoading = false;
                                $scope.errorMessage = 'Unable to update all invoices. The following invoices have already been voided: ' + result.substring(7) + '. Please re-search or refresh the page.';
                                $scope.resetToLastPosition();
                            } else {
                                $scope.isLoading = false;
                                $scope.errorMessage = result.replace(/^(.*)?Exception: /, '');
                                $scope.resetToLastPosition();
                            }
                        })
                    ;
                }

                return deferred.promise;
            };

            $scope.print = function() {
                var deferred = $q.defer();

                var changedInvoices = getChangedInvoices($scope.invoices);
                if (!changedInvoices || !changedInvoices.length) {
                    deferred.resolve([]);
                } else {
                    $scope.errorMessage = null;
                    $scope.isLoading = true;
                    remoteActions
                        .save(changedInvoices)
                        .then(function() {
                            var invoiceIdsToPrint = [];
                            $scope.invoices.forEach(function(obj) {
                                if (obj.readyForPrint) {
                                    setInvoiceToProcessing(obj);
                                    invoiceIdsToPrint.push(obj.id);
                                }
                            });
                            if (invoiceIdsToPrint.length) {
                                invoiceIdsToPrint.reverse(); // reorder
                                var strWindowFeatures = "location=yes,height=570,width=520,scrollbars=yes,status=yes";
                                var URL = resourceUrls.printInvoice + '?ids=' + invoiceIdsToPrint.join(',');
                                window.open(URL, "_blank", strWindowFeatures);
                            } else {
                                $scope.errorMessage = 'Error: Please select one or more invoices to print.';
                            }
                            $scope.isLoading = false;
                        })
                    ;
                }
            };

            $scope.convertToPrintMode = function(subsidiaryName, printMode) {
                if (subsidiaryName === undefined) {
                    subsidiaryName = '';
                }
                $scope
                    .save(subsidiaryName)
                    .then(function() {
                        window.top.location = resourceUrls.processInvoices
                            + '?startDate=' + $scope.startDate.value
                            + '&endDate=' + $scope.endDate.value
                            + '&subsidiaryName=' + subsidiaryName
                            + '&page=' + $scope.page
                            + '&orderBy=' + $scope.getOrderBy()
                            + '&currentPage=' + $scope.currentPage.value
                            + '&print=' + printMode
                        ;
                    })
                ;
            };

            $scope.checkForSaveBeforeNewSearch = function(page) {
                $scope
                    .save($scope.subsidiarySelected.Name)
                    .then(function() {
                        $scope.searchInvoices($scope.startDate.value, $scope.endDate.value, $scope.subsidiarySelected.Name, page);
                    })
                ;
            };

            $scope.order = function(predicate) {
                $scope.reverseOrder = ($scope.predicate === predicate) ? !$scope.reverseOrder : false;
                $scope.predicate = predicate;
                $scope.checkForSaveBeforeNewSearch(1);
            };

            $scope.showErrors = function(invoice) {
                if (sfdcPage.setHelp) {
                    sfdcPage.setHelp(invoice.id, invoice.validationErrors.join('<br/>'));
                }
            };

            $scope.close = function() {
                window.history.back();
            };

            var endDate = new Date(),
                startDate = new Date(),
                numberOfDaysToAdd = 30;

            var currOrderString = appConfig.orderBy;

            endDate.setDate(endDate.getDate() + numberOfDaysToAdd);
            $scope.subsidiary = {label: 'Subsidiary', value: '', Id: '', Name: ''};
            $scope.startDate = {label: 'Start Date', value: appConfig.startDate};
            $scope.endDate = {label: 'End Date', value: appConfig.endDate};
            $scope.isLoading = true;
            $scope.labels = appConfig.labels;
            $scope.page = appConfig.page;
            $scope.userSubsidiary = appConfig.userSubsidiary;
            $scope.userSubsidiaryId = appConfig.userSubsidiaryId;
            $scope.currentPage = {'value': appConfig.currentPage};
            $scope.lastPage = $scope.currentPage;
            $scope.totalInvoices = {'value': 0};
            $scope.invoicesPerPage = appConfig.constants.invoicesPerPage;
            $scope.reverseOrder = currOrderString.indexOf('ASC') === -1;
            $scope.predicate = currOrderString.replace(' DESC', '').replace(' ASC', '');
            $scope.isPrintMode = appConfig.isPrintMode;
            $scope.invoiceDatesCount = 0;
            $scope.revenueRecognitionCount = 0;
            $scope.printInvoicesCount = 0;
            $scope.rePrintInvoicesCount = 0;
            $scope.processingImg = appConfig.constants.processingImgSrc || false;
            $scope.maxPages = appConfig.constants.maxPagerPages || 5;
            $scope.history = {
                tab: $scope.page,
                currentPage: $scope.currentPage
            };
            $scope.defaultSubsidiary = {
                'Name': appConfig.userSubsidiary,
                'Id'  : appConfig.userSubsidiaryId
            };
            // run initial search
            $scope
                .searchInvoices('', $scope.endDate.value, appConfig.userSubsidiary, $scope.currentPage.value)
                .then(function(result) {
                    if ($scope.isPrintMode && !result.error) {
                        $timeout(function() {
                           window.print();
                        }, 1000);
                    }
                })
            ;

            window.scope = $scope;
        }
    };
});
