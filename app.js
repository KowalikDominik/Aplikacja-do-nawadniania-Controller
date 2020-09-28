(function(){

var app = angular.module("myApp", ["ngRoute","googlechart"]);

  app.config(['$routeProvider', function($routeProvider) {

      $routeProvider
          .when('/panel', {
              templateUrl: 'views/panel.html',
              label: 'Panel Główny'
          })
          .when('/charts', {
              templateUrl: 'views/charts.html',
              label: 'Wykresy'
          })
          .when('/auto', {
              templateUrl: 'views/auto.html',
              label: 'Automatyka'
          })
          .when('/login', {
              templateUrl: 'views/login.html',
              label: 'Proszę zaloguj się'
          })
          .otherwise({
              redirectTo: '/panel'
          })
      ;



  }]);

  //CONSTANTS
  const AUTH_EVENTS = {
    notAutthencitate: 'auth-not-authenticated'
  };
  const API_ENDPONT = {
    url: '/http://kowalik.vipserv.pl/controller/web'
  };

  $preloader = function(){
    var preloader = angular.element(document.querySelector('#preloader'));
    var body = angular.element(document.querySelector('body'));
    if(preloader[0]!=undefined){
      preloader.remove();
      return;
    }
    preloader = angular.element(document.createElement('div'));
    preloader.attr('id', 'preloader');
    body.prepend(preloader);
  };

  $enable_nav = function(){
    angular.element(document.querySelector('#top_nav')).show();
  };


	app.controller("panelController", ['$scope', '$interval', '$http',
    function($scope, $interval, $http) {
    // $enable_nav();
     // remove all active attr in links
      $( "a[href^='#!']" ).each(function( index ) {
        $( this ).parent().removeClass( "active" );
      });
      $("a[href='#!panel']").parent().addClass( "active" );

      var lastDate;
      var clickValve = 0;
      var autoOn = 0;
      $scope.alert=false;

      var intervalGetData = $interval(function () {
        getData();
      }, 2000);

      $scope.showModal= function(id){
        console.log(autoOn);
        clickValve = id;
        if(autoOn == 1){
          $('#myModal').modal('show');
        }
        else{
          $scope.sendChangeValve();
        }
      };

      var getData = function(){

        $http({
          method: 'GET',
          url: '/controller/web/api.php/getLastData'
        }).then(function (response){
          if(lastDate != response.data[0].date){
            $scope.chart1[1][1] = parseFloat(response.data[0].tempIN);
            $scope.chart2[1][1] = parseFloat(response.data[0].humIN);
            $scope.chart3[1][1] = parseFloat(response.data[0].tempOUT);
            $scope.chart4[1][1] = parseFloat(response.data[0].humOUT);
            $scope.chart5[1][1] = parseFloat(response.data[0].soilHum);
            $scope.valve1 = parseInt(response.data[0].valve1);
            $scope.valve2 = parseInt(response.data[0].valve2);
            autoOn = parseInt(response.data[0].status);
            lastDate = response.data[0].date;
           
          }
        },function (error){
          console.log(error);
        });
      };

      getData();

      var waitForOK = function() {
        $http({
          method: 'GET',
          url: '/controller/web/api.php/receivedStatus'
        }).then(function (response){
          if(response.data == 'ok'){

              if(clickValve == 1){
                $scope.valve1 = ($scope.valve1 == 0) ? 1 : 0;
              }else{
                $scope.valve2 = ($scope.valve2 == 0) ? 1 : 0;
              }

              $scope.alert=true;

              $preloader();

              $interval.cancel($scope.intervalGetStatus);
            }
        },function (error){
          console.log(error);
        });
      };

      $scope.sendChangeValve = function () {

        $state = ((clickValve == 1 ? $scope.valve1 : $scope.valve2) == 0 ? 1 : 0);

        $http({
          method: 'PUT',
          url: '/controller/web/api.php/changeValve/'+clickValve+'/'+$state
        }).then(function (response){
          $('#myModal').modal('hide');
          $preloader();          
          console.log(response);
        },function (error){
          console.log(error);
        }); 



        $scope.intervalGetStatus = $interval(function () {
          waitForOK();
        }, 500);

      };
	
		
      

      $scope.chart1 = [
        ['Label', 'Value'],
        ['C', 0]
      ];

      $scope.chart2 = [
        ['Label', 'Value'],
        ['%', 0]
      ];
      $scope.chart3 = [
        ['Label', 'Value'],
        ['C', 0]
      ];
      $scope.chart4 = [
        ['Label', 'Value'],
        ['%', 0]
      ];
      $scope.chart5 = [
        ['Label', 'Value'],
        ['%', 0]
      ];

	    $scope.myChart1Object = {};
	    $scope.myChart2Object = {};
	    $scope.myChart3Object = {};
	    $scope.myChart4Object = {};
	    $scope.myChart5Object = {};

	    $scope.myChart1Object.type = "Gauge";
	    $scope.myChart2Object.type = "Gauge";
	    $scope.myChart3Object.type = "Gauge";
	    $scope.myChart4Object.type = "Gauge";
	    $scope.myChart5Object.type = "Gauge";

      $tempOptions ={
        width: 400,
        height: 120,
        redFrom: 45,
        redTo: 100,
        yellowFrom: 35,
        yellowTo: 45,
        minorTicks: 5 
      };
        $humOptions ={
        width: 400,
        height: 120,
        redFrom: 90,
        redTo: 100,
        yellowFrom: 80,
        yellowTo: 90,
        minorTicks: 5
      };

	    $scope.myChart1Object.options = $tempOptions;
	    $scope.myChart2Object.options = $humOptions;
	    $scope.myChart3Object.options = $tempOptions;
	    $scope.myChart4Object.options = $humOptions;
	    $scope.myChart5Object.options = $humOptions;

      
	    $scope.myChart1Object.data = $scope.chart1;
	    $scope.myChart2Object.data = $scope.chart2;
	    $scope.myChart3Object.data = $scope.chart3;
	    $scope.myChart4Object.data = $scope.chart4;
	    $scope.myChart5Object.data = $scope.chart5;


	}]);

  app.filter('valve_text',function(){
    return function(valve){
      valve = valve||'OFF';
      if(valve==1) return 'ON'
        else return 'OFF';
    }
  });


  app.controller('lineChartController', ['$scope','$http',
      function($scope,$http) {
          //remove all active attr in links
        $( "a[href^='#!']" ).each(function( index ) {
          $( this ).parent().removeClass( "active" );
        });
        $("a[href='#!charts']").parent().addClass( "active" );
        $scope.date = new Date();
        $scope.emptyResponse=false;
        $scope.showChart = function(){
          init();
        };

        init();

        function convertDate(date){
          var inputDate = new Date(date);
          return new Date(inputDate.getFullYear(),inputDate.getMonth(),inputDate.getDate(),
                inputDate.getHours(),inputDate.getMinutes());
        }

        

        function init(){
          $scope.myChartObject = {};
          $scope.myChartObject.type = "LineChart";
          $scope.myChartObject.displayed = false;

          $scope.myChartObject.options = {
            height: 500,
            series: {
              1: {targetAxisIndex: 1},
              2: {targetAxisIndex: 1}
            },
            vAxes: {
             0: {
              title: 'Temperatura',
              ticks: [{v:0, f:'0 ℃'},{v:5, f:'5  ℃'},{v:10, f:'10  ℃'},
                      {v:15, f:'15  ℃'},{v:20, f:'20  ℃'},{v:25, f:'25  ℃'},
                      {v:30, f:'30  ℃'},{v:35, f:'35  ℃'}]
              },
             1: {
              title: 'Wilgotność',
              ticks: [{v:0, f:'0%'},{v:25, f:'25%'},{v:50, f:'50%'},{v:75, f:'75%'},{v:100, f:'100%'}]
              }
            },
            hAxis: {
            title: 'Godzina' 
            },
            vAxis:{
            minorGridlines: { 
              count: 2 
              }
            }
          };

          $scope.select_chart = $scope.select_chart||1;
        
          $scope.myChartObject.data = {};
          $scope.myChartObject.data.rows = [];
          $scope.myChartObject.data.cols = [];
          $scope.myChartObject.data.cols.push(
            {
              "id": "date",
              "label": "Godzina",
              "type": "timeofday",
            });
          if($scope.select_chart==1){
            $scope.myChartObject.options.series={};
            $scope.myChartObject.data.cols.push(
            {
                  id: "tempIN-id",
                  label: "Temperatura wewnątrz",
                  type: "number"
            },
            {
                  id: "tempOUT-id",
                  label: "Temperatura na zewnątrz",
                  type: "number"
            }); 
          }
          if($scope.select_chart==2){
            $scope.myChartObject.data.cols.push(
              {
                  id: "tempOUT-id",
                  label: "Temperatura na zewnątrz",
                  type: "number"
            },
            {
                  id: "humOUT-id",
                  label: "Wilgotność na zewnątrz",
                  type: "number"
            }); 
          }
          else if($scope.select_chart==3){
            $scope.myChartObject.data.cols.push(
            {
                  id: "tempIN-id",
                  label: "Temperatura wewnątrz",
                  type: "number"
            },
            {
                  id: "tempIN-id",
                  label: "Wilgotność wewnątrz",
                  type: "number"
            },
            {
                  id: "soliHum-id",
                  label: "Wilgotność podłoża",
                  type: "number"
            }); 



          }

          $scope.myChartObject.data.rows = [];

          $scope.setDate = $scope.setDate||$scope.date;

          var month = $scope.setDate.getMonth()+1;
          month = (month<=9 ? '0' + month : month);
          var dateToRequest = $scope.setDate.getFullYear()+'-'+month+'-'+$scope.setDate.getDate();

          $http({
            method: 'GET',
            url: '/controller/web/api.php/getDataDay/'+dateToRequest
          }).then(function (response){
           
              $scope.emptyResponse=(response.data.length==0 ? true : false);

              [].forEach.call(response.data, function (item,index) {
                var time = item.only_short_date.split(":");
                
                if($scope.select_chart==1){
                $scope.myChartObject.data.rows[index]={
                  c: [{
                      v: time
                  }, {
                      v: item.tempIN
                  }, {
                      v: item.tempOUT
                  }]

                };
                }
                else if($scope.select_chart==2){
                $scope.myChartObject.data.rows[index]={
                  c: [{
                      v: time
                  }, {
                      v: item.tempOUT
                  }, {
                      v: item.humOUT
                  }]  

                };
                }
                else{

                $scope.myChartObject.data.rows[index]={
                  c: [{
                      v: time
                  }, {
                      v: item.tempIN
                  }, {
                      v: item.humIN
                  }, {
                      v: item.soilHum
                  }]
                
                };
                }
          });
          },function (error){
            console.log(error);
          });
        }


}]);
  app.controller('autoController', ['$scope', '$http', '$interval',
      function($scope, $http, $interval) {


          $( "a[href^='#!']" ).each(function( index ) {
            $( this ).parent().removeClass( "active" );
          });
          $("a[href='#!auto']").parent().addClass( "active" );

          $scope.alert=false;

          $http({
            method: 'GET',
            url: '/controller/web/api.php/getAuto'
          }).then(function (response){
                console.dir(response.data[0]);
                $scope.humFrom = parseInt(response.data[0].humFrom);
                $scope.humTo = parseInt(response.data[0].humTo);
                $scope.humMinutesControl = parseInt(response.data[0].minutes);
                $scope.checkboxAuto = (parseInt(response.data[0].status)==1) ? true : false;
          },function (error){
            console.log(error);
          });        

        function waitForOK() {
          $http({
            method: 'GET',
            url: '/controller/web/api.php/receivedStatus'
          }).then(function (response){
            if(response.data == 'ok'){
                $scope.alert=true;
                $preloader();
                $interval.cancel($scope.intervalGetStatus);        
                
              }
          },function (error){
            console.log(error);
          });
        }

        $scope.sendNewSetting = function(){
          var checkbox = $scope.checkboxAuto || false;
          checkbox = (checkbox==true) ? 1 : 0;
          console.dir($scope.humFrom);
          console.dir($scope.humTo);
          console.dir($scope.humMinutesControl);
          console.log(checkbox);
          console.dir($scope.form);
          $http({
            method: 'PUT',
            url: '/controller/web/api.php/changeAuto/'+$scope.humFrom+'/'+$scope.humTo+'/'
                  +$scope.humMinutesControl+'/'+checkbox
          }).then(function (response){
            $preloader();
            console.log(response);
          },function (error){
            console.log(error);
          }); 
          $scope.intervalGetStatus = $interval(function () {
            waitForOK();
          }, 1000);
        };

      }]);

})();