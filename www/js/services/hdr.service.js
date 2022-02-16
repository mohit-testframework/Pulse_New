'use strict';

(function () {
  'use strict';

  pulse.services.factory('$hdr', function ($transmit, $device, $views, $camSettings, $q, $timeout, $interval) {

    // default
    var settings = {
      isActive: false,
      numPhotos: 3,
      evSteps: 1,
      photoCount: 0,
      iterator: 0,
      hdrData: undefined,
      originalShutterIndex: 0,
      hdrPromise: false,
      hdrInterval: false,
      isWaiting: false,
      shutterValue: false,
      forceStop: false
    };

    return {
      settings: settings,

      hdrUnbalanced: function hdrUnbalanced(device, hdrUnbalancedNumPhotos, hdrUnbalancedSign) {
        settings.numPhotos = hdrUnbalancedNumPhotos;
        settings.evSteps = 1;
        console.log('hdrUnbalancedNumPhotos: '+ JSON.stringify(hdrUnbalancedNumPhotos));
        console.log('hdrUnbalancedSign: '+ JSON.stringify(hdrUnbalancedSign));
        console.log("hdrUnbalanced service");
        settings.isActive = true;
        settings.hdrData = this.prepareHdrUnbalancedData(device);
        settings.originalShutterIndex = device.metaData.camSettings.activeShutterIndex;
        this.hdrUnbalancedCapture(device,hdrUnbalancedSign);
        // this.reset();
      },
      
      hdrUnbalancedCapture: function hdrUnbalancedCapture(device,hdrUnbalancedSign) {
        console.log("hdrUnbalancedCapture");
        var _this = this;
        var deferred = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : $q.defer();
        settings.isWaiting = false;

        if (settings.iterator < settings.numPhotos && !settings.forceStop) {
          if (settings.hdrData.movingIndex < 0) {
            settings.hdrData.movingIndex = 0;
          } else if (settings.hdrData.movingIndex > settings.hdrData.maxIndex) {
            settings.hdrData.movingIndex = settings.hdrData.maxIndex;
          }
          settings.iterator++;
          //change the shutter and wait a bit

          $timeout.cancel(settings.hdrPromise);
          console.log("settings.hdrData.movingIndex"+JSON.stringify(settings.hdrData.movingIndex))
          console.log("device.metaData.camSettings.shutterOptions[settings.hdrData.movingIndex]"+JSON.stringify(device.metaData.camSettings.shutterOptions[settings.hdrData.movingIndex]))
          var delay = $views.getMillisecondsFromShutter(device.metaData.camSettings.shutterOptions[settings.hdrData.movingIndex].value) ? $views.getMillisecondsFromShutter(device.metaData.camSettings.shutterOptions[settings.hdrData.movingIndex].value) + 4000 : 4000;
          this.captureUnbalanced(device,hdrUnbalancedSign);
          //setup a delay to force a picture if we don't hear back from pulse
          settings.hdrPromise = $timeout(function () {
            _this.forceUnbalancedCapture(device,hdrUnbalancedSign);
          }, delay);
        } else {
          if (settings.forceStop) {
            console.log('hdrUnbalancedCapture was manually cancelled');
          }
          console.log('hdrUnbalancedCapture Finished');
          $timeout.cancel(settings.hdrPromise);
          $timeout(function () {
            _this.reset();
          }, 500);
          this.reset();
          deferred.resolve();
        }
        return deferred.promise;
      },

      forceUnbalancedCapture: function forceUnbalancedCapture(device,hdrUnbalancedSign) {
        console.log('forcing capture');
        this.hdrUnbalancedCapture(device,hdrUnbalancedSign);
      },

      captureUnbalanced: function captureUnbalanced(device,hdrUnbalancedSign) {
        $camSettings.updateSetting(device, 'shutter', settings.hdrData.movingIndex, false);
        settings.shutterValue = $camSettings.getShutterFromIndex(settings.hdrData.movingIndex);
        $timeout(function () {
          console.log('captureUnbalanced');
          $transmit.capture(device, false);
          if(hdrUnbalancedSign==='+'){
            console.log('captureUnbalanced +++++++++++++++++++++++++');
            settings.hdrData.movingIndex = settings.hdrData.movingIndex + settings.hdrData.incrementer;
          }
          else if((hdrUnbalancedSign==='-')){
            console.log('captureUnbalanced -------------------------');
            settings.hdrData.movingIndex = settings.hdrData.movingIndex - settings.hdrData.incrementer;
          }
          if (settings.hdrData.movingIndex > settings.hdrData.maxIndex) {
            settings.hdrData.movingIndex = settings.hdrData.maxIndex;
          }else if (settings.hdrData.movingIndex < 0) {
            settings.hdrData.movingIndex = 0;
          }
          settings.isWaiting = true;
          settings.photoCount++;
        }, 200);
      },

      prepareHdrUnbalancedData: function prepareHdrUnbalancedData(device) {
        //calculates the variables that we will need to jump in hdr mode
        console.log("prepareHdrUnbalancedData");

        var jumpStops = $views.computeShutterEv(device.metaData.camSettings.shutterOptions);

        //figure out how much to increment based on what they entered in UI               3         5   
        var incrementer = settings.evSteps * jumpStops;
        console.log("incrementer: "+ JSON.stringify(incrementer))                         //3       3

        var indexJump = (settings.numPhotos - 1) / 2 * incrementer;
        console.log("indexJump: "+ JSON.stringify(indexJump))                             //3       6

        var movingIndex = device.metaData.camSettings.activeShutterIndex;
        console.log("movingIndex: "+ JSON.stringify(movingIndex))                         //24      21

        var maxIndex = device.metaData.camSettings.shutterOptions.length - 1;
        console.log("maxIndex: "+ JSON.stringify(maxIndex))                               //52       52

        var data = {
          movingIndex: movingIndex,
          maxIndex: maxIndex,
          incrementer: incrementer
        };
        console.log('data: '+ JSON.stringify(data));
        
        return data;
      },




      hdr: function hdr(device) {
        console.log("hdr dervice");

        settings.isActive = true;
        settings.hdrData = this.prepareHdrData(device);
        settings.originalShutterIndex = device.metaData.camSettings.activeShutterIndex;
        this.hdrCapture(device);
      },

      hdrCapture: function hdrCapture(device) {
        console.log("hdrCapture");

        var _this = this;

        var deferred = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : $q.defer();

        settings.isWaiting = false;
        if (settings.iterator < settings.numPhotos && !settings.forceStop) {
          if (settings.hdrData.movingIndex < 0) {
            settings.hdrData.movingIndex = 0;
          } else if (settings.hdrData.movingIndex > settings.hdrData.maxIndex) {
            settings.hdrData.movingIndex = settings.hdrData.maxIndex;
          }
          settings.iterator++;
          //change the shutter and wait a bit

          $timeout.cancel(settings.hdrPromise);
          var delay = $views.getMillisecondsFromShutter(device.metaData.camSettings.shutterOptions[settings.hdrData.movingIndex].value) ? $views.getMillisecondsFromShutter(device.metaData.camSettings.shutterOptions[settings.hdrData.movingIndex].value) + 4000 : 4000;
          this.capture(device);
          //setup a delay to force a picture if we don't hear back from pulse
          settings.hdrPromise = $timeout(function () {
            _this.forceCapture(device);
          }, delay);
        } else {
          if (settings.forceStop) {
            console.log('hdr was manually cancelled');
          }
          console.log('hdr Finished');
          $timeout.cancel(settings.hdrPromise);
          $timeout(function () {
            _this.reset();
          }, 500);
          this.reset();
          deferred.resolve();
        }
        return deferred.promise;
      },

      forceCapture: function forceCapture(device) {
        console.log('forcing capture');
        this.hdrCapture(device);
      },

      capture: function capture(device) {
        console.log('settings.hdrData.movingIndex'+ JSON.stringify(settings.hdrData.movingIndex));
        $camSettings.updateSetting(device, 'shutter', settings.hdrData.movingIndex, false);
        settings.shutterValue = $camSettings.getShutterFromIndex(settings.hdrData.movingIndex);
        $timeout(function () {
          console.log('hdr capture time');
          $transmit.capture(device, false);
          settings.hdrData.movingIndex = settings.hdrData.movingIndex + settings.hdrData.incrementer;
          if (settings.hdrData.movingIndex > settings.hdrData.maxIndex) {
            settings.hdrData.movingIndex = settings.hdrData.maxIndex;
          }
          settings.isWaiting = true;
          settings.photoCount++;
        }, 200);
      },


      
      reset: function reset() {
        settings.iterator = 0;
        var device = $device.getSelectedDevice();
        //hdr mode is all done. Go back to the original shutter setting
        $camSettings.updateSetting(device, 'shutter', settings.originalShutterIndex);
        settings.photoCount = 0;
        settings.isActive = false;
        settings.forceStop = false;
        settings.shutterValue = false;
      }, 

      prepareHdrData: function prepareHdrData(device) {
        //calculates the variables that we will need to jump in hdr mode
        console.log("prepareHdrData");

        var jumpStops = $views.computeShutterEv(device.metaData.camSettings.shutterOptions);

        //figure out how much to increment based on what they entered in UI               3         5   
        var incrementer = settings.evSteps * jumpStops;
        console.log("incrementer: "+ JSON.stringify(incrementer))                         //3       3

        var indexJump = (settings.numPhotos - 1) / 2 * incrementer;
        console.log("indexJump: "+ JSON.stringify(indexJump))                             //3       6

        var movingIndex = device.metaData.camSettings.activeShutterIndex - indexJump;
        console.log("movingIndex: "+ JSON.stringify(movingIndex))                         //24      21

        var maxIndex = device.metaData.camSettings.shutterOptions.length - 1;
        console.log("maxIndex: "+ JSON.stringify(maxIndex))                               //52       52

        var data = {
          movingIndex: movingIndex,
          maxIndex: maxIndex,
          incrementer: incrementer
        };
        console.log('data: '+ JSON.stringify(data));
        
        return data;
      }

    };
  });
})();

// 3
// 1/10

// 1/20  1/10 1/5

// 1/10 1/5 1/25



