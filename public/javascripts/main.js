
(function() {

  $(document).ready(function(){
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
    display_msg({m:"Share this url with your friend to comment on book: "+ document.location.origin+"/#"+fb_chat_room_id,c:"red"})

    // set up variables to access firebase data structure
    var fb_new_session = fb_instance.child('session').child(fb_session_id);
    var fb_instance_users = fb_new_session.child('users');

    
    // create user id for new user
    var username =Math.floor(Math.random()*1111);
    fb_instance_users.push({name: username});
  }
 
})();
