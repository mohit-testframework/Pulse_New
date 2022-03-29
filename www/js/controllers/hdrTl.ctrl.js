'use strict';

(function () {
  'use strict';

  pulse.controllers.controller('hdrTlCtrl', function ($hdrTl, $device, $cordovaVibration, $ionicSideMenuDelegate, $timeout, $views, $rootScope, $preset, $timelapse, $stateParams) {
    var vm = this;
    vm.activeBracketing = false;
    var dId = $stateParams.deviceId;
    vm.dId = dId;

    init();

    vm.changeHDRTl = function() {
      console.log('Inside changeHRDTl');
      var device = $device.getSelectedDevice();
      if (!vm.timelapseModel.timelapses[vm.dId].settings.activeExposure && 
        !vm.timelapseModel.timelapses[vm.dId].settings.activeISOExposure &&
        !vm.timelapseModel.timelapses[vm.dId].settings.activeBulbExposure) {
        if (!vm.timelapseModel.timelapses[vm.dId].settings.activeHDRTl) {
            $timelapse.timelapses[vm.dId].settings.activeHDRTl = false;
            $preset.settings.presetName = '';
            console.log('Clearing HDR Preset name');
        } else {
          $timelapse.timelapses[vm.dId].settings.activeHDRTl = true;
          $timelapse.timelapses[vm.dId].settings.hdr.hdrData = $hdrTl.prepareHdrData(device);
          $preset.settings.presetName = 'HDR Time Lapse';
          console.log('Setting Preset name to HDR ' + $preset.settings.presetName);
          // var device = getSelectedDevice();
          // $hdrTl.hdrTl(device);
        }          
      } else {
        var modalData = {
          text: "Only one Advanced Time Lapse feature can be turned on!",
          onButtonClick: function onButtonClick() {
            // console.log('Inside successfully alert');
          },
          animation: "fade-in-scale"
        };
        $rootScope.$broadcast("openModal", modalData);
      }
    };

    function init() {
        console.log("inside init HDR Time Lapse")
        vm.model = $hdrTl;
        vm.selectedDevice = $device.getSelectedDevice();
        $timelapse.initModel(dId);
        vm.timelapseModel = $timelapse;
  
        $ionicSideMenuDelegate.canDragContent(false);
  
        // if (vm.selectedDevice && vm.selectedDevice.metaData.camSettings) {
        //   vm.shutterOptions = filterOptions(vm.selectedDevice.metaData.camSettings.shutterOptions, 'shutter');
        //   $timelapse.timelapses[dId].settings.exposure.shutterArray = vm.shutterOptions.valueArray;
        // }
    }
  });
})();