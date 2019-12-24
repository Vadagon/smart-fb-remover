// https://us-central1-margarita-1.cloudfunctions.net/DBinsert/isMember?email=mazukis@gmail.com

var app = angular.module('app', ['ngMaterial', 'ngMessages']);
app.controller('main', function($mdToast, $scope, $mdDialog, $interval){

    $scope.loading = true;
    $scope.deleteSection = false;
    $scope.selectedCount = 0;
    $scope.filter = "0";
    $scope.login = {
      email: '',
      loading: false,
      logged: true,
      func: function(){
        $scope.login.loading = true;
        // mazukis@gmail.com
        $.get('https://us-central1-margarita-1.cloudfunctions.net/DBinsert/isMember?email='+$scope.login.email).done((e)=>{
          if(e && e.result){
            $scope.login.logged = true;
            chrome.runtime.sendMessage({type: "loggedTrue"})
          }
          console.log(e)
        }).always(()=>{
          $scope.login.loading = false;
        })
      }
    }
    // $scope.filtered = [];
    function init(){
      chrome.runtime.sendMessage({type: "data"}, function(response) {
        $scope.friends = response.friends;
        $scope.loading = response.loading;
        $scope.login.logged = response.logged;
        if($scope.loading){
          setTimeout(()=>{
            init()
          }, 10000)
        }
        // $scope.filtered = $scope.friends;
        $scope.user = {
          uid: response.uid,
          creds: response.creds
        }
        $scope.$apply();
      });
    }
    init();
    $scope.select = function(x){
        x.selected=!x.selected; 
        if(x.selected){
            $scope.selectedCount++
        }else{
            $scope.selectedCount--
        }
    }
    $scope.filterDir = function(x){
      return !x.hide;
    }
    $scope.filterFunc = function(e){
        $scope.filter = e;
        console.log($scope.filter, e)
        $scope.friends.forEach(x=>{
            x.selected = false;
            $scope.selectedCount = 0;
            if(e == "-1" && x.time){
                x.hide = true;
            }else if(e == "3" && new Date().getTime() - x.time < 7776000000){
                x.hide = true;
            }else if(e == "6" && new Date().getTime() - x.time < 7776000000 * 2){
                x.hide = true;
            }else if(e == "12" && new Date().getTime() - x.time < 7776000000 * 4){
                x.hide = true;
            }else{
                x.hide = false;
            }
        })
        // $scope.filtered = $scope.friends.filter(e=>!e.hide);
        // $scope.$apply();
    }
    $scope.selectAll = function(){
        var max = $scope.friends.filter((e)=>!e.hide).length
        $scope.selectedCount = $scope.selectedCount==max?0:max;
        $scope.friends.forEach(e=>{
            e.selected = (!e.hide && $scope.selectedCount != 0)
        })
    }
    $scope.timeParse = function(e){
        let date = moment(new Date( e ), "YYYY-MM-DD");
        return date.fromNow();
    }
    var prevFilter;
    $scope.removeFriends = function(ev) {
      console.log($scope.filter)
      prevFilter = $scope.filter
        // Appending dialog to document.body to cover sidenav in docs app
        var confirm = $mdDialog.confirm()
              .title('Would you like to unfriend selected friends?')
              .textContent('You will not be able to undo your changes.')
              .targetEvent(ev)
              .ok('Yes')
              .cancel('No');

        $mdDialog.show(confirm).then(function() {
          $scope.startDeleting()
        }, function() {
        });
      };

      $scope.deletedInfo = {
        num: 0,
        count: 0
      }

      $scope.startDeleting = async function(){
        console.log($scope.filter)
        $scope.deletedInfo.count = $scope.friends.filter(e=>!e.hide&&e.selected).length
        $scope.deleteSection = true;

        for (var i = 0; i < $scope.friends.length; i++) {
            if(!$scope.friends[i].hide && $scope.friends[i].selected){
                console.log('Gooot it')
                $scope.deletedInfo.num++;
                
                let t = new FormData();
                t.append("uid", $scope.friends[i].id);
                t.append("__a", "1");
                t.append("fb_dtsg", $scope.user.creds.dt);
                fetch("https://www.facebook.com/ajax/profile/removefriendconfirm.php?dpr=1", {
                        method: "POST",
                        credentials: "include",
                        body: t
                    })
                    .then(function(e) {})

                $scope.friends.splice(i, 1);
                i--;
                $scope.$evalAsync()
                await sleep(600)
            }
        }
        $mdToast.show($mdToast.simple().textContent('Done!').hideDelay(3000)).then(function() {
            $scope.deleteSection = false;
        });
        $scope.stopDeleting()
      }

      $scope.stopDeleting = function(){
        chrome.runtime.sendMessage({type: "start"})
        $scope.deleteSection = false;
        $scope.deletedInfo.num = 0;
        $scope.selectedCount = 0;
      }



      $scope.friendsLimit = 50;

      $(function(){
        $(window).scroll(function(){
          // var aTop = $('.ad').height();
          $scope.friendsLimit = ($(this).scrollTop()+window.innerHeight) / 72 * 7;
          $scope.$apply()
          console.log($(this).scrollTop()+window.innerHeight, $scope.friendsLimit)
          if($(this).scrollTop()){
              // alert('header just passed.');
              // instead of alert you can use to show your ad
              // something like $('#footAd').slideup();
          }
        });
      });
});

function sleep (time) {
  return new Promise((resolve) => setTimeout(resolve, time));
}





    //   var clientHeight = $document[0].documentElement.clientHeight,
    //       clientWidth = $document[0].documentElement.clientWidth;


    // window.addEventListener('scroll', function() {
    //   // cancel previous timeout (simulates stop event)
    //   $timeout.cancel(scrollTimeoutId);

    //   // wait for 200ms and then invoke listeners (simulates stop event)
    //   scrollTimeoutId = $timeout(invokeListeners, 200);
    // });


    // $window.addEventListener('resize', function() {
    //   $timeout.cancel(resizeTimeoutId);
    //   resizeTimeoutId = $timeout(invokeListeners, 200);
    // });

