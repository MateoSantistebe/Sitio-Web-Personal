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
                    
                    <div class="control-group">
                        <label>Modo Fusión:</label>
                        <input type="range" id="blendMode" min="0" max="4" step="1" value="0" class="slider">
                        <span class="value" id="blendModeValue">Multiplicar</span>
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
                
                <div class="control-section">
                    <h4>FONDO</h4>
                    
                    <div class="control-group">
                        <label>Color de Fondo:</label>
                        <input type="color" id="backgroundColor" value="#070a14" class="color-input">
                    </div>
                    
                    <div class="control-group">
                        <label>Rojo:</label>
                        <input type="range" id="bgRed" min="0.0" max="1.0" step="0.01" value="0.03" class="slider">
                        <span class="value" id="bgRedValue">0.03</span>
                    </div>
                    
                    <div class="control-group">
                        <label>Verde:</label>
                        <input type="range" id="bgGreen" min="0.0" max="1.0" step="0.01" value="0.04" class="slider">
                        <span class="value" id="bgGreenValue">0.04</span>
                    </div>
                    
                    <div class="control-group">
                        <label>Azul:</label>
                        <input type="range" id="bgBlue" min="0.0" max="1.0" step="0.01" value="0.08" class="slider">
                        <span class="value" id="bgBlueValue">0.08</span>
                    </div>
                </div>
                
                <div class="action-buttons">
                    <button id="resetAll" class="action-btn reset">Reset Todo</button>
                    <button id="randomize" class="action-btn random">Aleatorizar</button>
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
        this.setupSlider('blendMode', 'blendModeValue', 0, this.getBlendModeName.bind(this));
        this.setupSlider('audioVolume', 'audioVolumeValue', 0.1);
        
        // Sliders de color de fondo
        this.setupSlider('bgRed', 'bgRedValue', 0.03);
        this.setupSlider('bgGreen', 'bgGreenValue', 0.04);
        this.setupSlider('bgBlue', 'bgBlueValue', 0.08);
        
        // Color picker de fondo
        this.panel.querySelector('#backgroundColor').addEventListener('input', (e) => {
            this.handleColorPicker(e);
        });

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

        document.addEventListener('keydown', (e) => {
            if (e.key === 'p' || e.key === 'P') {
                e.preventDefault();
                this.togglePanel();
            }
        });
    }

    setupSlider(sliderId, valueId, defaultValue, formatFunction = null) {
        const slider = this.panel.querySelector(`#${sliderId}`);
        const valueDisplay = this.panel.querySelector(`#${valueId}`);
        
        slider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            if (formatFunction) {
                valueDisplay.textContent = formatFunction(value);
            } else {
                valueDisplay.textContent = value.toFixed(2);
            }
            this.onParameterChange(sliderId, value);
        });
    }

    getBlendModeName(value) {
        const modes = ['Multiplicar', 'Overlay', 'Soft Light', 'Color Burn', 'Normal'];
        return modes[parseInt(value)] || 'Normal';
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
        
        // Actualizar color de fondo cuando cambian los componentes RGB
        if (parameter.startsWith('bg')) {
            this.updateBackgroundColor();
        }
    }
    
    handleColorPicker(event) {
        const color = event.target.value;
        console.log(`🎨 Control Panel: Color picker changed to ${color}`);
        
        // Convertir hex a RGB
        const r = parseInt(color.substr(1, 2), 16) / 255;
        const g = parseInt(color.substr(3, 2), 16) / 255;
        const b = parseInt(color.substr(5, 2), 16) / 255;
        
        // Actualizar sliders
        this.panel.querySelector('#bgRed').value = r;
        this.panel.querySelector('#bgGreen').value = g;
        this.panel.querySelector('#bgBlue').value = b;
        
        // Actualizar displays
        this.panel.querySelector('#bgRedValue').textContent = r.toFixed(2);
        this.panel.querySelector('#bgGreenValue').textContent = g.toFixed(2);
        this.panel.querySelector('#bgBlueValue').textContent = b.toFixed(2);
        
        this.updateBackgroundColor();
    }
    
    updateBackgroundColor() {
        const r = parseFloat(this.panel.querySelector('#bgRed').value);
        const g = parseFloat(this.panel.querySelector('#bgGreen').value);
        const b = parseFloat(this.panel.querySelector('#bgBlue').value);
        
        console.log(`🎨 Control Panel: Updating background color to RGB(${r}, ${g}, ${b})`);
        
        if (this.webglShader && this.webglShader.updateParameters) {
            this.webglShader.updateParameters({ backgroundColor: [r, g, b] });
        }
        
        // Actualizar color picker
        const hex = '#' + 
            Math.round(r * 255).toString(16).padStart(2, '0') +
            Math.round(g * 255).toString(16).padStart(2, '0') +
            Math.round(b * 255).toString(16).padStart(2, '0');
        this.panel.querySelector('#backgroundColor').value = hex;
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
            'blendMode': 0,
            'audioVolume': 0.1,
            'bgRed': 0.03,
            'bgGreen': 0.04,
            'bgBlue': 0.08
        };

        Object.keys(defaults).forEach(key => {
            const slider = this.panel.querySelector(`#${key}`);
            const valueDisplay = this.panel.querySelector(`#${key}Value`);
            if (slider && valueDisplay) {
                slider.value = defaults[key];
                if (key === 'blendMode') {
                    valueDisplay.textContent = this.getBlendModeName(defaults[key]);
                } else {
                    valueDisplay.textContent = defaults[key].toFixed(2);
                }
                this.onParameterChange(key, defaults[key]);
            }
        });

        // Reset color picker
        this.panel.querySelector('#backgroundColor').value = '#070a14';

        this.showNotification('Todos los parámetros reseteados');
    }

    randomize() {
        // Excluimos audioVolume de la aleatorización
        const parameters = [
            'sphereSize', 'deformation', 'complexity', 'rotationSpeed',
            'textureIntensity', 'blendMode', 'bgRed', 'bgGreen', 'bgBlue'
        ];

        parameters.forEach(param => {
            const slider = this.panel.querySelector(`#${param}`);
            const min = parseFloat(slider.min);
            const max = parseFloat(slider.max);
            const randomValue = min + Math.random() * (max - min);
            slider.value = randomValue;
            
            const valueDisplay = this.panel.querySelector(`#${param}Value`);
            if (param === 'blendMode') {
                valueDisplay.textContent = this.getBlendModeName(Math.round(randomValue));
                this.onParameterChange(param, Math.round(randomValue));
            } else {
                valueDisplay.textContent = randomValue.toFixed(2);
                this.onParameterChange(param, randomValue);
            }
        });

        this.showNotification('Parámetros aleatorizados (volumen preservado)');
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