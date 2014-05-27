$(function() {
    //Facebook auth
    window.rwm = {
        pageNum: 1,
        me: null,
        bookID: null,
        fb_main: null,
        fb_data: null,
        pageThreads: null,
        pdfDoc: null,
        videoMsgs: {},
        recordRTC_Video: null,
        recordRTC_Audio: null,
        play_video: function(video_id) {
            var source = document.createElement("source");
            var vid = rwm.videoMsgs[video_id];
            source.src = URL.createObjectURL(base64_to_blob(vid.videoBlob));
            source.type = "video/webm";
            $("#video").empty();
            $("#video").append(source);
            $("#video").get(0).play();

            var source = document.createElement("source");
            source.src = URL.createObjectURL(base64_to_blob(vid.audioBlob));
            source.type = "audio/ogg";
            $("#audio").empty();
            $("#audio").append(source);
            $("#audio").get(0).play();
        },
        getVideo: function(linkID){
            fb_data.child(linkID).once("value", function(snapshot){
                this.videoMsgs[linkID] = snapshot.val();
            });
        },
        renderMsg: function(threadID, msgID){
            var msg = this.pageThreads[threadID].messages[msgID];
            FB.api('/'+msg.userID+'/picture', function(response){
                    if (!response.error) {
                        var elem = $('<li><div><img class="msg-icon" src="' + response.data.url + '"></img></div></li>')
                            .attr('id', msgID)
                            .addClass('videoHead');
                        //Assign appropriate click handlers/UI
                        if(msg.type === "video"){
                            rwm.fb_data.child(msg.linkID).once("value", function(snapshot){
                                rwm.videoMsgs[msg.linkID] = snapshot.val();
                            });
                            Tipped.create(elem.get(), {inline: 'video_overlay'});
                            elem.click(function(){
                                rwm.play_video(msg.linkID);
                            })
                        } else if(msg.type === "text"){
                            Tipped.create(elem.get(), msg.text);
                        }
                        
                        $("#"+threadID).append(elem);
                    } else {
                        console.log("Could not get FB pic");
                    }
            });

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
            this.fb_main.child(this.bookID).child(this.pageNum).once('value', function(snapshot){
                rwm.pageThreads = snapshot.val();         
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
            return this.fb_main.child(this.bookID).child(rwm.pageNum).push(stuff_to_upload).name();
        },
        append_msg_to_thread: function(threadID, data){
            this.fb_main.child(this.bookID).child(rwm.pageNum).child(threadID).child("messages").push(data);
        },
        get_text_message_and_upload: function(threadID){
            var res = prompt("Please enter comment:");
            var stuff_to_upload_fbmain = {
                type: 'text',
                text: res,
                userID: rwm.me.id
            }
            this.append_msg_to_thread(threadID, stuff_to_upload_fbmain);
        },
        stop_recording_and_upload_response:function(threadID) {
            var stuff_to_upload_fbdata = {};
            var stuff_to_upload_fbmain = {
                type: 'video',
                userID: rwm.me.id,
            };
            rwm.recordRTC_Audio.stopRecording(function(audioURL) {
                blob_to_base64(rwm.recordRTC_Audio.getBlob(), function(base64blob) {
                    stuff_to_upload_fbdata.audioBlob = base64blob;
                    rwm.recordRTC_Video.stopRecording(function(videoURL) {
                        blob_to_base64(rwm.recordRTC_Video.getBlob(), function(base64blob) {
                            stuff_to_upload_fbdata.videoBlob = base64blob;
                            var res = rwm.fb_data.push(stuff_to_upload_fbdata);
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
            $("#pdfarea").dblclick(function(e) {
                //$("#record_bar").css({"cursor": "auto"});
                var text_upload = {};
                text_upload.y = e.pageY;
                text_upload.text = prompt("Please enter text annotation");
                fb_session.child('' + rwm.pageNum).child("text").push(text_upload);
            });
            
            $("#recordVideo").mousedown(function(e){
                rwm.record_audio_and_video();
            });

            $("#recordVideo").mouseup(function(e){
                var threadID = rwm.createThread(e.pageX, e.pageY, 0,0);
                rwm.stop_recording_and_upload_response(threadID);
            });

            $("#recordText").click(function(e){
                var threadID = rwm.createThread(e.pageX, e.pageY, 0,0);
                rwm.get_text_message_and_upload(threadID);

            });
            $("#recordVideo").mouseenter(function(e){
                $("#webcam_stream").show(); 
            });
            $("#recordVideo").mouseleave(function(e){
                $("#webcam_stream").hide(); 
            });
            Tipped.create('#pdfarea', {inline: "toolbar", showOn: 'click', behavior: 'sticky', hideOn: {element: 'click', tooltip: 'click'}});
            Tipped.create("#recordVideo", "Click and hold to record video");

            document.getElementById('prevPage').addEventListener('click', rwm.goPrevious);
            document.getElementById('nextPage').addEventListener('click', rwm.goNext);
        },

        initPdf: function(){
            var url = "http://s3-us-west-2.amazonaws.com/readwithme/" + global.book_id + ".pdf";
            PDFJS.disableWorker = true;
            PDFJS.getDocument(url).then(function getPdfHelloWorld(_pdfDoc) {
                rwm.pdfDoc = _pdfDoc;
                rwm.renderPage(rwm.pageNum);
            });
        },


        goPrevious: function() {
            if (rwm.pageNum <= 1)
                return;
            rwm.pageNum--;
            rwm.renderPage(rwm.pageNum);
            rwm.reloadAnnotations();
            window.scrollTo(0, 0);
        },

        goNext: function() {
            if (rwm.pageNum >= rwm.pdfDoc.numPages)
                return;
            rwm.pageNum++;
            rwm.renderPage(rwm.pageNum);
            rwm.reloadAnnotations();
            window.scrollTo(0, 0)
        },

        renderPage: function(num) {
            var scale = 1.3,
                canvas = document.getElementById('pdfarea'),
                ctx = canvas.getContext('2d');
            this.pdfDoc.getPage(num).then(function(page) {
                var viewport = page.getViewport(scale);
                canvas.height = viewport.height;
                canvas.width = viewport.width;
                // :( :( :(
                $("#content_area").height(viewport.height);

                var renderContext = {
                    canvasContext: ctx,
                    viewport: viewport
                };
                page.render(renderContext);
            });
            document.getElementById('page_num').textContent = rwm.pageNum;
            document.getElementById('page_count').textContent = rwm.pdfDoc.numPages;
            console.log(canvas.height);
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
                    rwm.me = response;
                    $("#header_username").text(rwm.me.name);
                    FB.api('/me/picture', function(response) {
                        $("#header_photo").attr('src', response.data.url);
                    });
                });
                $(".dialogIsOpen").toggleClass("dialogIsOpen");
            // } else if (response.status === 'not_authorized') {
            //     // The person is logged into Facebook, but not your app.
            } else {
                $("body").toggleClass("dialogIsOpen");
                $("#modal").toggleClass("dialogIsOpen");

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
                // webcam_stream.innerHTML = "";
                // adds these properties to the video
                video = mergeProps(video, {
                    controls:false,
                      autoplay: true,
                      loop: true,
                      width: video_width,
                      height: video_height,
                      src: URL.createObjectURL(mediaStream)
                });
                webcam_stream.appendChild(video);


            }, function(failure) {
                console.log(failure);
            });
        },
        init: function() {
            this.initFacebook();
            this.initFirebase();
            this.bookID = global.book_id;
            this.initWebcam();
            this.initPdf();
            this.reloadAnnotations();
            this.bindUIActions();
        }
    }

    rwm.init();

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
