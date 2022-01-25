angular.module('incrementer', [])

.directive('incrementer', ['$timeout', '$interval', '$rootScope',
  function($timeout, $interval, $rootScope) {
    'use strict';

    var setScopeValues = function(scope, attrs) {
      var defaultScope = {
        min: 0,
        max: 200,
        step: 1,
        prefix: undefined,
        postfix: undefined,
        decimals: 0,
        stepInterval: 200,
        stepIntervalDelay: 200,
        initval: '',
        swipeInterval: 100,
        incrementerName: ''
      };
      angular.forEach(defaultScope, function(value, key) {
        scope[key] = attrs.hasOwnProperty(key) ? attrs[key] : value;
      });
      scope.val = attrs.value || scope.initval;
    };

    return {
      restrict: 'EA',
      require: '?ngModel',
      scope: true,
      replace: true,

      link: function(scope, element, attrs, ngModel) {
        setScopeValues(scope, attrs);

        var timeout, timer, helper = true,
          oldval = scope.val,
          activeSwipe,
          clickStart, swipeTimer;

        ngModel.$setViewValue(scope.val);

        scope.decrement = function() {
          oldval = scope.val;
          var value = parseFloat(parseFloat(Number(scope.val)) - parseFloat(scope.step)).toFixed(scope.decimals);

          if (value < parseInt(scope.min)) {
            value = parseFloat(scope.min).toFixed(scope.decimals);
            scope.val = value;
            ngModel.$setViewValue(value);
            return;
          }

          scope.val = value;
          ngModel.$setViewValue(value);
        };

        $rootScope.$on('autoIncrement', function (event, data) {
          if (data.incrementerName == scope.incrementerName){
            scope.val = data.value.toString();
          }
        });

        scope.increment = function() {
          oldval = scope.val;
          var value = parseFloat(parseFloat(Number(scope.val)) + parseFloat(scope.step)).toFixed(scope.decimals);

          if (value > parseInt(scope.max)) return;

          scope.val = value;
          ngModel.$setViewValue(value);
        };

        scope.startSpinUp = function(swipe) {
          if (swipe){
            if (activeSwipe){
              return;
            }
            activeSwipe = true;
            console.log(scope.swipeInterval);
            $timeout( function(){
              activeSwipe = false;
            }, scope.swipeInterval);
          }

          scope.checkValue();
          scope.increment();

          clickStart = Date.now();
          scope.stopSpin();
          if (!swipe) {

            $timeout(function() {

              timer = $interval(function() {

                scope.increment();
              }, scope.stepInterval);
            }, scope.stepIntervalDelay);
          }
          else{

          }
        };

        scope.startSpinDown = function(swipe) {

          if (swipe){
            if (activeSwipe){
              return;
            }
            activeSwipe = true;
            $timeout(function(){
              activeSwipe = false;
            }, scope.swipeInterval);
          }

          scope.checkValue();
          scope.decrement();

          clickStart = Date.now();

          if (!swipe) {

            var timeout = $timeout(function() {

              timer = $interval(function() {
                scope.decrement();
              }, scope.stepInterval);
            }, scope.stepIntervalDelay);
          }
        };

        scope.stopSpin = function() {

          if (Date.now() - clickStart > scope.stepIntervalDelay) {
            $timeout.cancel(timeout);
            $interval.cancel(timer);
          } else {
            $timeout(function() {

              $timeout.cancel(timeout);
              $interval.cancel(timer);
            }, scope.stepIntervalDelay);
          }
        };

        scope.checkValue = function() {
          var val;
          if (scope.val !== '' && !scope.val.match(/^-?(?:\d+|\d*\.\d+)$/i)) {
            val = oldval !== '' ? parseFloat(oldval).toFixed(scope.decimals) : parseFloat(scope.min).toFixed(scope.decimals);
            scope.val = val;
            ngModel.$setViewValue(val);
          }
        };
      },


      template: '<div class="incrementer">' +
        '<div class="row incrementer-row">' +
        '<a class="button button-icon minus" on-touch="startSpinDown()" on-release="stopSpin()">-</a>' +
        '<span class="prefix" ng-show="prefix" ng-bind="prefix"></span>' +
        '<div class="input-container" on-drag-right="startSpinUp(true)" on-drag-left="startSpinDown(true)" on-release="stopSpin(true)">' +
        '<span ng-model="val" class="incrementer-value" ng-blur="checkValue()">{{val}}</span><span class="postfix" ng-show="postfix" ng-bind="postfix"></span>' +
        '</div>' +
        '<a class="button button-icon plus" on-touch="startSpinUp()" on-release="stopSpin()">+</a>' +
        '</div>' +
        '</div>'
    };
  }
]);
