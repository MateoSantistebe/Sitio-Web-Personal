class WebGLShader {
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
        this.mouseX = 0;
        this.mouseY = 0;
        this.isMouseDown = false;
        this.autoRotation = true;
        this.rotationX = 0;
        this.rotationY = 0;
        this.targetRotationX = 0;
        this.targetRotationY = 0;
        this.zoom = 8.0;
        this.targetZoom = 8.0;
        
        // Sistema de audio reactivo (opcional)
        this.audioSystem = null;
        this.audioUniform = null;
        
        // Parámetros para el control panel
        this.parameters = {
            sphereSize: 1.2,
            deformation: 0.1,
            complexity: 3.0,
            smoothness: 0.5,
            rotationSpeed: 0.3,
            textureIntensity: 0.0
        };
        
        this.controlPanel = null;
        this.parametersUniform = null;
        this.currentTexture = null;
        
        this.init();
    }

    init() {
        this.createCanvas();
        this.initWebGL();
        this.createShaderProgram();
        this.setupBuffers();
        this.setupEventListeners();
        this.render();
    }

    createCanvas() {
        this.canvas = document.createElement('canvas');
        this.canvas.style.display = 'block';
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.cursor = 'grab';
        
        this.canvas.oncontextmenu = (e) => {
            e.preventDefault();
            return false;
        };
        
        const container = document.getElementById('webgl-container');
        container.appendChild(this.canvas);
        
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    setupEventListeners() {
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouseX = (e.clientX - rect.left) / rect.width;
            this.mouseY = (e.clientY - rect.top) / rect.height;
            
            if (this.isMouseDown) {
                this.targetRotationY = (this.mouseX - 0.5) * Math.PI * 2;
                this.targetRotationX = (this.mouseY - 0.5) * Math.PI;
                this.autoRotation = false;
            }
        });

        this.canvas.addEventListener('mousedown', (e) => {
            if (e.button === 0) {
                this.isMouseDown = true;
                this.canvas.style.cursor = 'grabbing';
                this.autoRotation = false;
            }
        });

        this.canvas.addEventListener('mouseup', (e) => {
            if (e.button === 0) {
                this.isMouseDown = false;
                this.canvas.style.cursor = 'grab';
                setTimeout(() => {
                    if (!this.isMouseDown) {
                        this.autoRotation = true;
                    }
                }, 3000);
            }
        });

        this.canvas.addEventListener('mouseleave', () => {
            this.isMouseDown = false;
            this.canvas.style.cursor = 'grab';
        });

        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const zoomSpeed = 0.1;
            this.targetZoom += e.deltaY * -0.01 * zoomSpeed;
            this.targetZoom = Math.max(4.0, Math.min(15.0, this.targetZoom));
            this.autoRotation = false;
            
            clearTimeout(this.zoomTimeout);
            this.zoomTimeout = setTimeout(() => {
                this.autoRotation = true;
            }, 3000);
        });

        // Touch events
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.isMouseDown = true;
            this.autoRotation = false;
        });

        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const rect = this.canvas.getBoundingClientRect();
            const touch = e.touches[0];
            this.mouseX = (touch.clientX - rect.left) / rect.width;
            this.mouseY = (touch.clientY - rect.top) / rect.height;
            
            this.targetRotationY = (this.mouseX - 0.5) * Math.PI * 2;
            this.targetRotationX = (this.mouseY - 0.5) * Math.PI;
        });

        this.canvas.addEventListener('touchend', () => {
            this.isMouseDown = false;
            setTimeout(() => {
                if (!this.isMouseDown) {
                    this.autoRotation = true;
                }
            }, 3000);
        });

        document.addEventListener('contextmenu', (e) => {
            if (e.target === this.canvas) {
                e.preventDefault();
                return false;
            }
        });
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

            uniform float time;
            uniform vec2 resolution;
            uniform vec4 mouse;
            uniform vec4 audio;
            uniform vec3 u_parameters;

            float det = 0.001;
            float maxdist = 30.0;
            const int maxsteps = 100;
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
                float autoRot = time * u_parameters.z;
                float manualRotY = mouse.z * 2.0;
                float manualRotX = mouse.w * 1.0;
                
                p *= rotateY(autoRot + manualRotY);
                p *= rotateX(manualRotX);
                
                float bass = audio.x;
                float mid = audio.y;
                float high = audio.z;
                float volume = audio.w;
                
                // USAR PARÁMETROS DEL CONTROL PANEL
                float sphereSize = u_parameters.x * (1.0 + bass * 0.3);
                float deformation = u_parameters.y;
                
                float sphere1 = sdSphere(p, sphereSize + sin(time + p.x * 2.0) * deformation);
                
                vec3 torusPos = p;
                torusPos.xy *= rotate2d(time + mid * 2.0);
                float torus1 = sdTorus(torusPos, vec2(1.5, 0.3 + deformation));
                
                vec3 boxPos = p;
                boxPos.xy *= rotate2d(time * 1.5 + high * 3.0);
                boxPos.xz *= rotate2d(time * 0.7);
                float box1 = sdBox(boxPos + vec3(2.0 + bass, 0.0, 0.0), vec3(0.4, 0.4, 0.4));
                
                float capsule1 = sdCapsule(p, 
                    vec3(0.0, -1.0, 0.0), 
                    vec3(sin(time + volume * 5.0)*2.0, 1.0, cos(time + volume * 5.0)*2.0), 
                    0.2 + volume * 0.1);
                
                float shape = opSmoothUnion(sphere1, torus1, 0.5);
                shape = opSmoothUnion(shape, box1, 0.3);
                shape = opSmoothUnion(shape, capsule1, 0.4);
                
                return shape;
            }

            vec3 calcNormal(vec3 p) {
                vec2 e = vec2(0.001, 0.0);
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
                
                for(int i = 0; i < maxsteps; i++) {
                    p = from + totalDist * dir;
                    dist = scene(p);
                    totalDist += dist;
                    
                    if(abs(dist) < det || totalDist > maxdist) break;
                }
                
                if(abs(dist) < det) {
                    vec3 normal = calcNormal(p);
                    return lighting(p, dir, normal);
                } else {
                    float pattern = sin(dir.y * 20.0 + time) * 0.1 + 0.9;
                    return vec3(0.02) * pattern;
                }
            }

            void main() {
                vec2 uv = (gl_FragCoord.xy - 0.5 * resolution.xy) / resolution.y;
                
                float baseZoom = 8.0;
                float zoomAdjust = mouse.x * 7.0;
                float zoom = baseZoom - zoomAdjust;
                
                vec3 from = vec3(0.0, 0.0, -zoom);
                vec3 dir = normalize(vec3(uv, 1.0));
                
                vec3 col = march(from, dir);
                
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
    }

    compileShader(type, source) {
        const shader = this.gl.createShader(type);
        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);

        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            console.error('Error compiling shader:', this.gl.getShaderInfoLog(shader));
            this.gl.deleteShader(shader);
            return null;
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

        const currentTime = (Date.now() - this.startTime) * 0.001;
        
        if (this.autoRotation) {
            this.targetRotationY = currentTime * this.parameters.rotationSpeed;
            this.targetRotationX = Math.sin(currentTime * 0.1) * 0.5;
        }
        
        this.zoom += (this.targetZoom - this.zoom) * 0.1;
        this.rotationX += (this.targetRotationX - this.rotationX) * 0.1;
        this.rotationY += (this.targetRotationY - this.rotationY) * 0.1;
        
        let audioValues = [0.1, 0.1, 0.1, 0.1];
        if (this.audioSystem) {
            audioValues = this.audioSystem.getAudioValues();
        }
        
        this.gl.uniform1f(this.timeUniform, currentTime);
        this.gl.uniform2f(this.resolutionUniform, this.canvas.width, this.canvas.height);
        this.gl.uniform4f(this.mouseUniform, (this.zoom-4.0)/11.0, this.mouseY, this.rotationY, this.rotationX);
        this.gl.uniform4f(this.audioUniform, ...audioValues);
        this.gl.uniform3f(this.parametersUniform, 
            this.parameters.sphereSize,
            this.parameters.deformation, 
            this.parameters.rotationSpeed
        );

        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);

        this.animationFrame = requestAnimationFrame(() => this.render());
    }

    updateParameters(newParams) {
        Object.assign(this.parameters, newParams);
        console.log('Parameters updated:', this.parameters);
    }

    destroy() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
        if (this.gl) {
            this.gl.getExtension('WEBGL_lose_context')?.loseContext();
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new WebGLShader();
});