function DisplayTag(photo_id, user_name, x_coord, y_coord, height, width) {
    var photo = document.getElementById(photo_id);
    var display = document.createElement('div');
    var name = document.createElement('p');
    name.innerHTML = user_name;
    photo.appendChild(display);
    display.appendChild(name);
    display.style.left = x_coord + "px";
    display.style.top = y_coord + "px";
    display.style.height = height + "px";
    display.style.width = width + "px";		
    display.style.border = '2px solid white';
    display.style.position = 'absolute' ;
    this.element = display;
    display.className = 'display';
}
