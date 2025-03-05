import * as THREE from 'three';

class SceneManager {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        
        this.initialize();
    }

    initialize() {
        this.scene = new THREE.Scene();
        
        this.setupCamera();
        this.setupRenderer();
        this.setupLights();
    }

    setupCamera() {
        this.camera = new THREE.PerspectiveCamera(35, 1, 0.1, 1000);
        this.camera.position.set(0, 0.2, 3.5);
        this.camera.lookAt(0, 0, 0);
    }

    setupRenderer() {
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
            preserveDrawingBuffer: true,
            powerPreference: "high-performance"
        });
        
        this.renderer.setSize(150, 150);
        this.renderer.setPixelRatio(window.devicePixelRatio * 2);
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }

    setupLights() {
        const mainLight = new THREE.DirectionalLight(0xffffff, 2);
        mainLight.position.set(0, 2, 2);
        mainLight.castShadow = true;
        mainLight.shadow.mapSize.width = 1024;
        mainLight.shadow.mapSize.height = 1024;
        mainLight.shadow.camera.near = 0.1;
        mainLight.shadow.camera.far = 10;
        this.scene.add(mainLight);
        
        const fillLight = new THREE.DirectionalLight(0xffffff, 1);
        fillLight.position.set(2, 0, 1);
        this.scene.add(fillLight);
        
        const fillLight2 = new THREE.DirectionalLight(0xffffff, 1);
        fillLight2.position.set(-2, 0, 1);
        this.scene.add(fillLight2);
        
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
        this.scene.add(ambientLight);
    }

    getDomElement() {
        return this.renderer.domElement;
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }

    addToScene(object) {
        this.scene.add(object);
    }

    removeFromScene(object) {
        this.scene.remove(object);
    }
}

export default SceneManager; 