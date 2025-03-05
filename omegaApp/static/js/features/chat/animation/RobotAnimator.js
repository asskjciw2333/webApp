import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import SceneManager from './SceneManager.js';

class RobotAnimator {
    constructor() {
        this.sceneManager = new SceneManager();
        this.robot = null;
        this.mixer = null;
        
        this.currentModelIndex = 0;
        this.currentAnimationDuration = 0;
        this.isActive = false;
        this.isTransitioning = false;
        this.nextModelTimer = null;
        this.cleanupPromise = null;
        
        // Separate models for idle and active states
        this.idleModels = [
            '/static/models/walk in circle.glb',
            '/static/models/samba dancing.glb',
            '/static/models/northern soul spin combo.glb',
        ];
        
        this.activeModels = [
            '/static/models/talking.glb',
            '/static/models/talking (1).glb',
            '/static/models/yelling.glb',
            '/static/models/standing arguing.glb',
        ];
        
        this.initialize();
    }

    initialize() {
        const container = document.createElement('div');
        container.className = 'chat-button';
        container.appendChild(this.sceneManager.getDomElement());
        document.body.appendChild(container);

        this.loadNextModel();
        this.startAnimation();
        
        container.addEventListener('click', () => {
            if (this.onClick) {
                this.onClick();
            }
        });
    }

    setOnClick(callback) {
        this.onClick = callback;
    }

    startAnimation() {
        const clock = new THREE.Clock();
        const animate = () => {
            requestAnimationFrame(animate);
            
            if (this.mixer) {
                this.mixer.update(clock.getDelta());
            }
            
            this.sceneManager.render();
        };
        animate();
    }

    async setActiveState(isActive) {
        if (this.isActive === isActive) return;
        
        this.isActive = isActive;
        this.currentModelIndex = 0;
        await this.cleanupCurrentModel();
        this.loadNextModel();
    }

    async cleanupCurrentModel() {
        this.cleanupPromise = (async () => {
            if (this.nextModelTimer) {
                clearTimeout(this.nextModelTimer);
                this.nextModelTimer = null;
            }

            if (this.isTransitioning) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            if (this.robot) {
                if (this.mixer) {
                    this.mixer.stopAllAction();
                    this.mixer.uncacheRoot(this.robot);
                }

                this.sceneManager.removeFromScene(this.robot);
                this.disposeModel(this.robot);
            }

            this.robot = null;
            this.mixer = null;
            this.isTransitioning = false;

            if (window.gc) {
                window.gc();
            }

            await new Promise(resolve => setTimeout(resolve, 50));
        })();

        try {
            await this.cleanupPromise;
        } finally {
            this.cleanupPromise = null;
        }
    }

    disposeModel(model) {
        model.traverse((child) => {
            if (child.isMesh) {
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(material => material.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
                if (child.geometry) {
                    child.geometry.dispose();
                }
            }
        });
    }

    loadNextModel() {
        if (this.isTransitioning || this.cleanupPromise) return;

        this.isTransitioning = true;
        const currentModels = this.isActive ? this.activeModels : this.idleModels;
        const loader = new GLTFLoader();
        
        loader.load(currentModels[this.currentModelIndex], (gltf) => {
            const newRobot = this.prepareModel(gltf.scene);
            const newMixer = new THREE.AnimationMixer(newRobot);
            
            this.sceneManager.addToScene(newRobot);
            
            const actions = this.setupAnimations(gltf, newMixer);
            this.currentModelIndex = (this.currentModelIndex + 1) % currentModels.length;
            
            this.transitionToNewModel(newRobot, newMixer, actions);
        });
    }

    prepareModel(model) {
        model.traverse((child) => {
            if (child.isMesh) {
                child.material = child.material.clone();
                child.material.metalness = 0.3;
                child.material.roughness = 0.6;
                child.material.envMapIntensity = 1.5;
                
                child.castShadow = true;
                child.receiveShadow = true;
                
                if (child.material.map) {
                    child.material.map.anisotropy = this.sceneManager.renderer.capabilities.getMaxAnisotropy();
                    child.material.map.minFilter = THREE.LinearMipmapLinearFilter;
                    child.material.map.magFilter = THREE.LinearFilter;
                }
                
                child.material.transparent = true;
                child.material.opacity = 0;
            }
        });
        
        this.scaleAndPositionModel(model);
        return model;
    }

    scaleAndPositionModel(model) {
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 0.8 / maxDim;
        model.scale.setScalar(scale);
        
        model.position.x = -center.x * scale;
        model.position.y = (-center.y * scale) - 0.5;
        model.position.z = -center.z * scale;
    }

    setupAnimations(gltf, mixer) {
        let actions = [];
        let maxDuration = 0;
        
        if (gltf.animations && gltf.animations.length) {
            gltf.animations.forEach(clip => {
                const action = mixer.clipAction(clip);
                maxDuration = Math.max(maxDuration, clip.duration);
                action.play();
                actions.push(action);
            });
            
            this.currentAnimationDuration = maxDuration * 1000;
        }
        
        return actions;
    }

    transitionToNewModel(newRobot, newMixer, newActions) {
        const TRANSITION_DURATION = 1.5;
        const FADE_START_DELAY = 0.3;
        let transitionTime = 0;
        let startTime = performance.now();
        
        const oldRobot = this.robot;
        const oldMixer = this.mixer;
        
        newActions.forEach(action => action.play());
        
        const animate = () => {
            const currentTime = performance.now();
            const deltaTime = (currentTime - startTime) / 1000;
            startTime = currentTime;
            
            transitionTime += deltaTime;
            
            if (oldMixer) oldMixer.update(deltaTime);
            if (newMixer) newMixer.update(deltaTime);
            
            if (transitionTime > FADE_START_DELAY) {
                const fadeTime = transitionTime - FADE_START_DELAY;
                const alpha = Math.min(fadeTime / (TRANSITION_DURATION - FADE_START_DELAY), 1.0);
                const eased = this.easeInOutCubic(alpha);
                
                this.updateModelOpacity(oldRobot, 1 - eased);
                this.updateModelOpacity(newRobot, eased);
                
                if (alpha < 1.0) {
                    requestAnimationFrame(animate);
                } else {
                    this.completeTransition(oldRobot, oldMixer, newRobot, newMixer);
                }
            } else {
                requestAnimationFrame(animate);
            }
        };
        
        animate();
    }

    updateModelOpacity(model, opacity) {
        if (!model) return;
        
        model.traverse((child) => {
            if (child.isMesh && child.material) {
                child.material.transparent = true;
                child.material.opacity = opacity;
            }
        });
    }

    completeTransition(oldRobot, oldMixer, newRobot, newMixer) {
        if (oldRobot) {
            this.sceneManager.removeFromScene(oldRobot);
            this.disposeModel(oldRobot);
        }
        
        if (oldMixer) {
            oldMixer.stopAllAction();
            oldMixer.uncacheRoot(oldRobot);
        }
        
        this.robot = newRobot;
        this.mixer = newMixer;
        
        if (this.nextModelTimer) {
            clearTimeout(this.nextModelTimer);
        }
        
        this.nextModelTimer = setTimeout(() => {
            this.isTransitioning = false;
            const currentModels = this.isActive ? this.activeModels : this.idleModels;
            if (this.isActive === (currentModels === this.activeModels)) {
                this.loadNextModel();
            }
        }, this.currentAnimationDuration + 500);
    }

    easeInOutCubic(x) {
        return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
    }
}

export default RobotAnimator; 