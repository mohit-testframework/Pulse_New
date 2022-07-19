"use strict";

(function() {
  "use strict";

  pulse.controllers.controller("PhotoCtrl", function(
    $timeout,
    $interval,
    BLE,
    $device,
    $camSettings,
    $rootScope,
    $q,
    $photo,
    $histogram,
    $cordovaVibration,
    $cordovaFile,
    $transmit,
    $config,
    $scope,
    btClassic,
    $views,
    $ionicSideMenuDelegate,
    $platform,
    $ionicPlatform

  ) {
    var vm = this;
    var hasSeenHistText = false;
    var hasReceivedThumb = false;
    var animationTimer = false;

    var currentThumb;
    var consecutivebadThumbs = 0;
    var maxConsecutiveBadthumbs = 2;

    var localStorageDevices;
    vm.numbers = [1, 2, 3, 4, 5, 6];
    vm.isMainDevice;
    vm.isAllCamera = false;
    vm.interval = 2;
    var currentSelectedDevice, previousSelectedDevice;


    $ionicPlatform.ready(function () {
      console.log('In ionicPlatform.ready');
      $device.getDevicesFromStorage().then(function (result) {
        localStorageDevices = sortByConnectedDevices(result);
        // console.log('localStorageDevices  : ' + localStorageDevices.id);
        vm.localStorageDevices = _.filter(localStorageDevices);
        console.log('vm.localStorageDevices  : ' + vm.localStorageDevices.id);
      });
    });


    init();

    $rootScope.$on("thumbnailUploadPhotoPage", function(event, data) {

      let photoThumb = window.Ionic.WebView.convertFileSrc(data.thumbPath);
      $timeout.cancel(animationTimer);
      var device = $device.getSelectedDevice();
      if (device.metaData.cameraType == $config.cameraSettings.make.CANON) {
        $timeout(function() {
          $transmit.refreshUSB(device);
        }, 40);
      }
      if (data.hasThumb) {
        vm.showSpinner = false;
        vm.backgroundGradient = 0.0;
        vm.thumb = photoThumb;
        vm.defaultThumb = false;
        histogram(photoThumb, function(err, histData) {
          if (histData) {
            vm.histogramItems = $histogram.prepareHistogram(histData);
            hasReceivedThumb = true;
            //make sure the histogram redraws
            $scope.$apply();
            consecutivebadThumbs = 0;
          }
        });
      } else {
        //thumbnail failed
        vm.showSpinner = false;
        vm.backgroundGradient = 0.0;
        if (consecutivebadThumbs++ >= maxConsecutiveBadthumbs) {
          // console.log(
          //   "We've had too many bad thumbs round here, disconnecting BTC"
          // );
          device.btClassic.disconnect(device.metaData.macAddress);
          device.btClassic.enabled = false;
          device.btClassic.connected = false;
        }
      }
    });

    vm.getImageSource = function (device) {
      // console.log('inside getImageSource : ');
      if (device.isScanning) {
        return 'img/connect2.svg';
      } else {
        if (vm.isDeviceActive(device)) {
          return 'img/connected.svg';
        } else {
          return 'img/circle-white.svg';
        }
      }
    };

    vm.changeExposureTime = function(time){
      // console.log('changeExposureTimeNew : ' + JSON.stringify(time));
      // let correctTime = time / 1.5;
    }

    vm.setNewDevice = function(device, $event){
      // console.log('device : ' + JSON.stringify(device));
      previousSelectedDevice = currentSelectedDevice;
      currentSelectedDevice =  device;
       // $device.setDevice(device);
       $device.setSessionDeviceToActiveOrInactiveNew(device, false);
    }

    vm.connectOrDisconnectDevice = function(device, $event) {
      console.log('inside connectOrDisconnectDevice : ');
      $event.stopPropagation();
      var index;

      _.forEach(vm.localStorageDevices, function(localStorageDevice, $index) {
         console.log('localStorageDevice : ' + localStorageDevice.isMainDevice);
        if (localStorageDevice.id == device.id) {
          localStorageDevice.isScanning = true;
          if (vm.isDeviceActive(device)) {

            //disconnect device
            
            // $device.disconnectPulse(device, false, false).then(function (response) {
            //   localStorageDevice.isScanning = false;
            // });
          } else {
            var timer = $timeout(function () {
              localStorageDevice.isScanning = false;
            }, 8000);
            device.bypass = true;
            //connect device
            $device.buildAndConnect(device, 0, 0, true).then(function (response) {
              localStorageDevice.isScanning = false;
              $timeout.cancel(timer);
            }, function (error) {
              localStorageDevice.isScanning = false;
              $timeout.cancel(timer);
            });
          }
        }
      });
    };

    vm.isEmpty = function () {
      if (!localStorageDevices || localStorageDevices == 'undefined' || _.isEmpty(localStorageDevices)) {
        return true;
      } else {
        return false;
      }
    };


    vm.isMoreThanOneDeviceConnected = function() {
       // console.log('vm.localStorageDevices length : ' + vm.localStorageDevices.length);
      if (vm.localStorageDevices || vm.localStorageDevices != undefined || vm.localStorageDevices != null) {
        if (vm.localStorageDevices.length != 0 && vm.localStorageDevices.length > 1) {
          let count = 0;
          for (var i = 0; i < vm.localStorageDevices.length; i++) {    
            if (vm.localStorageDevices[i] && vm.localStorageDevices[i] != undefined) {
              if (vm.localStorageDevices[i].isConnected != undefined && vm.localStorageDevices[i].isConnected.isConnected) {
                // console.log('inside count : ' + i +  vm.localStorageDevices[i].isConnected.isConnected);
                count = count + 1;
              }            
            }      
          }
          if (count > 1) {
            // console.log('inside count if part');
            return true;
           }else {
            // console.log('inside count else part');
            return false;
          }

        } else {
          // console.log('inside length less than 1 else part');
          return false;
        }
        
      } else {
        // console.log('inside localStorageDevices undefined else part');
        return false;
      }
    };

    vm.getCameraModel = function(device) {
      var selectedDevice = _.find($device.devices, function (item) {
        return device.id == item.id;
      });
      if (!selectedDevice) {
        return 'Not Connected';
      } else if (selectedDevice.metaData && selectedDevice.metaData.statusMode == $config.statusMode.CHARGING && selectedDevice.metaData.statusState == $config.statusState.START) {
        return 'Charging';
      } else if (selectedDevice.metaData && selectedDevice.metaData.cameraConnected) {
        if (typeof selectedDevice.metaData.cameraType == 'undefined') {
          return 'Connecting Camera';
        } else {
          return $camSettings.getCameraModel(selectedDevice.metaData);
        }
      } else {
        return 'No Camera';
      }
    };

    vm.isDeviceActive = function (device) {
      var isActive = false;
      _.forEach($device.devices, function (activeDevice) {
        if (device.id == activeDevice.id) {
          isActive = true;
        }
      });
      return isActive;
    };
    
    $rootScope.$on("thumbnailUploadFailed", function(event) {
      //thumbnail failed stop spinning
      vm.showSpinner = false;
      vm.backgroundGradient = 0.0;
      // console.log('inside thumbnailUploadFailed');
    });

    vm.burst = function() {
      var device = $device.getSelectedDevice();
      if (
        device &&
        device.metaData.cameraConnected &&
        !$photo.settings.inProgress
      ) {
        $cordovaVibration.vibrate(75);
        vm.fill = "#b2b2b2";
        $photo.burst(device);
      }
    };

    vm.endBurst = function() {
      var device = $device.getSelectedDevice();
      if (
        device &&
        device.metaData.cameraConnected &&
        !$photo.settings.inProgress
      ) {
        vm.fill = "#fff";
        $photo.endBurst(device);
      }
    };

    vm.setAllCameras = function() {
      var device = $device.getSelectedDevice();
      if (vm.isAllCamera) {
        device.metaData.isAllCamera = true;
        console.log('Setting all cameras to true');
      } else {
        device.metaData.isAllCamera = false;
        console.log('Setting all cameras to false');
      }
    };

    vm.takePhoto = function() {
      console.log("inside takePhoto ******* : ");

      var device;

      if (vm.isAllCamera == true) {
         device = $device.getSelectedDevice();
      } else {
         device = currentSelectedDevice;
      }

      var shutterWait = 0;
      var hasErrored = false;
      vm.changeopacity = "make-disabled";
      // console.log('device.metaData.cameraConnected : ' + device.metaData.cameraConnected + '$photo.settings.inProgress : ' + $photo.settings.inProgress)
      if (device && device.metaData.cameraConnected && ($photo.settings.inProgress == false)) {
        $photo.settings.inProgress = true;
        vm.fill = "#808080";
        vm.camSettings = $photo.getPhotoSettings();
        $cordovaVibration.vibrate(50);
        var settings = $camSettings.getActiveSettings();
        if (settings && settings.shutter) {
          if (settings.shutter.value == "BULB") {
            console.log("inside Bulb Mode *******");

               // let element = document.getElementById("photo-ring-div");
               //  element.style.opacity = "1";
               //  element.style.filter  = 'alpha(opacity=100)';
               //  document.getElementById('photo-ring-svg').setAttribute('pointer-events','auto');
                
            vm.bulbClass = "animated fadeIn";
            vm.errorText =
              "Please change shutter from Bulb to enable photo capture";
            $timeout(function() {
              vm.bulbClass = "animated fadeOut";
              $photo.settings.inProgress = false;
              $timeout(function() {
                vm.bulbClass = "hidden";
              }, 1000);
            }, 5000);
            //user is in bulb mode, they arent allowed to take a picture
            return;
          }
          shutterWait = $views.getMillisecondsFromShutter(
            settings.shutter.value
          );
        }

        if (shutterWait > 1000) {
          var animationSettings = {
            maxShutter: shutterWait / 100,
            shutterCounter: 0
          };
          vm.animationSettings = animationSettings;
          var timer = $interval(function() {
            animationSettings.shutterCounter++;
            if (
              animationSettings.shutterCounter > animationSettings.maxShutter
            ) {
              //timer's done, go for it
              vm.animationSettings = {};
              $interval.cancel(timer);
            }
          }, 100);
        }

        $timeout(function() {
          if (device.btClassic.connected && device.btClassic.enabled) {
            if (!hasErrored) {
              vm.showSpinner = true;
              vm.backgroundGradient = 0.6;
            }
          }
          // we dont allow another photo to be taken until the shutter is closed. Also wait 300 ms before allowing press again
          // $photo.settings.inProgress = false;
          
        }, shutterWait + 300);

        //timer to stop animating the thumbnail items if we havent gotten a response in a while
        animationTimer = $timeout(function() {
          console.log('vm.fill : ' + vm.fill);
          // we dont allow another photo to be taken until the shutter is closed. Also wait 300 ms before allowing press again

          // vm.thumb = "img/pulse-scene.jpg";
          vm.thumb = "../../img/pulse-scene.jpg";
          vm.showSpinner = false;
          vm.backgroundGradient = 0.0;

        }, shutterWait + 6000);

        var tempDevice = device;
        
        var previousDevices = [];
        if (vm.isAllCamera == true) {

          takePhotoAllCamera(tempDevice, shutterWait, hasErrored, previousDevices);
          
        } else if (vm.isAllCamera == false) {

          $timeout(function() {
            // we dont allow another photo to be taken until the shutter is closed. Also wait 300 ms before allowing press again
            // $photo.settings.inProgress = false;
              $photo.settings.inProgress = false;
              vm.fill = "#fff";          
          }, shutterWait + 2000);

          // while (tempDevice) {

            // console.log('tempDevice 111 : ' +  JSON.stringify(tempDevice));
            
            // console.log("inside while loop *******");
            console.log("shutterWait value ******* vm.isAllCamera false : " + shutterWait);
            
            $photo.takePhoto(tempDevice, true, shutterWait).then(
              function(response) {
  
                   console.log('takePhoto called successfully 7777');
                   
                  // let element = document.getElementById("photo-ring-div");
                  // element.style.opacity = "1";
                  // element.style.filter  = 'alpha(opacity=100)';
                  // document.getElementById('photo-ring-svg').setAttribute('pointer-events','auto');
  
  
                // $timeout.cancel(animationTimer);
  
  
                if (response && response.thumbCancel) {
                  //thumbnail failed for some reason
                  // vm.thumb = "img/pulse-scene.jpg";
                  vm.thumb = "../../img/pulse-scene.jpg";
                  vm.showSpinner = false;
                  vm.backgroundGradient = 0.0;
                  vm.fill = "#fff";
                }
                return;
              },
              function (error) {
                  console.log('takePhoto called error 7777');
                  
                  // let element = document.getElementById("photo-ring-div");
                  // element.style.opacity = "1";
                  // element.style.filter  = 'alpha(opacity=100)';
                  // document.getElementById('photo-ring-svg').setAttribute('pointer-events','auto');
  
                $timeout.cancel(animationTimer);
                //user is in video mode
                hasErrored = true;
                // vm.thumb = "img/pulse-scene.jpg";
                vm.thumb = "../../img/pulse-scene.jpg";
                vm.showSpinner = false;
                vm.backgroundGradient = 0.0;
                vm.fill = "#fff";
                vm.bulbClass = "animated fadeIn";
                vm.errorText = "Switch out of video mode in order to view images";
                $timeout(function() {
                  vm.bulbClass = "animated fadeOut";
                  $photo.settings.inProgress = false;
                  $timeout(function() {
                    vm.bulbClass = "hidden";
                  }, 1000);
                }, 5000);
              }
            );
            // previousDevices.push(tempDevice);
            // tempDevice = $device.getSelectedDevice(previousDevices);
          // }
        }

      } else {

        if ($photo.settings.inProgress == true) {
          if(previousSelectedDevice != null && previousSelectedDevice != undefined){
            vm.errorText = "Please wait. Photo processing for " + vm.getCameraModel(previousSelectedDevice);
          } else {
            vm.errorText = "Please wait. Photo processing for " + vm.getCameraModel(currentSelectedDevice);
          }
          
          // $timeout(function() {
            vm.bulbClass = "animated fadeIn";

            $timeout(function() {
              vm.bulbClass = "animated fadeOut";
              // $photo.settings.inProgress = false;
              $timeout(function() {
                vm.bulbClass = "hidden";
              }, 500);
            }, 1000);
          // }, 5000);

        }else {
          console.log("inside Camera not connected *******");
        }
        // $timeout.cancel(animationTimer);
      }
    };

    function takePhotoAllCamera(tempDevice, shutterWait, hasErrored, previousDevices) {
      // for(var i = 0; i < vm.localStorageDevices.length; i++){
        var deferred = $q.defer();
        console.log('vm.localStorageDevices.length : ' + vm.localStorageDevices.length);
        
        // console.log("inside while loop *******");
        console.log("device.metaData.cameraConnected value true ******* : " + tempDevice.metaData.cameraConnected);

        if (tempDevice.metaData.cameraConnected == true || tempDevice.metaData.cameraConnected == 1 || tempDevice.metaData.cameraConnected == '1') {

          $transmit.blinkLED(tempDevice);
          
          var photoMode;
          if (tempDevice.btClassic.connected && tempDevice.btClassic.enabled) {
            // photoMode = $config.communication.ACTION_PHOTO_FAST;
            photoMode = $config.communication.ACTION_PHOTO_CAPTURE;
            // console.log("capture: fast photo  *******");
            // console.log("capture: ack photo *******");
          } else {
            // photoMode = $config.communication.ACTION_PHOTO_CAPTURE;
            photoMode = $config.communication.ACTION_PHOTO_FAST;
            // console.log("capture: ack photo *******");
            console.log("capture: fast photo  *******");
          }
          var captureData = [
            0x00,
            0x01,
            $config.communication.SET_ACTION,
            photoMode
          ];
          var buff = new Uint8Array(captureData);
          // console.log("buff : " + JSON.stringify(buff));
          // Take picture first camera
          BLE.write(
            tempDevice.id,
            $config.services.GATT_SERVICE_UUID_PULSE_COMMS_SERVICE,
            $config.characteristics.GATT_CHAR_UUID_UART_TX,
            buff.buffer,
            function(response) {
              // console.log("Photo capture write response ******* : " + response);
              deferred.resolve(response);
            },
            function(error) {
              console.log("Photo capture write error ******* :");
              console.log(error);
              deferred.reject(error);
            }
          );
          // Take picture second camera
          previousDevices.push(tempDevice);
          tempDevice = $device.getSelectedDevice(previousDevices); 
          if (tempDevice != undefined && tempDevice != null) {
            BLE.write(
              tempDevice.id,
              $config.services.GATT_SERVICE_UUID_PULSE_COMMS_SERVICE,
              $config.characteristics.GATT_CHAR_UUID_UART_TX,
              buff.buffer,
              function(response) {
                // console.log("Photo capture write response ******* : " + response);
                deferred.resolve(response);
              },
              function(error) {
                console.log("Photo capture write error ******* :");
                console.log(error);
                deferred.reject(error);
              }
            );
          }
          // take picture third camera
          previousDevices.push(tempDevice);
          tempDevice = $device.getSelectedDevice(previousDevices); 
          if (tempDevice != undefined && tempDevice != null) {
            BLE.write(
              tempDevice.id,
              $config.services.GATT_SERVICE_UUID_PULSE_COMMS_SERVICE,
              $config.characteristics.GATT_CHAR_UUID_UART_TX,
              buff.buffer,
              function(response) {
                // console.log("Photo capture write response ******* : " + response);
                deferred.resolve(response);
              },
              function(error) {
                console.log("Photo capture write error ******* :");
                console.log(error);
                deferred.reject(error);
              }
            );
          }
          // take picture fourth camera
          previousDevices.push(tempDevice);
          tempDevice = $device.getSelectedDevice(previousDevices); 
          if (tempDevice != undefined && tempDevice != null) {
            BLE.write(
              tempDevice.id,
              $config.services.GATT_SERVICE_UUID_PULSE_COMMS_SERVICE,
              $config.characteristics.GATT_CHAR_UUID_UART_TX,
              buff.buffer,
              function(response) {
                // console.log("Photo capture write response ******* : " + response);
                deferred.resolve(response);
              },
              function(error) {
                console.log("Photo capture write error ******* :");
                console.log(error);
                deferred.reject(error);
              }
            );
          }
          // take picture fifth camera
          previousDevices.push(tempDevice);
          tempDevice = $device.getSelectedDevice(previousDevices); 
          if (tempDevice != undefined && tempDevice != null) {
            BLE.write(
              tempDevice.id,
              $config.services.GATT_SERVICE_UUID_PULSE_COMMS_SERVICE,
              $config.characteristics.GATT_CHAR_UUID_UART_TX,
              buff.buffer,
              function(response) {
                // console.log("Photo capture write response ******* : " + response);
                deferred.resolve(response);
              },
              function(error) {
                console.log("Photo capture write error ******* :");
                console.log(error);
                deferred.reject(error);
              }
            );
          }
          // take picture sixth camera
          previousDevices.push(tempDevice);
          tempDevice = $device.getSelectedDevice(previousDevices); 
          if (tempDevice != undefined && tempDevice != null) {
            BLE.write(
              tempDevice.id,
              $config.services.GATT_SERVICE_UUID_PULSE_COMMS_SERVICE,
              $config.characteristics.GATT_CHAR_UUID_UART_TX,
              buff.buffer,
              function(response) {
                // console.log("Photo capture write response ******* : " + response);
                deferred.resolve(response);
              },
              function(error) {
                console.log("Photo capture write error ******* :");
                console.log(error);
                deferred.reject(error);
              }
            );
          }
        } else {
          console.log("device.metaData.cameraConnected value false ******* : " + tempDevice.metaData.cameraConnected);
        }
        // previousDevices.push(tempDevice);
        // tempDevice = $device.getSelectedDevice(previousDevices);

        // // console.log("tempDevice ******* : " + JSON.stringify(tempDevice));

        // if (tempDevice != undefined && tempDevice != null) {
        //   // setTimeout(takePhotoAllCamera(tempDevice, shutterWait, hasErrored, previousDevices), parseInt(vm.interval));
        //   var IntervalValue = parseInt(vm.interval) * 1000;
        //   // console.log("interval value ******* : " + parseInt(vm.interval));
        //   // $timeout (function(){
        //     takePhotoAllCamera(tempDevice, shutterWait, hasErrored, previousDevices)
        //   // } , IntervalValue);       
        // } else {
          $timeout(function() {
            // we dont allow another photo to be taken until the shutter is closed. Also wait 300 ms before allowing press again
            // $photo.settings.inProgress = false;
              $photo.settings.inProgress = false;
              vm.fill = "#fff";          
          }, shutterWait + 2000);
        // }
    }

    function init() {
      vm.thumb = "img/pulse-scene.jpg";
      vm.showSpinner = false;
      vm.backgroundGradient = 0.0;
      vm.btClassic = btClassic;
      vm.histogram = false;
      vm.shutterCounter = 0;
      vm.maxShutter = 0;
      vm.fill = "#fff";
      vm.bulbClass = "hidden";
      vm.selectedDevice = $device.getSelectedDevice();
      if (vm.selectedDevice != undefined) {
        vm.isMainDevice = vm.selectedDevice.id; 
        currentSelectedDevice =  vm.selectedDevice;
        vm.selectedDevice.metaData.isAllCamera = vm.isAllCamera;
      }
    }

    vm.isBtClassicConnected = function(checkForEnabled) {
      var device = $device.getSelectedDevice();
      vm.selectedDevice = device;
     if (vm.selectedDevice != undefined) {
        vm.isMainDevice = vm.selectedDevice.id;  
        currentSelectedDevice =  vm.selectedDevice;
      }
      return $views.isBtClassicConnected(device, checkForEnabled);
    };

    vm.handleToggle = function(enabled) {
      // console.log('inside handleToggle');
      var device = $device.getSelectedDevice();
      //check if we have iOS 11.2.5, if so we need to present the "can't do it" modal
      var os = $platform.getDeviceVersion();
      if (os === "11.2.5") {
        // console.log("Using OS 11.2.5, fuuuuuck");
        var modalData = {
          text:
            "Unfortunately Apple’s iOS 11.2.5 release had significant bluetooth bugs and has disabled the Image Review feature. This feature will be disabled until Apple releases fixes to iOS. All other Pulse features are functioning correctly. Thank you for your patience! ",

          onButtonClick: function onButtonClick() {},
          onYesButtonClick: function onYesButtonClick() {},
          animation: "fade-in-scale",
          twoButton: false
        };
        $rootScope.$broadcast("openModal-long", modalData);

        device.btClassic.enabled = false;
        device.btClassic.connected = false;
        return;
      }

      if (enabled) {
        // console.log(`device: ${JSON.stringify(device)}`);
        //try to turn the toggle on
        // console.log('inside handleToggle enabled');
        btClassic.isConnected(device.metaData.macAddress).then(
          function(result) {
            //we are already connected, update the device already
            device.btClassic.connected = true;
            device.btClassic.enabled = true;
          },
          function(error) {
            //we aren't connected. Note that and try to connect
            device.btClassic.connected = false;
            device.btClassic.enabled = false;
            btClassic
              .connect(device.metaData.macAddress, device, false, true)
              .then(
                function(result) {
                  device.btClassic.connected = true;
                  device.btClassic.enabled = true;
                  vm.selectedDevice = device;
                   if (vm.selectedDevice != undefined) {
                      vm.isMainDevice = vm.selectedDevice.id;
                      currentSelectedDevice =  vm.selectedDevice;  
                    }                  
                },
                function(error) {
                  device.btClassic.enabled = false;
                  device.btClassic.connected = false;
                  vm.selectedDevice = device;
                   if (vm.selectedDevice != undefined) {
                      vm.isMainDevice = vm.selectedDevice.id;
                      currentSelectedDevice =  vm.selectedDevice;  
                    }                  
                }
              );
          }
        );
      }
    };

    vm.showHistText = function() {
      var device = $device.getSelectedDevice();
      if (
        $histogram.isBtClassicConnected() &&
        !vm.histogram &&
        !hasSeenHistText &&
        hasReceivedThumb
      ) {
        return true;
      } else {
        return false;
      }
    };

    vm.toggleHistogram = function() {
      hasSeenHistText = true;
      if (!vm.histogramItems || !vm.histogramItems.data) {
        vm.histogram = false;
      } else if (vm.histogram) {
        vm.histogram = false;
      } else {
        vm.histogram = true;
      }
    };

    vm.showThumbToggle = function() {
      var device = $device.getSelectedDevice();
      vm.selectedDevice = device;
     if (vm.selectedDevice != undefined) {
        vm.isMainDevice = vm.selectedDevice.id;  
        currentSelectedDevice =  vm.selectedDevice;
      }      
      if (device && !vm.isAllCamera) {
        return true;
      } else {
        return false;
      }
    };

    vm.checkToggle = function() {
      var device = $device.getSelectedDevice();
      if (device.btClassic.enabled && device.btClassic.connected) {
        return true;
      } else {
        return false;
      }
    };

    function sortByConnectedDevices(devices) {
      var localStorageDevices = _.sortBy(devices, [function (lDevice) {
        // console.log('lDevice.isMainDevice : ' + lDevice.isMainDevice);
        var connectedPulses = $device.getConnectedDevices();
        // console.log('Photo connectedPulses ' + JSON.stringify(connectedPulses));
        var isConnected = _.find(connectedPulses, function (connectedPulse) {
          console.log('Photo Returning lDevice.id ' + JSON.stringify(lDevice.id));
          return lDevice.id == connectedPulse.id;
        });
        lDevice.isConnected = isConnected;
        if (lDevice.isConnected) {
          console.log('Photo Returning lDevice.isConnected ' + lDevice.isConnected.id);
          return lDevice.isConnected;
        }
      }]);
      console.log('Photo Returning localStorageDevices ' + localStorageDevices.id);
      return localStorageDevices;
    }
    
    $scope.$on("$ionicView.enter", function() {
      $ionicSideMenuDelegate.canDragContent(true);
    });
  });
})();
