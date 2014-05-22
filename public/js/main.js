(function() {
    //Facebook auth
    
    function loginCallback(response){
        if (response.status === 'connected') {
            // Logged into your app and Facebook.
            FB.api('/me', function(response){
                window.me = response; 
                $("#header_username").text(me.name);
                FB.api('/me/picture', function(response){
                    $("#header_photo").attr('src', response.data.url);
                });
            });
            $(".dialogIsOpen").toggleClass("dialogIsOpen");
        } else if (response.status === 'not_authorized') {
            // The person is logged into Facebook, but not your app.
        } else {
            // The person is not logged into Facebook, so we're not sure if
            // they are logged into this app or not.
        }
    }
    window.fbAsyncInit = function() {
        FB.init({
            appId      : '529110353867623',
        cookie     : true,  // enable cookies to allow the server to access 
        // the session
        xfbml      : true,  // parse social plugins on this page
        version    : 'v2.0' // use version 2.0
        });
        FB.getLoginStatus(function(response) {
            loginCallback(response);
        });
    };


    (function(d, s, id) {
        var js, fjs = d.getElementsByTagName(s)[0];
        if (d.getElementById(id)) return;
        js = d.createElement(s); js.id = id;
        js.src = "//connect.facebook.net/en_US/sdk.js";
        fjs.parentNode.insertBefore(js, fjs);
    }(document, 'script', 'facebook-jssdk'));

    function testAPI() {
        console.log('Welcome!  Fetching your information.... ');
        FB.api('/me', function(response) {
            console.log('Successful login for: ' + response.name);
            document.getElementById('status').innerHTML =
            'Thanks for logging in, ' + response.name + '!';
        });
    }

    $("#modal").click(function(){
        FB.login(function(response){
            loginCallback(response);
        }, {scope: 'public_profile,email,user_friends'});
    });

    var cur_video_blob = null;
    var userid = null;
    var fb_instance_stream = null;

    $(document).ready(function(){
        setup_firebase();
        setup_playback();
        setup_pdf();
        setup_webcam();
    });

    function setup_firebase(){
        /* Include your Firebase link here!*/
        fb_instance = new Firebase("https://killinit.firebaseio.com/");
        fb_session_id = "default";
        fb_session = fb_instance.child('default');
    }

    function setup_playback() {
        $("#video").get(0).onended = function(e) {
            $("#video_overlay").removeClass("show");
        };
        $("#record_bar").mousemove(function(e){
            $("img").css('top', e.pageY - 30);
        });
    }

    play_video = function(video_id){
        var source = document.createElement("source");
        var vid = video_msgs[video_id];
        source.src =  URL.createObjectURL(base64_to_blob(vid.videoBlob));
        source.type =  "video/webm";
        $("#video").empty();
        $("#video").append(source);
        var offset = 250+window.scrollY;
        $("#video_overlay").css({"top": offset});
        $("#video_overlay").addClass("show");
        $("#video").get(0).play(); 

        var source = document.createElement("source");
        source.src =  URL.createObjectURL(base64_to_blob(vid.audioBlob));
        source.type =  "audio/ogg";
        $("#audio").empty();
        $("#audio").append(source);
        $("#audio").get(0).play(); 
    }                

    function setup_webcam() {
        record_audio_and_video = function(){
            recordRTC_Video.startRecording();
            recordRTC_Audio.startRecording();
        }

        //This is why I hate JavaScript. Need to learn to use promises.
        function stop_recording_and_upload(yPos){
            var stuff_to_upload = {}
            stuff_to_upload.y = yPos;
            stuff_to_upload.userid = me.id;
            recordRTC_Audio.stopRecording(function(audioURL) {
                blob_to_base64(recordRTC_Audio.getBlob(), function(base64blob){
                    stuff_to_upload.audioBlob = base64blob;
                    recordRTC_Video.stopRecording(function(videoURL) {
                        blob_to_base64(recordRTC_Video.getBlob(), function(base64blob){
                            stuff_to_upload.videoBlob = base64blob;
                            fb_session.child('' + window.pageNum).child("video").push(stuff_to_upload);
                        });
                    });        
                });
            });
        }

        stop_recording_and_upload_response = function(key, yPos){
            var stuff_to_upload = {}
            stuff_to_upload.y = yPos;
            stuff_to_upload.userid = me.id;
            recordRTC_Audio.stopRecording(function(audioURL) {
                blob_to_base64(recordRTC_Audio.getBlob(), function(base64blob){
                    stuff_to_upload.audioBlob = base64blob;
                    recordRTC_Video.stopRecording(function(videoURL) {
                        blob_to_base64(recordRTC_Video.getBlob(), function(base64blob){
                            stuff_to_upload.videoBlob = base64blob;
                            fb_session.child('' + window.pageNum).child("video").child(key).child("responses").push(stuff_to_upload);
                        });
                    });        
                });
            });
            reload_videos_on_page(pageNum);
        }

        // setup audio recording
        navigator.getUserMedia({audio: true}, function(mediaStream) {
            window.recordRTC_Audio = RecordRTC(mediaStream);
        },function(failure){
            console.log(failure);
        });

        // setup video recording 
        navigator.getUserMedia({video: true}, function(mediaStream) {
            window.recordRTC_Video = RecordRTC(mediaStream,{type:"video"});
            var video_width = 250; 
            var video_height = video_width * 0.7; 
            var webcam_stream = document.getElementById('webcam_stream'); 
            var video = document.createElement('video');
            webcam_stream.innerHTML = "";
            // adds these properties to the video
            video = mergeProps(video, {
                controls: false,
                  width: video_width,
                  height: video_height,
                  src: URL.createObjectURL(mediaStream)

            });
            webcam_stream.appendChild(video);
            video.setAttribute('autoplay', true);


        },function(failure){
            console.log(failure);
        });

        $("#record_bar").mousedown(function(e) {
            $("#webcam_stream").css("visibility","visible");
            $("#webcam_stream").css({"top": window.scrollY});
            record_audio_and_video();
        });   

        $("#record_bar").mouseup(function(e) {
            $("#webcam_stream").css("visibility","hidden");
            stop_recording_and_upload(e.pageY);
        });

        $("#pdfdiv").dblclick(function(e){
        //$("#record_bar").css({"cursor": "auto"});
            var text_upload = {};
            text_upload.y = e.pageY; 
            text_upload.text = prompt("Please enter text annotation"); 
            fb_session.child('' + window.pageNum).child("text").push(text_upload);
        });

        $("#pdfdiv").click(function(e) {
            console.log("Video stopped");
            $("#video").get(0).pause(); 
            $("#audio").get(0).pause(); 
            $("#video_overlay").removeClass("show");
        });

        $("#video_overlay").click(function(e) {
            console.log("Video paused");
            $("#video").get(0).pause(); 
            $("#audio").get(0).pause(); 
            $("#video_overlay").click(function(e) {
                console.log("Video restarted");
                $("#video").get(0).play(); 
                $("#audio").get(0).play(); 
            });
        });
    }

    
    function reload_videos_on_page(pNum){
        $("#playback_bar").empty();
        fb_session.child(''+pageNum).child("text").on('value', function(snapshot){
            text_msgs = snapshot.val();
            for(key in text_msgs){
                (function(key) {
                    var text_obj = text_msgs[key];
                    var elem = $('<div></div>').attr('id', key).addClass('textHead').css({"top": text_obj.y, "position": "absolute"});
                    var text_dom_elem = document.createTextNode(text_obj.text);
                    elem.append(text_dom_elem);
               
                    $("#playback_bar").append(elem);

                })(key);
            }
        });
        fb_session.child(''+pageNum).child("video").on('value', function(snapshot){
        $("#playback_bar").empty();
            video_msgs = {};

            var video_dump = snapshot.val();
            for(key in video_dump){
                video_msgs[key] = video_dump[key];
                for(res in video_dump[key].responses){
                    video_msgs[res] = video_dump[key].responses[res];
                }
            }
            
            function appendToRootUlDiv(key, root_key){
                var vid = video_msgs[key];
                console.log(vid);
                if(!vid.userid){
                    vid.userid = "10202137132692979";
                }
                FB.api('/'+ vid.userid + '/picture', function(response){
                    if(!response.error){
                        $("#root_"+ root_key).append($('<li><div><img class="msg-icon" src="' + response.data.url + '"></img></div></li>')
                            .attr('id', key)
                            .addClass('videoHead')
                            .click(function(){
                                play_video(key);
                            }));
                    } else {
                        $("#root_"+ root_key).append($('<li><div><img class="msg-icon" src="/img/letter-closed.png"></img></div></li>')
                            .attr('id', key)
                            .addClass('videoHead')
                            .css({"top": vid.y, "position": "absolute" })
                            .click(function(){
                                play_video(key);
                            }));
                    }
                });
            }
            for(key in video_dump){
                //Closures FTW!
                (function(key){
                    var elem = $('<div/>').append(
                        $('<ul id = root_' + key + '> </ul>'))
                            .css({"top": video_dump[key].y, "position": "absolute" });
                    $("#playback_bar").append(elem);
                    appendToRootUlDiv(key, key)
                    var resp = video_dump[key].responses; 
                    console.log(resp);
                    for(key2 in resp){
                        console.log(key2);
                        appendToRootUlDiv(key2,key);
                    }
                    var rec_button = $('<img src="/img/record.png"></img>'); 
                    rec_button.mousedown(function(e) {
                        console.log("Started recording response");
                        $("#webcam_stream").css("visibility","visible");
                        $("#webcam_stream").css({"top": window.scrollY});
                        record_audio_and_video();
                    });   

                    rec_button.mouseup(function(e) {
                        console.log("Finished recording response");
                        $("#webcam_stream").css("visibility","hidden");
                        $("#playback_bar").empty();
                        stop_recording_and_upload_response(key, e.pageY);
                    });
                    $("#root_" + key).append(rec_button);

                })(key);
            }
        });
    }

    function setup_pdf(){
        var url = "http://s3-us-west-2.amazonaws.com/readwithme/" + global.book_id + ".pdf";
        PDFJS.disableWorker = true;
        window.pageNum = 1;
        var pdfDoc = null,
            scale = 1.3,
            canvas = document.getElementById('pdfarea'),
            ctx = canvas.getContext('2d');
        function renderPage(num){
            pdfDoc.getPage(num).then(function(page){
                var viewport = page.getViewport(scale);
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                var renderContext = {
                    canvasContext : ctx,
                viewport : viewport
                };
                page.render(renderContext);
            });
            document.getElementById('page_num').textContent = pageNum;
            document.getElementById('page_count').textContent = pdfDoc.numPages;
            document.getElementById('prev').addEventListener('click', goPrevious);
            document.getElementById('next').addEventListener('click', goNext);
        }

        function goPrevious() {
            if(pageNum <= 1)
                return;
            pageNum--;
            renderPage(pageNum);
            reload_videos_on_page(pageNum);
            window.scrollTo(0,0);

        }

        function goNext() {
            if(pageNum >= pdfDoc.numPages)
                return;
            pageNum++;            
            renderPage(pageNum);            
            reload_videos_on_page(pageNum);
            window.scrollTo(0,0)
        }
        PDFJS.getDocument(url).then(function getPdfHelloWorld(_pdfDoc){
            pdfDoc = _pdfDoc
            renderPage(pageNum);
        });
        reload_videos_on_page(pageNum);
    }
    var blob_to_base64 = function(blob, callback) {
        var reader = new FileReader();
        reader.onload = function() {
            var dataUrl = reader.result;
            var base64 = dataUrl.split(',')[1];
            callback(base64);
        };
        reader.readAsDataURL(blob);
    };

    var base64_to_blob = function(base64) {
        var binary = atob(base64);
        var len = binary.length;
        var buffer = new ArrayBuffer(len);
        var view = new Uint8Array(buffer);
        for (var i = 0; i < len; i++) {
            view[i] = binary.charCodeAt(i);
        }
        var blob = new Blob([view]);
        return blob;
    };
})();
