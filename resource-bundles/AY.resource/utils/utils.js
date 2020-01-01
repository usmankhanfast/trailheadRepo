(function(angular) {
    angular.module('Utils', [])

    .service('utils', function() {
        var keys = {37: 1, 38: 1, 39: 1, 40: 1};

        var preventDefault = function(e) {
            e = e || window.event;
            if (e.preventDefault) {
                e.preventDefault();
            }
            e.returnValue = false;
            return false;
        };

        var preventDefaultForScrollKeys = function(e) {
            if (keys[e.keyCode]) {
                preventDefault(e);
                return false;
            }
            return true;
        };

        var disableScroll = function(disableAll) {
            if (disableAll) {
                if (window.addEventListener) { // older FF
                    window.addEventListener('DOMMouseScroll', preventDefault, false);
                }
                window.onwheel = preventDefault; // modern standard
                window.onmousewheel = document.onmousewheel = preventDefault; // older browsers, IE
                window.ontouchmove  = preventDefault; // mobile
                document.onkeydown  = preventDefaultForScrollKeys;
            } else {
                document.body.classList.add('disableScroll');
            }
        };

        var enableScroll = function(enableAll) {
            if (enableAll) {
                if (window.removeEventListener) {
                    window.removeEventListener('DOMMouseScroll', preventDefault, false);
                }
                window.onmousewheel = document.onmousewheel = null;
                window.onwheel = null;
                window.ontouchmove = null;
                document.onkeydown = null;
            } else {
                document.body.classList.remove('disableScroll');
            }
        };

        var userLocale;

        var setUserLocale = function(uLocale) {
            userLocale = uLocale;
        }

        var getUserLocale = function() {
            return userLocale;
        }

        return {
            disableScroll: disableScroll,
            enableScroll: enableScroll,
            setUserLocale: setUserLocale,
            getUserLocale: getUserLocale
        };
    })
})(angular);