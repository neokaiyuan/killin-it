function s3_upload(){
    var s3upload = new S3Upload({
        file_dom_selector: 'files',
        s3_sign_put_url: '/sign_s3',
        onProgress: function(percent, message) {
            $('#status').html('Upload progress: ' + percent + '% ' + message);
        },
        onFinishS3Put: function(public_url) {
            console.log(public_url);
            var shortid = public_url.split('/');
            shortid = shortid[shortid.length-1].split('.')[0];
            window.location.href = "http://read-with-me.herokuapp.com/book/"+ shortid;
        },
        onError: function(status) {
            $('#status').html('Upload error: ' + status);
        }
    });

}$(function() {
    $('#files').on("change", s3_upload);
});
