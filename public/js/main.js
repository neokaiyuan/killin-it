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
        isVideoStandby: false,
        isRecording: false,
        getVideo: function(linkID){
            fb_data.child(linkID).once("value", function(snapshot){
                this.videoMsgs[linkID] = snapshot.val();
            });
        },
        renderMsg: function(threadID, msgID){
            var msg = this.pageThreads[threadID].messages[msgID];
            FB.api('/'+msg.userID+'/picture', function(response) {
                if (!response.error) {
                    var elem = $('<li><div class="msg-icon-div"><img class="msg-icon" src="' + response.data.url + '"></img></div></li>')
                        .attr('id', "response"+msgID)
                        .addClass('videoHead');

                    //Assign appropriate click handlers/UI
                    if (msg.type === "video") {
                        rwm.fb_data.child(msg.linkID).once("value", function(snapshot){
                            rwm.videoMsgs[msg.linkID] = snapshot.val();
                        });
                        Tipped.create(elem.find(".msg-icon"), function(){
                            var clone = $('<div id="video_overlay">\
                                <video id="video" width="320" height="230" controls>\
                                <source id="videosource" type="video/webm"></video>\
                                <audio id="audio"><source id="audiosource" type="audio/ogg"></audio></div>'); 
                            var vid_elem = clone.children().eq(0);
                            var aud_elem = clone.children().eq(1);
                            var vid_src = vid_elem.children().get(0);
                            var aud_src = aud_elem.children().get(0);
                            
                            vid_elem.bind("play", function(){
                                aud_elem.get(0).play();
                            });

                            vid_elem.bind("pause", function(){
                                aud_elem.get(0).pause();
                            });

                            var vid = rwm.videoMsgs[msg.linkID];
                            vid_src.src = URL.createObjectURL(base64_to_blob(vid.videoBlob));

                            aud_src.src = URL.createObjectURL(base64_to_blob(vid.audioBlob));
                            
                            elem.click(function(){
                                vid_elem.get(0).play();
                                aud_elem.get(0).play();
                            });

                            return clone;
                        });
                        elem.find(".msg-icon-div").append($("<img id='play_overlay' src='/img/video_black.png'></img>"));
                    } else if (msg.type === "text") {
                        // Tipped.create(elem.find(".msg-icon"), msg.text);
                        elem.find(".msg-icon-div").append($("<p class='msg-text'>"+msg.text+"</p>"));
                    }

                    // delete button for messages
                    if (msg.userID == rwm.me.id) {
                        var delete_button = $('<img class="msg-icon delete_button" src="/img/delete_button.png"></img>')
                        delete_button.click(function() {
                            if (confirm("Are you sure you want to delete this message?")) {

                                var fb_thread = rwm.fb_main.child(rwm.bookID).child(rwm.pageNum).child(threadID);
                                fb_thread.child("messages").once("value", function(snapshot) {
                                    var messageCount = snapshot.numChildren();
                                    if (snapshot.child(msgID).child("type").val() == "video") {
                                        var linkID = snapshot.child(msgID).child("linkID").val();
                                        rwm.fb_data.child(linkID).remove();    
                                    }
                                    if (messageCount <= 1) {
                                        fb_thread.remove();
                                        console.log("thread removed");
                                    } else {
                                        fb_thread.child("messages").child(msgID).remove();
                                        console.log("message removed");
                                    }
                                });
                            }
                        });
                        elem.find(".msg-icon-div").append(delete_button);
                    }

                    $("#thread"+threadID).append(elem);
                } else {
                    console.log("Could not get FB pic");
                }
            });

        },
        //Not using this function right now.
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
                var elem = $("<img class='addreply' src='/img/plus.png'></img>");
                (function(x){
                        Tipped.create(elem.get(),function(){
                            var threadID = x; 
                            var clone = $('<div id="toolbar">\
                                <div id="recordVideo"><img src="/img/video.png" alt="" /></div>\
                                <div id="recordText"><img src="/img/bubble.png" alt="" /></div>\
                                <div></div></div>');
                            var vid_btn = clone.children().eq(0);
                            var txt_btn = clone.children().eq(1);
                            // vid_btn.mouseup(function(e){
                            //     var threadID = x; 
                            //     console.log(threadID);
                            //     rwm.stop_recording_and_upload_response(threadID);
                            // });

                            txt_btn.click(function(e){
                                var threadID = x; 
                                rwm.get_text_message_and_upload(threadID);
                            });
    
                            // vid_btn.mousedown(function(e){
                            //     rwm.record_audio_and_video();
                            // });
                            // vid_btn.mouseenter(function(e){
                            //     $("#webcam_stream").show(); 
                            // });
                            // vid_btn.mouseleave(function(e){
                            //     $("#webcam_stream").hide(); 
                            // });
                            
                            vid_btn.click(function(e){
                                $('#webcam_stream').show();
                            });

                            // Tipped.create(clone.children().first().get(), "Click and hold to record video");
                            return clone;
                        });
                })(x);

                $("#"+x).append(elem);
            }
            
        },
        reloadAnnotations: function(){
            this.fb_main.child(this.bookID).child(this.pageNum).on('value', function(snapshot){
                rwm.pageThreads = snapshot.val();         
                $("#playback_bar").empty();
                rwm.reloadHighlight();
            }); 
        },

        renderSingleThread: function(threadID){
            $("#playback_bar").empty();
            var elem = $('<div/>').addClass('thread').append(
                $('<ul id = ' + "thread" + threadID + '> </ul>'));
                // .css({
                    // "top": this.pageThreads[threadID].position.y1,
                    // "position": "absolute"
                // });
                $("#playback_bar").append(elem);
            var msgs = this.pageThreads[threadID].messages;
            for(x in msgs){
                this.renderMsg(threadID, x);
            }
                var elem = $("<img class='addreply' src='/img/plus.png'></img>");
                (function(x){
                        Tipped.create(elem.get(),function(){
                            var threadID = x; 
                            var clone = $('<div id="toolbar">\
                                <div id="recordVideo"><img src="/img/video.png" alt="" /></div>\
                                <div id="recordText"><img src="/img/bubble.png" alt="" /></div>\
                                <div></div></div>');
                            var vid_btn = clone.children().eq(0);
                            var txt_btn = clone.children().eq(1);

                            txt_btn.click(function(e){
                                var threadID = x; 
                                rwm.get_text_message_and_upload(threadID);
                            });
    
                            vid_btn.click(function(e){
                                $('#rec_btn').unbind('click');
                                $('#stp_btn').unbind('click');
                                rwm.isVideoStandby = true;
                                $('#webcam_stream').show();
                                $('#rec_btn').click(function(e){
                                    rwm.record_audio_and_video();
                                    $("#rec_btn").hide()
                                    $('#stp_btn').show();
                                });
                                
                                $('#stp_btn').click(function(e){
                                    var threadID = x; 
                                    rwm.stop_recording_and_upload_response(threadID);
                                    $('#stp_btn').hide()
                                    $('#rec_btn').show();
                                    $('#webcam_stream').hide();
                                    rwm.setDefaultRecordBehavior();
                                });
                            });

                            return clone;
                        });
                })(threadID);
                setTimeout(function(){
                    $("#thread"+threadID).append(elem);
                }, 300);
            // var elem = $("<img class='addreply' src='/img/plus.png'></img>");
            //     $("#"+"thread"+threadID).append(elem);
            $("#pdfdiv").click(function(e){
                $("#playback_bar").empty();
            });

        },
        reloadHighlight: function(){
            $(".display").remove();
            for(thread in this.pageThreads) {
                var position = this.pageThreads[thread].position;
                var annot_display = new DisplayTag("pdfdiv", thread, position.x1, position.y1, position.height, position.width);
            }
            $(".display").click(function(e){
                console.log(e.target);
                e.stopPropagation();
                rwm.renderSingleThread(e.target.id);
            });
        },
        record_audio_and_video: function() {
            $("#recording-indicator").show();
            rwm.isRecording = true;
            this.recordRTC_Video.startRecording();
            this.recordRTC_Audio.startRecording();
        },
        createThread: function(x,y,height,width){
            stuff_to_upload = {
                position:{
                    'x1':x,
                    'y1':y,
                    'height':height,
                    'width':width
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
            if(res != null && res != ""){
                var stuff_to_upload_fbmain = {
                    type: 'text',
                    text: res,
                    userID: rwm.me.id
                }
                this.append_msg_to_thread(threadID, stuff_to_upload_fbmain);
            }
        },
        stop_recording_and_upload_response:function(threadID) {
                console.log(threadID);
            $("#recording-indicator").hide();
            rwm.isRecording = false;
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
        setDefaultRecordBehavior: function(){
            $('#rec_btn').unbind('click');
            $('#stp_btn').unbind('click');
            $('#recordVideo').unbind('click');
            $('#recordText').unbind('click');
            // $("#recordVideo").mousedown(function(e){
            //     rwm.record_audio_and_video();
            // });

            // $("#recordVideo").mouseup(function(e){
            //     $("#feedback").width = 0;
            //     $("#feedback").height = 0;
            //     var threadID = rwm.createThread(annotation.x_coord, annotation.y_coord, annotation.height, annotation.width);
            //     rwm.stop_recording_and_upload_response(threadID);
            // });
            // 
            // $("#recordVideo").mouseenter(function(e){
            //     $("#webcam_stream").show(); 
            // });

            // $("#recordVideo").mouseleave(function(e){
            //     $("#webcam_stream").hide(); 
            // });
            // Tipped.create("#recordVideo", "Click and hold to record video");
            

            $("#recordText").click(function(e){
                $("#feedback").width = 0;
                $("#feedback").height = 0;
                var threadID = rwm.createThread(annotation.x_coord, annotation.y_coord, annotation.height, annotation.width);
                rwm.get_text_message_and_upload(threadID);
            });

            $('#recordVideo').click(function(e){
                $('#webcam_stream').show();
                rwm.isVideoStandby = true;
                $('#rec_btn').click(function(e){
                    rwm.record_audio_and_video();
                    $("#rec_btn").hide()
                    $('#stp_btn').show();
                });

                $('#stp_btn').click(function(e){
                $("#feedback").width = 0;
                $("#feedback").height = 0;
                var threadID = rwm.createThread(annotation.x_coord, annotation.y_coord, annotation.height, annotation.width);
                rwm.stop_recording_and_upload_response(threadID);
                    $('#stp_btn').hide()
                    $('#rec_btn').show();
                $('#webcam_stream').hide();
                });
            });
        },
        bindUIActions: function() {
            $("#modal").click(function() {
                FB.login(rwm.ensureLoggedIn, {
                    scope: 'public_profile,email,user_friends'
                });
            });
            
            annotation = new Tagger("pdfdiv", "feedback");
            rwm.setDefaultRecordBehavior();
            $("#pdfdiv").click(function(){
                rwm.setDefaultRecordBehavior();
            })
            Tipped.create('#pdfdiv', {inline: "toolbar", showOn: 'click', behavior: 'sticky', hideOn: {element: 'click', tooltip: 'click'}});
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
            $("#feedback").width = 0;
            $("#feedback").height = 0;
        },

        goNext: function() {
            if (rwm.pageNum >= rwm.pdfDoc.numPages)
                return;
            rwm.pageNum++;
            rwm.renderPage(rwm.pageNum);
            rwm.reloadAnnotations();
            window.scrollTo(0, 0)
            $("#feedback").width = 0;
            $("#feedback").height = 0;
        },

        renderPage: function(num) {
            var scale = 1.5,
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
        },
        initFacebook: function() {
            window.fbAsyncInit = function() {
                FB.init({
                    //appId: '532658660179459', // this is Kai test appID
                    appId: '529110353867623', // this is the herokuapp appId
                    // appId: '532144570230868', // this is the roshan's test appId
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
                // webcam_stream.appendChild(video);
                $(webcam_stream).prepend(video);

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
