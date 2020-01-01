// fix unhandled rejection errors
app.config(['$qProvider', function($qProvider) {
    $qProvider.errorOnUnhandledRejections(false);
}]);
app.service('remoteActions', function($q, appConfig) {

    Visualforce.remoting.timeout = 120000;

    var bonusRecipientOptionsDeferredMap = {};

    var getJsonCompWrapper = function() {
        var deferred = $q.defer();
        Visualforce.remoting.Manager.invokeAction(
            appConfig.actions.getJsonCompWrapper,
            appConfig.compId,
            function(result, event) {
                if (result !== null) {
                    deferred.resolve(result);
                } else if (event.type === 'exception') {
                    deferred.resolve({error: event.message});
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

    var getAccountAddress = function(accountId) {
        var deferred = $q.defer();

        Visualforce.remoting.Manager.invokeAction(
            appConfig.actions.getAccountAddress,
            accountId,
            function(result, event) {
                if (result !== null) {
                    deferred.resolve(result);
                } else if (event.type === 'exception') {
                    deferred.resolve({error: event.message});
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

    var getBrokerInfo = function(brokerId) {
        var deferred = $q.defer();
        if (brokerId && appConfig.actions.getBrokerInfo !== undefined) {
            Visualforce.remoting.Manager.invokeAction(
                appConfig.actions.getBrokerInfo
                , brokerId
                , function(result, event) {
                    if (result !== null) {
                        deferred.resolve(result);
                    } else if (event.type === 'exception') {
                        deferred.resolve({error: event.message});
                    } else if (event.message) {
                        if (event.message.indexOf(appConfig.labels.userLoggedOutMatch) !== -1 || event.message.indexOf(appConfig.labels.userLoggedOutSessionInvalid) !== -1) {
                            window.alert(appConfig.labels.userLoggedOut); // eslint-disable-line
                            deferred.resolve(appConfig.labels.userLoggedOut);
                        }
                    }
                }
            );
        } else {
            deferred.resolve(null);
        }

        return deferred.promise;
    };

    var getPropertyDetails = function(propertyId) {
        var deferred = $q.defer();

        Visualforce.remoting.Manager.invokeAction(
            appConfig.actions.getPropertyDetails,
            propertyId,
            function(result, event) {
                if (result !== null) {
                    deferred.resolve(result);
                } else if (event.type === 'exception') {
                    deferred.resolve({error: event.message});
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

    var setApprovalToUnderReview = function(approvalId) {
        var deferred = $q.defer();

        Visualforce.remoting.Manager.invokeAction(
            appConfig.actions.setApprovalToUnderReview,
            approvalId,
            function(result, event) {
                if (result !== null) {
                    deferred.resolve(result);
                } else if (event.type === 'exception') {
                    deferred.resolve({error: event.message});
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


    var getSpaceWrapper = function(spaceId) {
        var deferred = $q.defer();

        Visualforce.remoting.Manager.invokeAction(
            appConfig.actions.getSpaceWrapper,
            spaceId,
            function(result, event) {
                if (result !== null) {
                    deferred.resolve(result);
                } else if (event.type === 'exception') {
                    deferred.resolve({error: event.message});
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

    var getBonusRecipientOptions = function(subsidiaryIds) {
        var isCachedRequest = (typeof bonusRecipientOptionsDeferredMap[subsidiaryIds] !== 'undefined');
        var deferred = (isCachedRequest) ? bonusRecipientOptionsDeferredMap[subsidiaryIds] : $q.defer();

        if (!isCachedRequest && appConfig.actions.getBonusRecipientOptions !== undefined) {
            bonusRecipientOptionsDeferredMap[subsidiaryIds] = deferred;

            Visualforce.remoting.Manager.invokeAction(
                appConfig.actions.getBonusRecipientOptions,
                subsidiaryIds,
                function(result, event) {
                    if (result !== null) {
                        deferred.resolve(result);
                    } else if (event.type === 'exception') {
                        deferred.resolve({error: event.message});
                    } else if (event.message) {
                        if (event.message.indexOf(appConfig.labels.userLoggedOutMatch) !== -1 || event.message.indexOf(appConfig.labels.userLoggedOutSessionInvalid) !== -1) {
                            window.alert(appConfig.labels.userLoggedOut); // eslint-disable-line
                            deferred.resolve(appConfig.labels.userLoggedOut);
                        }
                    }
                }
            );
        }

        return deferred.promise;
    };

    var isSegmentationChangeRequired = function(saleId) {
        var deferred = $q.defer();

        Visualforce.remoting.Manager.invokeAction(
            appConfig.actions.isSegmentationChangeRequired,
            saleId,
            function(result, event) {
                if (result !== null) {
                    deferred.resolve(result);
                } else if (event.type === 'exception') {
                    deferred.resolve({error: event.message});
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

    var propertiesToKeep = [
          'actualPercent'
        , 'comments'
        , 'commissionType'
        , 'chargeType'
        , 'currentApprover'
        , 'currencyIsoCode'
        , 'displayValue'
        , 'editTime'
        , 'id'
        , 'ignoreUpdates'
        , 'isFlaggedForDelete'
        , 'isProForma'
        , 'isVoided'
        , 'listingId'
        , 'objectName'
        , 'otbeRecordTypeId'
        , 'processForApproval'
        , 'projectId'
        , 'proposalId'
        , 'recordType'
        , 'referenceObjectName'
        , 'rejected'
        , 'saleId'
        , 'type'
        , 'useCommissionPercent'
        , 'useDefaultValues'
        , 'useInvoiceDefaults'
        , 'usePreferentialSplit'
        , 'userProfile'
        , 'value'
        , 'overrideCalculations'
        , 'overrideConsiderations'
        , 'primaryBrokerAccountingSubsidiary'
        , 'primaryBrokerAccountingCategory'
        , 'primaryBrokerAccountingCostCenter'
        , 'primaryBrokerAccountingDepartment'
    ];

    var childHasPropertiesToKeep = function(obj) {
        if (obj !== null && typeof obj === 'object') {
            for (var key in obj) {
                if (obj.hasOwnProperty(key)) {
                    if (propertiesToKeep.includes(key) || childHasPropertiesToKeep(obj[key])) {
                        return true;
                    }
                }
            }
        }
        return false;
    };

    var compWrapperReplacer = function(key, value) {
        if (propertiesToKeep.includes(key) || childHasPropertiesToKeep(value)) {
            // kick out option groups since that data is just bloat
            if (key === 'options' && value.length) {
                return undefined;
            }
            return value;
        }
        return undefined;
    };

    var savedDeferred = null;
    var save = function(compWrapper) {
        var maxLengthForApexRemote = 900000;
        var jsonCompWrapper = JSON.stringify(compWrapper, compWrapperReplacer);
        savedDeferred = $q.defer();
        if (jsonCompWrapper.length > maxLengthForApexRemote && typeof ApexActionSaveDealWizard === 'function') {
            ApexActionSaveDealWizard(jsonCompWrapper);
        } else {
            Visualforce.remoting.Manager.invokeAction(
                appConfig.actions.save,
                jsonCompWrapper,
                function(result, event) {
                    saveCallback(result, event);
                },
                {escape: false}
            );
        }
        return savedDeferred.promise;
    };

    var saveCallback = function(result, event) {
        if (result !== null) {
            if (savedDeferred) {
                savedDeferred.resolve(result);
            }
        } else if (event && event.hasOwnProperty('type') && event.type === 'exception') {
            if (savedDeferred) {
                savedDeferred.resolve({error: event.message});
            }
        } else if (event && event.hasOwnProperty('message')) {
            if (event.message.indexOf(appConfig.labels.userLoggedOutMatch) !== -1 || event.message.indexOf(appConfig.labels.userLoggedOutSessionInvalid) !== -1) {
                window.alert(appConfig.labels.userLoggedOut); // eslint-disable-line
                if (savedDeferred) {
                    savedDeferred.resolve(appConfig.labels.userLoggedOut);
                }
            }
        }
    };

    // :( scope this to the window for the action apex onComplete callback
    window.ApexActionSaveDealWizardComplete = function(result, event) {
        saveCallback(result, event);
    };

    return {
        getJsonCompWrapper: getJsonCompWrapper,
        getAccountAddress: getAccountAddress,
        getPropertyDetails: getPropertyDetails,
        getBrokerInfo: getBrokerInfo,
        getSpaceWrapper: getSpaceWrapper,
        getBonusRecipientOptions: getBonusRecipientOptions,
        save: save,
        setApprovalToUnderReview: setApprovalToUnderReview,
        isSegmentationChangeRequired: isSegmentationChangeRequired
    };
});