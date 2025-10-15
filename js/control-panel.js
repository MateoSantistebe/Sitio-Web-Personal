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
                        <input type="range" id="sphereSize" min="0.5" max="3.0" step="0.1" value="1.2" class="slider">
                        <span class="value" id="sphereSizeValue">1.2</span>
                    </div>
                    
                    <div class="control-group">
                        <label>Deformación:</label>
                        <input type="range" id="deformation" min="0.0" max="1.0" step="0.1" value="0.1" class="slider">
                        <span class="value" id="deformationValue">0.1</span>
                    </div>
                    
                    <div class="control-group">
                        <label>Complejidad:</label>
                        <input type="range" id="complexity" min="1" max="10" step="1" value="3" class="slider">
                        <span class="value" id="complexityValue">3</span>
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
                        <input type="range" id="audioVolume" min="0.0" max="1.0" step="0.1" value="0.15" class="slider">
                        <span class="value" id="audioVolumeValue">0.15</span>
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
        this.setupSlider('sphereSize', 'sphereSizeValue', 1.2);
        this.setupSlider('deformation', 'deformationValue', 0.1);
        this.setupSlider('complexity', 'complexityValue', 3);
        this.setupSlider('rotationSpeed', 'rotationSpeedValue', 0.3);
        this.setupSlider('textureIntensity', 'textureIntensityValue', 0.0);
        this.setupSlider('audioVolume', 'audioVolumeValue', 0.15);

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
        if (this.webglShader && this.webglShader.updateParameters) {
            this.webglShader.updateParameters({ [parameter]: value });
        }
        
        if (parameter === 'audioVolume' && this.webglShader.audioSystem) {
            this.webglShader.audioSystem.setVolume(value);
        }
        
        console.log(`Parameter changed: ${parameter} = ${value}`);
    }

    handleTextureUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            this.textureImage = new Image();
            this.textureImage.onload = () => {
                this.createTextureFromImage(this.textureImage);
                this.showNotification('Textura cargada correctamente');
            };
            this.textureImage.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    createTextureFromImage(image) {
        if (!this.webglShader || !this.webglShader.gl) {
            console.error('WebGLShader or GL context not available');
            return;
        }

        const gl = this.webglShader.gl;
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        
        this.webglShader.currentTexture = texture;
        console.log('Texture loaded successfully');
    }

    resetTexture() {
        this.panel.querySelector('#textureIntensity').value = 0.0;
        this.panel.querySelector('#textureIntensityValue').textContent = '0.0';
        this.onParameterChange('textureIntensity', 0.0);
        this.showNotification('Textura reseteada');
    }

    resetAll() {
        const defaults = {
            'sphereSize': 1.2,
            'deformation': 0.1,
            'complexity': 3,
            'rotationSpeed': 0.3,
            'textureIntensity': 0.0,
            'audioVolume': 0.15
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