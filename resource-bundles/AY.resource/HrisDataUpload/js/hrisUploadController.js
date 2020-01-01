(function(angular) {
    'use strict';

    var hrisServiceApp = angular.module('hrisServiceApp', ['AppConfig', 'HrisDataUtils'])
        .controller('hrisUploadController', function($scope, $q, appConfig, processCsv, hrisFileParseOverride) {

            $scope.notifications = [];

            if (isIE()) {
                $scope.notifications.push(appConfig.labels.unsupportedBrowser);
                $scope.unsupportedBrowser = true;
                return;
            }

            try {
                hrisFileParseOverride.apply();
            } catch (err) {
                $scope.notifications.push(appConfig.labels.unsupportedBrowser);
                $scope.unsupportedBrowser = true;
                return;
            }
            $scope.remoteScheduleSync = appConfig.remoteScheduleSync;
            $scope.remoteUploadData = appConfig.remoteUploadData;

            $scope.newResultCount = 0;
            $scope.updatedResultCount = 0;
            $scope.errorResultCount = 0;
            $scope.processed = 0;
            $scope.toProcess = 1;

            $scope.requiredFieldsBySystem = appConfig.requiredFieldsBySystem;
            $scope.hasErrors = false;
            $scope.processed = false;
            $scope.isUploading = false;

            $scope.dataToPush = [];
            $scope.resultsData = [];
            $scope.invalidData = [];
            $scope.validData = [];
            $scope.importResultsData = [];
            $scope.rowsToProcess = appConfig.rowsToProcess;

            var hrisImportData = [];
            var hrisImportFile = angular.element(document.querySelector("input[type=file]"));

            // helper method to call $scope.$apply() only when needed
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

            $scope.onFileChanged = function(ele) {
                $scope.safeApply(function() {
                    resetForm();
                    var files = ele.files;
                    if (files && files.length) {
                        validateCsv();
                    }
                });
            };

            $scope.onSelectedSourceChanged = function() {
                angular.forEach(angular.element("input[type='file']"),
                    function(inputElem) {
                      angular.element(inputElem).val(null);
                    }
                );
            };

            var validateCsv = function() {
                var deferred = $q.defer();

                var source = $scope.selectedSource;
                if (source === null) {
                    deferred.reject();
                    return deferred.promise;
                }

                $scope.importResultsData = [];

                var processErrors = function(errors) {
                    if (!errors) {
                        return;
                    }

                    for (var e in errors) {
                        if (errors.hasOwnProperty(e)) {
                            var message = e + " on " + errors[e] + (errors[e] === 1 ? " record" : " records");
                            addNotification(message);
                        }
                    }
                };

                processCsv.validate(source, $scope.requiredFieldsBySystem[source], $scope.notifications, hrisImportFile)
                    .then(function(result) {
                        if (result.data) {
                            processErrors(result.errors);

                            $scope.invalidData = result.data.invalid;
                            $scope.validData = result.data.valid;
                        }
                        deferred.resolve(result);
                    }).catch(function(error) {
                        addNotification(error);
                    });

                return deferred.promise;
            }

            $scope.downloadInvalid = function() {
                var source = $scope.selectedSource;

                return processCsv.validate(source, $scope.requiredFieldsBySystem[source], $scope.notifications, hrisImportFile)
                    .then(function(result) {
                        processCsv.download.invalidRecords(result.data.invalid);
                    });
            };

            $scope.downloadImportResults = function() {
                var importedResults = $scope.importResultsData;

                processCsv.download.uploadedRecords($scope.importResultsData);
            };

            $scope.uploadCSV = function() {
                var source = $scope.selectedSource;

                return validateCsv()
                    .then(function(result) {
                        $scope.processed = 0;
                        $scope.toProcess =  result.data.valid.length;
                        processCsv.upload($scope, incrementResultsCount, result.data.valid)
                            .then(function(data) {
                                if (data && data.length) {
                                    $scope.importResultsData = data.reduce(function(a, b) {
                                        return a.concat(b);
                                    });

                                    $scope.newResultCount = 0;
                                    $scope.updatedResultCount = 0;
                                    $scope.errorResultCount = 0;
                                    $scope.importResultsData.forEach(function(dataRow) {
                                        var result = dataRow['Import Result'];
                                        if (result === 'Created') {
                                            $scope.newResultCount++;
                                        } else if (result === 'Updated') {
                                            $scope.updatedResultCount++;
                                        } else if (result === 'Failed') {
                                            $scope.errorResultCount++;
                                        }
                                    });

                                    addNotification('Upload complete');
                                } else {
                                    addNotification('Upload failed');
                                }

                                $scope.isUploading = false;
                            })
                    })
                    .catch(function(error) {
                        addNotification(error);
                    });
                function incrementResultsCount(value) {
                    $scope.processedRecords += value;
                }
            }

            function addNotification(message) {
                if ($scope.notifications.indexOf(message) === -1) {
                    $scope.notifications.push(message);
                }
            }

            function resetForm() {
                $scope.isUploading = false;
                $scope.toProcess = 1;
                $scope.processedRecords = 0;
                $scope.processed = false;
                $scope.notifications = [];
                $scope.invalidData = [];
                $scope.validData = [];
                $scope.importResultsData = [];

                $scope.newResultCount = 0;
                $scope.updatedResultCount = 0;
                $scope.errorResultCount = 0;
            }

            function isIE() {
                var ua = window.navigator.userAgent;

                var msie = ua.indexOf('MSIE ');
                if (msie > 0) {
                    // IE 10 or older => return version number
                    return parseInt(ua.substring(msie + 5, ua.indexOf('.', msie)), 10);
                }

                var trident = ua.indexOf('Trident/');
                if (trident > 0) {
                    // IE 11 => return version number
                    var rv = ua.indexOf('rv:');
                    return parseInt(ua.substring(rv + 3, ua.indexOf('.', rv)), 10);
                }

                var edge = ua.indexOf('Edge/');
                if (edge > 0) {
                   // Edge (IE 12+) => return version number
                   return parseInt(ua.substring(edge + 5, ua.indexOf('.', edge)), 10);
                }

                // other browser
                return false;
            }
        });
}(angular));