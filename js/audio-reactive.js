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
        this.initialized = false;
        this.audioReady = false;
        this.targetVolume = 0.1; // Volumen predeterminado
        
        // No inicializar automáticamente - esperar interacción del usuario
    }

    async initializeWhenReady() {
        try {
            // Solo crear el audio context, NO activar sonido aún
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Preparar nodos de audio pero sin crear osciladores
            this.setupAudioNodes();
            this.startAudioAnalysis();
            
            this.audioReady = true;
            console.log('🎵 Audio system prepared (no sound yet)');
        } catch (error) {
            console.error('Error preparing audio:', error);
            this.createFallbackAudio();
        }
    }

    async init() {
        await this.createAudioContext();
        this.setupAudioNodes();
        // NO crear osciladores automáticamente - esperar interacción del usuario
        this.startAudioAnalysis();
    }

    async createAudioContext() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            console.log('Audio Context creado correctamente');
        } catch (error) {
            console.error('Error creando Audio Context:', error);
            this.createFallbackAudio();
        }
    }

    waitForUserInteraction() {
        return new Promise((resolve) => {
            const handleInteraction = async (e) => {
                try {
                    // Solo activar audio si NO es un click en el canvas WebGL
                    const canvas = document.querySelector('#webgl-container canvas');
                    if (canvas && e.target === canvas) {
                        return; // No activar audio en clicks del canvas
                    }
                    
                    if (this.audioContext && this.audioContext.state === 'suspended') {
                        await this.audioContext.resume();
                        console.log('🎵 Audio context resumed');
                    }
                    
                    // Crear y activar osciladores después del click
                    this.createComplexOscillators();
                    console.log('🎵 Audio activated by user click');
                    
                    document.removeEventListener('click', handleInteraction);
                    document.removeEventListener('touchstart', handleInteraction);
                    resolve();
                } catch (error) {
                    console.error('Error resuming audio context:', error);
                    resolve();
                }
            };

            document.addEventListener('click', handleInteraction);
            document.addEventListener('touchstart', handleInteraction);
        });
    }

    showAudioInstructions() {
        const instructions = document.createElement('div');
        instructions.id = 'audio-instructions';
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

        // El usuario debe cerrar manualmente - no auto-cerrar
        instructions.addEventListener('click', async () => {
            console.log('🎵 Audio instruction box clicked - activating audio');
            
            // Activar audio context si está suspendido
            if (this.audioContext && this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
                console.log('🎵 Audio context resumed');
            }
            
            // Crear y activar osciladores
            this.createComplexOscillators();
            console.log('🎵 Audio activated by instruction box click');
            
            // Ocultar instrucciones
            this.hideAudioInstructions();
        });
    }

    hideAudioInstructions() {
        const instructions = document.getElementById('audio-instructions');
        if (instructions) {
            instructions.remove();
        }
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
        // Evitar crear osciladores duplicados
        if (this.isPlaying || this.oscillators.length > 0) {
            console.log('🎵 Audio: Oscillators already running');
            return;
        }
        
        console.log('🎵 Audio: Creating oscillators...');
        
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
        
        // Aplicar el volumen guardado
        if (this.gainNode && this.targetVolume !== undefined) {
            this.gainNode.gain.setValueAtTime(this.targetVolume, this.audioContext.currentTime);
            console.log('✅ Audio: Applied saved volume:', this.targetVolume);
        }
        
        this.isPlaying = true;
        console.log('✅ Audio: Oscillators created and playing');
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
        
        // Audio simple y constante - sin dependencia del mouse
        this.applySimpleAudioEffects(time);
    }

    applySimpleAudioEffects(time) {
        // Audio simple y agradable sin dependencia del mouse
        const filterFreq = 600 + Math.sin(time * 0.5) * 200; // Filtro suave
        const filterQ = 1.5;
        
        // Aplicar filtro suavemente
        if (this.filter) {
            this.filter.frequency.setTargetAtTime(filterFreq, this.audioContext.currentTime, 0.2);
            this.filter.Q.setTargetAtTime(filterQ, this.audioContext.currentTime, 0.2);
        }
        
        // Modificar frecuencias de osciladores de forma sutil
        this.oscillators.forEach((osc, index) => {
            if (osc.oscillator && osc.oscillator.frequency) {
                const freqMultiplier = 1.0 + Math.sin(time * 0.3 + index * 0.5) * 0.05; // Variación muy sutil
                const targetFreq = osc.baseFreq * freqMultiplier;
                osc.oscillator.frequency.setTargetAtTime(targetFreq, this.audioContext.currentTime, 0.3);
            }
        });
    }

    getAudioValues() {
        return this.audioValues;
    }

    setVolume(volume) {
        console.log('🔊 Audio: Setting volume to', volume);
        
        try {
            // Guardar el volumen para aplicarlo cuando el audio esté listo
            this.targetVolume = Math.max(0, Math.min(1, volume));
            
            // Si el gainNode ya existe, aplicar el volumen inmediatamente
            if (this.gainNode && this.audioContext) {
                this.gainNode.gain.setValueAtTime(this.targetVolume, this.audioContext.currentTime);
                console.log('✅ Audio: Volume set to', this.targetVolume);
            } else {
                console.log('🔊 Audio: Volume saved for when audio is ready:', this.targetVolume);
            }
        } catch (err) {
            console.error('❌ Audio: Error in setVolume:', err);
        }
    }
    
    async tryStartAudio() {
        try {
            if (this.audioContext && this.audioContext.state === 'suspended') {
                console.log('🎵 Audio: Attempting to resume audio context...');
                await this.audioContext.resume();
                console.log('✅ Audio: Audio context resumed');
            }
            
            if (!this.isPlaying && this.audioContext) {
                console.log('🎵 Audio: Starting oscillators...');
                this.createComplexOscillators();
                console.log('✅ Audio: Oscillators started');
            }
        } catch (err) {
            console.error('❌ Audio: Failed to start audio:', err);
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