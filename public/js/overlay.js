$(document).ready(function() {
  setup_playback();
})

function setup_playback() {
  $("#playback_bar").click(function() {
    $("#video_overlay").addClass("show");
    $("#video").get(0).play(); 
  });
  addEndedListener();
}

function addEndedListener() {
  $("#video").get(0).onended = function(e) {
    $("#video_overlay").removeClass("show");
  };
}