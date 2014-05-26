$(function() {
    //Facebook auth
    window.rwm = {
        pageNum: null,
        userID: null,
        bookID: null,
        fb_main: null,
        fb_data: null,
        pageThreads: null,
        recordRTC_Video: null,
        recordRTC_Audio: null,
        renderMsg: function(threadID, msgID){
            console.log(threadID);
            var msg = this.pageThreads[threadID].messages[msgID];
            FB.api('/'+msg.userID+'/picture', function(response){
                    if (!response.error) {
                        var elem = $('<li><div><img class="msg-icon" src="' + response.data.url + '"></img></div></li>')
                            .attr('id', msgID)
                            .addClass('videoHead');
                        //Assign appropriate click handlers/UI
                        if(msg.type === "video"){
                            Tipped.create(elem.get(), {inline: 'video_overlay'});
                        } else if(msg.type === "text"){
                            Tipped.create(elem.get(), msg.text);
                        }
                        
                        $("#"+threadID).append(elem);
                    } else {
                        console.log("Could not get FB pic");
                    }
            });

            console.log(msg);
        },
        renderAnnotations: function(){
            for(x in this.pageThreads){
                var elem = $('<div/>').addClass('thread').append(
                    $('<ul id = ' + x + '> </ul>'))
                    .css({
                        "top": this.pageThreads[x].position.y1,
                    "position": "absolute"
                    });
                $("#playback_bar").append(elem);
            }
            for(x in this.pageThreads){
                var msgs = this.pageThreads[x].messages;
                for(y in msgs){
                    this.renderMsg(x, y);
                }
            }
        },
        reloadAnnotations: function(){
            this.fb_main.child(this.bookID).child(pageNum).once('value', function(snapshot){
                rwm.pageThreads = snapshot.val();         
                console.log(rwm.pageThreads);
                $("#playback_bar").empty();
                rwm.renderAnnotations();
            }); 
        },
        record_audio_and_video: function() {
            this.recordRTC_Video.startRecording();
            this.recordRTC_Audio.startRecording();
        },
        createThread: function(x1,y1,x2,y2){
            stuff_to_upload = {
                position:{
                    'x1':x1,
                    'y1':y1,
                    'x2':x2,
                    'y2':y2
                },
                messages:{}
            }
            return this.fb_main.child(this.bookID).child(pageNum).push(stuff_to_upload).name();
        },
        append_msg_to_thread: function(threadID, data){
            this.fb_main.child(this.bookID).child(pageNum).child(threadID).child("messages").push(data);
        },
        get_text_message_and_upload: function(threadID){
            var res = prompt("Please enter comment:");
            var stuff_to_upload_fbmain = {
                type: 'text',
                text: res,
                userID: me.id
            }
            this.append_msg_to_thread(threadID, stuff_to_upload_fbmain);
        },
        stop_recording_and_upload_response:function(threadID) {
            var stuff_to_upload_fbdata = {};
            var stuff_to_upload_fbmain = {
                type: 'video',
                userID: me.id,
            };
            rwm.recordRTC_Audio.stopRecording(function(audioURL) {
                blob_to_base64(rwm.recordRTC_Audio.getBlob(), function(base64blob) {
                    stuff_to_upload_fbdata.audioBlob = base64blob;
                    rwm.recordRTC_Video.stopRecording(function(videoURL) {
                        blob_to_base64(rwm.recordRTC_Video.getBlob(), function(base64blob) {
                            stuff_to_upload_fbdata.videoBlob = base64blob;
                            var res = rwm.fb_data.push(stuff_to_upload_fbdata);
                            console.log(res.name());
                            stuff_to_upload_fbmain.linkID = res.name();
                            rwm.append_msg_to_thread(threadID, stuff_to_upload_fbmain);
                        });
                    });
                });
            });
        },
        bindUIActions: function() {

            $("#modal").click(function() {
                FB.login(rwm.ensureLoggedIn, {
                    scope: 'public_profile,email,user_friends'
                });
            });
            $("#video").get(0).onended = function(e) {
                $("#video_overlay").removeClass("show");
            };
            $("#pdfdiv").dblclick(function(e) {
                //$("#record_bar").css({"cursor": "auto"});
                var text_upload = {};
                text_upload.y = e.pageY;
                text_upload.text = prompt("Please enter text annotation");
                fb_session.child('' + window.pageNum).child("text").push(text_upload);
            });
            
            $("#recordVideo").mousedown(function(e){
                rwm.record_audio_and_video();
            })

            $("#recordVideo").mouseup(function(e){
                var threadID = rwm.createThread(e.pageX, e.pageY, 0,0);
                rwm.stop_recording_and_upload_response(threadID);
            })

            $("#recordText").click(function(e){
                var threadID = rwm.createThread(e.pageX, e.pageY, 0,0);
                rwm.get_text_message_and_upload(threadID);

            })
            Tipped.create('#pdfarea', {inline: "toolbar", showOn: 'click', behavior: 'sticky', hideOn: {element: 'click', tooltip: 'click'}})
        },
        initFacebook: function() {
            window.fbAsyncInit = function() {
                FB.init({
                    appId: '529110353867623',
                cookie: true, // enable cookies to allow the server to access 
                // the session
                xfbml: true, // parse social plugins on this page
                version: 'v2.0' // use version 2.0
                });
                FB.getLoginStatus(function(response) {
                    rwm.ensureLoggedIn(response);
                });
            };


            (function(d, s, id) {
                var js, fjs = d.getElementsByTagName(s)[0];
                if (d.getElementById(id)) return;
                js = d.createElement(s);
                js.id = id;
                js.src = "//connect.facebook.net/en_US/sdk.js";
                fjs.parentNode.insertBefore(js, fjs);
            }(document, 'script', 'facebook-jssdk'));
        },
        ensureLoggedIn: function(response){
            if (response.status === 'connected') {
                // Logged into your app and Facebook.
                FB.api('/me', function(response) {
                    window.me = response;
                    $("#header_username").text(me.name);
                    FB.api('/me/picture', function(response) {
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
        },
        initFirebase: function(){
            /* Include your Firebase link here!*/
            var fb_instance = new Firebase("https://killinit.firebaseio.com/");
            var fb_session_id = "default";
            fb_session = fb_instance.child('default');
            this.fb_main = new Firebase("https://rwm-main.firebaseio.com/");
            this.fb_data = new Firebase("https://rwm-data.firebaseio.com/");
        },
        initWebcam: function(){
            navigator.getUserMedia({
                audio: true
            }, function(mediaStream) {
                rwm.recordRTC_Audio = RecordRTC(mediaStream);
            }, function(failure) {
                console.log(failure);
            });

            // setup video recording 
            navigator.getUserMedia({
                video: true
            }, function(mediaStream) {
                rwm.recordRTC_Video = RecordRTC(mediaStream, {
                    type: "video"
                });
                var video_width = 250;
                var video_height = video_width * 0.7;
                var webcam_stream = document.getElementById('webcam_stream');
                var video = document.createElement('video');
                webcam_stream.innerHTML = "";
                // adds these properties to the video
                video = mergeProps(video, {
                    controls: true,
                      width: video_width,
                      height: video_height,
                      src: URL.createObjectURL(mediaStream)

                });
                webcam_stream.appendChild(video);
                video.setAttribute('autoplay', true);


            }, function(failure) {
                console.log(failure);
            });
        },
        init: function() {
            this.initFacebook();
            this.initFirebase();
            this.bindUIActions();
            this.bookID = global.book_id;
            this.initWebcam();
        }
    }

    rwm.init();

    $(document).ready(function() {
        setup_pdf();
        setup_webcam();
    });

    play_video = function(video_id) {
        var source = document.createElement("source");
        var vid = video_msgs[video_id];
        source.src = URL.createObjectURL(base64_to_blob(vid.videoBlob));
        source.type = "video/webm";
        $("#video").empty();
        $("#video").append(source);
        var offset = 250 + window.scrollY;
        $("#video_overlay").css({
            "top": offset
        });
        $("#video_overlay").addClass("show");
        $("#video").get(0).play();

        var source = document.createElement("source");
        source.src = URL.createObjectURL(base64_to_blob(vid.audioBlob));
        source.type = "audio/ogg";
        $("#audio").empty();
        $("#audio").append(source);
        $("#audio").get(0).play();
    }

    function setup_webcam() {

        //This is why I hate JavaScript. Need to learn to use promises.
        function stop_recording_and_upload(yPos) {
            var stuff_to_upload = {}
            stuff_to_upload.y = yPos;
            stuff_to_upload.userid = me.id;
            rwm.recordRTC_Audio.stopRecording(function(audioURL) {
                blob_to_base64(rwm.recordRTC_Audio.getBlob(), function(base64blob) {
                    stuff_to_upload.audioBlob = base64blob;
                    rwm.recordRTC_Video.stopRecording(function(videoURL) {
                        blob_to_base64(rwm.recordRTC_Video.getBlob(), function(base64blob) {
                            stuff_to_upload.videoBlob = base64blob;
                            fb_session.child('' + window.pageNum).child("video").push(stuff_to_upload);
                        });
                    });
                });
            });
        }


        // setup audio recording

    }

    function reload_videos_on_page(pNum) {
        $("#playback_bar").empty();
        fb_session.child('' + pageNum).child("text").on('value', function(snapshot) {
            text_msgs = snapshot.val();
            for (key in text_msgs) {
                (function(key) {
                    var text_obj = text_msgs[key];
                    var elem = $('<div></div>').attr('id', key).addClass('textHead').css({
                        "top": text_obj.y,
                        "position": "absolute"
                    });
                    var text_dom_elem = document.createTextNode(text_obj.text);
                    elem.append(text_dom_elem);

                    $("#playback_bar").append(elem);

                })(key);
            }
        });
        fb_session.child('' + pageNum).child("video").on('value', function(snapshot) {
            video_msgs = {};

            var video_dump = snapshot.val();
            for (key in video_dump) {
                video_msgs[key] = video_dump[key];
                for (res in video_dump[key].responses) {
                    video_msgs[res] = video_dump[key].responses[res];
                }
            }

            function appendToRootUlDiv(key, root_key) {
                var vid = video_msgs[key];
                console.log(vid);
                if (!vid.userid) {
                    vid.userid = "10202137132692979";
                }
                FB.api('/' + vid.userid + '/picture', function(response) {
                    if (!response.error) {
                        $("#root_" + root_key).append($('<li><div><img class="msg-icon" src="' + response.data.url + '"></img></div></li>')
                            .attr('id', key)
                            .addClass('videoHead')
                            .click(function() {
                                play_video(key);
                            }));
                    } else {
                        $("#root_" + root_key).append($('<li><div><img class="msg-icon" src="/img/letter-closed.png"></img></div></li>')
                            .attr('id', key)
                            .addClass('videoHead')
                            .css({
                                "top": vid.y,
                                "position": "absolute"
                            })
                            .click(function() {
                                play_video(key);
                            }));
                    }
                });
            }
            for (key in video_dump) {
                //Closures FTW!
                (function(key) {
                    var elem = $('<div/>').append(
                        $('<ul id = root_' + key + '> </ul>'))
                        .css({
                            "top": video_dump[key].y,
                            "position": "absolute"
                        });
                    $("#playback_bar").append(elem);
                    appendToRootUlDiv(key, key)
                    var resp = video_dump[key].responses;
                    console.log(resp);
                    for (key2 in resp) {
                        console.log(key2);
                        appendToRootUlDiv(key2, key);
                    }
                    var rec_button = $('<img src="/img/record.png"></img>');
                    rec_button.mousedown(function(e) {
                        console.log("Started recording response");
                        $("#webcam_stream").css("visibility", "visible");
                        $("#webcam_stream").css({
                            "top": window.scrollY
                        });
                        rwm.record_audio_and_video();
                    });

                    rec_button.mouseup(function(e) {
                        console.log("Finished recording response");
                        $("#webcam_stream").css("visibility", "hidden");
                        rwm.stop_recording_and_upload_response("-JNrca2jtRY1YsIYe_FP");
                    });
                    $("#root_" + key).append(rec_button);

                })(key);
            }
        });
    }

    function setup_pdf() {
        var url = "http://s3-us-west-2.amazonaws.com/readwithme/" + global.book_id + ".pdf";
        PDFJS.disableWorker = true;
        window.pageNum = 1;
        var pdfDoc = null,
            scale = 1.3,
            canvas = document.getElementById('pdfarea'),
            ctx = canvas.getContext('2d');

        function renderPage(num) {
            pdfDoc.getPage(num).then(function(page) {
                var viewport = page.getViewport(scale);
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                var renderContext = {
                    canvasContext: ctx,
                    viewport: viewport
                };
                page.render(renderContext);
            });
            document.getElementById('page_num').textContent = pageNum;
            document.getElementById('page_count').textContent = pdfDoc.numPages;
            document.getElementById('prev').addEventListener('click', goPrevious);
            document.getElementById('next').addEventListener('click', goNext);
        }

        function goPrevious() {
            if (pageNum <= 1)
                return;
            pageNum--;
            renderPage(pageNum);
            reload_videos_on_page(pageNum);
            window.scrollTo(0, 0);

        }

        function goNext() {
            if (pageNum >= pdfDoc.numPages)
                return;
            pageNum++;
            renderPage(pageNum);
            reload_videos_on_page(pageNum);
            window.scrollTo(0, 0)
        }
        PDFJS.getDocument(url).then(function getPdfHelloWorld(_pdfDoc) {
            pdfDoc = _pdfDoc
            renderPage(pageNum);
        });
        // reload_videos_on_page(pageNum);
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
});
