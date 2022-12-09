const polyfill = require('rollup-plugin-polyfill');

const VERSION = 'v2';
const TAG = process.env.TAG_NAME || 'latest';
const ENV = (process.env.TAG_NAME && 'prod') || process.env.PAYMENTAUTH_ENV || 'local';

let API_ORIGIN, CDN_ORIGIN;
switch (ENV)
{
  case 'prod':
    API_ORIGIN = 'https://api.paymentauth.com';
    CDN_ORIGIN = 'https://cdn.paymentauth.com';
    break;
  case 'test':
    API_ORIGIN = 'http://bs-local.com:9876';
    CDN_ORIGIN = 'http://bs-local.com:9876';
    break;
  case 'dev':
    API_ORIGIN = 'http://api.chargehive.dev.local-host.xyz:8823';
    CDN_ORIGIN = 'http://cdn.chargehive.dev.local-host.xyz:8823';
    break;
  default:
    API_ORIGIN = 'https://api.paymentauth.me:8823';
    CDN_ORIGIN = 'https://cdn.paymentauth.me:8823';
}

//const SANDBOX_JS = isProductionSandbox ? 'https://cdn.chargehive.com/sandbox/challenge.min.js' : 'http://sandbox.paymentauth.me:8823/challenge.min.js';

const replaceValues = {
  '___API_VERSION___': VERSION,
  '___API_ORIGIN___': API_ORIGIN,
  '___CDN_ORIGIN___': CDN_ORIGIN,
  //  '___SANDBOX_JS___': SANDBOX_JS,
  '___TAG___': TAG,
  '___ENV___': ENV,
};

module.exports = {
  ENV, replaceValues,
  polyfillIncludes: polyfill(['custom-event-polyfill']),
};
