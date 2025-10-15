class AudioReactiveSystem {
    constructor(webglShader) {
        this.webglShader = webglShader;
        this.audioContext = null;
        this.analyser = null;
        this.oscillators = [];
        this.gainNode = null;
        this.filter = null;
        this.isPlaying = false;
        this.audioValues = new Float32Array(4); // [bass, mid, high, volume]
        this.frequencyData = null;
        this.lastShapeType = 0;
        this.shapeChangeTime = 0;
        
        this.init();
    }

    async init() {
        await this.createAudioContext();
        this.setupAudioNodes();
        this.createComplexOscillators();
        this.startAudioAnalysis();
    }

    async createAudioContext() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            if (this.audioContext.state === 'suspended') {
                await this.waitForUserInteraction();
            }
            
            console.log('Audio Context creado correctamente');
        } catch (error) {
            console.error('Error creando Audio Context:', error);
            this.createFallbackAudio();
        }
    }

    waitForUserInteraction() {
        return new Promise((resolve) => {
            const handler = () => {
                document.removeEventListener('click', handler);
                document.removeEventListener('touchstart', handler);
                if (this.audioContext) {
                    this.audioContext.resume().then(resolve);
                }
            };
            
            document.addEventListener('click', handler);
            document.addEventListener('touchstart', handler);
            
            this.showAudioInstructions();
        });
    }

    showAudioInstructions() {
        const instructions = document.createElement('div');
        instructions.innerHTML = `
            <div style="
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(0,0,0,0.9);
                color: white;
                padding: 2rem;
                border: 1px solid #333;
                font-family: 'Courier New', monospace;
                text-align: center;
                z-index: 10000;
                max-width: 300px;
            ">
                <h3 style="margin-bottom: 1rem;">AUDIO REACTIVO</h3>
                <p style="margin-bottom: 1rem;">Haz click para activar el sonido</p>
                <p style="font-size: 0.8rem; opacity: 0.7;">El audio reacciona a las formas 3D</p>
            </div>
        `;
        document.body.appendChild(instructions);

        setTimeout(() => {
            if (instructions.parentNode) {
                instructions.parentNode.removeChild(instructions);
            }
        }, 5000);
    }

    setupAudioNodes() {
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 512;
        this.gainNode = this.audioContext.createGain();
        this.gainNode.gain.value = 0.15;
        
        this.filter = this.audioContext.createBiquadFilter();
        this.filter.type = 'lowpass';
        this.filter.frequency.value = 800;
        
        this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
    }

    createComplexOscillators() {
        // Crear múltiples osciladores para sonido más rico
        const frequencies = [110, 165, 220, 277, 330, 440]; // A2, E3, A3, C#4, E4, A4
        const types = ['sine', 'triangle', 'sawtooth', 'square'];
        
        frequencies.forEach((freq, index) => {
            const oscillator = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            
            oscillator.type = types[index % types.length];
            oscillator.frequency.value = freq;
            gain.gain.value = 0.08; // Volumen bajo individual
            
            oscillator.connect(gain);
            gain.connect(this.filter);
            
            oscillator.start();
            this.oscillators.push({ oscillator, gain, baseFreq: freq });
        });
        
        this.filter.connect(this.analyser);
        this.analyser.connect(this.gainNode);
        this.gainNode.connect(this.audioContext.destination);
        
        this.isPlaying = true;
    }

    createFallbackAudio() {
        console.log('Usando audio simulado');
        this.audioValues = new Float32Array([0.5, 0.3, 0.2, 0.1]);
        
        setInterval(() => {
            const time = Date.now() * 0.001;
            this.audioValues[0] = 0.5 + Math.sin(time * 0.5) * 0.3;
            this.audioValues[1] = 0.3 + Math.sin(time * 1.2) * 0.2;
            this.audioValues[2] = 0.2 + Math.sin(time * 2.0) * 0.1;
            this.audioValues[3] = 0.1 + Math.sin(time * 0.3) * 0.05;
        }, 100);
    }

    startAudioAnalysis() {
        const analyzeAudio = () => {
            if (this.analyser && this.isPlaying) {
                this.analyser.getByteFrequencyData(this.frequencyData);
                
                const bass = this.getFrequencyRange(0, 10);
                const mid = this.getFrequencyRange(10, 50);
                const high = this.getFrequencyRange(50, 128);
                const volume = (bass + mid + high) / 3;
                
                this.audioValues[0] = bass / 255;
                this.audioValues[1] = mid / 255;
                this.audioValues[2] = high / 255;
                this.audioValues[3] = volume / 255;
                
                this.modifySoundBasedOnGeometry();
            }
            
            requestAnimationFrame(analyzeAudio);
        };
        
        analyzeAudio();
    }

    getFrequencyRange(start, end) {
        let sum = 0;
        for (let i = start; i < end; i++) {
            sum += this.frequencyData[i];
        }
        return sum / (end - start);
    }

    modifySoundBasedOnGeometry() {
        if (!this.oscillators.length || !this.webglShader) return;
        
        const time = Date.now() * 0.001;
        const rotationSpeed = Math.abs(this.webglShader.rotationY);
        const mouseX = this.webglShader.mouseX;
        const mouseY = this.webglShader.mouseY;
        
        // Detectar tipo de forma predominante basado en la rotación y posición
        const shapeType = this.detectShapeType(rotationSpeed, mouseX, mouseY);
        
        // Cambiar sonido cuando cambia la forma
        if (shapeType !== this.lastShapeType) {
            this.shapeChangeTime = time;
            this.lastShapeType = shapeType;
        }
        
        const shapeAge = time - this.shapeChangeTime;
        
        // Aplicar efectos basados en el tipo de forma
        this.applyShapeBasedEffects(shapeType, shapeAge, rotationSpeed, mouseX, mouseY);
    }

    detectShapeType(rotationSpeed, mouseX, mouseY) {
        // Simular detección de formas basado en parámetros de interacción
        if (rotationSpeed > 2.0) return 2; // Formas rápidas = tipo 2
        if (mouseX > 0.7) return 3;        // Lado derecho = tipo 3
        if (mouseY < 0.3) return 1;        // Parte superior = tipo 1
        return 0;                          // Default = tipo 0
    }

    applyShapeBasedEffects(shapeType, shapeAge, rotationSpeed, mouseX, mouseY) {
        const time = Date.now() * 0.001;
        
        // Modificar filtro según la forma
        let filterFreq = 800;
        let filterQ = 1;
        
        // Modificar frecuencias de osciladores según la forma
        this.oscillators.forEach((osc, index) => {
            let detune = 0;
            let volume = 0.08;
            
            switch(shapeType) {
                case 0: // Formas esféricas - sonido armónico
                    detune = Math.sin(time * 2 + index) * 10;
                    filterFreq = 1200 + Math.sin(time) * 400;
                    volume = 0.1 + Math.sin(time * 3 + index) * 0.05;
                    break;
                    
                case 1: // Formas angulares - sonido más agresivo
                    detune = Math.sin(time * 5 + index) * 50;
                    filterFreq = 2000 + rotationSpeed * 500;
                    filterQ = 10 + rotationSpeed * 5;
                    volume = 0.12 + Math.random() * 0.08;
                    break;
                    
                case 2: // Formas rápidas - sonido pulsante
                    detune = Math.sin(time * 8 + index * 2) * 30;
                    filterFreq = 800 + Math.sin(time * 10) * 600;
                    volume = 0.15 * (0.5 + 0.5 * Math.sin(time * 4 + index));
                    break;
                    
                case 3: // Formas complejas - sonido caótico
                    detune = (Math.random() - 0.5) * 100;
                    filterFreq = 500 + mouseY * 1500;
                    filterQ = 15;
                    volume = 0.06 + Math.random() * 0.1;
                    break;
            }
            
            // Aplicar efectos de "edad" de la forma
            if (shapeAge < 2.0) {
                // Efecto de transición cuando cambia la forma
                const transition = shapeAge / 2.0;
                detune *= transition;
                volume *= transition;
            }
            
            osc.oscillator.detune.value = detune;
            osc.gain.gain.value = volume;
        });
        
        // Aplicar efectos al filtro
        this.filter.frequency.value = filterFreq;
        this.filter.Q.value = filterQ;
        
        // Modificar volumen general basado en la rotación
        const baseVolume = 0.15;
        const rotationVolume = Math.min(0.3, rotationSpeed * 0.1);
        this.gainNode.gain.value = baseVolume + rotationVolume;
    }

    getAudioValues() {
        return this.audioValues;
    }

    setVolume(volume) {
        if (this.gainNode) {
            this.gainNode.gain.value = Math.max(0, Math.min(1, volume));
        }
    }

    stop() {
        this.oscillators.forEach(osc => {
            osc.oscillator.stop();
        });
        this.oscillators = [];
        this.isPlaying = false;
        
        if (this.audioContext) {
            this.audioContext.close();
        }
    }
}