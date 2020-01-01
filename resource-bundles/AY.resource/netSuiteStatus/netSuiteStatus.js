(function(angular) {
    angular.module('NetSuiteStatus', ['AppConfig', 'Utils'])

    .provider('netSuiteStatusConfig', function() {
        var config = {
            failedItems: [],
            getStatus: null,    // this should be a remote action
            isRunning: false,
            itemCompleteCount: 0,
            itemTotalCount: 0,
            message: '',
            status: '',
            title: 'NetSuite Sync Status',
            totalProgress: 100,
            type: 'Items'
        };
        return {
            set: function(settings) {
                config = settings;
            },
            $get: function() {
                return config;
            }
        };
    })

    .service('netSuiteStatusAsync', function($q, $timeout, netSuiteStatusConfig, utils) {
        var getStatus = function(args, deferred) {
            if (!deferred) {
                netSuiteStatusConfig.failedItems = [];
                netSuiteStatusConfig.status = '';
                netSuiteStatusConfig.totalProgress = 0;

                utils.disableScroll(false);
            }

            deferred = deferred || $q.defer();

            if (netSuiteStatusConfig.getStatus) {
                Visualforce.remoting.Manager.invokeAction(
                    netSuiteStatusConfig.getStatus
                    , args
                    , function(response, event) {
                        if (response) {
                            netSuiteStatusConfig.isRunning = (response.completed !== response.total);
                            if (response.total === 1 || response.total === '1') {
                                netSuiteStatusConfig.status = 'Processing a total of ' + response.total + ' invoice.' + ' This window will close upon completion.';
                            } else {
                                netSuiteStatusConfig.status = 'Processing a total of ' + response.total + ' invoices.' + ' This window will close upon completion.';
                            }

                            netSuiteStatusConfig.totalProgress = (response.total === 0) ? 0 : (response.completed / response.total) * 100;

                            if (netSuiteStatusConfig.isRunning) {
                                $timeout(function() {
                                    getStatus(args, deferred);
                                }, 500);
                            } else {
                                netSuiteStatusConfig.failedItems = response.failedItems;

                                if (response.failedItems.length === 0) {
                                    utils.enableScroll(false);
                                    deferred.resolve(response);
                                } else {
                                    deferred.reject(response);
                                }
                            }
                        } else {
                            netSuiteStatusConfig.isRunning = true;
                            netSuiteStatusConfig.message = '';
                            netSuiteStatusConfig.status = (event && event.message)
                                ? 'Error: ' + event.message
                                : 'Error checking NetSuite sync status';

                            deferred.reject();
                        }
                    }
                    , {escape: false}
                );
            } else {
                utils.enableScroll(false);
                deferred.resolve();
            }

            return deferred.promise;
        };

        return {
            getStatus: getStatus
        };
    })

    .directive('netSuiteStatus', function(netSuiteStatusConfig, resourceUrls) {
        return {
            restrict: 'E',

            scope: {
                closeText: '@',
                onClose: '&'
            },

            templateUrl: resourceUrls.netSuiteStatusTemplateBase + '/netsuite_status.html',

            link: function(scope, element, attrs) {
                scope.config = netSuiteStatusConfig;
                scope.salesforceBase = resourceUrls.salesforceBase;
                scope.isLightning = false;

                if (typeof sforce != "undefined") {
                    scope.isLightning = true;
                    scope.salesforceBase = '/lightning/r/McLabs2__Invoice__c/';
                }

                scope.close = function() {
                    if (angular.isDefined(attrs.onClose)) {
                        scope.onClose();
                    }
                };

                window.onbeforeunload = null;   // don't show any prompts on close
                window.top.nsScope = scope;
            }
        }
    })

})(angular);