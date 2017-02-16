!function(exports) {
  'use strict';

  var server = window.location.origin;

  var debug =
    new Utils.MultiLevelLogger('requests.js', Utils.MultiLevelLogger.DEFAULT_LEVELS.all);

  function sendXHR(aType, aURL, aData, aDataType, aResponseType, aHeaders) {
    return new Promise(function(resolve, reject) {
      aData = typeof aData === 'object' && JSON.stringify(aData) || aData;
      var xhr = new XMLHttpRequest();
      xhr.open(aType, aURL);
      xhr.responseType = aResponseType || 'json';
      xhr.overrideMimeType && xhr.overrideMimeType('application/json');
      if (aDataType) {
        // Note that this requires
        xhr.setRequestHeader('Content-Type', aDataType);
      }

      if (aHeaders && typeof aHeaders === 'object') {
        Object.keys(aHeaders).forEach(function(header) {
          xhr.setRequestHeader(header, aHeaders[header]);
        });
      }

      xhr.onload = function (aEvt) {
        if (xhr.status === 200) {
          var response = xhr.responseType === 'json' && (xhr.response || {}) || xhr.responseText;
          if (xhr.responseType === 'json' && typeof xhr.response === 'string') {
            response = JSON.parse(response);
          }
          resolve(response);
        } else {
          reject({ status: xhr.status, reason: xhr.response });
        }
      };

      xhr.onerror = function (aEvt) {
        debug.error('sendXHR. XHR failed ' + JSON.stringify(aEvt) + 'url: '+
                    aURL + ' Data: ' + aData + ' RC: ' + xhr.responseCode);
        reject(aEvt);
      };

      xhr.send(aData);
    });
  }

  function composeDate(data) {
    var composed = [];

    Object.keys(data).forEach(function(key) {
      composed.push(key);
      composed.push('=');
      composed.push(data[key]);
      composed.push('&');
    });

    composed.length && composed.pop();

    return composed.join('');
  }

  exports.Request = exports.Request || {};
  exports.Request.sendXHR = sendXHR;

}(this);
