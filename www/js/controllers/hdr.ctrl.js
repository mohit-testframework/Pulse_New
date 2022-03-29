'use strict';

(function () {
  'use strict';

  pulse.controllers.controller('HdrCtrl', function ($hdr, $device, $cordovaVibration, $ionicSideMenuDelegate, $timeout, $views, $rootScope) {
    var vm = this;
    vm.activeBracketing = false;
    vm.activeUnbalancedMode = false;
    vm.hdrUnbalancedNumPhotos = 0;
    vm.hdrUnbalancedSign = '';
    init();

    vm.checkValue = function (data) { 
      switch(data) {
        case '-':
          vm.hdrUnbalancedNumPhotos = 1;
          vm.hdrUnbalancedSign = '-';
        break;
        
        case '+':
          vm.hdrUnbalancedNumPhotos = 1;
          vm.hdrUnbalancedSign = '+';
        break;
        
        case '- -':
          vm.hdrUnbalancedNumPhotos = 3;
          vm.hdrUnbalancedSign = '-';
        break;
        
        case '+ +':
          vm.hdrUnbalancedNumPhotos = 3;
          vm.hdrUnbalancedSign = '+';
        break;
          
        case '- - -':
          vm.hdrUnbalancedNumPhotos = 5;
          vm.hdrUnbalancedSign = '-';
        break;

        case '+ + +':
          vm.hdrUnbalancedNumPhotos = 5;
          vm.hdrUnbalancedSign = '+';
        break;
      }
      console.log('data: '+ JSON.stringify(data));
    }

    $rootScope.$on('pictureFinished', function (event) {
      console.log('hdr capture event');
      if ($hdr.settings.isActive && $hdr.settings.isWaiting && !vm.activeUnbalancedMode) {
        var device = $device.getSelectedDevice();
        $hdr.hdrCapture(device);
      }
    });

    function init() {
      console.log("inside init HDDDDRRR")
      vm.model = $hdr;
      vm.errorClass = 'hidden';
      $ionicSideMenuDelegate.canDragContent(false);
    }

    vm.stopHdr = function () {
      $hdr.settings.forceStop = true;
    };

    vm.startHdr = function () {
      console.log("inside start hdr")
      var device = $device.getSelectedDevice();
      var hasError;
      if (device) {
        var cameraModeFail = device.metaData.cameraMode != 'MANUAL' && !$views.permissableMode && !$views.abortModes;
        if (device.metaData.cameraMode && cameraModeFail) {
          hasError = true;
          vm.errorClass = 'animated fadeIn';
          vm.errorMessage = 'Change your camera mode to Manual to enable HDR';
        } else if (!device.metaData.shutterArray.length) {
          hasError = true;
          vm.errorClass = 'animated fadeIn';
          vm.errorMessage = 'We could not find any shutter settings. Unabled to perform HDR';
        } else {
          if(vm.activeUnbalancedMode){
            console.log("waana have fun...");
            $hdr.settings.inProgress = true;
            $cordovaVibration.vibrate(50);
            $hdr.hdrUnbalanced(device,vm.hdrUnbalancedNumPhotos,vm.hdrUnbalancedSign);
          }
          else{
             console.log("else")

            $hdr.settings.inProgress = true;
            //everything checks out, let's have an HDR party
            $cordovaVibration.vibrate(50);
            $hdr.hdr(device);
          }
        }
        if (hasError) {
          hasError = false;
          $timeout(function () {
            vm.errorClass = 'animated fadeOut';
            $timeout(function () {
              vm.errorClass = 'hidden';
            }, 1000);
          }, 5000);
        }
      }
    };
  });
})();