(function() {

    $(document).ready(function(){
        setupPdf();
        connect_to_firebase();
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


        // create user id for new user
        var username =Math.floor(Math.random()*1111);
        fb_instance_users.push({name: username});
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

})();
