'use strict';

(function () {
  'use strict';

  pulse.services.factory('$hdrTl', function ($transmit, $device, $views, $camSettings, $q, $timeout, $interval) {

    // default
    var settings = {
      numPhotos: 3,
      evSteps: 1,
    };

    return {
      settings: settings,

      prepareHdrData: function prepareHdrData(device) {
        //calculates the variables that we will need to jump in hdr mode
        console.log("prepareHdrData");

        var jumpStops = $views.computeShutterEv(device.metaData.camSettings.shutterOptions);

        //figure out how much to increment based on what they entered in UI               3         5   
        var incrementer = settings.evSteps * jumpStops;
        // console.log("incrementer: "+ JSON.stringify(incrementer))                         //3       3

        var indexJump = (settings.numPhotos - 1) / 2 * incrementer;
        // console.log("indexJump: "+ JSON.stringify(indexJump))                             //3       6

        var movingIndex = device.metaData.camSettings.activeShutterIndex - indexJump;
        // console.log("movingIndex: "+ JSON.stringify(movingIndex))                         //24      21

        var maxIndex = device.metaData.camSettings.shutterOptions.length - 1;
        // console.log("maxIndex: "+ JSON.stringify(maxIndex))                              //52       52

        var numPhotos = settings.numPhotos;

        var data = {
          movingIndex: movingIndex,
          maxIndex: maxIndex,
          incrementer: incrementer,
          numPhotos: numPhotos
        };
        console.log('Prepare data: '+ JSON.stringify(data) + ' ' + indexJump);
        
        return data;
      }

    };
  });
})();