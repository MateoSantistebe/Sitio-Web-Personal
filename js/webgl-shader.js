class WebGLVisualizer {
    constructor() {
        this.canvas = null;
        this.gl = null;
        this.program = null;
        this.timeUniform = null;
        this.resolutionUniform = null;
        this.mouseUniform = null;
        this.startTime = Date.now();
        this.animationFrame = null;
        
        // Variables para interacción
        this.mouseX = 0.5; // Centrar inicialmente
        this.mouseY = 0.5; // Centrar inicialmente
        this.isMouseDown = false;
        this.autoRotation = true;
        this.rotationX = 0;
        this.rotationY = 0;
        this.targetRotationX = 0;
        this.targetRotationY = 0;
        this.zoom = 8.0;
        this.targetZoom = 8.0;
        this.zoomTimeout = null; // Para el timeout del zoom
        
        // Sistema de audio reactivo (opcional)
        this.audioSystem = null;
        this.audioUniform = null;
        
        // Parámetros para el control panel
        this.parameters = {
            sphereSize: 1.5,
            deformation: 0.3,
            complexity: 4.0,
            smoothness: 0.5,
            rotationSpeed: 0.3,
            textureIntensity: 0.0
        };
        
        this.controlPanel = null;
        this.parametersUniform = null;
        this.parametersUniform = null;
        this.extraParametersUniform = null;
        this.lastTextureIntensity = -1; // Para detectar cambios
        
        // Variables para texturas
        this.texture = null;
        this.textureUniform = null;
        this.hasTextureUniform = null;
        this.hasTexture = false;
        
        // Variables para logging
        this.lastHasTexture = false;
        this.textureActivated = false;
        
        // Referencias a event handlers para poder limpiarlos
        this.resizeHandler = () => this.resize();
        this.mouseMoveHandler = null;
        this.mouseDownHandler = null;
        this.mouseUpHandler = null;
        this.mouseLeaveHandler = null;
        this.wheelHandler = null;
        this.touchStartHandler = null;
        this.touchMoveHandler = null;
        this.touchEndHandler = null;
        this.contextMenuHandler = null;
    }

    init() {
        console.log('🚀 Initializing WebGL...');
        this.createCanvas();
        this.initWebGL();
        this.createShaderProgram();
        this.setupBuffers();
        this.resize();
        this.setupEventListeners();
        this.clearWebGLErrors();
        this.render();
        console.log('✅ WebGL initialization complete');
    }

    createCanvas() {
        const container = document.getElementById('webgl-container');
        if (!container) {
            console.error('❌ webgl-container not found!');
            return;
        }
        
        this.canvas = document.createElement('canvas');
        this.canvas.style.cursor = 'grab';
        this.canvas.style.display = 'block';
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        container.appendChild(this.canvas);
    }

    setupEventListeners() {
        // Listener para resize de ventana
        this.resizeHandler = () => {
            this.resize();
        };
        window.addEventListener('resize', this.resizeHandler);

        this.mouseMoveHandler = (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const currentMouseX = (e.clientX - rect.left) / rect.width;
            const currentMouseY = (e.clientY - rect.top) / rect.height;
            
            if (this.isMouseDown) {
                const deltaX = currentMouseX - this.mouseX;
                const deltaY = currentMouseY - this.mouseY;
                
                // Aplicar rotación basada en el movimiento del mouse
                this.targetRotationY += deltaX * 4; // Sensibilidad horizontal
                this.targetRotationX -= deltaY * 2; // Sensibilidad vertical (invertida para que sea más natural)
                
                // Limitar la rotación vertical para evitar que se voltee completamente
                this.targetRotationX = Math.max(-1.5, Math.min(1.5, this.targetRotationX));
                
                this.autoRotation = false;
            }
            
            // Actualizar posición del mouse siempre
            this.mouseX = currentMouseX;
            this.mouseY = currentMouseY;
        };
        this.canvas.addEventListener('mousemove', this.mouseMoveHandler);

        this.mouseDownHandler = (e) => {
            if (e.button === 0) {
                this.isMouseDown = true;
                this.canvas.style.cursor = 'grabbing';
                this.autoRotation = false;
                
                const rect = this.canvas.getBoundingClientRect();
                this.mouseX = (e.clientX - rect.left) / rect.width;
                this.mouseY = (e.clientY - rect.top) / rect.height;
            }
        };
        this.canvas.addEventListener('mousedown', this.mouseDownHandler);

        this.mouseUpHandler = (e) => {
            if (e.button === 0) {
                this.isMouseDown = false;
                this.canvas.style.cursor = 'grab';
                setTimeout(() => {
                    if (!this.isMouseDown) {
                        this.autoRotation = true;
                    }
                }, 3000);
            }
        };
        this.canvas.addEventListener('mouseup', this.mouseUpHandler);

        this.mouseLeaveHandler = () => {
            this.isMouseDown = false;
            this.canvas.style.cursor = 'grab';
        };
        this.canvas.addEventListener('mouseleave', this.mouseLeaveHandler);

        this.wheelHandler = (e) => {
            e.preventDefault();
            
            // Normalizar el deltaY para diferentes navegadores y dispositivos
            const delta = e.deltaY || e.detail || e.wheelDelta;
            const zoomSpeed = 0.3;
            
            if (delta > 0) {
                // Scroll hacia abajo = alejar
                this.targetZoom += zoomSpeed;
            } else {
                // Scroll hacia arriba = acercar
                this.targetZoom -= zoomSpeed;
            }
            
            // Limitar el zoom entre valores razonables
            this.targetZoom = Math.max(2.0, Math.min(20.0, this.targetZoom)); // Aumentado para esferas grandes
            
            // Desactivar auto-rotación temporalmente
            this.autoRotation = false;
            clearTimeout(this.zoomTimeout);
            this.zoomTimeout = setTimeout(() => {
                this.autoRotation = true;
            }, 2000);
            
            console.log('🔍 Zoom:', this.targetZoom.toFixed(2));
        };
        this.canvas.addEventListener('wheel', this.wheelHandler, { passive: false });

        // Touch events
        this.touchStartHandler = (e) => {
            e.preventDefault();
            this.isMouseDown = true;
            this.autoRotation = false;
            
            const rect = this.canvas.getBoundingClientRect();
            const touch = e.touches[0];
            this.mouseX = (touch.clientX - rect.left) / rect.width;
            this.mouseY = (touch.clientY - rect.top) / rect.height;
        };
        this.canvas.addEventListener('touchstart', this.touchStartHandler, { passive: false });

        this.touchMoveHandler = (e) => {
            e.preventDefault();
            if (this.isMouseDown && e.touches.length === 1) {
                const rect = this.canvas.getBoundingClientRect();
                const touch = e.touches[0];
                const currentMouseX = (touch.clientX - rect.left) / rect.width;
                const currentMouseY = (touch.clientY - rect.top) / rect.height;
                
                const deltaX = currentMouseX - this.mouseX;
                const deltaY = currentMouseY - this.mouseY;
                
                this.targetRotationY += deltaX * 4;
                this.targetRotationX -= deltaY * 2;
                this.targetRotationX = Math.max(-1.5, Math.min(1.5, this.targetRotationX));
                
                this.mouseX = currentMouseX;
                this.mouseY = currentMouseY;
            }
        };
        this.canvas.addEventListener('touchmove', this.touchMoveHandler, { passive: false });

        this.touchEndHandler = () => {
            this.isMouseDown = false;
            setTimeout(() => {
                if (!this.isMouseDown) {
                    this.autoRotation = true;
                }
            }, 3000);
        };
        this.canvas.addEventListener('touchend', this.touchEndHandler);

        this.contextMenuHandler = (e) => {
            if (e.target === this.canvas) {
                e.preventDefault();
                return false;
            }
        };
        document.addEventListener('contextmenu', this.contextMenuHandler);
        
        // Test simple para verificar que el canvas reciba eventos
        this.canvas.addEventListener('click', (e) => {
            console.log('🎯 CLICK TEST: Canvas clicked!', {
                clientX: e.clientX,
                clientY: e.clientY,
                target: e.target.tagName
            });
        });
        
        // Event listeners configurados correctamente
    }

    resize() {
        const container = document.getElementById('webgl-container');
        const rect = container.getBoundingClientRect();
        
        this.canvas.width = rect.width * window.devicePixelRatio;
        this.canvas.height = rect.height * window.devicePixelRatio;
        
        if (this.gl) {
            this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        }
        
        if (this.resolutionUniform) {
            this.gl.uniform2f(this.resolutionUniform, this.canvas.width, this.canvas.height);
        }
    }

    initWebGL() {
        this.gl = this.canvas.getContext('webgl') || this.canvas.getContext('experimental-webgl');
        
        if (!this.gl) {
            console.error('WebGL no está disponible en tu navegador');
            return;
        }
        
        this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
    }

    createShaderProgram() {
        const vertexShaderSource = `
            attribute vec2 aPosition;
            void main() {
                gl_Position = vec4(aPosition, 0.0, 1.0);
            }
        `;

        const fragmentShaderSource = `
            #ifdef GL_ES
            precision mediump float;
            #endif

            uniform vec2 resolution;
            uniform vec4 mouse;
            uniform float time;
            uniform vec4 audio;
            uniform vec4 u_parameters;
            uniform vec2 u_extra_params;
            uniform sampler2D u_texture;
            uniform bool u_hasTexture;

            float det = 0.0005; // Mayor precisión para evitar baches
            float maxdist = 100.0;  // Aumentado para formas muy deformadas
            const int maxsteps = 150; // Más pasos para evitar baches en rotación
            #define PI 3.14159265359

            mat2 rotate2d(float _angle){
                return mat2(cos(_angle),-sin(_angle),
                            sin(_angle),cos(_angle));
            }

            mat3 rotateX(float angle) {
                float c = cos(angle);
                float s = sin(angle);
                return mat3(
                    1.0, 0.0, 0.0,
                    0.0, c, -s,
                    0.0, s, c
                );
            }

            mat3 rotateY(float angle) {
                float c = cos(angle);
                float s = sin(angle);
                return mat3(
                    c, 0.0, s,
                    0.0, 1.0, 0.0,
                    -s, 0.0, c
                );
            }

            float opSmoothUnion(float d1, float d2, float k) {
                float h = clamp(0.5 + 0.5*(d2-d1)/k, 0.0, 1.0);
                return mix(d2, d1, h) - k*h*(1.0-h);
            }

            float sdSphere(vec3 p, float r) {
                return length(p) - r;
            }

            float sdBox(vec3 p, vec3 b) {
                vec3 q = abs(p) - b;
                return length(max(q,0.0)) + min(max(q.x,max(q.y,q.z)),0.0);
            }

            float sdTorus(vec3 p, vec2 t) {
                vec2 q = vec2(length(p.xz)-t.x,p.y);
                return length(q)-t.y;
            }

            float sdCapsule(vec3 p, vec3 a, vec3 b, float r) {
                vec3 pa = p - a, ba = b - a;
                float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
                return length(pa - ba * h) - r;
            }

            float scene(vec3 p) {
                // mouse.x = zoom normalizado, mouse.y = mouseY, mouse.z = rotationY, mouse.w = rotationX
                float manualRotY = mouse.z; // rotationY
                float manualRotX = mouse.w; // rotationX
                float autoRot = time * u_parameters.z;
                
                // Aplicar rotaciones
                p *= rotateY(autoRot + manualRotY);
                p *= rotateX(manualRotX);
                
                float bass = audio.x;
                float mid = audio.y;
                float high = audio.z;
                float volume = audio.w;
                
                // USAR PARÁMETROS DEL CONTROL PANEL
                float sphereSize = u_parameters.x * (1.0 + bass * 0.3);
                float deformation = u_parameters.y;
                float complexity = u_parameters.w;
                float textureIntensity = u_extra_params.x;
                
                // Esfera principal con deformación más visible
                float sphere1 = sdSphere(p, sphereSize + sin(time * complexity + p.x * 2.0) * deformation);
                
                // Torus con tamaño afectado por complexity
                vec3 torusPos = p;
                torusPos.xy *= rotate2d(time + mid * 2.0);
                float torusSize = 1.5 + (complexity - 3.0) * 0.2;
                float torus1 = sdTorus(torusPos, vec2(torusSize, 0.3 + deformation));
                
                // Múltiples cajas basadas en complexity (usando límites constantes)
                float boxes = 100.0;
                
                // Caja 1
                if (complexity >= 1.0) {
                    vec3 boxPos1 = p;
                    boxPos1.xy *= rotate2d(time * 1.0 + high * 3.0);
                    boxPos1.xz *= rotate2d(time * 0.7);
                    float box1 = sdBox(boxPos1 + vec3(2.0 + bass, 0.0, 0.0), vec3(0.4, 0.4, 0.4));
                    boxes = min(boxes, box1);
                }
                
                // Caja 2
                if (complexity >= 2.0) {
                    vec3 boxPos2 = p;
                    boxPos2.xy *= rotate2d(time * 1.3 + high * 3.0);
                    boxPos2.xz *= rotate2d(time * 0.7 + 1.0);
                    float box2 = sdBox(boxPos2 + vec3(2.5 + bass, 0.0, 0.0), vec3(0.35, 0.35, 0.35));
                    boxes = min(boxes, box2);
                }
                
                // Caja 3
                if (complexity >= 3.0) {
                    vec3 boxPos3 = p;
                    boxPos3.xy *= rotate2d(time * 1.6 + high * 3.0);
                    boxPos3.xz *= rotate2d(time * 0.7 + 2.0);
                    float box3 = sdBox(boxPos3 + vec3(3.0 + bass, 0.0, 0.0), vec3(0.3, 0.3, 0.3));
                    boxes = min(boxes, box3);
                }
                
                // Caja 4
                if (complexity >= 4.0) {
                    vec3 boxPos4 = p;
                    boxPos4.xy *= rotate2d(time * 1.9 + high * 3.0);
                    boxPos4.xz *= rotate2d(time * 0.7 + 3.0);
                    float box4 = sdBox(boxPos4 + vec3(3.5 + bass, 0.0, 0.0), vec3(0.25, 0.25, 0.25));
                    boxes = min(boxes, box4);
                }
                
                // Cajas adicionales para complexity mayor
                if (complexity >= 5.0) {
                    vec3 boxPos5 = p;
                    boxPos5.xy *= rotate2d(time * 2.2 + high * 3.0);
                    boxPos5.xz *= rotate2d(time * 0.7 + 4.0);
                    float box5 = sdBox(boxPos5 + vec3(4.0 + bass, 0.0, 0.0), vec3(0.2, 0.2, 0.2));
                    boxes = min(boxes, box5);
                }
                
                if (complexity >= 6.0) {
                    vec3 boxPos6 = p;
                    boxPos6.xy *= rotate2d(time * 2.5 + high * 3.0);
                    boxPos6.xz *= rotate2d(time * 0.7 + 5.0);
                    float box6 = sdBox(boxPos6 + vec3(1.5 + bass, 0.0, 0.0), vec3(0.15, 0.15, 0.15));
                    boxes = min(boxes, box6);
                }
                
                if (complexity >= 7.0) {
                    vec3 boxPos7 = p;
                    boxPos7.xy *= rotate2d(time * 2.8 + high * 3.0);
                    boxPos7.xz *= rotate2d(time * 0.7 + 6.0);
                    float box7 = sdBox(boxPos7 + vec3(1.0 + bass, 0.0, 0.0), vec3(0.1, 0.1, 0.1));
                    boxes = min(boxes, box7);
                }
                
                if (complexity >= 8.0) {
                    vec3 boxPos8 = p;
                    boxPos8.xy *= rotate2d(time * 3.1 + high * 3.0);
                    boxPos8.xz *= rotate2d(time * 0.7 + 7.0);
                    float box8 = sdBox(boxPos8 + vec3(0.5 + bass, 0.0, 0.0), vec3(0.05, 0.05, 0.05));
                    boxes = min(boxes, box8);
                }
                
                // Cápsula con movimiento más dinámico
                float capsule1 = sdCapsule(p, 
                    vec3(0.0, -1.0, 0.0), 
                    vec3(sin(time * complexity + volume * 5.0)*2.0, 1.0, cos(time * complexity + volume * 5.0)*2.0), 
                    0.2 + volume * 0.1 + deformation * 0.5);
                
                // Combinar formas con smoothness variable
                float smoothness = 0.5 + deformation * 0.5;
                float shape = opSmoothUnion(sphere1, torus1, smoothness);
                shape = opSmoothUnion(shape, boxes, smoothness * 0.6);
                shape = opSmoothUnion(shape, capsule1, smoothness * 0.8);
                
                return shape;
            }

            vec3 calcNormal(vec3 p) {
                // Epsilon más pequeño para mayor precisión en formas deformadas
                float deformation = u_parameters.y;
                float eps = 0.001 * (1.0 - deformation * 0.3); // Más precisión con más deformación
                vec2 e = vec2(eps, 0.0);
                return normalize(vec3(
                    scene(p + e.xyy) - scene(p - e.xyy),
                    scene(p + e.yxy) - scene(p - e.yxy),
                    scene(p + e.yyx) - scene(p - e.yyx)
                ));
            }

            vec3 lighting(vec3 p, vec3 dir, vec3 normal) {
                vec3 lightPos = vec3(5.0, 3.0, -2.0);
                vec3 lightDir = normalize(lightPos - p);
                
                float diff = max(dot(normal, lightDir), 0.0);
                vec3 reflectDir = reflect(-lightDir, normal);
                float spec = pow(max(dot(dir, reflectDir), 0.0), 32.0);
                float amb = 0.1;
                
                float shadow = 1.0;
                vec3 shadowRay = p + normal * 0.1;
                for(int i = 0; i < 10; i++) {
                    float dist = scene(shadowRay);
                    if(dist < 0.001) {
                        shadow = 0.3;
                        break;
                    }
                    shadowRay += lightDir * dist;
                    if(length(shadowRay - p) > 15.0) break;
                }
                
                vec3 col = vec3(1.0);
                return col * (amb + diff * shadow) + spec * 0.5;
            }

            vec3 march(vec3 from, vec3 dir) {
                float totalDist = 0.0;
                vec3 p = from;
                float dist = 0.0;
                
                // Precisión adaptativa basada en deformación
                float deformation = u_parameters.y;
                float adaptiveDet = det * (1.0 - deformation * 0.5); // Más precisión con más deformación
                
                for(int i = 0; i < maxsteps; i++) {
                    p = from + totalDist * dir;
                    dist = scene(p);
                    totalDist += dist;
                    
                    if(abs(dist) < adaptiveDet || totalDist > maxdist) break;
                }
                
                if(abs(dist) < det) {
                    vec3 normal = calcNormal(p);
                    return lighting(p, dir, normal);
                } else {
                    // Fondo simple pero visible
                    float pattern = sin(dir.y * 20.0 + time) * 0.1 + 0.9;
                    return vec3(0.03, 0.04, 0.08) * pattern;
                }
            }

            void main() {
                vec2 uv = (gl_FragCoord.xy - 0.5 * resolution.xy) / resolution.y;
                
                // Zoom adaptativo basado en tamaño de esfera y deformación
                float sphereSize = u_parameters.x; // Tamaño de la esfera
                float deformation = u_parameters.y; // Deformación
                float adaptiveBaseZoom = 8.0 + sphereSize * 2.0 + deformation * 1.5; // Considera ambos parámetros
                float zoomAdjust = mouse.x * 12.0;
                float zoom = adaptiveBaseZoom - zoomAdjust;
                
                vec3 from = vec3(0.0, 0.0, -zoom);
                vec3 dir = normalize(vec3(uv, 1.0));
                
                vec3 col = march(from, dir);
                
                // Efecto de textura de imagen usando textureIntensity
                float textureIntensity = u_extra_params.x;
                if (textureIntensity > 0.0 && u_hasTexture) {
                    // Usar coordenadas UV para samplear la textura
                    vec2 texUV = (uv + 1.0) * 0.5; // Convertir de [-1,1] a [0,1]
                    texUV.y = 1.0 - texUV.y; // Flip Y para corregir orientación
                    
                    // Samplear la textura
                    vec3 textureColor = texture2D(u_texture, texUV).rgb;
                    
                    // Aplicar textura con intensidad controlable
                    col = mix(col, col * textureColor, textureIntensity);
                } else if (textureIntensity > 0.0) {
                    // Fallback: patrón procedural si no hay textura
                    vec2 texUV = uv * 5.0 + time * 0.2;
                    float pattern = sin(texUV.x * 3.14159) * sin(texUV.y * 3.14159) * 0.5 + 0.5;
                    vec3 patternColor = vec3(pattern * 0.5, pattern * 0.7, pattern * 0.9);
                    col = mix(col, col * patternColor, textureIntensity * 0.5);
                }
                
                float scanline = sin(gl_FragCoord.y * 1.5) * 0.02 + 0.98;
                col *= scanline;
                
                vec2 vignette = uv * 1.2;
                float vign = 1.0 - dot(vignette, vignette) * 0.2;
                col *= vign;
                
                col = pow(col, vec3(1.1));
                
                gl_FragColor = vec4(col, 1.0);
            }
        `;

        const vertexShader = this.compileShader(this.gl.VERTEX_SHADER, vertexShaderSource);
        const fragmentShader = this.compileShader(this.gl.FRAGMENT_SHADER, fragmentShaderSource);

        this.program = this.gl.createProgram();
        this.gl.attachShader(this.program, vertexShader);
        this.gl.attachShader(this.program, fragmentShader);
        this.gl.linkProgram(this.program);

        if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)) {
            console.error('Error linking program:', this.gl.getProgramInfoLog(this.program));
        }

        this.gl.useProgram(this.program);

        this.timeUniform = this.gl.getUniformLocation(this.program, "time");
        this.resolutionUniform = this.gl.getUniformLocation(this.program, "resolution");
        this.mouseUniform = this.gl.getUniformLocation(this.program, "mouse");
        this.audioUniform = this.gl.getUniformLocation(this.program, "audio");
        this.parametersUniform = this.gl.getUniformLocation(this.program, "u_parameters");
        this.extraParametersUniform = this.gl.getUniformLocation(this.program, "u_extra_params");
        this.textureUniform = this.gl.getUniformLocation(this.program, "u_texture");
        this.hasTextureUniform = this.gl.getUniformLocation(this.program, "u_hasTexture");
        
        // Uniforms inicializados
    }

    compileShader(type, source) {
        const shader = this.gl.createShader(type);
        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);

        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            const error = this.gl.getShaderInfoLog(shader);
            const shaderType = type === this.gl.VERTEX_SHADER ? 'VERTEX' : 'FRAGMENT';
            console.error(`❌ ${shaderType} SHADER COMPILATION ERROR:`);
            console.error(error);
            
            // Mostrar solo las líneas problemáticas para evitar spam
            const lines = source.split('\n');
            const errorLines = error.match(/ERROR: \d+:(\d+)/g);
            if (errorLines) {
                errorLines.forEach(errorLine => {
                    const lineNum = parseInt(errorLine.match(/\d+:(\d+)/)[1]);
                    const start = Math.max(0, lineNum - 3);
                    const end = Math.min(lines.length, lineNum + 2);
                    console.log(`Lines ${start + 1}-${end}:`);
                    for (let i = start; i < end; i++) {
                        const marker = i === lineNum - 1 ? '>>> ' : '    ';
                        console.log(`${marker}${(i + 1).toString().padStart(3, ' ')}: ${lines[i]}`);
                    }
                });
            }
            
            this.gl.deleteShader(shader);
            throw new Error(`${shaderType} shader compilation failed: ${error}`);
        }

        return shader;
    }

    setupBuffers() {
        const vertices = new Float32Array([
            -1.0, -1.0,
             1.0, -1.0,
            -1.0,  1.0,
             1.0,  1.0
        ]);

        const vertexBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, vertexBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, vertices, this.gl.STATIC_DRAW);

        const positionAttribute = this.gl.getAttribLocation(this.program, "aPosition");
        this.gl.enableVertexAttribArray(positionAttribute);
        this.gl.vertexAttribPointer(positionAttribute, 2, this.gl.FLOAT, false, 0, 0);
    }

    render() {
        if (!this.gl) return;

        try {
            const currentTime = (Date.now() - this.startTime) * 0.001;
        
        if (this.autoRotation) {
            this.targetRotationY = currentTime * this.parameters.rotationSpeed;
            this.targetRotationX = Math.sin(currentTime * 0.1) * 0.5;
        }
        
        // Interpolación más suave para zoom y rotación
        const lerpFactor = this.isMouseDown ? 0.15 : 0.08; // Más rápido cuando se arrastra
        this.zoom += (this.targetZoom - this.zoom) * 0.12;
        this.rotationX += (this.targetRotationX - this.rotationX) * lerpFactor;
        this.rotationY += (this.targetRotationY - this.rotationY) * lerpFactor;
        
        let audioValues = [0.1, 0.1, 0.1, 0.1];
        if (this.audioSystem) {
            audioValues = this.audioSystem.getAudioValues();
        }
        
        this.gl.uniform1f(this.timeUniform, currentTime);
        this.gl.uniform2f(this.resolutionUniform, this.canvas.width, this.canvas.height);
        this.gl.uniform4f(this.mouseUniform, (this.zoom-4.0)/11.0, this.mouseY, this.rotationY, this.rotationX);
        this.gl.uniform4f(this.audioUniform, ...audioValues);
        
        // Debug logs removidos para mejor rendimiento
        
        // Pasar todos los parámetros principales al shader
        this.gl.uniform4f(this.parametersUniform, 
            this.parameters.sphereSize,
            this.parameters.deformation, 
            this.parameters.rotationSpeed,
            this.parameters.complexity
        );
        
        // Pasar parámetros adicionales
        if (this.extraParametersUniform) {
            this.gl.uniform2f(this.extraParametersUniform, 
                this.parameters.textureIntensity,
                this.parameters.smoothness || 0.5
            );
            
            // Texture intensity tracking sin logs
        }
        
        // Actualizar uniforms de textura
        if (this.hasTextureUniform) {
            this.gl.uniform1i(this.hasTextureUniform, this.hasTexture ? 1 : 0);
            
            // Texture state tracking sin logs
            if (this.lastHasTexture !== this.hasTexture) {
                console.log('🖼️ WebGL Shader: hasTexture uniform updated:', this.hasTexture);
                this.lastHasTexture = this.hasTexture;
            }
        }
        
        if (this.textureUniform && this.texture && this.hasTexture) {
            this.gl.activeTexture(this.gl.TEXTURE0);
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
            this.gl.uniform1i(this.textureUniform, 0);
            
            // Log solo cuando se activa la textura por primera vez
            if (!this.textureActivated) {
                console.log('🎨 WebGL Shader: Texture activated and bound to TEXTURE0');
                this.textureActivated = true;
            }
        }

        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);

            // Verificar errores WebGL (solo en desarrollo)
            if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
                const error = this.gl.getError();
                if (error !== this.gl.NO_ERROR) {
                    console.warn('⚠️ WebGL Error in render:', error);
                }
            }

        } catch (error) {
            console.error('❌ Error in render loop:', error);
            // Continuar la animación incluso si hay errores
        }

        this.animationFrame = requestAnimationFrame(() => this.render());
    }

    updateParameters(newParams) {
        console.log('🔄 WebGL Shader: Updating parameters:', newParams);
        Object.assign(this.parameters, newParams);
        console.log('✅ WebGL Shader: Parameters after update:', this.parameters);
        
        // Verificar que los uniforms principales estén disponibles
        if (this.parametersUniform === null) {
            console.error('❌ parametersUniform not initialized!');
        }
        if (this.extraParametersUniform === null) {
            console.warn('⚠️ extraParametersUniform not available (texturas no funcionarán)');
        }
    }

    clearWebGLErrors() {
        if (!this.gl) return;
        
        let errorCount = 0;
        let error;
        while ((error = this.gl.getError()) !== this.gl.NO_ERROR && errorCount < 10) {
            errorCount++;
        }
        
        if (errorCount > 0) {
            console.log(`🧹 Cleared ${errorCount} WebGL errors`);
        }
    }
    
    createTextureFromImage(image) {
        console.log('🖼️ WebGL Shader: Creating texture from image:', image.width, 'x', image.height);
        
        if (!this.gl) {
            console.error('❌ WebGL Shader: GL context not available');
            return;
        }
        
        // Eliminar textura anterior si existe
        if (this.texture) {
            console.log('🗑️ WebGL Shader: Deleting previous texture');
            this.gl.deleteTexture(this.texture);
        }
        
        // Crear nueva textura
        this.texture = this.gl.createTexture();
        if (!this.texture) {
            console.error('❌ WebGL Shader: Failed to create texture');
            return;
        }
        
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
        
        // Configurar parámetros de textura
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
        
        // Cargar imagen en la textura
        try {
            this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, image);
            console.log('📤 WebGL Shader: Image data uploaded to GPU');
        } catch (err) {
            console.error('❌ WebGL Shader: Failed to upload image data:', err);
            return;
        }
        
        this.hasTexture = true;
        console.log('✅ WebGL Shader: Texture created successfully, hasTexture =', this.hasTexture);
        console.log('🎛️ WebGL Shader: Current texture intensity:', this.parameters.textureIntensity);
        
        // Verificar uniforms
        console.log('🔗 WebGL Shader: Texture uniforms:', {
            textureUniform: this.textureUniform,
            hasTextureUniform: this.hasTextureUniform
        });
    }

    destroy() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
        
        // Limpiar textura
        if (this.gl && this.texture) {
            this.gl.deleteTexture(this.texture);
        }
        
        // Limpiar event listeners para evitar memory leaks
        if (this.canvas) {
            // Remover todos los event listeners del canvas
            this.canvas.removeEventListener('mousemove', this.mouseMoveHandler);
            this.canvas.removeEventListener('mousedown', this.mouseDownHandler);
            this.canvas.removeEventListener('mouseup', this.mouseUpHandler);
            this.canvas.removeEventListener('mouseleave', this.mouseLeaveHandler);
            this.canvas.removeEventListener('wheel', this.wheelHandler);
            this.canvas.removeEventListener('touchstart', this.touchStartHandler);
            this.canvas.removeEventListener('touchmove', this.touchMoveHandler);
            this.canvas.removeEventListener('touchend', this.touchEndHandler);
        }
        
        // Remover event listeners globales
        window.removeEventListener('resize', this.resizeHandler);
        document.removeEventListener('contextmenu', this.contextMenuHandler);
        
        if (this.gl) {
            this.gl.getExtension('WEBGL_lose_context')?.loseContext();
        }
    }
}

// Inicialización manejada desde index.html para evitar conflictos