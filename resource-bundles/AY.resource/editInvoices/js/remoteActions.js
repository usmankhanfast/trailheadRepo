app.service('remoteActions', function($q, appConfig) {

    Visualforce.remoting.timeout = 120000;

    var getJsonCompWrapper = function() {
        var deferred = $q.defer();

        Visualforce.remoting.Manager.invokeAction(
            appConfig.actions.getJsonCompWrapper,
            appConfig.compId,
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
            { escape: false }
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

    var save = function(compWrapper) {
        var deferred = $q.defer();

        Visualforce.remoting.Manager.invokeAction(
            appConfig.actions.save,
            JSON.stringify(compWrapper),
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
        getJsonCompWrapper: getJsonCompWrapper,
        getAccountAddress: getAccountAddress,
        save: save
    };
});