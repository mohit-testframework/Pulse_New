'use strict';

(function () {
  'use strict';

  pulse.services.factory('$photo', function ($q, $config, $transmit, $timeout, $device, $rootScope, $camSettings, $interval, $views, btClassic) {

    var selectedDevice = $device.getSelectedDevice();

    var burstInterval;

    var settings = {
      inProgress: false
    };

    var thumbForcer;
    return {

      settings: settings,

      getPhotoSettings: function getPhotoSettings() {

        return $camSettings.getActiveSettings();
      },

      killForceThumb: function killForceThumb() {
        $timeout.cancel(thumbForcer);
      },

      takePhoto: function takePhoto(device) {
        console.log("inside takePhoto Service page *******");
        // console.log('Photo service inside takePhoto');
        var _this = this;

        var blink = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : true;
        var thumbForceWait = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;


        var deferred = $q.defer();
        if (!device) {
          console.log("no device is connected *******");
          deferred.reject('no device is connected');
        } else if (!device.metaData.cameraConnected) {
          console.log("no camera connected *******");
          deferred.reject('no camera connected');
        } else {
          if (device.btClassic.connected && device.btClassic.enabled) {
            console.log("Inside connnected and enabled BTC *******");

            //take the picture in safe mode
            if (blink) {
              // console.log('Photo page inside takePhoto');
              $transmit.blinkLED(device);
            }
            
            $timeout(function() {
              
              $transmit.capture(device, false).then(function(response){
                  // $transmit.reportActivity();
                  // console.log('Photo service page $transmit.capture response : ', response);
                  $timeout(function () {
                    // console.log('getThumb function call');
                    _this.getThumb(device, thumbForceWait).then(function (response) {
                      // let element = document.getElementById("photo-ring-div");
                      // element.style.opacity = "1";
                      // element.style.filter  = 'alpha(opacity=100)';
                      // document.getElementById('photo-ring-svg').setAttribute('pointer-events','auto');                  
                      deferred.resolve(response);
                    }, function (error) {
                        // let element = document.getElementById("photo-ring-div");
                        // element.style.opacity = "1";
                        // element.style.filter  = 'alpha(opacity=100)';       
                        // document.getElementById('photo-ring-svg').setAttribute('pointer-events','auto');           
                      deferred.reject(error);
                    }, 100);
                  },1000);
              },function (error) {
                    // let element = document.getElementById("photo-ring-div");
                    // element.style.opacity = "1";
                    // element.style.filter  = 'alpha(opacity=100)';       
                    // document.getElementById('photo-ring-svg').setAttribute('pointer-events','auto');           
                    deferred.reject(error);
                });

            }, 40);
          } else {
            console.log("Inside not connnected and enabled BTC *******");
            $transmit.blinkLED(device);
            $timeout(function() {
              //take the picture in fast mode
              $transmit.capture(device);
              if (device.metaData.cameraType == $config.cameraSettings.make.CANON) {
                var secondsTimestamp = Date.now() / 1000 | 0;
                if (!device.activityTime || device.activityTime + 5 < secondsTimestamp) {
                  device.activityTime = secondsTimestamp;
                  $transmit.refreshUSB(device);
                }
              }
              // $transmit.reportActivity();
              //btClassic is not connected. Don't ask for the thumb
              deferred.resolve();
            }, 40);
          }
        }

        return deferred.promise;
      },

      burst: function burst(device) {
        var deferred = $q.defer();
        if (!device) {
          deferred.reject('no device is connected');
        } else if (!device.metaData.cameraConnected) {
          deferred.reject('no camera connected');
        } else {
          $transmit.blinkLED(device);
          $timeout(function () {
            var cameraType = $camSettings.getCameraType(device.metaData);
            if (cameraType && cameraType.toLowerCase() == 'nikon') {
              $transmit.burstNikon(device);
              /*burstInterval = $interval(() => {
                $transmit.burstNikon(device);
              }, 500);*/
            } else {
              //canon
              $transmit.burstCanon(device);
            }
            deferred.resolve();
          }, 40);
        }

        return deferred.promise;
      },

      endBurst: function endBurst(device) {
        var deferred = $q.defer();
        if (!device) {
          deferred.reject('no device is connected');
        } else if (!device.metaData.cameraConnected) {
          deferred.reject('no camera connected');
        } else {
          var cameraType = $camSettings.getCameraType(device.metaData);
          if (cameraType && cameraType.toLowerCase() == 'nikon') {
            //$interval.cancel(burstInterval);
            deferred.resolve();
            return;
          } else {
            //canon
            $transmit.endBurstCanon(device);
          }
          deferred.resolve();
        }

        return deferred.promise;
      },

      getThumb: function getThumb(device) {
        var thumbForceWait = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;

        var deferred = $q.defer();
        //ensure we are connected
        // console.log('calling isConnected MAC: ' + device.metaData.macAddress);
        if (thumbForceWait < 0) {
          thumbForceWait = 0;
          // console.log("thumbForceWait was <0!?!");
        }
        btClassic.isConnected(device.metaData.macAddress).then(function (response) {
          $timeout(function () {
            //timestamp from the thumb request to the thumb completion
            device.waitingForThumb = true;
            $device.setDevice(device);
            var cameraMode = device.metaData.cameraMode;
            console.log('cameraMode: ' + cameraMode);
            console.log('$views.abortModes: ' + $views.abortModes);
            if (cameraMode != 'VIDEO' || $views.abortModes) {
              console.log('inside cameraMode: ' + cameraMode);
              $transmit.requestThumb(device).then(function () {
                thumbForcer = $timeout(function () {
                  var syncedDevice = $device.getSelectedDevice();
                  //check to see if the thumb has already been rendered
                  if (syncedDevice.waitingForThumb) {
                    syncedDevice.waitingForThumb = false;
                    $device.setDevice(device);
                    // $transmit.cancelThumb(syncedDevice);
                    //read from BT CLASSIC then store to local storage, then render
                    // console.log('no thumbnail acknowledgement sent. Doing a force read.');
                    
                          // var element = document.getElementById("photo-ring-div");
                          // if(element != null){
                          //     element.style.opacity = "1";
                          //     element.style.filter  = 'alpha(opacity=100)';  
                          //     document.getElementById('photo-ring-svg').setAttribute('pointer-events','auto');
                          // }

                    btClassic.read(device.metaData.macAddress).then(function (data) {
                      if (data && data.length) {
                        console.log('Read from BTClassic. Data length is ' + data.length);
                        $device.thumb(data, device);
                        deferred.resolve({
                          success: true
                        });
                      } else {
                        console.log('Attempted to read from BT Classic. Failed. Data was empty');
                        $rootScope.$broadcast('thumbnailUploadFailed');
                        deferred.resolve({
                          thumbCancel: true,
                          reason: 'pulse took to long to respond'
                        });
                        
                      }
                    });
                  }
                }, 8000 + thumbForceWait); //wait 8 seconds for the thumb and then cancel nothing happened
              }, function (error) {
                      console.log(error);
                  // var element = document.getElementById("photo-ring-div");
                  //        if(element != null){
                  //             element.style.opacity = "1";
                  //             element.style.filter  = 'alpha(opacity=100)';  
                  //             document.getElementById('photo-ring-svg').setAttribute('pointer-events','auto');
                  //         }                             
                // console.log(error);
              });
            } else {
              console.log('else cameraMode: ' + cameraMode);
              deferred.reject({ error: 'user is in video mode. Not requesting Thumb' });
            }
          }, 250);
        }, function (error) {
              // let element = document.getElementById("photo-ring-div");
              // element.style.opacity = "1";
              // element.style.filter  = 'alpha(opacity=100)';  
              // document.getElementById('photo-ring-svg').setAttribute('pointer-events','auto');         
          deferred.resolve({
            thumbCancel: true,
            reason: 'bt classic connection dropped'
          });
          //bluetooth classic dropped somewhere
          device.btClassic.connected = false;
          device.btClassic.enabled = false;
          $device.setDevice(device);
          // console.log(error + ' :BT CLASSIC has been disconnected');
        });
        return deferred.promise;
      }
    };

    function forceThumb(syncedDevice) {
      btClassic.read(syncedDevice.metaData.macAddress).then(function (data) {
        if (data && data.length) {
          // console.log('Read from BTClassic. Data length is ' + data.length);
          $device.thumb(data, syncedDevice);
        } else {
          // console.log('Attempted to read from BT Classic. Failed. Data was empty');
          $rootScope.$broadcast('thumbnailUploadFailed');
        }
      }, function () {
        // console.log('We went wrong with the BTClassic read');
        $rootScope.$broadcast('thumbnailUploadFailed');
      });
    }
  });
})();