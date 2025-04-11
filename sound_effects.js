/**
 * Sound effects module for The Truth, Redacted
 * Uses Tone.js to create cyberpunk-inspired audio effects
 */

class SoundEffects {
    constructor() {
      this.enabled = false;
      this.initialized = false;
      this.volume = -15; // Initial volume in dB
      
      // Sound creation functions
      this.createSounds = this.createSounds.bind(this);
      this.playTextAppear = this.playTextAppear.bind(this);
      this.playTextDelete = this.playTextDelete.bind(this);
      this.playBackgroundAmbience = this.playBackgroundAmbience.bind(this);
      this.playUIClick = this.playUIClick.bind(this);
    }
    
    async initialize() {
      if (this.initialized) return;
      
      try {
        // We'll defer starting the audio context until explicitly triggered by user interaction
        console.log("Audio context ready to be started on user interaction");
        
        // Create master volume and effects (these won't make sound until context is started)
        this.masterVolume = new Tone.Volume(this.volume).toDestination();
        
        // Add some reverb for atmosphere
        this.reverb = new Tone.Reverb({
          decay: 2.5,
          wet: 0.3
        }).connect(this.masterVolume);
        
        // Add slight distortion for a gritty feel
        this.distortion = new Tone.Distortion({
          distortion: 0.1,
          wet: 0.2
        }).connect(this.reverb);
        
        // Create the sounds
        this.createSounds();
        
        this.initialized = true;
        console.log("Sound effects initialized and waiting for user interaction");
      } catch (error) {
        console.error("Failed to initialize audio:", error);
      }
    }
    
    createSounds() {
      // Text appear sound - digital glitchy sound
      this.textAppearSynth = new Tone.FMSynth({
        harmonicity: 3,
        modulationIndex: 10,
        detune: 0,
        oscillator: {
          type: "sine"
        },
        envelope: {
          attack: 0.01,
          decay: 0.2,
          sustain: 0.1,
          release: 0.1
        },
        modulation: {
          type: "square"
        },
        modulationEnvelope: {
          attack: 0.5,
          decay: 0.01,
          sustain: 0.5,
          release: 0.1
        }
      }).connect(this.distortion);
      
      // Text delete sound - low pitch sweep
      this.textDeleteSynth = new Tone.MonoSynth({
        oscillator: {
          type: "sawtooth"
        },
        envelope: {
          attack: 0.05,
          decay: 0.2,
          sustain: 0.1,
          release: 0.1
        },
        filter: {
          Q: 1,
          type: "lowpass",
          rolloff: -12
        },
        filterEnvelope: {
          attack: 0.001,
          decay: 0.5,
          sustain: 0.1,
          release: 0.5,
          baseFrequency: 200,
          octaves: 2
        }
      }).connect(this.distortion);
      
      // UI click sound - short blip
      this.uiClickSynth = new Tone.MembraneSynth({
        pitchDecay: 0.05,
        octaves: 2,
        oscillator: {
          type: "sine"
        },
        envelope: {
          attack: 0.001,
          decay: 0.2,
          sustain: 0,
          release: 0.1
        }
      }).connect(this.distortion);
      
      // Background ambience - low drone
      this.backgroundNoise = new Tone.Noise({
        type: "pink",
        volume: -35
      }).connect(this.reverb);
      
      this.backgroundLFO = new Tone.LFO({
        frequency: 0.1,
        min: -40,
        max: -30
      }).connect(this.backgroundNoise.volume);
      
      // Drone synth for ambient background
      this.droneSynth = new Tone.FMSynth({
        harmonicity: 1.5,
        modulationIndex: 10,
        detune: -15,
        oscillator: {
          type: "triangle"
        },
        envelope: {
          attack: 1,
          decay: 2,
          sustain: 0.8,
          release: 2
        },
        modulation: {
          type: "sine"
        },
        modulationEnvelope: {
          attack: 1,
          decay: 0.5,
          sustain: 0.5,
          release: 2
        },
        volume: -25
      }).connect(this.reverb);
      
      // Loop for the drone background sound
      this.droneLoop = new Tone.Loop(time => {
        // Play a low drone note
        if (this.enabled) {
          const notes = ["C2", "G1", "A1", "F1"];
          const randomNote = notes[Math.floor(Math.random() * notes.length)];
          this.droneSynth.triggerAttackRelease(randomNote, "8n", time);
        }
      }, "8m").start(0);
    }
    
    playTextAppear(pitch = "C4") {
      if (!this.enabled || !this.initialized) return;
      
      // Randomize pitch slightly for variation
      const pitchVariation = Math.random() * 12 - 6; // +/- 6 semitones
      const finalPitch = Tone.Frequency(pitch).transpose(pitchVariation);
      
      this.textAppearSynth.triggerAttackRelease(finalPitch, "16n");
    }
    
    playTextDelete(pitch = "G2") {
      if (!this.enabled || !this.initialized) return;
      
      // Randomize pitch slightly for variation
      const pitchVariation = Math.random() * 6 - 3; // +/- 3 semitones
      const finalPitch = Tone.Frequency(pitch).transpose(pitchVariation);
      
      this.textDeleteSynth.triggerAttackRelease(finalPitch, "8n");
    }
    
    playUIClick() {
      if (!this.enabled || !this.initialized) return;
      
      this.uiClickSynth.triggerAttackRelease("C5", "32n");
    }
    
    playBackgroundAmbience() {
      if (!this.enabled || !this.initialized) return;
      
      if (this.backgroundNoise.state !== "started") {
        this.backgroundNoise.start();
        this.backgroundLFO.start();
        Tone.Transport.start();
      }
    }
    
    stopBackgroundAmbience() {
      if (!this.initialized) return;
      
      if (this.backgroundNoise.state === "started") {
        this.backgroundNoise.stop();
        this.backgroundLFO.stop();
        Tone.Transport.stop();
      }
    }
    
    async toggleSounds() {
      this.enabled = !this.enabled;
      
      if (this.enabled) {
        if (!this.initialized) {
          await this.initialize();
        }
        
        // Start audio context on user interaction (toggle button click)
        try {
          await Tone.start();
          console.log("Audio context started successfully");
          this.playBackgroundAmbience();
        } catch (error) {
          console.error("Failed to start audio context:", error);
          // If we can't start the audio, disable sounds again
          this.enabled = false;
        }
        
        return this.enabled;
      } else {
        this.stopBackgroundAmbience();
        return false;
      }
    }
    
    setVolume(volume) {
      if (!this.initialized) return;
      
      // Convert 0-100 scale to dB (-60 to 0)
      const dbVolume = (volume / 100 * 60) - 60;
      this.masterVolume.volume.value = dbVolume;
    }
    
    /**
     * Play a glitch sound effect
     */
    playGlitch() {
      if (!this.enabled || !this.initialized) return;
      
      // Use the text delete synth with different settings for glitch effect
      const pitchVariation = Math.random() * 24 - 12; // +/- 12 semitones (wider range)
      const finalPitch = Tone.Frequency("D3").transpose(pitchVariation);
      
      this.textDeleteSynth.triggerAttackRelease(finalPitch, "16n");
    }
    
    /**
     * Play a redaction sound effect
     */
    playRedaction() {
      if (!this.enabled || !this.initialized) return;
      
      // Use the text appear synth with different settings for redaction effect
      const pitchVariation = Math.random() * 6 - 3; // +/- 3 semitones
      const finalPitch = Tone.Frequency("G3").transpose(pitchVariation);
      
      this.textAppearSynth.triggerAttackRelease(finalPitch, "8n");
    }
  }