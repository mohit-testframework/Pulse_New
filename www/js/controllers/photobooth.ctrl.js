'use strict';

(function () {
  'use strict';

  pulse.controllers.controller('PhotoboothCtrl', function ($scope, $photobooth, $rootScope, $photo, $ionicSideMenuDelegate, $device, $views, $camSettings, $ionicSlideBoxDelegate, $timeout, $transmit, $config, $cordovaVibration) {

    var vm = this;
    var currentPhotoIteration = 0;
    vm.thumbs = [];
    vm.control = {};
    vm.photosTaken = 0;

    var pbPhotos = 0;

    $scope.pbSettings = $photobooth.settings;

    $ionicSideMenuDelegate.canDragContent(false);

    $rootScope.$on('thumbnailUploadPhotoBoothPage', function (event, data) {
      // console.log("data.thumbPath PhotoBooth Page : " + data.thumbPath);
      let photoThumb = window.Ionic.WebView.convertFileSrc(data.thumbPath);
      if (pbPhotos > 0) {
        pbPhotos--;
        vm.thumbs.push(photoThumb);
      }
    });

    $scope.$on('timer-tick', function (event, args) {
      var device = $device.getSelectedDevice();
      if (args.millis == 3000) {
        $transmit.blinkLED(device, 2, $config.LED_STEADY);
      } else if (args.millis == 1000) {
        $photo.takePhoto(device, false);
      } else if (args.millis > 3000) {
        $transmit.blinkLED(device, 0.1, $config.LED_STEADY);
      }
    });

    vm.disableSwipe = function () {
      $ionicSlideBoxDelegate.enableSlide(false);
    };

    vm.notEmptyOrNull = function (thumb) {
      return !(thumb === null || thumb.length === 0);
    };

    vm.handlePbTransition = function () {
      vm.photosTaken++;
      $photobooth.settings.currentPhotoIteration++;
      if ($photobooth.settings.currentPhotoIteration < $photobooth.settings.numPhotos) {
        $scope.$broadcast('timer-set-countdown', $scope.pbSettings.interval);
        $scope.$broadcast('timer-start', $scope.pbSettings.interval);
      } else {
        stopPB();
      }
    };

    function stopPB() {
      $views.removePhotoboothUI();
      $scope.$broadcast('timer-stop');
      var device = $device.getSelectedDevice();
      $photobooth.stop(device);
      $ionicSlideBoxDelegate.slide(2);
      //wait for time to process the Thumbs, and set pbPhotos back to 0 so photobooth thumbs stop rendering
      $timeout(function () {
        pbPhotos = 0;
      }, 7000);
    }

    vm.startOrPausePhotobooth = function () {
      var device = $device.getSelectedDevice();
      if ($photobooth.settings.finished) {
        $ionicSlideBoxDelegate.slide(0);
        $photobooth.reset();
        vm.thumbs.length = 0;
      } else if (!$photobooth.settings.inProgress) {
        if (device && device.metaData && device.metaData.cameraConnected) {
          if (!$camSettings.hasGoodShutterSetting(device, $photobooth.settings.interval)) {
            var modalData = {
              text: 'We found a problem! Your shutter speed of ' + device.metaData.camSettings.shutterOptions[device.metaData.camSettings.activeShutterIndex].value + ' cannot be slower than your photobooth interval!',
              onButtonClick: function onButtonClick() {
                console.log('Shutter speed was too slow for photo boothing');
              },
              animation: 'fade-in-scale'
            };
            $rootScope.$broadcast('openModal', modalData);
            return;
          }

          $cordovaVibration.vibrate(50);
          initializePhotobooth();
        } else {
          return;
        }
      } else {
        stopPB(device);
      }
    };

    function initializePhotobooth() {
      currentPhotoIteration = 0;
      vm.photosTaken = 0;
      pbPhotos = $photobooth.settings.numPhotos;
      var device = $device.getSelectedDevice();
      $ionicSlideBoxDelegate.slide(1);
      $views.renderPhotoBoothUI();
      $scope.$broadcast('timer-set-countdown', $scope.pbSettings.interval);
      $scope.$broadcast('timer-start', $scope.pbSettings.interval);
      $photobooth.start(device);
    }

    // Enable drag-to-open menu
    $scope.$on('$ionicView.enter', function () {
      $ionicSideMenuDelegate.canDragContent(false);
    });
  });
})();