class ControlPanel {
    constructor(webglShader) {
        this.webglShader = webglShader;
        this.isVisible = false;
        this.panel = null;
        this.textureImage = null;
        
        this.init();
    }

    init() {
        this.createPanel();
        this.setupEventListeners();
    }

    createPanel() {
        this.panel = document.createElement('div');
        this.panel.className = 'control-panel';
        this.panel.innerHTML = `
            <div class="panel-header">
                <h3>CONTROL PANEL</h3>
                <button class="toggle-btn">−</button>
            </div>
            
            <div class="panel-content">
                <div class="control-section">
                    <h4>FORMA GEOMÉTRICA</h4>
                    
                    <div class="control-group">
                        <label>Tamaño Esfera:</label>
                        <input type="range" id="sphereSize" min="0.3" max="4.0" step="0.1" value="1.5" class="slider">
                        <span class="value" id="sphereSizeValue">1.5</span>
                    </div>
                    
                    <div class="control-group">
                        <label>Deformación:</label>
                        <input type="range" id="deformation" min="0.0" max="2.0" step="0.1" value="0.3" class="slider">
                        <span class="value" id="deformationValue">0.3</span>
                    </div>
                    
                    <div class="control-group">
                        <label>Complejidad:</label>
                        <input type="range" id="complexity" min="1" max="8" step="1" value="4" class="slider">
                        <span class="value" id="complexityValue">4</span>
                    </div>
                </div>
                
                <div class="control-section">
                    <h4>ROTACIÓN</h4>
                    
                    <div class="control-group">
                        <label>Velocidad Auto:</label>
                        <input type="range" id="rotationSpeed" min="0.0" max="2.0" step="0.1" value="0.3" class="slider">
                        <span class="value" id="rotationSpeedValue">0.3</span>
                    </div>
                </div>
                
                <div class="control-section">
                    <h4>TEXTURA</h4>
                    
                    <div class="control-group">
                        <label for="textureUpload">Cargar Imagen:</label>
                        <input type="file" id="textureUpload" accept="image/*" class="file-input">
                    </div>
                    
                    <div class="control-group">
                        <label>Intensidad Textura:</label>
                        <input type="range" id="textureIntensity" min="0.0" max="1.0" step="0.1" value="0.0" class="slider">
                        <span class="value" id="textureIntensityValue">0.0</span>
                    </div>
                    
                    <button id="resetTexture" class="action-btn">Reset Textura</button>
                </div>
                
                <div class="control-section">
                    <h4>AUDIO</h4>
                    
                    <div class="control-group">
                        <label>Volumen:</label>
                        <input type="range" id="audioVolume" min="0.0" max="1.0" step="0.1" value="0.1" class="slider">
                        <span class="value" id="audioVolumeValue">0.1</span>
                    </div>
                </div>
                
                <div class="action-buttons">
                    <button id="resetAll" class="action-btn reset">Reset Todo</button>
                    <button id="randomize" class="action-btn random">Aleatorizar</button>
                    <button id="debugTexture" class="action-btn">🔍 Debug Textura</button>
                </div>
            </div>
        `;

        document.body.appendChild(this.panel);
        this.hidePanel();
    }

    setupEventListeners() {
        this.panel.querySelector('.toggle-btn').addEventListener('click', () => {
            this.togglePanel();
        });

        // Sliders de forma
        this.setupSlider('sphereSize', 'sphereSizeValue', 1.5);
        this.setupSlider('deformation', 'deformationValue', 0.3);
        this.setupSlider('complexity', 'complexityValue', 4);
        this.setupSlider('rotationSpeed', 'rotationSpeedValue', 0.3);
        this.setupSlider('textureIntensity', 'textureIntensityValue', 0.0);
        this.setupSlider('audioVolume', 'audioVolumeValue', 0.1);

        // Upload de textura
        this.panel.querySelector('#textureUpload').addEventListener('change', (e) => {
            this.handleTextureUpload(e);
        });

        // Botones de acción
        this.panel.querySelector('#resetTexture').addEventListener('click', () => {
            this.resetTexture();
        });

        this.panel.querySelector('#resetAll').addEventListener('click', () => {
            this.resetAll();
        });

        this.panel.querySelector('#randomize').addEventListener('click', () => {
            this.randomize();
        });

        this.panel.querySelector('#debugTexture').addEventListener('click', () => {
            this.debugTexture();
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'p' || e.key === 'P') {
                e.preventDefault();
                this.togglePanel();
            }
        });
    }

    setupSlider(sliderId, valueId, defaultValue) {
        const slider = this.panel.querySelector(`#${sliderId}`);
        const valueDisplay = this.panel.querySelector(`#${valueId}`);
        
        slider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            valueDisplay.textContent = value.toFixed(2);
            this.onParameterChange(sliderId, value);
        });
    }

    onParameterChange(parameter, value) {
        console.log(`🎛️ Control Panel: ${parameter} = ${value}`);
        
        if (this.webglShader && this.webglShader.updateParameters) {
            this.webglShader.updateParameters({ [parameter]: value });
            console.log(`✅ Parameter sent to WebGL shader: ${parameter} = ${value}`);
            console.log(`📊 Current shader parameters:`, this.webglShader.parameters);
        } else {
            console.error(`❌ WebGL shader not available or updateParameters method missing`);
        }
        
        if (parameter === 'audioVolume') {
            console.log(`🔊 Control Panel: Setting audio volume to ${value}`);
            if (this.webglShader && this.webglShader.audioSystem) {
                this.webglShader.audioSystem.setVolume(value);
                console.log(`✅ Audio volume sent to audio system`);
            } else {
                console.warn(`⚠️ Audio system not available`);
            }
        }
    }

    handleTextureUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        console.log('📁 Control Panel: Loading texture file:', file.name, file.type);
        this.showNotification('Cargando imagen...');

        const reader = new FileReader();
        reader.onload = (e) => {
            console.log('📖 Control Panel: File read successfully');
            this.textureImage = new Image();
            this.textureImage.onload = () => {
                console.log('🖼️ Control Panel: Image loaded:', this.textureImage.width, 'x', this.textureImage.height);
                this.createTextureFromImage(this.textureImage);
                this.showNotification('Textura cargada: ' + file.name);
            };
            this.textureImage.onerror = () => {
                console.error('❌ Control Panel: Failed to load image');
                this.showNotification('Error al cargar imagen');
            };
            this.textureImage.src = e.target.result;
        };
        reader.onerror = () => {
            console.error('❌ Control Panel: Failed to read file');
            this.showNotification('Error al leer archivo');
        };
        reader.readAsDataURL(file);
    }

    createTextureFromImage(image) {
        if (!this.webglShader) {
            console.error('WebGLShader not available');
            return;
        }

        // Usar el método del webgl-shader que ya está implementado
        if (this.webglShader.createTextureFromImage) {
            console.log('🖼️ Control Panel: Creating texture from image...');
            this.webglShader.createTextureFromImage(image);
            console.log('✅ Control Panel: Texture created successfully');
            
            // Activar la intensidad de textura si está en 0
            const textureIntensitySlider = this.panel.querySelector('#textureIntensity');
            if (textureIntensitySlider && parseFloat(textureIntensitySlider.value) === 0) {
                textureIntensitySlider.value = 0.5;
                this.panel.querySelector('#textureIntensityValue').textContent = '0.5';
                this.onParameterChange('textureIntensity', 0.5);
                console.log('🎛️ Control Panel: Auto-set texture intensity to 0.5');
            }
        } else {
            console.error('❌ Control Panel: createTextureFromImage method not available in WebGL shader');
        }
    }

    resetTexture() {
        this.panel.querySelector('#textureIntensity').value = 0.0;
        this.panel.querySelector('#textureIntensityValue').textContent = '0.0';
        this.onParameterChange('textureIntensity', 0.0);
        this.showNotification('Textura reseteada');
    }

    resetAll() {
        const defaults = {
            'sphereSize': 1.5,
            'deformation': 0.3,
            'complexity': 4,
            'rotationSpeed': 0.3,
            'textureIntensity': 0.0,
            'audioVolume': 0.1
        };

        Object.keys(defaults).forEach(key => {
            const slider = this.panel.querySelector(`#${key}`);
            const valueDisplay = this.panel.querySelector(`#${key}Value`);
            if (slider && valueDisplay) {
                slider.value = defaults[key];
                valueDisplay.textContent = defaults[key].toFixed(2);
                this.onParameterChange(key, defaults[key]);
            }
        });

        this.showNotification('Todos los parámetros reseteados');
    }

    randomize() {
        const parameters = [
            'sphereSize', 'deformation', 'complexity', 'rotationSpeed',
            'textureIntensity', 'audioVolume'
        ];

        parameters.forEach(param => {
            const slider = this.panel.querySelector(`#${param}`);
            const min = parseFloat(slider.min);
            const max = parseFloat(slider.max);
            const randomValue = min + Math.random() * (max - min);
            slider.value = randomValue;
            this.panel.querySelector(`#${param}Value`).textContent = randomValue.toFixed(2);
            this.onParameterChange(param, randomValue);
        });

        this.showNotification('Parámetros aleatorizados');
    }

    togglePanel() {
        if (this.isVisible) {
            this.hidePanel();
        } else {
            this.showPanel();
        }
    }

    showPanel() {
        this.panel.classList.add('visible');
        this.isVisible = true;
    }

    hidePanel() {
        this.panel.classList.remove('visible');
        this.isVisible = false;
    }

    debugTexture() {
        console.log('🔍 === DEBUG TEXTURA ===');
        console.log('WebGL Shader:', this.webglShader);
        console.log('Has Texture:', this.webglShader ? this.webglShader.hasTexture : 'N/A');
        console.log('Texture Object:', this.webglShader ? this.webglShader.texture : 'N/A');
        console.log('Texture Intensity:', this.webglShader ? this.webglShader.parameters.textureIntensity : 'N/A');
        console.log('Texture Uniforms:', {
            textureUniform: this.webglShader ? this.webglShader.textureUniform : 'N/A',
            hasTextureUniform: this.webglShader ? this.webglShader.hasTextureUniform : 'N/A'
        });
        console.log('GL Context:', this.webglShader ? this.webglShader.gl : 'N/A');
        console.log('======================');
        
        this.showNotification('Debug info en consola');
    }

    showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'control-notification';
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 2000);
    }
}