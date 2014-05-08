(function() {

    var cur_video_blob = null;
    var userid = null;
    var fb_instance_stream = null;

    $(document).ready(function(){
        setupPdf();
        connect_to_firebase();
        connect_webcam();
    });

    function connect_to_firebase(){
        /* Include your Firebase link here!*/
        fb_instance = new Firebase("https://killin-it.firebaseio.com/");

        // generate new reading session id or use existing id
        var url_segments = document.location.href.split("/#");
        if(url_segments[1]){
            fb_session_id = url_segments[1];
        }else{
            fb_session_id = Math.random().toString(36).substring(7);
        }
        // display_msg({m:"Share this url with your friend to comment on book: "+ document.location.origin+"/#"+fb_chat_room_id,c:"red"})

        // set up variables to access firebase data structure
        var fb_new_session = fb_instance.child('session').child(fb_session_id);
        var fb_instance_users = fb_new_session.child('users');
        fb_instance_stream = fb_new_session.child('stream');

        // create user id for new user
        userid =Math.floor(Math.random()*1111);
        fb_instance_users.push({name: userid});
    }

    function connect_webcam() {
        var mediaConstraints = {
            video: true,
            audio: true
        };
        
        var onMediaSuccess = function(stream) {
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
                src: URL.createObjectURL(stream)

            });
            video.setAttribute('autoplay', true);
            webcam_stream.appendChild(video);

            $("#record_bar").mousedown(function(e) {
                var mediaRecorder = new MediaStreamRecorder(stream);
                mediaRecorder.mimeType = 'video/webm';
                mediaRecorder.ondataavailable = function (blob) {
                    console.log("new data available!");

                    // convert data into base 64 blocks
                    blob_to_base64(blob,function(b64_data){
                        cur_video_blob = b64_data;
                        fb_instance_stream.push({name: userid, video: cur_video_blob, position: e.clientY});
                    });
                };
                mediaRecorder.start(30000);
                $("#webcam_stream").css("visibility","visible");
                $("#record_bar").mouseup(function(e) {
                    mediaRecorder.stop();
                    $("#webcam_stream").css("visibility","hidden");

                });
            });   


        }

        var onMediaError = function(e) {
            console.error('media error', e);
        }

        navigator.getUserMedia(mediaConstraints, onMediaSuccess, onMediaError)


    }

    function setupPdf(){
        var url = "/other/mobydick.pdf";
        PDFJS.disableWorker = true;
        var pdfDoc = null,
            pageNum = 1,
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
