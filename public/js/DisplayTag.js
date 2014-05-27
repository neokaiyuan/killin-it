function DisplayTag(photo_id, highlight_id, x_coord, y_coord, height, width) {
    var photo = document.getElementById(photo_id);
    var display = document.createElement('div');
    photo.appendChild(display);
    display.style.left = x_coord + "px";
    display.style.top = y_coord + "px";
    display.style.height = height + "px";
    display.style.width = width + "px";	
    display.style.background = 'yellow';	
    display.style.position = 'absolute' ;
    this.element = display;
    display.className = 'display';
    display.id = highlight_id;
}
