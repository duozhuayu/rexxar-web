'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = rexxarFetch;

require('whatwg-fetch');

var _utils = require('./utils');

var navigator = typeof window !== 'undefined' ? window.navigator : null;

var isAndroid = navigator ? /android/i.test(navigator.userAgent.toLowerCase()) : true;

/**
 * `rexxarFetch` wraps whatwg-fetch function. Use rexxarFetch like using the normal fetch API.
 * However, there are some limitation, rexxarFetch does not support Request object as
 * argument when you are using for HTTP POST, and `application/x-www-form-urlencoded`
 * must be specified as content-type.
 *
 * @param {string|object} input Url string or a Request object
 * @param {object} init Options for Request
 * @returns {function} Promise A Promise that resolves to a Response object.
 */
function rexxarFetch(input, init) {

  var request = void 0;
  var promise = void 0;

  if (Request.prototype.isPrototypeOf(input) && !init) {
    request = input;
    if (request.method === 'POST') {
      throw new Error('rexxarFetch POST error: please use `rexxarFetch(input, init)` for HTTP POST');
    }
  } else {
    request = new Request(input, init);
  }

  if (request.method === 'POST') {
    var contentType = request.headers.get('content-type');
    var body = init.body;

    if (!contentType && !body) {
      input = (input + '&_rexxar_method=POST').replace(/[&?]/, '?');
      promise = fetch(input);
    } else if (contentType && contentType.indexOf('application/x-www-form-urlencoded') > -1) {
      if (window && 'URLSearchParams' in window && window.URLSearchParams.prototype.isPrototypeOf(body)) {
        body = body.toString();
      }
      if ((0, _utils.getType)(body) === 'String') {
        input = (input + '&' + body + '&_rexxar_method=POST').replace(/[&?]/, '?');
        promise = fetch(input);
      } else {
        throw new Error('rexxarFetch POST error: cannot handle this body type');
      }
    } else {
      throw new Error('rexxarFetch POST error: only supports `application/x-www-form-urlencoded` as content-type');
    }
  } else {
    promise = fetch(request);
  }

  return promise.then(resolveResponse);
}

function resolveResponse(response) {

  if (isAndroid) {
    var responseBackup = response.clone();

    return response.text().then(function (text) {

      var errorMsg = text.indexOf('_error_=') === 0 ? (0, _utils.str2obj)(text)._error_ : null;

      if (errorMsg) {
        var error = JSON.parse(errorMsg);

        if (error._network_error) {
          throw new TypeError('Network request failed');
        } else if (error._response_error) {
          var options = {
            status: error._response_code,
            statusText: '',
            headers: new Headers(response.headers)
          };

          var res = error._response_error;
          var body = (0, _utils.getType)(res) === 'Object' ? JSON.stringify(res) : '' + res;

          return new Response(body, options);
        } else {
          throw new Error('Unknown error type');
        }
      } else {
        return responseBackup;
      }
    });
  } else {
    if (response.status === 999) {
      throw new TypeError('Network request failed');
    }
    return response;
  }
}