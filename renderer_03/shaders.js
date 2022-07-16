shader = function (gl) {
  var vertexShaderSource = `
	uniform   mat4 uM;
	uniform   mat4 uProjectionMatrix;
	uniform   mat4 uLightProjectionMatrix;
	uniform   mat4 uInverseViewMatrix;
	uniform   mat4 uHeadlightsViewMatrixR;
	uniform   mat4 uHeadlightsViewMatrixL;

	uniform   vec3 uColor;
	
	attribute vec3 aPosition;
	attribute vec3 aNormal;
	attribute vec2 aTexCoords;

	// vertex position in ViewSpace
	varying vec3 vPosVS;
	// view direction in VieSpace
	varying vec3 vViewVS;
	// vertex normal in ViewSpace
	varying vec3 vNormalVS;
	// texture coordinates
	varying vec2 vTexCoords;
	// texture coordinates of projectors (R - L)
	varying vec4 vprojected_texThingR;
	varying vec4 vprojected_texThingL;

	void main(void){
		vec4 position = vec4(aPosition, 1.0);
		
		mat4 normalMatrixVS = uM;

		vNormalVS = normalize(normalMatrixVS * vec4(aNormal, 0)).xyz;
		vTexCoords = vec2(aTexCoords.x,aTexCoords.y);
		vPosVS = vec3(uM * position); 
		vViewVS = normalize(-vPosVS);		
		vprojected_texThingR = uLightProjectionMatrix * uHeadlightsViewMatrixR * uInverseViewMatrix * uM * position;
		vprojected_texThingL = uLightProjectionMatrix * uHeadlightsViewMatrixL * uInverseViewMatrix * uM * position;

		// output
		gl_Position = uProjectionMatrix * uM * position;
	}`;
	
  var fragmentShaderSource = `
	precision highp float;

	uniform mat4 uViewMatrix;
	uniform mat4 uInverseViewMatrix;
	uniform mat4 uHeadlightsViewMatrixL;
	uniform mat4 uHeadlightsViewMatrixR;

	// positional light: position and color
	uniform vec3 uLightColor;
	uniform vec3 uColor;
	uniform vec3 uLightDirection;
	
	uniform sampler2D uSampler;
	uniform sampler2D uProjectionSamplerR;
	uniform sampler2D uDepthSamplerR;
	uniform sampler2D uProjectionSamplerL;
	uniform sampler2D uDepthSamplerL;
	
	uniform float uSolidColor;

	varying vec3 vNormalVS;
	varying vec3 vPosVS;
	varying vec3 vViewVS;
	varying vec2 vTexCoords;

	varying vec4 vprojected_texThingR;
	varying vec4 vprojected_texThingL;

	float k_ambient = 0.5;
	float k_specular = 0.3;
	uniform float uTextureON;

	uniform vec3 uLampLocation[12];

	float specularComp(vec3 N, vec3 L, float NdotL){
		vec3 R = normalize((2.0 * NdotL * N) - L);
		float RdotV = max(0.0, dot(R,vViewVS));
		float specular = pow(RdotV, 10.0); 
		return specular;
	}

	vec3 headlightTexture(mat4 hvm, vec4 vDepthTCoords, sampler2D depthSampler, sampler2D ProjectionSampler, vec3 posW){
		
		vec2 projTC = (vDepthTCoords/vDepthTCoords.z).xy * .5 + .5;
		vec3 projected_tex = texture2D(ProjectionSampler, projTC).xyz;
		
		float light_contrib = 0.0;
				
		float ProjectorZ = (hvm * uInverseViewMatrix * vec4(vPosVS, 1.0)).z;

		if( ProjectorZ < -2.0 && projTC.x <= 1.0 && projTC.x >= 0.0 && projTC.y <= 1.0 && projTC.y >= 0.0)
				light_contrib = 1.0;

		vec3 tC = (vDepthTCoords/vDepthTCoords.w).xyz*0.5+0.5;

		if(ProjectorZ < -1.0 && tC.x > 0.0 && tC.x < 1.0 && tC.y > 0.0 && tC.y < 1.0 ){
			float storedDepth ;
			float bias = 0.01;
			storedDepth =  texture2D(depthSampler,tC.xy).x;
			if(storedDepth + bias < tC.z)
				light_contrib = 0.0;
		}
		
		vec3 pos = (hvm * vec4(posW, 1.)).xyz;
		// Falloff
		light_contrib /= length(pos*pos);
		// Intensity
		light_contrib *= 15.0;

		return projected_tex * light_contrib;
	}


	void main()
	{

		// position in world space and "headlight space"
		vec3 posWS = (uInverseViewMatrix * vec4(vPosVS, 1.)).xyz;

		vec3 N = normalize(vNormalVS);
		// light vector (positional light)
		vec3 L = normalize(uViewMatrix * vec4(-uLightDirection, 0)).xyz;

		vec3 headlightR = headlightTexture(uHeadlightsViewMatrixR,
												 vprojected_texThingR,
												 uDepthSamplerR,
												 uProjectionSamplerR,
												 posWS);
		vec3 headlightL = headlightTexture(uHeadlightsViewMatrixL,
												 vprojected_texThingL,
												 uDepthSamplerL,
												 uProjectionSamplerL,
												 posWS);
		vec3 headlightComp = headlightR + headlightL;

		/* if ogject has not texture : uTextureON = 0 */
		vec3 color_tex = uTextureON * texture2D(uSampler, vTexCoords).xyz + (1.0 - uTextureON) * uColor + headlightComp;

		float NdotL = max(0.0, dot(N,L));
		float diff = max(k_ambient, NdotL);		
		float specular = specularComp(N, L, NdotL);

		vec3 final_color = (color_tex * diff) + (uLightColor * k_specular * specular);
		
//LAMPS-------
		vec3 lamp_color = vec3(0.8,0.8,0.45);
		float outer = 0.5; 
		float inner = 0.8;

		for(int i = 0; i < 12; i++){
			vec3 lampPosVS = (uViewMatrix * vec4(uLampLocation[i], 1.0)).xyz;
			vec3 lampL = (lampPosVS + (uViewMatrix * vec4(0.0,3.0,0.0,0.0)).xyz) - vPosVS;
			vec3 fS;
			float length = sqrt(dot(lampL, lampL));

			float lamp_NdotL = max(0.0, dot(N, normalize(lampL)));
			
			float lamp_specular = specularComp(N, lampL, lamp_NdotL);

			vec3 lamp_contribution = max(0.0, dot(N, lampL) / (length*length)) * lamp_color + (lamp_color * lamp_specular * k_specular);
	
			float alpha = dot(normalize(lampL), normalize((uViewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz));

			if(alpha >= inner) 
				fS = lamp_contribution * 1.0;
			if(alpha > outer && alpha < inner)
				fS = lamp_contribution * ((alpha - outer)*(1.0 / (inner - outer)));
			
			final_color += fS;
		}
//--------LAMPS		

		//per testa del lampione
		if(uSolidColor > 0.0) final_color = uColor;

		gl_FragColor  = vec4(final_color, 1.0);
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
  gl.bindAttribLocation(shaderProgram, aDiffuseIndex, "aDiffuse");
  gl.bindAttribLocation(shaderProgram, aNormalIndex, "aNormal");
  gl.bindAttribLocation(shaderProgram, aTexCoordsIndex, "aTexCoords");

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
  
  shaderProgram.uLightDirectionLocation  = gl.getUniformLocation(shaderProgram, "uLightDirection");
  shaderProgram.uLightColorLocation = gl.getUniformLocation(shaderProgram, "uLightColor");

  shaderProgram.uTextureON  = gl.getUniformLocation(shaderProgram, "uTextureON");
  shaderProgram.uSolidColor = gl.getUniformLocation(shaderProgram, "uSolidColor");

  shaderProgram.uSamplerLocation  = gl.getUniformLocation(shaderProgram, "uSampler");

  shaderProgram.uProjectionSamplerRLocation  = gl.getUniformLocation(shaderProgram, "uProjectionSamplerR");
  shaderProgram.uProjectionSamplerLLocation  = gl.getUniformLocation(shaderProgram, "uProjectionSamplerL");

  shaderProgram.uHeadlightsViewMatrixR = gl.getUniformLocation(shaderProgram, "uHeadlightsViewMatrixR");
  shaderProgram.uHeadlightsViewMatrixL = gl.getUniformLocation(shaderProgram, "uHeadlightsViewMatrixL");

  shaderProgram.uDepthSamplerRLocation   = gl.getUniformLocation(shaderProgram, "uDepthSamplerR");
  shaderProgram.uDepthSamplerLLocation   = gl.getUniformLocation(shaderProgram, "uDepthSamplerL");

  shaderProgram.uLampLocation= new Array();
  for(var i = 0; i < 12; ++i)
    shaderProgram.uLampLocation[i] = gl.getUniformLocation(shaderProgram,"uLampLocation["+i+"]");
  
  shaderProgram.vertex_shader = vertexShaderSource;
  shaderProgram.fragment_shader = fragmentShaderSource;

  return shaderProgram;
};