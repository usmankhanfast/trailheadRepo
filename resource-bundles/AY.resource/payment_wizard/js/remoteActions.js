// fix unhandled rejection errors
app.config(['$qProvider', function($qProvider) {
    $qProvider.errorOnUnhandledRejections(false);
}]);
app.service('remoteActions', function($q, appConfig) {

    Visualforce.remoting.timeout = 120000;

    var save = function(paymentWrapper) {
        var deferred = $q.defer();

        Visualforce.remoting.Manager.invokeAction(
            appConfig.actions.save,
            JSON.stringify(paymentWrapper),
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

    var getRelatedPayments = function(currency, billTo) {
        var deferred = $q.defer();

        Visualforce.remoting.Manager.invokeAction(
            appConfig.actions.getRelatedPayments,
            currency,
            billTo,
            function(result, event) {
                if (result !== null) {
                    if (result && result.length > 0 && result.substring(0, 1) === '[') {
                        result = JSON.parse(result);
                    }
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

    var getBatchInfo = function(batchId) {
        var deferred = $q.defer();

        Visualforce.remoting.Manager.invokeAction(
            appConfig.actions.getBatchInfo,
            batchId,
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

    var getLastStatus = function(paymentId) {
        var deferred = $q.defer();

        Visualforce.remoting.Manager.invokeAction(
            appConfig.actions.getLastStatus,
            paymentId,
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

    var queryBalance = function(payment) {
        var deferred = $q.defer();

        Visualforce.remoting.Manager.invokeAction(
            appConfig.actions.queryBalance,
            JSON.stringify(payment),
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

    var getInvoices = function(invoiceIds, currencyIsoCode, netsuiteBillToId, includeWriteOffPayments) {
        var deferred = $q.defer();
        Visualforce.remoting.Manager.invokeAction(
            appConfig.actions.getInvoices,
            JSON.stringify(invoiceIds),
            currencyIsoCode,
            netsuiteBillToId,
            includeWriteOffPayments,
            function(result, event) {
                if (result !== null) {
                    if (result && result.length > 0 && result.substring(0, 1) === '[') {
                        result = JSON.parse(result);
                    }
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

    var getBillToIdOnSubsidiaryChange = function(subsidiaryId) {
        var deferred = $q.defer();

        Visualforce.remoting.Manager.invokeAction(
            appConfig.actions.getBillToId,
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

    var saveAllocations = function(invoices) {
        var deferred = $q.defer();

        Visualforce.remoting.Manager.invokeAction(
            appConfig.actions.saveAllocations,
            JSON.stringify(invoices),
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

    var getDefaultAllocations = function(invoiceIds) {
        var deferred = $q.defer();

        Visualforce.remoting.Manager.invokeAction(
            appConfig.actions.getDefaultAllocations,
            JSON.stringify(invoiceIds),
            function(result, event) {
                if (result !== null) {
                    if (result && result.length > 0 && result.substring(0, 1) === '[') {
                        result = JSON.parse(result);
                    }
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
        getDefaultAllocations: getDefaultAllocations,
        saveAllocations: saveAllocations,
        getInvoices: getInvoices,
        getRelatedPayments: getRelatedPayments,
        getBillToIdOnSubsidiaryChange: getBillToIdOnSubsidiaryChange,
        save: save,
        getBatchInfo: getBatchInfo,
        queryBalance: queryBalance,
        getLastStatus: getLastStatus
    };
});