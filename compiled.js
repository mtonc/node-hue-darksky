"use strict";

var _dotenv = _interopRequireDefault(require("dotenv"));

var _regeneratorRuntime = _interopRequireDefault(require("regenerator-runtime"));

var _nodeHueApi = require("node-hue-api");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { return void reject(error); } info.done ? resolve(value) : Promise.resolve(value).then(_next, _throw); }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } var gen = fn.apply(self, args); _next(undefined); }); }; }

_dotenv["default"].config();

var hue = _nodeHueApi.v3.api;
var discovery = _nodeHueApi.v3.discovery;

var getBridge = /*#__PURE__*/function () {
  var _ref = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime["default"].mark(function _callee() {
    var result;
    return _regeneratorRuntime["default"].wrap(function _callee$(_context) {
      for (; 1;) switch (_context.prev = _context.next) {
        case 0:
          return _context.next = 2, discovery.nupnpSearch();

        case 2:
          result = _context.sent, console.log(JSON.stringify(result, null, 2));

        case 4:
        case "end":
          return _context.stop();
      }
    }, _callee);
  }));

  return function getBridge() {
    return _ref.apply(this, arguments);
  };
}();

getBridge();
