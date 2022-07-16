shadowMapSize = 512.0

/* directional light */
DirLight = function(){
  this.direction = [1,-1,0];
  this.color = [1,.8,.9];
}
sun = new DirLight();

/* the FollowFromUpCamera always look at the car from a position above right over the car */
FollowFromUpCamera = function(){
  this.frame = glMatrix.mat4.create();
  /* update the camera with the current car position */
  this.update = function(car_position){
    this.frame = car_position;
  }
  /* return the transformation matrix to transform from world coordiantes to the view reference frame */
  this.matrix = function(){
    let eye = glMatrix.vec3.create();
    let target = glMatrix.vec3.create();
    let up = glMatrix.vec4.create();
    glMatrix.vec3.transformMat4(eye, [0 ,50,0], this.frame);
    glMatrix.vec3.transformMat4(target, [0.0,0.0,0.0,1.0], this.frame);
    glMatrix.vec4.transformMat4(up, [0.0,0.0,-1,0.0], this.frame);
    
	return glMatrix.mat4.lookAt(glMatrix.mat4.create(),eye,target,up.slice(0,3));
  }
}

/* the ChaseCamera always look at the car from behind the car, slightly above */
ChaseCamera = function(){
  /* the only data it needs is the frame of the camera */
  this.frame = [0,0,0];  
  /* update the camera with the current car position */
  this.update = function(car_frame){
    this.frame = car_frame.slice();
  }
  /* return the transformation matrix to transform from world coordiantes to the view reference frame */
  this.matrix = function(){
    let eye = glMatrix.vec3.create();
    let target = glMatrix.vec3.create();
    glMatrix.vec3.transformMat4(eye, [0 ,2,7,1.0], this.frame);
    glMatrix.vec3.transformMat4(target, [0.0,0.0,0.0,1.0], this.frame);
	
    return glMatrix.mat4.lookAt(glMatrix.mat4.create(),eye, target,[0, 1, 0]);	
  }
}

/* the ControllableCamera controllable with mouse and keyboard. 
 moving the mouse without clicking we direct the view direction,
 typing keys I,K,J,L we change the viewpoint, respectively to go closer, get away, move left and right */
ControllableCamera = function () {
	this.frame = glMatrix.mat4.create();

	this.angles = [];
	this.keys = [];
	//view target when the mouse is in the center of the canvas
	this.centerTarg = glMatrix.vec3.fromValues(0, 5, 5);
	//position of current view point
	this.eyePos = glMatrix.vec3.fromValues(0, 5, 0);
	//position of current target
	this.targetPos = glMatrix.vec3.fromValues(0, 5, 5);
	this.up = glMatrix.vec3.fromValues(0, 1, 0);

	/* update camera position */
	this.update = function () {
		let tmp = glMatrix.vec3.create();
		let tras = glMatrix.mat4.create();
		let invView = glMatrix.vec3.sub(glMatrix.vec3.create(), this.eyePos, this.centerTarg);
		let rotation = glMatrix.mat4.create();
		trasKey = glMatrix.mat4.create();
		
		/* rotation with mouse */
		// horizontal rotation around up axis
		let rotH = glMatrix.mat4.fromRotation(glMatrix.mat4.create(), this.angles['h'], this.up);
		// rotation axis
		let newAxes = glMatrix.vec3.cross(glMatrix.vec3.create(), this.up, invView);
		// vertical rotation around the newAxes
		let rotV = glMatrix.mat4.fromRotation(glMatrix.mat4.create(), this.angles['v'], newAxes);
		glMatrix.mat4.mul(rotation, rotH, rotV);
		// update target position
		this.targetPos = glMatrix.vec3.transformMat4(this.targetPos, this.centerTarg, rotation);

		/* translation with keyboard */
		// view direction
		glMatrix.vec3.sub(tmp, this.targetPos, this.eyePos);
		glMatrix.vec3.normalize(tmp, tmp);
		// decrease the speed of camera 
		glMatrix.vec3.scale(tmp, tmp, 0.1);
		
		if (this.keys['i']) {
			glMatrix.mat4.fromTranslation(trasKey, tmp);
			glMatrix.mat4.mul(tras, tras, trasKey);
		}
		else if (this.keys['k']) {
			glMatrix.vec3.scale(tmp, tmp, -1);// reverse direction to move away
			glMatrix.mat4.fromTranslation(trasKey, tmp);
			glMatrix.mat4.mul(tras, tras, trasKey);
		}
		else if (this.keys['j']) {
			let vS = glMatrix.vec3.cross(glMatrix.vec3.create(), this.up, tmp);
			glMatrix.mat4.fromTranslation(trasKey, vS);
			glMatrix.mat4.mul(tras, tras, trasKey);
		}
		else if (this.keys['l']) {
			let vS = glMatrix.vec3.cross(glMatrix.vec3.create(), tmp, this.up);
			glMatrix.mat4.fromTranslation(trasKey, vS);
			glMatrix.mat4.mul(tras, tras, trasKey);
		} 
		glMatrix.mat4.mul(this.frame, this.frame, tras);
	}
	/* return the transformation matrix to transform from world coordiantes to the view reference frame */
	this.matrix = function () {
		let eye = glMatrix.vec3.create();
		let target = glMatrix.vec3.create();
		glMatrix.vec3.transformMat4(eye, this.eyePos, this.frame);
		glMatrix.vec3.transformMat4(target, this.targetPos, this.frame);

		return glMatrix.mat4.lookAt(glMatrix.mat4.create(), eye, target, this.up); 
	}
}

projectTexture = function(position, center){
  this.frame = [0,0,0];
  /* update the projector with the current car position */
  this.update = function(car_frame){
    this.frame = car_frame.slice();
  }
  /* return the transformation matrix to transform from world coordiantes to the view reference frame */
  this.matrix = function(){
    let eye = glMatrix.vec3.create();
    let target = glMatrix.vec3.create();
    glMatrix.vec3.transformMat4(eye, position, this.frame);
    glMatrix.vec3.transformMat4(target, center, this.frame);
    
	return glMatrix.mat4.lookAt(glMatrix.mat4.create(),eye, target,[0, 1, 0]);
  }
}

/* the main object to be implementd */
var Renderer = new Object();

/* array of cameras that will be used */
Renderer.cameras = [];
Renderer.cameras.push(new FollowFromUpCamera());
Renderer.cameras.push(new ChaseCamera());
FreeCam = new ControllableCamera();
Renderer.cameras.push(FreeCam);
// set the camera currently in use : FollowFromUpCamera
Renderer.currentCamera = 0;    

Renderer.setupWebGL = function (){
 /* create the canvas */
  Renderer.canvas = document.getElementById("OUTPUT-CANVAS");
  /* get the webgl context */
  Renderer.gl = Renderer.canvas.getContext("webgl");

  /* read the webgl version and log */
  var gl_version = Renderer.gl.getParameter(Renderer.gl.VERSION);
  log("glversion: " + gl_version);
  var GLSL_version = Renderer.gl.getParameter(Renderer.gl.SHADING_LANGUAGE_VERSION)
  log("glsl  version: "+GLSL_version);

  Renderer.gl.getExtension('OES_standard_derivatives');
  var ext = Renderer.gl.getExtension('WEBGL_depth_texture');
  if (!ext) return alert('need WEBGL_depth_texture');
	
}

function loadTexture(gl, url, wrapping){ //wrapping = {1 : REPEAT, 0 : CLAMP_TO_EDGE (x Headlights)}
  var texture = gl.createTexture();
  texture.image = new Image();

  var that = texture;
  texture.image.onload = function () {
    gl.bindTexture(gl.TEXTURE_2D, that);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, that.image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    if(wrapping == 0){
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }
    else{
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    }
    gl.generateMipmap(gl.TEXTURE_2D);
	
    gl.bindTexture(gl.TEXTURE_2D, null);
  };

  texture.image.src = url;
  return texture;
}

Renderer.createObjectBuffers = function (gl, obj) {
  obj.vertexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, obj.vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, obj.vertices, gl.STATIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  
  if(obj.normals){
    obj.normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, obj.normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, obj.normals, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  }
  
  if(typeof obj.texCoords != 'undefined'){
    obj.texCoordsBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, obj.texCoordsBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, obj.texCoords, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  }
  
  obj.indexBufferTriangles = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, obj.indexBufferTriangles);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, obj.triangleIndices, gl.STATIC_DRAW);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

  // create edges
  var edges = new Uint16Array(obj.numTriangles * 3 * 2);
  for (var i = 0; i < obj.numTriangles; ++i) {
    edges[i * 6 + 0] = obj.triangleIndices[i * 3 + 0];
    edges[i * 6 + 1] = obj.triangleIndices[i * 3 + 1];
    edges[i * 6 + 2] = obj.triangleIndices[i * 3 + 0];
    edges[i * 6 + 3] = obj.triangleIndices[i * 3 + 2];
    edges[i * 6 + 4] = obj.triangleIndices[i * 3 + 1];
    edges[i * 6 + 5] = obj.triangleIndices[i * 3 + 2];
  }

  obj.indexBufferEdges = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, obj.indexBufferEdges);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, edges, gl.STATIC_DRAW);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
};

function createFramebuffer(gl,size){
  var depthTexture = gl.createTexture();
  const depthTextureSize = size;
  gl.bindTexture(gl.TEXTURE_2D, depthTexture);
  gl.texImage2D(
    gl.TEXTURE_2D,      // target
    0,                  // mip level
    gl.DEPTH_COMPONENT, // internal format
    depthTextureSize,   // width
    depthTextureSize,   // height
    0,                  // border
    gl.DEPTH_COMPONENT, // format
    gl.UNSIGNED_INT,    // type
    null);              // data
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  var depthFramebuffer = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, depthFramebuffer);
  
  gl.framebufferTexture2D(
    gl.FRAMEBUFFER,       // target
    gl.DEPTH_ATTACHMENT,  // attachment point
    gl.TEXTURE_2D,        // texture target
    depthTexture,         // texture
    0);                   // mip level

  // create a color texture of the same size as the depth texture
  var colorTexture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, colorTexture);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    depthTextureSize,
    depthTextureSize,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    null,
  );
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  // attach it to the framebuffer
  gl.framebufferTexture2D(
    gl.FRAMEBUFFER,        // target
    gl.COLOR_ATTACHMENT0,  // attachment point
    gl.TEXTURE_2D,         // texture target
    colorTexture,          // texture
    0);                    // mip level

  gl.bindTexture(gl.TEXTURE_2D,null);
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);
  depthFramebuffer.depthTexture = depthTexture;
  depthFramebuffer.colorTexture = colorTexture;
  depthFramebuffer.size = depthTextureSize;

  return depthFramebuffer;
}

Renderer.drawObject = function (gl, obj, fillColor, useShader) {
  gl.bindBuffer(gl.ARRAY_BUFFER, obj.vertexBuffer);
  gl.enableVertexAttribArray(useShader.aPositionIndex);
  gl.vertexAttribPointer(useShader.aPositionIndex, 3, gl.FLOAT, false, 0, 0);

  if(obj.normals || obj.normalBuffer){
    gl.bindBuffer(gl.ARRAY_BUFFER, obj.normalBuffer);
    gl.enableVertexAttribArray(useShader.aNormalIndex);
    gl.vertexAttribPointer(useShader.aNormalIndex, 3, gl.FLOAT, false, 0, 0);
  }

  if(typeof obj.texCoords != 'undefined'){
    gl.bindBuffer(gl.ARRAY_BUFFER, obj.texCoordsBuffer);
    gl.enableVertexAttribArray(useShader.aTexCoordsIndex);
    gl.vertexAttribPointer(useShader.aTexCoordsIndex, 2, gl.FLOAT, false, 0, 0);
  }

  gl.enable(gl.POLYGON_OFFSET_FILL);
  gl.polygonOffset(1.0, 1.0);

  if(obj.indexBufferTriangles){
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, obj.indexBufferTriangles);
    gl.uniform3fv(useShader.uColorLocation, [fillColor[0], fillColor[1], fillColor[2]]);
    gl.drawElements(gl.TRIANGLES, obj.triangleIndices.length, gl.UNSIGNED_SHORT, 0);
  }
  else {
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, obj.indexBuffer);
    gl.uniform3fv(useShader.uColorLocation, [fillColor[0], fillColor[1], fillColor[2]]);
    gl.drawElements(gl.TRIANGLES, obj.triangleIndices.length, gl.UNSIGNED_SHORT, 0);
  }
  gl.disable(gl.POLYGON_OFFSET_FILL);

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
  gl.disableVertexAttribArray(useShader.aPositionIndex);
  gl.disableVertexAttribArray(useShader.aNormalIndex);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
};

var lamp_position_array=[];

Renderer.HeadlightR = new projectTexture([0.5, 0.5, -1.0, 1.0], [0.5, 0.5, -2.0, 1.]);
Renderer.HeadlightL = new projectTexture([-0.5, 0.5, -1.0, 1.0], [-0.5, 0.5, -2.0, 1.0]);

/* draw the car */
let rotation_angle = 0;
Renderer.drawCar = function (gl, useShader) {

  M                 = glMatrix.mat4.create();
  rotate_transform  = glMatrix.mat4.create();
  translate_matrix  = glMatrix.mat4.create();
  scale_matrix      = glMatrix.mat4.create();

  glMatrix.mat4.fromTranslation(translate_matrix,[0,1,1]);
  glMatrix.mat4.fromScaling(scale_matrix,[0.7,0.25,1]);
  glMatrix.mat4.mul(M,scale_matrix,translate_matrix);
  glMatrix.mat4.fromRotation(rotate_transform,-0.1,[1,0,0]);
  glMatrix.mat4.mul(M,rotate_transform,M);
  glMatrix.mat4.fromTranslation(translate_matrix,[0,0.1,-1]);
  glMatrix.mat4.mul(M,translate_matrix,M);

  Renderer.stack.push();
  Renderer.stack.multiply(M);

  gl.uniformMatrix4fv(useShader.uM, false, this.stack.matrix);

  this.drawObject(gl,this.cube,[0.8,0.1,0.3,1.0], useShader);
  Renderer.stack.pop();

  Mw                 = glMatrix.mat4.create();
  MwFront            = glMatrix.mat4.create();
  
  /* draw the wheels */
  glMatrix.mat4.fromRotation(rotate_transform,3.14/2.0,[0,0,1]);
  glMatrix.mat4.fromTranslation(translate_matrix,[1,0,0]);
  glMatrix.mat4.mul(Mw,translate_matrix,rotate_transform);
  glMatrix.mat4.fromScaling(scale_matrix,[0.1,0.2,0.2]);
  glMatrix.mat4.mul(Mw,scale_matrix,Mw);

  /* now the diameter of the wheel is 2*0.2 = 0.4 and the wheel is centered in 0,0,0 */
  glMatrix.mat4.fromRotation(rotate_transform, Game.cars[0].wheelsAngle ,[0,1,0]);
  
  rotation_angle -= .4 * Game.cars[0].speed;
  glMatrix.mat4.mul(Mw,glMatrix.mat4.fromRotation(glMatrix.mat4.create(), rotation_angle,[1,0,0]),Mw);

  glMatrix.mat4.mul(MwFront,rotate_transform,Mw);

  glMatrix.mat4.identity(M);

  glMatrix.mat4.fromTranslation(translate_matrix,[-0.8,0.2,-0.7]);
  glMatrix.mat4.mul(M,translate_matrix,MwFront);

  Renderer.stack.push();
  Renderer.stack.multiply(M);
  gl.uniformMatrix4fv(useShader.uM, false, this.stack.matrix);
  this.drawObject(gl,this.cylinder,[0.4,0.6,0.8,1.0], useShader);
  Renderer.stack.pop();

  glMatrix.mat4.fromTranslation(translate_matrix,[0.8,0.2,-0.7]);

  glMatrix.mat4.mul(M,translate_matrix,MwFront);

  Renderer.stack.push();
  Renderer.stack.multiply(M);
  gl.uniformMatrix4fv(useShader.uM, false, this.stack.matrix);
  this.drawObject(gl,this.cylinder,[0.4,0.6,0.8,1.0], useShader);
  Renderer.stack.pop();

  /* this will increase the size of the wheel to 0.4*1,5=0.6 */
  glMatrix.mat4.fromScaling(scale_matrix,[1,1.5,1.5]);;
  glMatrix.mat4.mul(Mw,scale_matrix,Mw);

  glMatrix.mat4.fromTranslation(translate_matrix,[0.8,0.25,0.7]);
  glMatrix.mat4.mul(M,translate_matrix,Mw);

  Renderer.stack.push();
  Renderer.stack.multiply(M);
  gl.uniformMatrix4fv(useShader.uM, false, this.stack.matrix);
  Renderer.stack.pop();
  this.drawObject(gl,this.cylinder,[0.4,0.6,0.8,1.0], useShader);

  glMatrix.mat4.fromTranslation(translate_matrix,[-0.8,0.3,0.7]);

  glMatrix.mat4.mul(M,translate_matrix,Mw);

  Renderer.stack.push();
  Renderer.stack.multiply(M);
  gl.uniformMatrix4fv(useShader.uM, false, this.stack.matrix);
  this.drawObject(gl,this.cylinder,[0.4,0.6,0.8,1.0], useShader);
  Renderer.stack.pop();
};

view_transform    = glMatrix.mat4.create();
proj_transform_R  = glMatrix.mat4.create();
proj_transform_L  = glMatrix.mat4.create();

identity          = glMatrix.mat4.create();
scale_matrix      = glMatrix.mat4.create();

Renderer.drawScene = function (gl, useShader, right) {
  gl.useProgram(useShader);
  gl.uniform1f(useShader.uSolidColor, 0.0);
 
  sun.direction = Game.scene.weather.sunLightDirection;
  sun.color = Game.scene.weather.sunLightColor;

  var width = this.canvas.width;
  var height = this.canvas.height
  var ratio = width / height;
  this.stack = new MatrixStack();

  // setup the view transform
  view_transform = Renderer.cameras[Renderer.currentCamera].matrix();  
  // setup the projection transform
  let proj_matrix = glMatrix.mat4.perspective(glMatrix.mat4.create(),3.14 / 4, ratio, 1, 500);  
  // headlight projector right transform
  proj_transform_R = Renderer.HeadlightR.matrix();        
  // headlight projector left transform  
  proj_transform_L = Renderer.HeadlightL.matrix();                
  // inverse of the viewMatrix
  var inv_view_matrix = glMatrix.mat4.create();                         
  glMatrix.mat4.invert(inv_view_matrix, view_transform);

  glMatrix.mat4.fromScaling(scale_matrix,[4,1,4]);
  gl.uniformMatrix4fv(useShader.uM,false,scale_matrix);

  gl.uniformMatrix4fv(useShader.uViewMatrixLocation,       false,  view_transform);
  gl.uniformMatrix4fv(useShader.uProjectionMatrixLocation, false,  proj_matrix);
	gl.uniformMatrix4fv(useShader.uInverseViewMatrixLocation,     false,  inv_view_matrix);
  gl.uniformMatrix4fv(useShader.uLightProjectionMatrixLocation, false,  proj_matrix);

  /* the shader will just output the base color if a null light direction is given */
  gl.uniform3fv(useShader.uLightDirectionLocation,sun.direction);
  gl.uniform3fv(useShader.uLightColorLocation,sun.color);

	if(useShader === Renderer.depth_shader){
		  if(right)
			  gl.uniformMatrix4fv(useShader.uHeadlightsViewMatrix,  false,  proj_transform_R);
		  else     
			  gl.uniformMatrix4fv(useShader.uHeadlightsViewMatrix,  false,  proj_transform_L);
	} 
  gl.uniformMatrix4fv(useShader.uHeadlightsViewMatrixR,  false,  proj_transform_R);
  gl.uniformMatrix4fv(useShader.uHeadlightsViewMatrixL,  false,  proj_transform_L);

  Renderer.cameras[Renderer.currentCamera].update(this.car.frame);
  Renderer.HeadlightR.update(this.car.frame);
  Renderer.HeadlightL.update(this.car.frame);

  var V = Renderer.cameras[Renderer.currentCamera].matrix();
  // initialize the stack with the identity
  this.stack.loadIdentity();  
  // multiply by the view matrix  
  this.stack.multiply(V);      

  /* CAR */
  this.stack.push();
  this.stack.multiply(this.car.frame);
  // the car has no textures
  gl.uniform1f(useShader.uTextureON, 0);  

  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, Renderer.HEADLIGHTS);
  gl.activeTexture(gl.TEXTURE3);
  gl.bindTexture(gl.TEXTURE_2D, Renderer.HEADLIGHTS);
  gl.activeTexture(gl.TEXTURE0);

  Renderer.drawCar(gl, useShader);
  this.stack.pop();

  gl.uniformMatrix4fv(useShader.uM, false, this.stack.matrix);

  // following static elements has textures
  gl.uniform1f(useShader.uTextureON, 1); 

  gl.uniform1i(useShader.uProjectionSamplerRLocation, 1);
  gl.uniform1i(useShader.uProjectionSamplerLLocation, 3);
 
  gl.uniform1i(useShader.uSamplerLocation, 0);
  /* GROUND */
  gl.bindTexture(gl.TEXTURE_2D, Renderer.GRASS_TEXTURE);
  this.drawObject(gl, Game.scene.groundObj, [0.3, 0.7, 0.2, 1.0], useShader);

  /* TRACK */
  gl.bindTexture(gl.TEXTURE_2D, Renderer.STREET_TEXTURE);
  this.drawObject(gl, Game.scene.trackObj, [0.9, 0.8, 0.7, 1.0], useShader);

  /* BUILDINGS */
  gl.bindTexture(gl.TEXTURE_2D, Renderer.FACADES);
  for (var i in Game.scene.buildingsObjTex)
    this.drawObject(gl, Game.scene.buildingsObjTex[i], [0.8, 0.8, 0.8, 1.0], useShader);

  gl.bindTexture(gl.TEXTURE_2D, Renderer.ROOF);
  for (var i in Game.scene.buildingsObjTex)
    this.drawObject(gl, Game.scene.buildingsObjTex[i].roof, [0.8, 0.8, 0.8, 1.0], useShader);

  gl.uniform1f(useShader.uTextureON, 0); 

  
	if(useShader === Renderer.uniform_shader)
		for(var i in Game.scene.lamps){
		  let M         = glMatrix.mat4.create();
		  let M1        = glMatrix.mat4.create();
		  let scale_mat = glMatrix.mat4.create();

		  glMatrix.mat4.fromTranslation(M, [lamp_position_array[i][0], lamp_position_array[i][1] + 3, lamp_position_array[i][2]]);

		  glMatrix.mat4.fromScaling(scale_mat, [0.5,0.25,0.5,0]);
		  glMatrix.mat4.mul(M, M, scale_mat);

		  this.stack.multiply(M);
		  gl.uniformMatrix4fv(useShader.uM, false, this.stack.matrix);
		  gl.uniform1f(useShader.uSolidColor, 1.0);
		  this.drawObject(gl, this.cube, [1.0, 1.0, 1.0, 1.0], useShader);
		  gl.uniform1f(useShader.uSolidColor, 0.0);
		  glMatrix.mat4.invert(M1, M);

		  this.stack.multiply(M1);
		  gl.uniform3fv(useShader.uLampLocation[i], lamp_position_array[i]);
		}
  gl.useProgram(null);
};

Renderer.setupWhatToDraw = function (gl) {
  /* set the scene */
  Game.setScene(scene_0);
  
  /* add car */
  this.car = Game.addCar("mycar");
  
  this.cube = new Cube(10);
  ComputeNormals(this.cube);
  this.createObjectBuffers(gl,this.cube);
  
  this.cone = new Cone(10);
  ComputeNormals(this.cone);
  this.createObjectBuffers(gl,this.cone);
  
  this.cylinder = new Cylinder(10);
  ComputeNormals(this.cylinder);
  this.createObjectBuffers(gl,this.cylinder );
  
  this.cylinder10 = new Cylinder(10,10);
  ComputeNormals(this.cylinder10);
  this.createObjectBuffers(gl,this.cylinder10 );
  
  Renderer.triangle = new Triangle();
  ComputeNormals(this.triangle);
  Renderer.createObjectBuffers(gl, this.triangle);
  
  /* track */
  ComputeNormals(Game.scene.trackObj);
  Renderer.createObjectBuffers(gl,Game.scene.trackObj);
  
  /* ground */
  ComputeNormals(Game.scene.groundObj);
  Renderer.createObjectBuffers(gl,Game.scene.groundObj);

  /* buildings */
  for (var i = 0; i < Game.scene.buildings.length; ++i){
	/* facades   */
    ComputeNormals(Game.scene.buildingsObjTex[i]);
    Renderer.createObjectBuffers(gl,Game.scene.buildingsObjTex[i]);
    /* roof */
    ComputeNormals(Game.scene.buildingsObjTex[i].roof);
    Renderer.createObjectBuffers(gl,Game.scene.buildingsObjTex[i].roof);
  }
  
   /* lamps */
   for(lamp of Game.scene.lamps)
    lamp_position_array.push(lamp.position);

  this.sphere = loadOnGPU(sphere, gl);
  
  //load textures
  Renderer.STREET_TEXTURE   = loadTexture(gl, "../common/textures/street4.png", 1);
  Renderer.GRASS_TEXTURE    = loadTexture(gl, "../common/textures/grass_tile.png", 1);
  Renderer.ROOF             = loadTexture(gl, "../common/textures/roof.jpg", 1);
  Renderer.HEADLIGHTS       = loadTexture(gl, "../common/textures/headlight.png", 0);
  Renderer.FACADES          = loadTexture(gl, "../common/textures/facade3.jpg", 1);
};

Renderer.setupHowToDraw = function (){
	
	/* create the shaders */
	Renderer.uniform_shader = new shader(Renderer.gl);
	Renderer.depth_shader = new depthShader(Renderer.gl);
	
	/* create FrameBuffer for headlights */
	Renderer.framebufferR = createFramebuffer(Renderer.gl,shadowMapSize);                                
	Renderer.framebufferL = createFramebuffer(Renderer.gl,shadowMapSize);
}

Renderer.draw = function () {
  let gl = Renderer.gl

  gl.enable(gl.CULL_FACE);
  gl.enable(gl.DEPTH_TEST);

  var width = Renderer.canvas.width;
  var height = Renderer.canvas.height
  var ratio = width / height;

  /*  SHADOW PASS */
  gl.useProgram(Renderer.depth_shader);
  gl.viewport(0, 0, shadowMapSize, shadowMapSize);
  
	// SHADOWMAP headlight R
  gl.bindFramebuffer(gl.FRAMEBUFFER,Renderer.framebufferR);
  gl.cullFace(gl.BACK);  
  gl.enable(gl.DEPTH_TEST);
  gl.clearColor(1.0, 1.0, 1.0, 1.0);
  gl.clearDepth(1.0);
  gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);

  gl.bindTexture(gl.TEXTURE_2D, null);
  Renderer.drawScene(Renderer.gl, Renderer.depth_shader, true);
 
	// SHADOWMAP headlight L
  gl.bindFramebuffer(gl.FRAMEBUFFER,Renderer.framebufferL);
  gl.cullFace(gl.BACK);
  gl.enable(gl.DEPTH_TEST);
  gl.clearColor(1.0, 1.0, 1.0, 1.0);
  gl.clearDepth(1.0);
  gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);

  gl.bindTexture(gl.TEXTURE_2D, null);
  Renderer.drawScene(Renderer.gl, Renderer.depth_shader, false);
  
  gl.bindFramebuffer(gl.FRAMEBUFFER,null)

  /* LIGHT PASS */
  gl.useProgram(Renderer.uniform_shader);
  gl.viewport(0, 0, width, height);
  gl.cullFace(gl.BACK);
  gl.enable(gl.DEPTH_TEST);
  gl.clearColor(0.2, 0.5, 0.74, 1.0);
  gl.clearDepth(1.0);
  gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);

  gl.bindTexture(gl.TEXTURE_2D, null);

  gl.uniform1i(Renderer.uniform_shader.uDepthSamplerRLocation,2);
  gl.uniform1i(Renderer.uniform_shader.uDepthSamplerLLocation,4);

  gl.activeTexture(gl.TEXTURE2);
  gl.bindTexture(gl.TEXTURE_2D, Renderer.framebufferR.depthTexture);
  gl.activeTexture(gl.TEXTURE4);
  gl.bindTexture(gl.TEXTURE_2D, Renderer.framebufferL.depthTexture);

  Renderer.drawScene(Renderer.gl, Renderer.uniform_shader, false);
  gl.bindTexture(gl.TEXTURE_2D, null);

  window.requestAnimationFrame(Renderer.draw) ;
};

Renderer.setupAndStart = function () {

	Renderer.setupWebGL();

	/* create the matrix stack */
	Renderer.stack = new MatrixStack();

	/* initialize objects to be rendered */
	Renderer.setupWhatToDraw(Renderer.gl);

	Renderer.setupHowToDraw();

	/* add listeners for the mouse / keyboard events */
	Renderer.canvas.addEventListener('mousemove',on_mouseMove,false);
	Renderer.canvas.addEventListener('keydown',on_keydown,false);
	Renderer.canvas.addEventListener('keyup',on_keyup,false);

	Renderer.draw();
}

on_keyup = function(e){
	if (e.key == 'i' || e.key == 'j' || e.key == 'k' || e.key == 'l') {
		FreeCam.keys[e.key] = false;
	}
	Renderer.car.control_keys[e.key] = false;
}
on_keydown = function(e){
	if (e.key == 'i' || e.key == 'j' || e.key == 'k' || e.key == 'l') {
		FreeCam.keys[e.key] = true;
	}
	Renderer.car.control_keys[e.key] = true;
}
// for ControllableCamera
on_mouseMove = function(e){ 
	FreeCam.angles['h'] = (e.offsetX / Renderer.canvas.width) * 2 * Math.PI - Math.PI;
	FreeCam.angles['v'] = (e.offsetY / Renderer.canvas.height) * Math.PI / 2 - Math.PI / 4;
}

update_camera = function (value){
  Renderer.currentCamera = value;
}

window.onload = Renderer.setupAndStart;