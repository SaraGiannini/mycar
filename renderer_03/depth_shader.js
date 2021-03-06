depthShader = function (gl) {
  var vertexShaderSource = `
	uniform   mat4 uM;
	uniform   mat4 uProjectionMatrix;
	uniform   mat4 uLightProjectionMatrix;
	uniform   mat4 uViewMatrix;
	uniform   mat4 uInverseViewMatrix;
	uniform   mat4 uHeadlightsViewMatrix;
	uniform   vec3 uColor;

	attribute vec3 aPosition;

	void main(void)
	{
		gl_Position = uProjectionMatrix * uHeadlightsViewMatrix * uInverseViewMatrix *  uM * vec4(aPosition, 1.0);
	}
`;
  var fragmentShaderSource = `
	precision highp float;
	uniform vec3 uColor;

	void main()
	{
		gl_FragColor  = vec4(uColor, 1.0);
	}
`;

  // create the vertex shader
  var vertexShader = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vertexShader, vertexShaderSource);
  gl.compileShader(vertexShader);

  // create the fragment shader
  var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fragmentShader, fragmentShaderSource);
  gl.compileShader(fragmentShader);

  // Create the shader program
  var aPositionIndex = 0;
  var aDiffuseIndex = 1;
  var aNormalIndex = 2;
  var aTexCoordsIndex = 3;

  var shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  
  gl.bindAttribLocation(shaderProgram, aPositionIndex, "aPosition");

  gl.linkProgram(shaderProgram);

  // If creating the shader program failed, alert
  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    var str = "Unable to initialize the shader program.n";
    str += "VS:\n" + gl.getShaderInfoLog(vertexShader) + "n";
    str += "FS:\n" + gl.getShaderInfoLog(fragmentShader) + "n";
    str += "PROG:\n" + gl.getProgramInfoLog(shaderProgram);
    alert(str);
  }

  shaderProgram.aPositionIndex = aPositionIndex;
  shaderProgram.aDiffuseIndex = aDiffuseIndex;
  shaderProgram.aNormalIndex = aNormalIndex;
  shaderProgram.aTexCoordsIndex = aTexCoordsIndex;

  shaderProgram.uM  = gl.getUniformLocation(shaderProgram, "uM");
  shaderProgram.uProjectionMatrixLocation = gl.getUniformLocation(shaderProgram, "uProjectionMatrix");
  shaderProgram.uLightProjectionMatrixLocation = gl.getUniformLocation(shaderProgram, "uLightProjectionMatrix");
  shaderProgram.uViewMatrixLocation = gl.getUniformLocation(shaderProgram, "uViewMatrix");
  shaderProgram.uInverseViewMatrixLocation = gl.getUniformLocation(shaderProgram, "uInverseViewMatrix");
  shaderProgram.uColorLocation            = gl.getUniformLocation(shaderProgram, "uColor");
  shaderProgram.uHeadlightsViewMatrix = gl.getUniformLocation(shaderProgram, "uHeadlightsViewMatrix");

  shaderProgram.vertex_shader = vertexShaderSource;
  shaderProgram.fragment_shader = fragmentShaderSource;

  return shaderProgram;
};
