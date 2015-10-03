History = new Mongo.Collection("history");

if (Meteor.isClient) {
    Meteor.startup(function() {
        reCAPTCHA.config({
            publickey: '6LcVxg0TAAAAAE18vBiH00UAyaJggsmLm890SjZl'
        });
    });

    var hpSound = undefined;
    var songsArr = [];
    var _sound = undefined;
    Template.register.events({
        "submit form": function(e){
            e.preventDefault();
            var username = e.target.registerUsername.value;
            var email = e.target.registerEmail.value;
            var password = e.target.registerPassword.value;
            var captchaData = grecaptcha.getResponse();
            Meteor.call("createUserMethod", {username: username, email: email, password: password}, captchaData, function(err, res) {
                grecaptcha.reset();

                if (err) {
                    console.log(err);
                } else {
                    Meteor.loginWithPassword(username, password);
                }
            });
        },

        "click #facebook-login": function(){
            Meteor.loginWithFacebook()
        },

        "click #github-login": function(){
            Meteor.loginWithGithub()
        },

        "click #login": function(){
            $("#register-view").hide();
            $("#login-view").show();
        }
    });

    Template.login.events({
        "submit form": function(e){
            e.preventDefault();
            var username = e.target.loginUsername.value;
            var password = e.target.loginPassword.value;
            Meteor.loginWithPassword(username, password);
            Accounts.onLoginFailure(function(){
                $("input").css("background-color","indianred").addClass("animated shake");
                    $("input").on("click",function(){
                        $("input").css({
                            "background-color": "transparent",
                            "width": "250px"
                     });
                })
            });
        },

        "click #facebook-login": function(){
            Meteor.loginWithFacebook()
        },

        "click #github-login": function(){
            Meteor.loginWithGithub()
        },

        "click #register": function(){
            $("#login-view").hide();
            $("#register-view").show();
        }
    });

    Template.dashboard.events({
        "click .logout": function(e){
            e.preventDefault();
            Meteor.logout();
            if (hpSound !== undefined) {
                hpSound.stop();
            }
        },

        "click .button-tunein": function(){
            SC.stream("/tracks/172055891/", function(sound){
                sound._player._volume = 0.3;
                sound.play();
            });
        },

        "click #play": function(){
            $("#play").hide();
            SC.stream("/tracks/172055891/", function(sound){
                hpSound = sound;
                sound._player._volume = 0.3;
                sound.play();
                $("#stop").on("click", function(){
                    $("#stop").hide();
                    $("#play").show();
                    sound._player.pause();
                })
            });
            $("#stop").show();
        }
    });

    Template.room.events({
      "click #search-song": function(){
        SC.get('/tracks', { q: $("#song-input").val()}, function(tracks) {
          console.log(tracks);
          songsArr = [];
          $("#song-results").empty()
          for(var i in tracks){
            $("#song-results").append("<p>" + tracks[i].title + "</p>")
            songsArr.push({title: tracks[i].title, id: tracks[i].id, duration: tracks[i].duration / 1000});
          }
          $("#song-results p").click(function(){
            var title = $(this).text();
            for(var i in songsArr){
              if(songsArr[i].title === title){
                var id = songsArr[i].id;
                var duration = songsArr[i].duration;
                var songObj = {
                  title: songsArr[i].title,
                  id: id,
                  duration: duration,
                  type: "soundcloud"
                }
              }
            }
            console.log(id);
            Meteor.call("addToPlaylist", songObj, function(err,res){
              console.log(res);
            });
            // if (_sound !== undefined)_sound.stop();
            // SC.stream("/tracks/" + id, function(sound){
            //   _sound = sound;
            //   sound._player._volume = 0.3;
            //   sound.play()
            // });
          })
        });
      }
    });

    Template.room.helpers({
        type: function() {
          var parts = location.href.split('/');
          var id = parts.pop();
          return id.toUpperCase();
        },
        title: function(){
          return Session.get("title");
        },
        artist: function(){
          return Session.get("artist");
        }
    });

    Template.room.onCreated(function () {
        var tag = document.createElement("script");
        tag.src = "https://www.youtube.com/iframe_api";
        var firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
        
        var currentSong = undefined;
        var _sound = undefined;
        var yt_player = undefined;
        var size = 0;

        function getTimeElapsed() {
            if (currentSong !== undefined) {
                return Date.now() - currentSong.started;
            }
            return 0;
        }

        function getSongInfo(query){
          query = query.toLowerCase().split(" ").join("%20");
          $.ajax({
            type: "GET",
            url: 'https://api.spotify.com/v1/search?q=' + query + '&type=track',
            applicationType: "application/json",
            contentType: "json",
            success: function(data){
              console.log(data);
              for(var i in data){
                // for(var j in data[i].items){
                  // data[i].items[j] - each indivudual object in response
                  // console.log(data[i].items[j].name)
                  // for(var k in data[i].items[j].artists){
                  //   if(data[i].items[j].artists[k].name);
                  // }
                  Session.set("title", data[i].items[0].name);
                  for(var j in data[i].items[0].artists){
                     Session.set("artist", data[i].items[0].artists[j].name);
                  }
                  $("#albumart").remove();
                  $(".room-title").before("<img id='albumart' src='" + data[i].items[0].album.images[1].url + "' />")
                  //Session.set("artist", currentSong.song.artist);
                  //Session.set("duration", currentSong.song.duration)
                //}
              }
            }
          })
        }
        
        function resizeSeekerbar() {
            $("#seeker-bar").width(((getTimeElapsed() / 1000) / Session.get("duration") * 100) + "%");
        }

        function startSong() {
            if (currentSong !== undefined) {
                if (_sound !== undefined) _sound.stop();
                if (yt_player !== undefined && yt_player.stopVideo !== undefined) yt_player.stopVideo();
                
                if (currentSong.song.type === "soundcloud") {
                  $("#player").attr("src", "")
                  getSongInfo(currentSong.song.title);
                  SC.stream("/tracks/" + currentSong.song.id + "/", function(sound){
                    _sound = sound;
                    sound._player._volume = 0.3;
                    console.log(sound);
                    sound.play();
                    Session.set("title", currentSong.song.title || "Title");
                    Session.set("artist", currentSong.song.artist || "Artist");
                    Session.set("duration", currentSong.song.duration);
                    resizeSeekerbar();
                    setTimeout(function() { // HACK, otherwise seek doesn't work.
                        sound._player.seek(getTimeElapsed());
                    }, 500);
                  });
                } else {
                    if (yt_player === undefined) {
                        yt_player = new YT.Player("player", {
                            height: 540,
                            width: 960,
                            videoId: currentSong.song.id,
                            events: {
                                'onReady': function(event) {
                                    event.target.seekTo(getTimeElapsed() / 1000);
                                    event.target.playVideo();
                                    resizeSeekerbar();
                                },
                                'onStateChange': function(event){
                                    if (event.data == YT.PlayerState.PAUSED) {
                                        event.target.seekTo(getTimeElapsed() / 1000);
                                        event.target.playVideo();
                                    }
                                }
                            }
                        });
                    } else {
                        yt_player.loadVideoById(currentSong.song.id);
                    }

                    Session.set("title", currentSong.song.title || "Title");
                    Session.set("artist", currentSong.song.artist || "Artist");
                    getSongInfo(currentSong.song.title);
                    Session.set("duration", currentSong.song.duration);
                }
            }
        }

        Meteor.subscribe("history");
        Meteor.setInterval(function() {
            var data = undefined;
            var dataCursor = History.find({type: "edm"});
            dataCursor.map(function(doc) {
                if (data === undefined) {
                    data = doc;
                }
            });
            if (data.history.length > size) {
                currentSong = data.history[data.history.length-1];
                size = data.history.length;
                startSong();
            }
        }, 1000);
        
        Meteor.setInterval(function() {
            resizeSeekerbar();
        }, 50);
    });
}

if (Meteor.isServer) {
    Meteor.startup(function() {
        reCAPTCHA.config({
            privatekey: '6LcVxg0TAAAAAI2fgIEEWHFxwNXeVIs8mzq5cfRM'
        });
    });

    Meteor.users.deny({update: function () { return true; }});
    Meteor.users.deny({insert: function () { return true; }});
    Meteor.users.deny({remove: function () { return true; }});

    var startedAt = Date.now();
    var songs = [
      {id: "YqeW9_5kURI", title: "Lean On", artist: "Major Lazer", duration: 178, type: "youtube"}
    ];
    var currentSong = 0;
    addToHistory(songs[currentSong], startedAt);

    function addToHistory(song, startedAt) {
        History.update({type: "edm"}, {$push: {history: {song: song, started: startedAt}}});
    }

    function skipSong() {
        if (currentSong < (songs.length - 1)) {
            currentSong++;
        } else currentSong = 0;
        songTimer();
        addToHistory(songs[currentSong], startedAt);
    }

    function songTimer() {
        startedAt = Date.now();
        Meteor.setTimeout(function() {
            skipSong();
        }, songs[currentSong].duration * 1000);
    }

    ServiceConfiguration.configurations.remove({
        service: "facebook"
    });

    ServiceConfiguration.configurations.insert({
        service: "facebook",
        appId: "1496014310695890",
        secret: "9a039f254a08a1488c08bb0737dbd2a6"
    });

    ServiceConfiguration.configurations.remove({
        service: "github"
    });

    ServiceConfiguration.configurations.insert({
        service: "github",
        clientId: "dcecd720f47c0e4001f7",
        secret: "375939d001ef1a0ca67c11dbf8fb9aeaa551e01b"
    });

    songTimer();

    Meteor.publish("history", function() {
        return History.find({type: "edm"})
    });

    Meteor.methods({
        createUserMethod: function(formData, captchaData) {
            var verifyCaptchaResponse = reCAPTCHA.verifyCaptcha(this.connection.clientAddress, captchaData);
            if (!verifyCaptchaResponse.success) {
                console.log('reCAPTCHA check failed!', verifyCaptchaResponse);
                throw new Meteor.Error(422, 'reCAPTCHA Failed: ' + verifyCaptchaResponse.error);
            } else {
                console.log('reCAPTCHA verification passed!');
                Accounts.createUser({
                    username: formData.username,
                    email: formData.email,
                    password: formData.password
                });
            }
            return true;
        },
        addToPlaylist: function(songObj){
          songs.push(songObj);
          return songs;
        }
    });
}

Router.route("/", {
    template: "home"
});

Router.route("/:type", {
    template: "room"
});
