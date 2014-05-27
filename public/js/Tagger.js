function Tagger(photo_id, fback_id, x_coord, y_coord, height, width) {
	this.isMouseDown = false; 
	this.photo = document.getElementById(photo_id);
	this.fback = document.createElement('div');
	this.fback.id = fback_id;
	this.photo.appendChild(this.fback);
	this.fback.id = fback_id;

	this.reset = true;
	this.x_offset = 0;
	this.y_offset = 0;
    
	var child = this.fback;
	while (child != document.body) {
		this.x_offset += child.offsetParent.offsetLeft;
		this.y_offset += child.offsetParent.offsetTop;
		child = child.offsetParent;
	}
	var obj = this;
	this.photo.onmousedown = function(event){
		obj.mouseDown(event);
	}
}

Tagger.prototype.mouseDown = function(event){
	event.preventDefault();
	if (this.reset === true) {
		this.x_coord = event.pageX - this.x_offset;
		this.y_coord = event.pageY - this.y_offset;
		this.fback.style.width = '0px'; 
		this.fback.style.height = '0px';
		this.fback.style.left = this.x_coord + "px";
		this.fback.style.top = this.y_coord + "px";
		this.fback.style.background = 'yellow' ;
		this.reset = false; 
	}
	var obj = this;
	this.oldMoveHandler = document.body.onmousemove; 
	document.body.onmousemove = function(event) {
		obj.mouseMove(event);
	}	
	this.oldUpHandler = document.body.onmouseup; 
	document.body.onmouseup = function(event) {
		obj.mouseUp(event);
	}
	this.isMouseDown = true;
}

Tagger.prototype.mouseMove = function(event) {
	if (!this.isMouseDown) {
		return; 
	}
	var x_diff = event.pageX - this.x_offset - this.x_coord;
	var y_diff = event.pageY - this.y_offset - this.y_coord;
	var left = 0;
	var top = 0;
	
	if (x_diff < 0) {
        left = event.pageX - this.x_offset;
        if (left < 0) {
            left = 0;
            x_diff = this.x_coord;
        }
    } else {
        left = this.x_coord;
        if (x_diff + this.x_coord > this.photo.offsetWidth) {
            x_diff = this.photo.offsetWidth - this.x_coord;
        }
    }
    
    if (y_diff < 0) {
        top = event.pageY - this.y_offset;
        if (top < 0) {
            top = 0;
            y_diff = this.y_coord;
        }
    } else {
        top = this.y_coord;
        if (y_diff + this.y_coord > this.photo.offsetHeight){
            y_diff = this.photo.offsetHeight- this.y_coord;
        }
    }

	this.fback.style.left = left + "px";
	this.fback.style.top = top + "px";
    this.width = Math.abs(x_diff);
    this.height = Math.abs(y_diff);
	this.fback.style.width = this.width + "px";
	this.fback.style.height = this.height + "px";	
}

Tagger.prototype.mouseUp = function(event) {
	this.isMouseDown = false;
	this.reset = true; 
    
	document.body.onmousemove = this.oldMoveHandler;
    document.body.onmouseup = this.oldUpHandler;
}
