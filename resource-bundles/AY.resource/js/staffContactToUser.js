(function(angular) {
    'use strict'

    var contactConvertApp = angular.module('ConvertContactApp', ['AppConfig', 'vfHelpers']);

    contactConvertApp.config(function($compileProvider) {
        $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|mailto|file|javascript):/);
    });

    contactConvertApp.controller('ConvertContactCtrl', function($scope, $q, $filter, $timeout, appConfig) {
        $scope.save = function() {
            if ($scope.convertContactForm.$valid) {
                save(JSON.stringify($scope.user));
            }
        };

        $scope.cancel = function() {
            window.top.location = '/' + appConfig.id;
        };

        // this method can be called from outside angular via an actionFunction oncomplete callback
        $scope.onSaveComplete = function(success, newUserId) {
            if (!success) {
                return;
            }
            $scope.wasSaveSuccessful = true;
            window.top.location = '/' + newUserId + '?noredirect=1&isUserEntityOverride=1';
        };

        var updateProfileOptions = function(selectedUserLicense) {
            $scope.sections.forEach(function(s) {
                s.columns.forEach(function(c) {
                    c.fields.forEach(function(f) {
                        if (f.destinationFieldName.indexOf('Profile') !== -1) {
                            while (f.wrapper.options.length > 0) {
                                f.wrapper.options.pop();
                            }
                            $scope.licenseToProfileMap[selectedUserLicense].forEach(function(o) {
                                f.wrapper.options.push(o);
                            });
                        }
                    });
                });
            });
        }

        $scope.hasError = appConfig.hasError;
        $scope.wasSaveSuccessful = false;
        $scope.licenseToProfileMap = appConfig.licenseToProfileMap;
        $scope.user = appConfig.user;

        if ($scope.user.isActive && $scope.user.isActive.value) {
            $scope.user.isActive.value = eval($scope.user.isActive.value);
        }

        if ($scope.user.license) {
            $scope.user.license.options = appConfig.licenses;
        }
        if ($scope.user.role) {
            $scope.user.role.options = appConfig.roles;
        }
    });
})(angular)

