(function(angular) {
    // pulls cached version if it exists otherwise it uses the remote
    var templateBuilder = function(attrs, templateName) {
        // if the the fieldwithlabel attr is true set the template to 'fieldWithLabel'
        if (attrs && attrs.showLabel && (attrs.showLabel === 'true' || attrs.showLabel === true)) {
            templateName = 'fieldWithLabel';
        }
        if (typeof vfHelperTemplates === 'object' && vfHelperTemplates[templateName]) {
            return vfHelperTemplates[templateName];
        }
        return '<ng-include src="getTemplate(templateName, showLabel)"></ng-include>';
    };

    generateGUID = (typeof(window.crypto) != 'undefined' && typeof(window.crypto.getRandomValues) != 'undefined')
        ? function() {
            // If we have a cryptographically secure PRNG, use that
            // http://stackoverflow.com/questions/6906916/collisions-when-generating-uuids-in-javascript
            var buf = new Uint16Array(8);
            window.crypto.getRandomValues(buf);
            var S4 = function(num) {
                var ret = num.toString(16);
                while (ret.length < 4) {
                    ret = "0"+ret;
                }
                return ret;
            };
            return (S4(buf[0])+S4(buf[1])+"-"+S4(buf[2])+"-"+S4(buf[3])+"-"+S4(buf[4])+"-"+S4(buf[5])+S4(buf[6])+S4(buf[7]));
        }
        : function() {
            // Otherwise, just use Math.random
            // http://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid-in-javascript/2117523#2117523
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                var r = Math.random()*16|0, v = c === 'x' ? r : (r&0x3|0x8);
                return v.toString(16);
            });
        };

    angular.module('vfHelpers', ['AppConfig', 'ngSanitize'])
        .config(function($compileProvider) {
            // required to support lookup popups
            $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|mailto|file|javascript):/);
        })

        .filter('percent', ['$filter', function($filter) {
            return function(input, decimals) {
                var val = parseFloat(input) || 0.0;
                var displayVal = $filter('number')(val, 5)

                return displayVal + '%';
            };
        }])

        .filter('capitalize', function() {
            return function(input) {
              return (angular.isString(input) && input.length > 0) ? input.charAt(0).toUpperCase() + input.substr(1).toLowerCase() : input;
            }
        })

        .service('resources', function(resourceUrls) {
            var getHelpIconUri = function() {
                return resourceUrls.vfHelperBase + '/img/HelpIcon.png';
            };

            var getImageBase = function() {
                return resourceUrls.vfHelperBase + '/img';
            };

            var getTemplate = function(templateName, showLabel) {
                templateName = (!showLabel) ? templateName : 'fieldWithLabel';

                return resourceUrls.vfHelperBase + '/templates/' + templateName + '.html';
            };

            return {
                getHelpIconUri: getHelpIconUri,
                getImageBase: getImageBase,
                getTemplate: getTemplate
            };
        })

        .service('netSuiteAsync', function($q, appConfig) {
            var netSuiteIdToSubsidiaryInfoMap = {};
            var netSuiteIdToDeferredMap = {};

            // this method allows pages with multiple NetSuite Search Fields to share the result
            // of a single request for a particular NetSuite ID instead of each having to perform
            // their own remote action.
            var getSubsidiaryInfo = function(netSuiteId) {
                var doRemoteCall = !netSuiteIdToDeferredMap[netSuiteId];

                var deferred;
                if (doRemoteCall) {
                    deferred = netSuiteIdToDeferredMap[netSuiteId] = $q.defer();
                } else {
                    deferred = netSuiteIdToDeferredMap[netSuiteId];
                }

                if (netSuiteIdToSubsidiaryInfoMap[netSuiteId]) {
                    deferred.resolve(netSuiteIdToSubsidiaryInfoMap[netSuiteId]);
                } else if (doRemoteCall) {
                    Visualforce.remoting.Manager.invokeAction(
                        appConfig.actions.getNetSuiteData.getSubsidiaryInfo
                        , netSuiteId
                        , function(response, event) {
                            netSuiteIdToSubsidiaryInfoMap[netSuiteId] = response;
                            delete netSuiteIdToDeferredMap[netSuiteId];

                            deferred.resolve(response);
                        }
                        , {escape: false}
                    );
                }

                return deferred.promise;
            };

            return {
                getSubsidiaryInfo: getSubsidiaryInfo
            };
        })

        .controller('fieldController', ['$scope', function($scope) {
            var getCaretPosition = function(inputField) {
                var caretPosition = 0;

                // IE Support
                if (document.selection) {
                    inputField.focus();

                    var selectionRange = document.selection.createRange();
                    selectionRange.moveStart ('character', -inputField.value.length);

                    caretPosition = selectionRange.text.length;
                } else if (inputField.selectionStart || inputField.selectionStart === '0') {
                    caretPosition = inputField.selectionStart;
                }

                return caretPosition;
            };

            $scope.showHelpText = function() {
                if (sfdcPage.setHelp && $scope.field.helpText) {
                    sfdcPage.setHelp($scope.baseId, $scope.field.helpText);
                }
            };

            this.equals = function(value1, value2) {
                if (typeof value1 === 'undefined' || typeof value2 === 'undefined') {
                    return false;
                }

                return (value1 === value2
                    || value1.toString().toLowerCase() === "true" && value2.toString().toLowerCase() === "yes"
                    || value1.toString().toLowerCase() === "false" && value2.toString().toLowerCase() === "no"
                    || value2.toString().toLowerCase() === "true" && value1.toString().toLowerCase() === "yes"
                    || value2.toString().toLowerCase() === "false" && value1.toString().toLowerCase() === "no");
            };

            this.restrictTextInput = function(inputId, length) {
                if (typeof length === 'undefined' || length === null) {
                    return;
                }

                // use a small timeout to make sure that the angular has had time to set the id on the element
                setTimeout(function() {
                    var element = angular.element(document.getElementById(inputId));
                    element.on('keypress', function(e) {
                        // ignore arrow keys
                        if (e.charCode <= 0) {
                            return;
                        }

                        if (e.target.value.length >= length) {
                            e.preventDefault();
                        }
                    });

                    element.on('paste', function(e) {
                        e.preventDefault();

                        // get the pasted text and remove non-numberic characters, except the decimal
                        var text = e.clipboardData.getData("text/plain");
                        if (text) {
                            text = text.substr(0, length);
                        }

                        e.target.value = text;
                        e.target.dispatchEvent(new Event('change'));
                    });
                }, 500);
            };

            this.restrictDecimalInput = function(inputId, precision) {
                if (typeof precision === 'undefined' || precision === null) {
                    return;
                }

                var numberRegex = (precision === 0) ? /[0-9]/ : /[0-9.-]/;
                var decimalRegex = new RegExp('(.*)\\.[0-9]{' + precision + '}');
                var exactDecimalRegex = new RegExp('^(.*)\\.[0-9]{' + precision + '}$');

                // use a small timeout to make sure that the angular has had time to set the id on the element
                setTimeout(function() {
                    var element = angular.element(document.getElementById(inputId));
                    element.on('keypress', function(e) {
                        // ignore arrow keys
                        if (e.charCode <= 0) {
                            return;
                        }

                        var keyPressed = String.fromCharCode(e.charCode);
                        var caretPosition = getCaretPosition(e.target);
                        var newValue = [e.target.value.slice(0, caretPosition), keyPressed, e.target.value.slice(caretPosition)].join('');

                        if (newValue.length > 0 && isNaN(newValue)
                            || keyPressed.search(numberRegex) !== 0
                            || e.target.value.search(decimalRegex) === 0 && newValue.search(exactDecimalRegex) !== 0) {
                            e.preventDefault();

                            // if the user enters a decimal point as the first value, add a zero as the integer part of the number
                            if (newValue === '.') {
                                e.target.value = '0.';
                                e.target.dispatchEvent(new Event('change'));
                            }
                        }
                    });

                    element.on('paste', function(e) {
                        e.preventDefault();

                        // get the pasted text and remove non-numberic characters, except the decimal
                        var text = e.clipboardData.getData("text/plain");
                        if (text) {
                            text = text.replace(/[^0-9.]/g, '');

                            // if the resultant text matches the regex, set it to the first match.
                            // this enforces the decimal restriction.
                            var matches = text.match(decimalRegex);
                            if (matches && matches.length > 0) {
                                text = matches[0];

                                // remove the trailing decimal if precisin is 0
                                if (precision === 0) {
                                    text = text.replace('.', '');
                                }
                            }
                        }

                        e.target.value = text;
                        e.target.dispatchEvent(new Event('change'));
                    });
                }, 500);
            };
        }])

        .directive('restrictDecimals', function() {
            return {
                restrict: 'A',

                link: function(scope, element, attrs, fieldController) {
                    var precision = attrs.restrictDecimals;
                    if (precision && !isNaN(precision)) {
                        if (!element[0].id) {
                            element[0].id = generateGUID();
                        }
                        fieldController.restrictDecimalInput(element[0].id, precision);
                    }
                },

                controller: 'fieldController'
            }
        })

        .directive('setFocus', function($timeout, $parse) {
            return {
                link: function(scope, element, attrs) {
                    var model = $parse(attrs.setFocus);
                    scope.$watch(model, function(value) {
                        if (value === true) {
                            $timeout(function() {
                                element[0].focus();
                            });
                        }
                    });
                }
            };
        })

        // this directive provides lookup field functionality within angular.
        // usage: <lookup-field field="[object]"/>
        // note: the field object should have the following attributes:
        //       idPrefix - the 3-character prefix for the SObject
        //       label - the label for the SObject
        //       value - the 15-character id of the selected record
        //       displayValue - the display value of the selected record
        //       required - whether or not the field is required
        .directive('lookupField', function($rootScope, resources, remoteActions) {
            return {
                restrict: 'E',

                scope: {
                    field: '=',
                    disabled: '=',
                    readonly: '=',
                    showLabel: '@',
                    hideHelp: '@',
                    tag: '&',
                    onFieldChange: '&'
                },

                template: function(event, attrs) {
                    return templateBuilder(attrs, 'lookupField');
                },

                link: function(scope, element, attrs, fieldController) {
                    angular.extend(scope, resources);

                    scope.templateName = 'lookupField';
                    scope.baseId = generateGUID();
                    scope.getTemplate = resources.getTemplate;

                    if (scope.onFieldChange) {
                        scope.$watch('field.value', function(newValue, oldValue) {
                            if (newValue !== oldValue) {
                                scope.$eval(scope.onFieldChange);
                            }
                        });
                    }

                    scope.openLookup = function() {
                        var params = '';

                        if (scope.field.displayValue) {
                            params += '&lksrch=' + encodeURIComponent(scope.field.displayValue).replace(/[!'()*]/g, escape);
                        }
                        if (scope.field.fieldId) {
                            params += '&lkfield=' + scope.field.fieldId;
                        }
                        if (scope.field.objectPrefix) {
                            params += '&lkent='+scope.field.objectPrefix;
                        }

                        openLookup('/_ui/common/data/LookupPage?lknm=' + scope.baseId + '&lktp=' + scope.field.idPrefix
                            , 670, '1', params);
                    };

                    scope.clearLookup = function() {
                        scope.field.value = '';
                        scope.field.displayValue = '';
                    };

                    scope.$on('lookup-complete-' + scope.baseId, function(event, result) {
                        // we have to manually set the value and displayValue attributes since ng-model binding
                        // doesn't work when fields are updated outside of angular
                        // note: use scope.$apply() here so that it will trigger a dirty check on other directives
                        // that might be paired to this field's value
                        if (scope.field.fieldName==='Bill_To_Company__c') {
                            remoteActions.getAccountAddress(scope.field.value)
                                .then(function(result) {
                                    //scope.billToAddress.value = result;
                                    $rootScope.$broadcast('Bill_To_Company__c', result);
                                });
                        }

                        scope.$apply(function() {
                            scope.field.value = result.value;
                            scope.field.displayValue = result.displayValue;

                            if (scope.tag) {
                                $rootScope.$broadcast(scope.tag, result.value);
                            }
                        });
                    });
                },

                controller: 'fieldController'
            };
        })

        .directive('currencyOutput', function(resources) {
            return {
                restrict: 'E',

                scope: {
                    field: '=',
                    showLabel: '@',
                    hideHelp: '@'
                },

                template: function(event, attrs) {
                    return templateBuilder(attrs, 'currencyOutput');
                },

                link: function(scope) {
                    angular.extend(scope, resources);

                    scope.templateName = 'currencyOutput';
                    scope.baseId = generateGUID();
                    if (scope.field) {
                        scope.field.value = parseFloat(scope.field.value || '0.0');
                    }
                },

                controller: 'fieldController'
            };
        })

        .directive('currencyField', function(resources) {
            return {
                restrict: 'E',

                scope: {
                    field: '=',
                    disabled: '=',
                    readonly: '=',
                    precision: '=?',
                    showLabel: '@',
                    hideHelp: '@',
                    alignRight: '@',
                    onFieldChange: '&'
                },

                template: function(event, attrs) {
                    return templateBuilder(attrs, 'currencyField');
                },

                link: function(scope, element, attrs, fieldController) {
                    angular.extend(scope, resources);

                    scope.templateName = 'currencyField';
                    scope.baseId = generateGUID();
                    scope.precision = scope.precision || 2;

                    fieldController.restrictDecimalInput(scope.baseId, scope.precision);

                    scope.onBlur = function() {
                        if (typeof scope.field.value === 'string') {
                            scope.field.value = parseFloat(scope.field.value || '0.0');
                        }
                    };

                    if (angular.isDefined(attrs.onFieldChange)) {
                        scope.$watch('field.value', function(newValue, oldValue) {
                            if (newValue !== oldValue && parseFloat(newValue) !== parseFloat(oldValue)) {
                                scope.$eval(scope.onFieldChange);
                            }
                        });
                    }
                },

                controller: 'fieldController'
            }
        })

       .directive('textOutput', function(resources) {
            return {
                restrict: 'E',

                scope: {
                    field: '=',
                    multiline: '=',
                    precision: '=?',
                    showLabel: '@',
                    hideHelp: '@'
                },

                template: function(event, attrs) {
                    return templateBuilder(attrs, 'textOutput');
                },

                link: function(scope, element, attrs, fieldController) {
                    angular.extend(scope, resources);

                    scope.templateName = 'textOutput';
                    scope.baseId = generateGUID();

                    fieldController.restrictDecimalInput(scope.baseId, scope.precision);

                    scope.precision = scope.precision || 0;
                    scope.field = scope.field || {
                        displayValue: '',
                        value: '',
                        isRequired: false
                    };

                    scope.field.displayValue = scope.field.displayValue || scope.field.value;
                    if (typeof scope.field.displayValue !== 'undefined' && scope.field.displayValue !== null) {
                        scope.field.displayValue = (scope.multiline)
                            ? scope.field.displayValue.toString().replace(/\n/g, "<br>").replace(/\\n/g, "<br>")
                            : scope.field.displayValue.toString();
                    }

                    if (typeof scope.field.idPrefix === 'undefined'
                        && typeof scope.field.recordType === 'undefined'
                        && typeof scope.field.options === 'undefined'
                        && (!scope.field.type || scope.field.type === 'STRING_TYPE')) {      // only watch string types that aren't lookup fields or picklists
                        scope.$watch('field', function(newValue) {
                            if (newValue === undefined) {
                                return;
                            }

                            if (typeof newValue.value === 'undefined' || newValue.value === null) {
                                scope.field.displayValue = '';
                            } else if (!fieldController.equals(scope.field.value, scope.field.displayValue)) {
                                scope.field.displayValue = (scope.multiline)
                                    ? newValue.value.toString().replace(/\n/g, "<br>").replace(/\\n/g, "<br>")
                                    : newValue.value.toString();
                            }
                        }, true);
                    }
                },

                controller: 'fieldController'
            }
        })

        .directive('booleanField', function(resources) {
            return {
                restrict: 'E',

                scope: {
                    field: '=',
                    disabled: '=',
                    onFieldChange: '&',
                    showLabel: '@',
                    hideHelp: '@'
                },

                template: function(event, attrs) {
                    return templateBuilder(attrs, 'booleanField');
                },

                link: function(scope, element, attrs) {
                    angular.extend(scope, resources);

                    scope.templateName = 'booleanField';
                    scope.baseId = generateGUID();

                    scope.$watch('field.value', function(newValue, oldValue) {
                        if (typeof newValue === 'string') {
                            scope.field.value = newValue.toLowerCase().indexOf('t') === 0;
                        }

                        if (newValue !== oldValue && scope.onFieldChange) {
                            scope.$eval(scope.onFieldChange);
                        }
                    });
                },

                controller: 'fieldController'
            }
        })

        .directive('textField', function(resources) {
            return {
                restrict: 'E',

                scope: {
                    field: '=',
                    disabled: '=',
                    onInputChange: '&',
                    readonly: '=',
                    length: '=?',
                    precision: '=?',
                    showLabel: '@',
                    hideHelp: '@',
                    requiredField: '@'
                },

                template: function(event, attrs) {
                    var tpl = attrs.$attr.showNumberInput ? 'textNumberField' : 'textField';
                    return templateBuilder(attrs, tpl);
                },

                link: function(scope, element, attrs, fieldController) {
                    angular.extend(scope, resources);

                    scope.templateName = scope.showNumberInput ? 'textNumberField' : 'textField';
                    scope.baseId = generateGUID();

                    fieldController.restrictDecimalInput(scope.baseId, scope.precision);
                    fieldController.restrictTextInput(scope.baseId, scope.length);

                    scope.precision = scope.precision || 0;
                    scope.step = Math.pow(10, -scope.precision);

                    // set field.isRequired if the requiredField attribute is added to the component
                    if (scope.requiredField) {
                        scope.field.isRequired = true;
                    }

                    if (scope.field) {
                        scope.showNumberInput = scope.field.type === 'DECIMAL_TYPE'
                                             || scope.field.type === 'CURRENCY_TYPE'
                                             || scope.field.type === 'PERCENT_TYPE'
                                             || scope.field.type === 'INTEGER_TYPE';

                        if (scope.field.type !== 'STRING_TYPE') {
                            scope.onBlur = function() {
                                if (scope.field.type === 'DECIMAL_TYPE'
                                    || scope.field.type === 'PERCENT_TYPE'
                                    || scope.field.type === 'CURRENCY_TYPE') {
                                    scope.field.value = scope.field.value && parseFloat(scope.field.value);
                                } else if (scope.field.type === 'INTEGER_TYPE') {
                                    scope.field.value = scope.field.value && parseInt(scope.field.value);
                                }
                            };
                        }
                    }

                    if (angular.isDefined(attrs.onInputChange)) {
                        scope.onInputChange = function() {
                            scope.$eval(attrs.onInputChange);
                        }
                    }
                },

                controller: 'fieldController'
            };
        })

        .directive('textareaField', function(resources) {
            return {
                restrict: 'E',

                scope: {
                    field: '=',
                    disabled: '=',
                    multiline: '=',
                    readonly: '=',
                    showLabel: '@',
                    hideHelp: '@',
                    rows: '@',
                    cols: '@',
                    class: '@',
                    maxlength: '@',
                    size: '@'
                },

                template: function(event, attrs) {
                    return templateBuilder(attrs, 'textareaField');
                },

                link: function(scope) {
                    angular.extend(scope, resources);

                    scope.templateName = 'textareaField';
                    scope.baseId = generateGUID();

                    if (scope.field && !scope.field.defaultRows) {
                        scope.field.defaultRows = 4;
                    }
                },

                controller: 'fieldController'
            };
        })

        .directive('netsuiteSearchField', function($q, resources, appConfig, netSuiteAsync) {
            return {
                restrict: 'E',

                scope: {
                    field: '=',
                    disabled: '=',
                    disableSearch: '=',
                    readonly: '=',
                    endpoint: '=',
                    onFieldChange: '&',
                    showLabel: '@',
                    hideHelp: '@',
                    hideSubsidiary : '@',
                    isVendor: '=?',
                    brokerId: '=',
                    requireBroker: '@',
                    requireBrokerMsg: '@',
                    subsidiary: '=',
                    aptoError: '@',
                    aptoErrorMsg: '@'
                },

                template: function(event, attrs) {
                    return templateBuilder(attrs, 'netsuiteSearchField');
                },

                link: function(scope, element, attrs) {

                    var requestRecipients = JSON.parse(appConfig.vendorRequestRecipientsJson);
                    angular.extend(scope, resources);
                    var fieldRecordType = scope.field.recordType;
                    var ignoreChange = false;
                    var lastTid = -1;
                    var minTermLength = 2;
                    var originalDisplayValue = scope.field.displayValue;
                    var originalResults = [];
                    scope.errorCode = null;
                    scope.errorMessage = null;
                    scope.firstName = '';
                    scope.lastName = '';
                    scope.companyName = '';
                    scope.extId = '';
                    scope.city = '';
                    scope.stateProvince = '';
                    scope.templateName = 'netsuiteSearchField';
                    scope.baseId = generateGUID();
                    scope.results = [];
                    scope.showOverlay = false;
                    scope.subsidiaryInfo = '';
                    scope.isVendor = scope.isVendor || fieldRecordType.toLowerCase() === 'vendor' || fieldRecordType.toLocaleLowerCase() === 'customer_long';
                    scope.isVendorOnly = fieldRecordType.toLowerCase() === 'vendor';
                    scope.emailTo = fieldRecordType.toLowerCase() === 'vendor' ? requestRecipients.US : requestRecipients.BillTo;
                    scope.emailToSecondary = fieldRecordType.toLowerCase() === 'vendor' ? requestRecipients.CA:'';
                    scope.isSearching = false;
                    var processResponse = function(response, event, deferred, searchText) {
                        if (event && typeof event.tid !== 'undefined') {
                            // the response is from an earlier transaction so discard it
                            if (lastTid > event.tid) {
                                lastTid = event.tid;
                                deferred.reject(response);
                                return;
                            }
                            // the search string has already been updated, so discard this response
                            var vendorSearchText = scope.companyName + scope.firstName + scope.lastName + scope.extId + scope.city + scope.stateProvince;
                            if (vendorSearchText !== searchText && scope.field.displayValue + vendorSearchText !== searchText) {
                                deferred.reject(response);
                                return;
                            }

                            lastTid = event.tid;
                        }

                        if (!response) {
                            if (!event) {
                                deferred.resolve([{
                                    error: 'Please type at least ' + minTermLength + ' characters to begin searching.',
                                    status: 'message'
                                }]);
                            } else {
                                var error = (event.message.includes('timeout'))
                                    ? 'The search timed out.<br/>Please type more characters to narrow the search results.'
                                    : event.message;
                                deferred.resolve([{
                                    error: error,
                                    status: 'message'
                                }]);
                            }
                        } else {
                            deferred.resolve(response);
                        }
                    };

                    var handleRemotingResponse = function(response, event, deferred, queryString) {
                        if (event.statusCode === 400) {
                            scope.aptoError = true;
                            scope.aptoErrorMsg = 'Using Apto Datastore. ('+event.message+')';
                        }

                        if (event.statusCode !== 200 && scope.isVendorOnly) {
                            processVendorFromDataStore(response, event, deferred, queryString);
                        } else if (event.statusCode !== 200) {
                            processCustomersFromDataStore(response, event, deferred, queryString);
                        } else {
                            processResponse(response, event, deferred, queryString);
                        }
                    };

                    var processDataStoreResponse = function(response, event, deferred, searchText) {
                        Visualforce.remoting.Manager.invokeAction(
                            'NetSuiteSearchController.getClientsFromDataStore'
                            , searchText
                            , scope.brokerId
                            , function(response, event) {
                                deferred.resolve(response);
                            }
                            , {escape: false}
                        );
                    };

                    var processCustomersFromDataStore = function(response, event, deferred, searchText) {
                        Visualforce.remoting.Manager.invokeAction(
                            'NetSuiteSearchController.getCustomersFromDataStore'
                            , scope.brokerId
                            , scope.companyName
                            , scope.firstName
                            , scope.lastName
                            , function(response, event) {
                                deferred.resolve(response);
                            }
                            , {escape: false}
                        );

                    };

                    var processVendorFromDataStore = function(response, event, deferred, searchText) {
                        Visualforce.remoting.Manager.invokeAction(
                            'NetSuiteSearchController.getVendorsFromDataStore'
                            , scope.brokerId
                            , scope.companyName
                            , scope.firstName
                            , scope.lastName
                            , scope.extId
                            , scope.city
                            , scope.stateProvince
                            , function(response, event) {
                                deferred.resolve(response);
                            }
                            , {escape: false}
                        );

                    };

                    var executeRemoteCall = function(endpoint, searchText, brokerId) {
                        var deferred = $q.defer();
                        Visualforce.remoting.Manager.invokeAction(
                            endpoint
                            , searchText
                            , brokerId
                            , function(response, event) {

                                if (event.statusCode === 400) {
                                    scope.aptoError = true;
                                    scope.aptoErrorMsg = 'Using Apto Datastore. ('+event.message+')';
                                }

                                if (event.statusCode !== 200) {
                                    processDataStoreResponse(response, event, deferred, searchText);
                                } else {
                                    processResponse(response, event, deferred, searchText);
                                }
                            }
                            , {escape: false}
                        );
                        return deferred.promise;
                    };

                    var executeVendorRemoteCall = function(endpoint, brokerId, companyName, firstName, lastName, extId, city, stateProvince) {
                        var deferred = $q.defer();
                        if (scope.isVendorOnly && companyName.length >= minTermLength || firstName.length >= minTermLength || lastName.length >= minTermLength || extId.length >= minTermLength || city.length >= minTermLength || stateProvince.length >= minTermLength) {
                            Visualforce.remoting.Manager.invokeAction(
                                endpoint
                                , brokerId
                                , companyName
                                , firstName
                                , lastName
                                , extId
                                , city
                                , stateProvince
                                , function(response, event) {
                                    handleRemotingResponse(response, event, deferred, companyName + firstName + lastName + extId+ city + stateProvince);
                                }
                                , {escape: false}
                            );
                        } else if (scope.isVendor && companyName.length >= minTermLength || firstName.length >= minTermLength || lastName.length >= minTermLength) {
                            Visualforce.remoting.Manager.invokeAction(
                                endpoint
                                , brokerId
                                , companyName
                                , firstName
                                , lastName
                                , function(response, event) {
                                    handleRemotingResponse(response, event, deferred, companyName + firstName + lastName);
                                }
                                , {escape: false}
                            );
                        } else {
                            var queryStr = scope.isVendorOnly ? companyName + firstName + lastName + extId + city + stateProvince : companyName + firstName + lastName;
                            processResponse(null, null, deferred, queryStr);
                        }
                        return deferred.promise;
                    };

                    var handleResponse = function(response, scope, searchString) {
                        var sortResults = function(results) {
                            results.sort(function(a, b) {
                                return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
                            });
                        };
                        scope.results.length = 0;
                        if (response) {
                            if (response.length === 1
                                && typeof response[0].error !== 'undefined'
                                && (response[0].error !== null || response[0].error !== '')) {

                                if (response[0].status === 'message') {
                                    scope.errorCode = '';
                                    scope.errorMessage = response[0].error;
                                } else {
                                    var errorMessageParts = response[0].error.split(' ');
                                    scope.errorCode = errorMessageParts[0];
                                    scope.errorMessage = errorMessageParts.slice(1).join(' ');
                                }
                                scope.results = [];
                            } else {
                                scope.errorCode = null;
                                scope.errorMessage = null;
                                searchString = searchString && searchString.toLowerCase();

                                var resultsStartingWithSearchString = [];
                                var resultsNotStartingWithSearchString = [];
                                response.forEach(function(r) {
                                    r.htmlAddress = (r.formattedAddress
                                        ? r.formattedAddress.toString().replace(/\n/g, "<br>").replace(/\\n/g, "<br>")
                                        : '');

                                    if (searchString && r.name.toLowerCase().startsWith(searchString)) {
                                        resultsStartingWithSearchString.push(r);
                                    } else {
                                        resultsNotStartingWithSearchString.push(r);
                                    }
                                });

                                // show results that start with the search string at the top of the list
                                sortResults(resultsStartingWithSearchString);
                                sortResults(resultsNotStartingWithSearchString);

                                scope.results = resultsStartingWithSearchString.concat(resultsNotStartingWithSearchString);
                            }
                        }
                        scope.isSearching = false;
                    };

                    scope.$watch(
                        'subsidiary + brokerId'
                        , function(newValue, oldValue) {
                            if (!newValue) {
                                scope.subsidiaryInfo = '';
                                return;
                            } else if (scope.disableSearch && scope.subsidiaryInfo || scope.subsidiaryInfo && newValue === oldValue) {
                                return;
                            }

                            netSuiteAsync.getSubsidiaryInfo(scope.subsidiary || scope.brokerId).then(function(response) {
                                scope.subsidiaryInfo = response;
                            });
                        }
                    );

                    var qualifyNetsuiteVendorSearch = function(newValue, oldValue) {
                        if (newValue === oldValue || ignoreChange) {
                            ignoreChange = false;
                            return false;
                        } else if (!newValue) {
                            handleResponse([], scope);
                            return false;
                        } else if (scope.disableSearch) {
                            return false;
                        }
                        return true;
                    };

                    // use a setTimeout to prevent an async request on every keyup.
                    var netsuiteVendorSearchFormTimeout;
                    scope.$watch(
                        'field.displayValue + companyName + firstName + lastName + extId + city + stateProvince',
                        function(newValue, oldValue) {
                            if (netsuiteVendorSearchFormTimeout) {
                                 clearTimeout(netsuiteVendorSearchFormTimeout);
                            }
                            if (qualifyNetsuiteVendorSearch(newValue, oldValue)) {
                                scope.isSearching = true;
                            }
                            netsuiteVendorSearchFormTimeout = setTimeout(function() {
                                var brokerId;
                                if (!qualifyNetsuiteVendorSearch(newValue, oldValue)) {
                                    return;
                                }
                                brokerId = (typeof scope.brokerId === 'undefined') ? null : scope.brokerId;

                                if (scope.isVendor) {
                                    executeVendorRemoteCall(scope.endpoint, brokerId, scope.companyName || '', scope.firstName || '', scope.lastName || '', scope.extId || '', scope.city || '', scope.stateProvince || '')
                                        .then(function(response) {
                                            handleResponse(response, scope, scope.companyName);
                                        })
                                    ;
                                } else {
                                    executeRemoteCall(scope.endpoint, newValue, brokerId)
                                        .then(function(response) {
                                            if (scope.field.displayValue) {
                                                handleResponse(response, scope, newValue);
                                            }
                                        })
                                    ;
                                }
                            }, 500);
                        }
                    );

                    scope.select = function(result) {
                        scope.field.value = result.id;
                        scope.field.displayValue = result.name;
                        scope.field.formattedAddress = result.formattedAddress;
                        scope.showOverlay = false;

                        ignoreChange = true;
                    };

                    scope.doShowOverlay = function() {
                        var brokerId;
                        originalDisplayValue = scope.field.displayValue;
                        scope.showOverlay = true;

                        if (scope.results.length === 0 && scope.field.displayValue) {
                            scope.isSearching = true;
                            brokerId = (typeof scope.brokerId === 'undefined') ? null : scope.brokerId;
                            if (scope.isVendor) {
                                executeVendorRemoteCall(scope.endpoint, brokerId, scope.companyName || '', scope.firstName || '', scope.lastName || '', scope.extId || '', scope.city || '', scope.stateProvince || '')
                                    .then(function(response) {
                                        handleResponse(response, scope, scope.companyName);
                                    })
                                ;
                            } else {
                                executeRemoteCall(scope.endpoint, scope.field.displayValue, brokerId)
                                    .then(function(response) {
                                        if (scope.field.displayValue) {
                                            handleResponse(response, scope);
                                            originalResults = scope.results;
                                        }
                                    })
                                ;
                            }
                        }
                    };

                    scope.clearLookup = function() {
                        scope.field.value = '';
                        scope.field.displayValue = '';
                    };

                    scope.doHideOverlay = function() {
                        scope.field.displayValue = originalDisplayValue;
                        scope.results = originalResults;
                        scope.showOverlay = false;
                        ignoreChange = true;
                    };

                    if (angular.isDefined(attrs.onFieldChange)) {
                        scope.$watch('field.value', function(newValue, oldValue) {
                            if (newValue !== oldValue) {
                                scope.$eval(scope.onFieldChange);
                            }
                        });
                    }
                },

                controller: 'fieldController'
            }
        })

        .directive('picklistField', function(resources) {
            return {
                restrict: 'E',

                scope: {
                    field: '=',
                    disabled: '=',
                    pairField: '=',         // the field whose value is the key for pairOptions
                    pairOptions: '=',       // a dictionary in the form of {key: options[]}
                    readonly: '=',
                    sansNone: '=',
                    onFieldChange: '&',
                    showLabel: '@',
                    hideHelp: '@',
                    requiredField: '@'
                },

                template: function(event, attrs) {
                    return templateBuilder(attrs, 'picklistField');
                },

                link: function(scope, element, attrs) {
                    angular.extend(scope, resources);

                    // set field.isRequired if the requiredField attribute is added to the component
                    if (scope.requiredField) {
                        scope.field.isRequired = true;
                    }

                    scope.templateName = 'picklistField';
                    scope.baseId = generateGUID();

                    scope.$watch('field.value', function(newValue, oldValue) {
                        if (scope.field !== undefined && newValue !== oldValue) {
                            scope.field.displayValue = '';
                            var options = (angular.isDefined(attrs.pairOptions))
                                ? scope.optionsMap[scope.optionsKey.value]
                                : scope.field.options;

                            options.forEach(function(option) {
                                if (option.value === newValue) {
                                    scope.field.displayValue = option.displayValue;
                                    return;
                                }
                            });

                            if (angular.isDefined(attrs.onFieldChange)) {
                                scope.$eval(scope.onFieldChange);
                            }
                        }
                    });

                    if (angular.isDefined(attrs.pairOptions)) {
                        scope.optionsMap = scope.pairOptions;
                        scope.optionsKey = scope.pairField;
                        scope.$watch('field.options', function(newValue, oldValue) {
                            if (newValue !== oldValue) {
                                scope.optionsMap.default = newValue;
                            }

                            if (scope.field !== undefined && scope.field.displayValue) {
                                var match = false;
                                for (var i = 0; i < scope.field.options.length; i++) {
                                    if (scope.field.options[i].value === scope.field.value
                                        && scope.field.options[i].displayValue === scope.field.displayValue) {
                                        match = true;
                                        break;
                                    }
                                }

                                if (!match) {
                                    var currentOption = {
                                        displayValue: scope.field.displayValue,
                                        value: scope.field.value
                                    };
                                    scope.field.options.push(currentOption);
                                }
                            }
                        });
                    }
                },

                controller: 'fieldController'
            }
        })

        .directive('multiselectPicklistField', function(resources) {
            return {
                restrict: 'E',

                scope: {
                    field: '=',
                    disabled: '=',
                    readonly: '=',
                    showLabel: '@',
                    hideHelp: '@'
                },

                template: function(event, attrs) {
                    return templateBuilder(attrs, 'multiselectPicklistField');
                },

                link: function(scope) {
                    angular.extend(scope, resources);

                    scope.templateName = 'multiselectPicklistField';
                    scope.baseId = generateGUID();
                    scope.available = '';
                    scope.selected = '';
                    scope.field.selected = [];
                    scope.field.value = scope.field.value || '';
                    scope.field.value.split(';').forEach(function(v) {
                        scope.field.selected.push({
                            value: v,
                            label: v
                        });
                    });

                    scope.add = function() {
                        var selValues = scope.available;
                        selValues.forEach(function(v) {
                            for (var i = 0; i < scope.field.options.length; i++) {
                                if (scope.field.options[i].value === v) {
                                    scope.field.options.splice(i, 1);
                                }
                            }
                            scope.field.selected.push({
                                value: v,
                                label: v
                            });
                        });

                        scope.available = [];
                        scope.setChosen();
                    };
                    scope.remove = function() {
                        var selValues = scope.selected;
                        selValues.forEach(function(v) {
                            for (var i = 0; i < scope.field.selected.length; i++) {
                                if (scope.field.selected[i].value === v) {
                                    scope.field.selected.splice(i, 1);
                                }
                            }
                            scope.field.options.push({
                                value: v,
                                label: v
                            });
                        });

                        scope.selected = [];
                        scope.setChosen();
                    };

                    scope.setChosen = function() {
                        var chosen = '';
                        scope.field.selected.forEach(function(v) {
                            if (v.value) {
                                chosen += v.value + ';'
                            }
                        });
                        scope.field.value = chosen;
                    };
                },

                controller: 'fieldController'
            }
        })

        // this directive provides a datepicker for binding dates to an object
        // it can accept pair-field and pair-type parameters to allow pairing the bound field
        // with another bound field. currently the only supported pair type is 'either',
        // which ensures that either one of the paired fields are required, but not both.
        .directive('dateField', function($compile, $filter, $http, $timeout, $rootScope, dateConfig, resources, resourceUrls, utils) {
            var DEFAULT_YEAR_COUNT = 7;

            var capitalize = function(string) {
                return string.charAt(0).toUpperCase() + string.slice(1);
            };

            var setLocale = function() {
                if (dateConfig.locale && moment && moment.locale) {
                    moment.locale(dateConfig.locale);
                }
            };

            var validateDate = function(field) {
                if (moment && field.value && field.value !== null && field.value !== "") {
                    if (utils.getUserLocale() === 'en_CA') {
                        field.value = moment(field.value, 'DD/MM/YYYY').format('DD/MM/YYYY');
                    } else {
                        field.value = moment(field.value, 'MM/DD/YYYY').format('M/D/YYYY');
                    }
                }
            };

            var getDays = function() {
                if (dateConfig.days) {
                    return dateConfig.days;
                } else if (moment && moment.weekdaysShort) {
                    return moment.weekdaysShort().map(function(weekday) {
                        return capitalize(weekday);
                    });
                }

                return [
                    'Sun',
                    'Mon',
                    'Tue',
                    'Wed',
                    'Thu',
                    'Fri',
                    'Sat'
                ];
            };

            var getMonths = function() {
                if (dateConfig.months) {
                    return dateConfig.months;
                } else if (moment && moment.months) {
                    return moment.months().map(function(month) {
                        return capitalize(month);
                    });
                }

                return [
                    'January',
                    'February',
                    'March',
                    'April',
                    'May',
                    'June',
                    'July',
                    'August',
                    'September',
                    'October',
                    'November',
                    'December'
                ];
            };

            var getYears = function() {
                var startYear = moment ? moment().subtract(1, 'years').year() : new Date().getFullYear() - 1;
                var endYear = (dateConfig.yearCount)
                    ? startYear + dateConfig.yearCount - 1
                    : startYear + DEFAULT_YEAR_COUNT - 1;

                var years = [];
                for (var year = startYear; year <= endYear; year++) {
                    years.push(year);
                }
                return years;
            };

            return {
                restrict: 'E',

                scope: {
                    field: '=',
                    disabled: '=',
                    pairField: '=',     // the field to pair with this field
                    pairType: '@',      // currently only supports 'either'
                    readonly: '=',
                    showLabel: '@',     // currently not supported
                    hideHelp: '@',
                    onFieldChange: '&',
                    onFieldBlur: '&',
                    hideTodayDate: '@'
                },

                template: function(scope, attrs) {
                    return templateBuilder(attrs, 'dateField');
                },

                link: function(scope) {
                    angular.extend(scope, resources);

                    scope.templateName = 'dateField';
                    scope.baseId = generateGUID();

                    scope.today = $filter('date')(new Date(), 'MM/dd/yyyy');
                    if (utils.getUserLocale() === 'en_CA') {
                        scope.today = $filter('date')(new Date(), 'dd/MM/yyyy');
                    }

                    scope.showDatePicker = function(id) {
                        DatePicker.pickDate(true, id, false);
                    };

                    scope.insertDate = function(id) {
                        DatePicker.insertDate(scope.today, id, true);
                    };

                    scope.checkDatePairing = function() {
                        if (!scope.pairField || !scope.pairType || !scope.field) {
                            return;
                        }

                        if (scope.pairField && scope.pairType === 'either') {
                            if (scope.field.value) {
                                scope.pairField.value = null;
                            }

                            if (scope.pairField.isRequired && !scope.pairField.originalRequired) {
                                scope.pairField.originalRequired = true;
                            }
                            scope.pairField.isRequired = !scope.field.value;

                            if (scope.field.originalRequired) {
                                scope.field.isRequired = true;
                            } else if (scope.field.originalDisplayValue === undefined) {
                                scope.field.isRequired = !scope.pairField.value;
                            }
                        }
                    };

                    scope.onFieldBlurred = function(baseId) {
                        if (scope.field.fieldName === 'Transaction_Date__c') {
                            if (utils.getUserLocale() === 'en_CA') {
                                var splitValue = scope.field.value.split('/');
                                if (splitValue[2] && splitValue[2].length === 2) {
                                    splitValue[2] = '20' + splitValue[2];
                                }
                                var checkDate = new Date(parseInt(splitValue[2])+'-'+parseInt(splitValue[1])+'-'+parseInt(splitValue[0]));
                                if (checkDate > new Date()) {
                                    $rootScope.$broadcast('future-transaction-date');
                                }
                            } else {
                                if (Date.parse(scope.field.value) > new Date()) {
                                    $rootScope.$broadcast('future-transaction-date');
                                }
                            }
                        }
                        if (scope.onFieldBlur) {
                            validateDate(scope.field);
                            scope.$eval(scope.onFieldBlur);
                            if (baseId) {
                                setTimeout(function() {
                                    document.getElementById(baseId).blur();
                                }, 300);
                            }
                        }
                    };

                    if (scope.field && scope.field.isRequired && scope.pairField && scope.pairType === 'either' && scope.pairField.value) {
                        scope.field.originalRequired = true;
                        scope.field.isRequired = false;
                    }

                    if (scope.onFieldChange) {
                        scope.$watch('field.value', function(newValue, oldValue) {
                            if (newValue !== oldValue && scope.onFieldChange) {
                                scope.$eval(scope.onFieldChange);
                            }
                        });
                    }

                    if (!document.getElementsByClassName('datePicker').length) {
                        setLocale();
                        scope.days = getDays();
                        scope.months = getMonths();
                        scope.years = getYears();

                        if (vfHelperTemplates === 'object' && vfHelperTemplates.datePicker) {
                            var datePickerTemplate = $compile(vfHelperTemplates.datePicker)(scope);
                            angular.element(document.body).append(datePickerTemplate);
                        } else {
                            return $http.get(resourceUrls.vfHelperBase + '/templates/datePicker.html').then(function(response) {
                                var datepickerTemplate = $compile(response.data)(scope);
                                angular.element(document.body).append(datepickerTemplate);
                            });
                        }
                    }

                    return null;
                },

                controller: 'fieldController'
            }
        })

        .run(function($rootScope) {
            // this patches the lookupPick method so that angular will know when it is called
            if (typeof lookupPick === 'undefined') {return;} //Hack to allow using this file outside of salesforce
            var superLookupPick = lookupPick;
            lookupPick = function() {
                superLookupPick.apply(this, arguments);
                $rootScope.$broadcast('lookup-complete-' + arguments[2], {
                    value: arguments[4],
                    displayValue: arguments[5]
                });
            };

            // this patches the lookupPick2 method so that angular will know when it is called
            var superLookupPick2 = lookupPick2;
            lookupPick2 = function() {
                superLookupPick2.apply(this, arguments);
                $rootScope.$broadcast('lookup-complete-' + arguments[2], {
                    value: arguments[3],
                    displayValue: arguments[4]
                });
            };

            // add an empty helpText div for help icon text
            if (!document.getElementsByClassName('helpText').length) {
                var helpTextContainer = document.createElement('div');
                helpTextContainer.className = 'helpText';

                document.body.appendChild(helpTextContainer);
            }
        });
})(angular);
