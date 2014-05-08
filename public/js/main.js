(function() {

    var cur_video_blob = null;
    var userid = null;
    var fb_instance_stream = null;

    $(document).ready(function(){
        setup_pdf();
        setup_firebase();
        setup_webcam();
    });

    function setup_firebase(){
        /* Include your Firebase link here!*/
        fb_instance = new Firebase("https://readwithme.firebaseio.com/");
        fb_session_id = "default";
        fb_session = fb_instance.child('default');
    }

    function setup_webcam() {
        function record_audio_and_video(){
            recordRTC_Video.startRecording();
            recordRTC_Audio.startRecording();
        }

        //This is why I hate JavaScript. Need to learn to use promises.
        function stop_recording_and_upload(yPos){
            var stuff_to_upload = {}
            stuff_to_upload.y = yPos;
            recordRTC_Audio.stopRecording(function(audioURL) {
                blob_to_base64(recordRTC_Audio.getBlob(), function(base64blob){
                    stuff_to_upload.audioBlob = base64blob;
                    recordRTC_Video.stopRecording(function(videoURL) {
                        blob_to_base64(recordRTC_Video.getBlob(), function(base64blob){
                            stuff_to_upload.videoBlob = base64blob;
                            console.log(stuff_to_upload);
                            fb_session.child('' + window.pageNum).push(stuff_to_upload);
                            console.log(window.pageNum + ':' + stuff_to_upload);                                
                        });
                    });        
                });
            });
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
            video.setAttribute('autoplay', true);
            webcam_stream.appendChild(video);

        },function(failure){
            console.log(failure);
        });

        $("#record_bar").mousedown(function(e) {
            $("#webcam_stream").css("visibility","visible");
            record_audio_and_video();
        });   

        $("#record_bar").mouseup(function(e) {
            $("#webcam_stream").css("visibility","hidden");
            stop_recording_and_upload(e.clientY);
        });
    }

    function setup_pdf(){
        var url = "/other/mobydick.pdf";
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
        }

        function goNext() {
            if(pageNum >= pdfDoc.numPages)
                return;
            pageNum++;
            renderPage(pageNum);            
        }
        PDFJS.getDocument(url).then(function getPdfHelloWorld(_pdfDoc){
            pdfDoc = _pdfDoc
            renderPage(pageNum);
        });
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
