$(document).ready(function() {
  setup_playback();
})

function setup_playback() {
  addEndedListener();
}

function addEndedListener() {
  $("#video").get(0).onended = function(e) {
    $("#video_overlay").removeClass("show");
  };
}
