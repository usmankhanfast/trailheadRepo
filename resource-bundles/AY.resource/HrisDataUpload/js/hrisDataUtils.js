(function(angular) {
    angular.module('HrisDataUtils', [])
        .factory('hrisFileParseOverride', function() {
            var applied = false;

            var apply = function() {
                if (applied) {
                    return;
                }

                FileReader.prototype.__defineGetter__('originalResult', FileReader.prototype.__lookupGetter__('result'));
                Object.defineProperty(FileReader.prototype, 'result', {
                    get: function() {
                        return this._result || this.originalResult;
                    },
                    set: function(value) {
                        this._result = value;
                    }
                })

                FileReader.prototype.isFirstLoad = true;

                var superReadAsText = FileReader.prototype.readAsText;
                FileReader.prototype.readAsText = function() {
                    var instance = this;

                    var stripExtraQuotesFromResults = function() {
                        if (instance.result) {
                            instance.result = instance.result.replace(/<CR>/gm, '')              // delete any <CR> carriage returns
                                                             .replace(/"{12}/gm, '')             // delete any grouping of 12 quotation marks
                                                             .replace(/"{2}/gm, '')              // delete any grouping of 3 quotation marks
                                                             .replace(/(^",)|(,"$)/gm, ',')      // delete any quotation marks that are at isolated at the beginning or end of a line
                                                             .replace(/\n",/gm, '\n,')           // delete any quotation marks isolated at the beginning of a line preceeded by a \n
                                                             .replace(/,"\n/gm, ',\n')           // delete any quotation marks isolated at the end of a line followed by a \n
                                                             .replace(/\u2013|\u2014/gm, "-")    // fix some encoding errors for them if they try to import a non UTF-8 or ISO-8859-1 file
                                                             .replace(/È/g, 'é')
                                                             .replace(/�/g, 'é')
                                                             .replace(/Ë/g, 'è');
                        }
                    }
                    arguments[1]='iso-8859-1';
                    if (this.isFirstLoad) {
                        if (this.onload === null) {
                            this.onload = stripExtraQuotesFromResults();
                        } else {
                            var superOnLoad = this.onload;
                            this.onload = function() {
                                stripExtraQuotesFromResults();
                                superOnLoad.apply(this, arguments);
                            }
                        }
                        this.isFirstLoad = false;
                    }

                    superReadAsText.apply(this, arguments);
                }

                applied = true;
            };

            return {
                apply: apply
            };
        })
        .factory('dataManipulation', function() {
            var derivedFields = {
                'Managing Director ID': 'Managing Director',
                'Accounting Department ID': 'Acct Departments',
                'First Name': 'Staff First Name or Payroll First Name',
                'Last Name': 'Staff Last Name or Payroll Last Name'
            };
            return {
                preprocessData : preprocessData,
                processRow : processRow
            };

            function processRow(requiredFields, notifications, input) {
                var errors = {};
                var result = { data : input };
                for (var requiredFieldKey in requiredFields) {
                    if (typeof requiredFields[requiredFieldKey] === "function") {
                        continue;
                    }

                    var key = String(requiredFields[requiredFieldKey]);
                    var missingField;

                    if (typeof result.data[key] === 'undefined') {
                        missingField = derivedFields[key] || key;
                        if (notifications.indexOf("Required column '" + missingField + "' is missing") === -1) {
                            throw new Error("Required Column " + missingField + " is missing");
                        }
                    } else if (result.data[key] === "") {
                        missingField = derivedFields[key] || key;

                        var errorMessage = "Required field value '" + missingField + "' is empty";
                        if (typeof errors[errorMessage] !== 'number') {
                            errors[errorMessage] = 0;
                        }
                        errors[errorMessage] += 1;
                    }
                }

                result.errors = Object.getOwnPropertyNames(errors);
                return result;
            }

            function preprocessData(source, input) {
                if (!input) {
                    return null;
                }
                var data = input;

                if (source === "UltiPro") {
                    processNameFields(data);
                }

                processAddressFields(data);
                processPhone(data);
                processManagingDirector(data);
                if (source === "ADP") {
                    processAcctSubsidiaries(data);
                    processAcctDepartments(data);
                    processAcctCategories(data);
                    processAcctMktCostCenters(data);
                }

                return data;
            }

            function processAddressFields(data) {
                data['Mailing Street'] = data['Location Address Line 1'];
                if (data['Location Address Line 2']) {
                    data['Mailing Street'] += '\n' + data['Location Address Line 2'];
                }
                if (data['Location Address Line 3']) {
                    data['Mailing Street'] += '\n' + data['Location Address Line 3'];
                }
            }

            function processPhone(data) {
                if (typeof data['Work Contact: Work Phone'] !== 'undefined') {
                    var phoneParts = data['Work Contact: Work Phone'].split(' Ext. ');
                    data['Work Contact: Work Phone'] = phoneParts[0];
                }
            }

            function processManagingDirector(data) {
                if (typeof data['Managing Director'] !== 'undefined') {
                    //Disabled currently per Apto QA ~ 11/13/15
                    //result['Managing Director Name'] = result['Managing Director'].split('|').pop() || '';//Expecting <INT> - <ID> |<NAME>; return <NAME>
                    data['Managing Director ID'] = data['Managing Director'].split('|')[0].trim().replace(/[0-9]* - /, ''); //Expecting <INT> - <ID> |<NAME>; return <ID>

                    // if the ID is invalid, delete it
                    // Per CLARITY-2220, we define "invalid" as a length of less than 2 characters in HRIS Id
                    if (data['Managing Director ID'].length < 2) {
                        data['Managing Director ID'] = '';
                    }
                }
            }

            function processAcctCategories(data) {
                if (typeof data['Acct Categories'] !== 'undefined') {
                    var accountCategories = data['Acct Categories'].split(' ');
                    data['Acct Categories'] = accountCategories[0];

                    data['Accounting Category ID'] = accountCategories.splice(0, 1).pop(); //Expecting <ID> - <INT> - <NAME>; return <ID>
                    data['Accounting Category Name'] = accountCategories.splice(accountCategories.length - 3, accountCategories.length - 1).join(' '); //Expecting - <INT> - <NAME>; return <INT> - <NAME>
                }
            }

            function processAcctSubsidiaries(data) {
                if (typeof data['Acct Subsidiaries'] !== 'undefined') {
                        var accountSubsidiaries = data['Acct Subsidiaries'].split(' ');
                        data['Accounting Subsidiaries ID'] = accountSubsidiaries.splice(0, 1).pop(); //Expecting <ID> - <SomeString> - <NAME>; return <ID>
                }
            }

            function processAcctDepartments(data) {
                if (typeof data['Acct Departments'] !== 'undefined') {
                    var fieldValueParts = data['Acct Departments'].split(' - ');

                    data['Accounting Department ID'] = fieldValueParts[0];
                    fieldValueParts.shift();
                    data['Accounting Department Name'] = fieldValueParts.join(' - '); //Expecting <ID> - <SomeString> - <NAME>; return <ID>
                }
            }

            function processAcctMktCostCenters(data) {
                if (typeof data['Acct Mkt Cost Centers'] !== 'undefined') {
                    data['Acct Mkt Cost Centers'] = data['Acct Mkt Cost Centers'].split('-')[0].trim(); //Expecting 6 - CORPU - Corporate Natl USA; return 6
                }
            }

            function processNameFields(data) {
                data['First Name'] = data['Staff First Name'] || data['Payroll First Name'];
                data['Last Name'] = data['Staff Last Name'] || data['Payroll Last Name'];
                data['Staff Name'] = data['Staff Name'];

                if (typeof data['Payroll Name'] === 'undefined') {
                    data['Payroll Name'] = ''
                    if (data['Payroll First Name']) {
                        data['Payroll Name'] += data['Payroll First Name'];
                    }
                    if (data['Payroll Last Name']) {
                        data['Payroll Name'] += ' ' + data['Payroll Last Name'];
                    }
                    data['Payroll Name'] = data['Payroll Name'].trim();
                }
            }

        })
        .factory('processCsv', function(dataManipulation, $q) {
            var maxSimultaneousUploads = 5,
                rowGroupSize = 8,
                hasEncodingError = false;

            return {
                setMaxSimultaneousUploads : setMaxSimultaneousUploads,
                validate : validateFile,
                upload : upload,
                download : {
                    uploadedRecords : downloadUploaded,
                    invalidRecords : downloadInvalid
                }
            };

            function setMaxSimultaneousUploads(maxSimultaneousUploads) {
                this.maxSimultaneousUploads = maxSimultaneousUploads;
            }

            function download(filename, text) {
                function fireEvent(element, event) {
                    var evt;

                    if (document.createEvent) {
                        evt = document.createEvent('MouseEvents');
                        evt.initEvent(event, true, true);
                        element.dispatchEvent(evt);
                    } else if (document.createEventObject) {
                        evt = document.createEventObject();
                        element.fireEvent('on' + event, evt);
                    } else {
                        element[event]();
                    }
                }

                var downloadLink = document.createElement('a');
                downloadLink.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
                downloadLink.setAttribute('download', filename);

                fireEvent(downloadLink, 'click');
            }

            function downloadUploaded(data) {
                if (data.length) {
                    var results = Papa.unparse(data);
                    download('processed.csv', results);
                }
            }

            function downloadInvalid(data) {
                var results = Papa.unparse(data.map(function(x) {
                    var data = {};

                    data['Import Result'] = 'Failed';
                    data['Apto Id'] = 'N/A';
                    data.Error = x.errors.join('; ');

                    return angular.extend(data, x.data);
                }));
                download('unprocessed.csv', results);
            }

            function validateFile(source, requiredFields, notifications, file) {
                var deferred = $q.defer(),
                    hrisImportData = [];

                file.parse({
                    config: {
                        header: true,
                        skipEmptyLines: true,
                        step: function(row) {
                            var preppedRowData = dataManipulation.preprocessData(source, row.data[0])
                            try {
                                hrisImportData.push(dataManipulation.processRow(requiredFields, notifications, preppedRowData));
                            } catch (ex) {
                                deferred.reject(ex.message);
                            }
                        }
                    },
                    before: function(file) {
                        var acceptedMIMETypes = ["text/csv", "application/csv", "application/vnd.ms-excel"],
                            isfileExtCSV = (file.name && file.name.indexOf('.csv') !== -1);

                        if (!isfileExtCSV || file.type && acceptedMIMETypes.indexOf(file.type) === -1) {
                            deferred.reject("Error: Invalid type - please select a CSV file.");
                            return {
                                action: "abort",
                                reason: "Error: Invalid type - please select a CSV file."
                            }

                        }
                        return {};
                    },
                    complete: function() {
                        var errorMessages = {};

                        var dedupedData = removeDuplicates(hrisImportData);
                        var managerHrisIdConflicts = removeSameHRISManager(hrisImportData);
                        var invalid = [];
                        var duplicateHrisRecords=[];
                        var processErrors = function(row) {
                            var errorsCopy = angular.copy(row.errors);

                            for (var key in errorsCopy) {
                                if (errorsCopy.hasOwnProperty(key)) {
                                    var value = errorsCopy[key];
                                    if (typeof value === "function") {
                                        continue;
                                    }

                                    if (typeof errorMessages[value] === 'undefined') {
                                        errorMessages[value] = 0;
                                    }
                                    errorMessages[value] += 1;
                                }
                            }
                        };

                        var valid = dedupedData.valid.filter(function(row) {
                            processErrors(row);

                            if (row && row.errors.length > 0) {
                                invalid.push(row);
                            }

                            return row && row.errors.length === 0;
                        });

                        duplicateHrisRecords=dedupedData.removed.filter(function(row) {
                            if (!row) {
                                return false;
                            }

                            processErrors(row);
                            return row.errors.length > 0;
                        });

                        invalid=duplicateHrisRecords.concat(invalid);

                        if (!valid.length) {
                            notifications.push("No valid rows were found for upload. Please select another file.");
                        }

                        var results = {};
                        results.valid = valid;
                        results.duplicates = dedupedData.removed
                        results.invalid = invalid;

                        deferred.resolve({data: results, errors: errorMessages});

                        function removeDuplicates(data) {
                            var employmentByHrisId = {}
                                , duplicateHrisIdLabel = 'Duplicate HRIS ID'
                                , results = {
                                    removed: [],
                                    valid: []
                                };
                            data.forEach(function(record) {
                                //Because there are currently two HR systems we have to check for both sets of criteria fields
                                //Its not a great solution, but if we send data in chunks to the server (for speed reasons)
                                //then the upsert command will attempt to upsert duplicates
                                var hrisId = record.data['HRIS ID'];

                                if (!hrisId) {
                                    // if it doesn't have an hris id, push it as valid so it isn't deduped, and instead
                                    // let the required field check flag with the error that the HRIS ID is missing.
                                    results.valid.push(record);
                                } else if (employmentByHrisId[hrisId]) {
                                    var oldRecord = employmentByHrisId[hrisId];
                                    var fireDateNew = record.data['Termination Date'];
                                    var fireDateOld = oldRecord.data['Termination Date'];
                                    var removed = {};
                                    var valid = {};

                                    //add error to first occurence not set
                                    //if (typeof oldRecord.errors[duplicateHrisIdLabel] === 'undefined') {
                                    //    oldRecord.errors.push(duplicateHrisIdLabel);
                                    //}

                                    if (!fireDateNew && !fireDateOld) {
                                        // We are assuming that there will never be more than 2 duplicate HRIS Ids that are not terminated
                                        results.removed.push(oldRecord);
                                        removed = record;
                                    } else if (fireDateNew && fireDateOld) {
                                        if (Date.parse(fireDateNew) > Date.parse(fireDateOld)) {
                                            employmentByHrisId[hrisId] = record;
                                            removed = oldRecord;
                                        } else {
                                            removed = record;
                                        }
                                    } else {
                                        if (!fireDateNew && fireDateOld) {
                                            employmentByHrisId[hrisId] = record;
                                            removed = oldRecord;
                                        } else {
                                            removed = record;
                                        }
                                    }

                                    if (removed.errors.indexOf(duplicateHrisIdLabel) === -1) {
                                        removed.errors.push(duplicateHrisIdLabel);
                                    }

                                    results.removed.push(removed);
                                } else {
                                    employmentByHrisId[hrisId] = record;
                                }

                            });

                            for (var key in employmentByHrisId) {
                                if (employmentByHrisId.hasOwnProperty(key)) {
                                    results.valid.push(employmentByHrisId[key]);
                                }
                            }
                            return results;
                        }

                        function removeSameHRISManager(data) {
                            conflictHrisIdLabel = 'HRIS ID cannot match Manager\'s HRIS ID'
                            , results = {
                                removed: [],
                                valid: []
                            };
                        data.forEach(function(record) {
                            var hrisId = record.data['HRIS ID'];
                            var managerHrisId = record.data['Managing Director'];
                            if (managerHrisId!==null) {
                                managerHrisId = managerHrisId.split('|')[0].trim().replace(/[0-9]* - /, '');
                            } else {
                                managerHrisId = '';
                            }
                            if (!hrisId) {
                                results.valid.push(record);
                            } else {
                                var removed = {};
                                if (hrisId===managerHrisId && managerHrisId!=='') {
                                    removed = record;
                                    if (removed.errors.indexOf(conflictHrisIdLabel) === -1) {
                                        removed.errors.push(conflictHrisIdLabel);
                                    }
                                    results.removed.push(record);
                                } else {
                                    results.valid.push(record);
                                }
                            }
                        });
                            return results;
                        }
                    }
                });

                return deferred.promise;
            }

            function scheduleSync(remoteScheduleSync) {
                var deferred = $q.defer();

                Visualforce.remoting.Manager.invokeAction(
                    remoteScheduleSync,
                    function callback(result, event) {
                        deferred.resolve();
                    }
                );

                return deferred.promise;
            }

            function upload($scope, incrementResultsCount, validData) {

                rowGroupSize = $scope.rowsToProcess || rowGroupSize;
                var dataToPush = [],
                    deferred = $q.defer(),
                    results = [],
                    abort = false;

                $scope.isUploading = true;
                while (validData.length > 0) {
                    dataToPush.push(JSON.stringify(validData.splice(0, rowGroupSize)));
                }

                var uploadsRemaining = dataToPush.length;
                scheduleSync($scope.remoteScheduleSync).then(sendData);

                return deferred.promise;

                function sendData() {
                    if (dataToPush.length === 0) {
                        deferred.resolve();
                        return;
                    }

                    var delay = 1000;
                    var initialData = dataToPush.splice(0, maxSimultaneousUploads);
                    initialData.forEach(function(dataChunkToSend) {
                        setTimeout(function() {
                            sendDataChunk([dataChunkToSend]);
                        }, delay);
                    });
                }

                function sendDataChunk(dataChunkToSend) {
                    if (abort) {
                        return;
                    }

                    Visualforce.remoting.Manager.invokeAction(
                        $scope.remoteUploadData,
                        dataChunkToSend,
                        $scope.selectedSource,
                        function callback(result, event) {
                            $scope.$apply(function() {
                                if (result !== null) {
                                    incrementResultsCount(result.length);
                                    results.push(result);
                                } else if (event.message && typeof(appConfig) != "undefined") {
                                    if (event.message.indexOf(appConfig.labels.userLoggedOutMatch) !== -1 || event.message.indexOf(appConfig.labels.userLoggedOutSessionInvalid) !== -1) {
                                        abort = true;
                                        $scope.notifications = [];
                                        $scope.notifications.push('Error user has been logged out.  Please refresh page.');
                                        deferred.resolve(results);
                                    } else {
                                        $scope.notifications.push(event.message);
                                    }
                                } else if (result === null && event.type === 'exception') {
                                    dataChunkToSend.forEach(function(data) {
                                        data = JSON.parse(data);
                                        data.forEach(function(row) {
                                            var errorInfo='Email='+row.data['Work Contact: Work Email'];
                                            errorInfo+=' HRIS ID='+row.data['HRIS ID'];
                                            results.push({
                                                "Import Result": 'Failed',
                                                "Error": event.message + ' '+ errorInfo
                                            })
                                        })
                                    });
                                }
                            });

                            uploadsRemaining--;
                            if (dataToPush.length > 0) {
                                setTimeout(function() {
                                    sendDataChunk(dataToPush.splice(0, 1));
                                }, 5000);
                            } else if (uploadsRemaining === 0) {
                                deferred.resolve(results);
                            }
                        }
                    );
                }
            }
        });
})(angular);
