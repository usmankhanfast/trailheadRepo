/*
YUI 3.10.3 (build 2fb5187)
Copyright 2013 Yahoo! Inc. All rights reserved.
Licensed under the BSD License.
http://yuilibrary.com/license/
*/

YUI.add("event-valuechange",function(e,t){var n="_valuechange",r="value",i,s={POLL_INTERVAL:50,TIMEOUT:1e4,_poll:function(t,r){var i=t._node,o=r.e,u=i&&i.value,a=t._data&&t._data[n],f,l;if(!i||!a){s._stopPolling(t);return}l=a.prevVal,u!==l&&(a.prevVal=u,f={_event:o,currentTarget:o&&o.currentTarget||t,newVal:u,prevVal:l,target:o&&o.target||t},e.Object.each(a.notifiers,function(e){e.fire(f)}),s._refreshTimeout(t))},_refreshTimeout:function(e,t){if(!e._node)return;var r=e.getData(n);s._stopTimeout(e),r.timeout=setTimeout(function(){s._stopPolling(e,t)},s.TIMEOUT)},_startPolling:function(t,i,o){if(!t.test("input,textarea"))return;var u=t.getData(n);u||(u={prevVal:t.get(r)},t.setData(n,u)),u.notifiers||(u.notifiers={});if(u.interval){if(!o.force){u.notifiers[e.stamp(i)]=i;return}s._stopPolling(t,i)}u.notifiers[e.stamp(i)]=i,u.interval=setInterval(function(){s._poll(t,u,o)},s.POLL_INTERVAL),s._refreshTimeout(t,i)},_stopPolling:function(t,r){if(!t._node)return;var i=t.getData(n)||{};clearInterval(i.interval),delete i.interval,s._stopTimeout(t),r?i.notifiers&&delete i.notifiers[e.stamp(r)]:i.notifiers={}},_stopTimeout:function(e){var t=e.getData(n)||{};clearTimeout(t.timeout),delete t.timeout},_onBlur:function(e,t){s._stopPolling(e.currentTarget,t)},_onFocus:function(e,t){var i=e.currentTarget,o=i.getData(n);o||(o={},i.setData(n,o)),o.prevVal=i.get(r),s._startPolling(i,t,{e:e})},_onKeyDown:function(e,t){s._startPolling(e.currentTarget,t,{e:e})},_onKeyUp:function(e,t){(e.charCode===229||e.charCode===197)&&s._startPolling(e.currentTarget,t,{e:e,force:!0})},_onMouseDown:function(e,t){s._startPolling(e.currentTarget,t,{e:e})},_onSubscribe:function(t,i,o,u){var a,f,l;f={blur:s._onBlur,focus:s._onFocus,keydown:s._onKeyDown,keyup:s._onKeyUp,mousedown:s._onMouseDown},a=o._valuechange={};if(u)a.delegated=!0,a.getNodes=function(){return t.all("input,textarea").filter(u)},a.getNodes().each(function(e){e.getData(n)||e.setData(n,{prevVal:e.get(r)})}),o._handles=e.delegate(f,t,u,null,o);else{if(!t.test("input,textarea"))return;t.getData(n)||t.setData(n,{prevVal:t.get(r)}),o._handles=t.on(f,null,null,o)}},_onUnsubscribe:function(e,t,n){var r=n._valuechange;n._handles&&n._handles.detach(),r.delegated?r.getNodes().each(function(e){s._stopPolling(e,n)}):s._stopPolling(e,n)}};i={detach:s._onUnsubscribe,on:s._onSubscribe,delegate:s._onSubscribe,detachDelegate:s._onUnsubscribe,publishConfig:{emitFacade:!0}},e.Event.define("valuechange",i),e.Event.define("valueChange",i),e.ValueChange=s},"3.10.3",{requires:["event-focus","event-synthetic"]});
