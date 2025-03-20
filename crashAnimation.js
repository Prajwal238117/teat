class CrashAnimation {
  constructor(container) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, container.offsetWidth / container.offsetHeight, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.particles = [];
    this.rocketGeometry = null;
    this.rocketMaterial = null;
    this.rocket = null;
    this.smokeParticles = [];
    this.explosionParticles = [];
    this.isExploding = false;
    this.multiplier = 1.0;
    this.isPortrait = window.innerHeight > window.innerWidth;
    
    this.init();
  }

  init() {
    // Setup renderer with pixel ratio for better mobile display
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(this.container.offsetWidth, this.container.offsetHeight);
    this.renderer.setClearColor(0x000000, 0);
    this.container.appendChild(this.renderer.domElement);

    // Adjust camera position based on device orientation
    this.updateCameraPosition();

    // Create rocket
    this.createRocket();
    
    // Add lights with intensity based on screen size
    const ambientLight = new THREE.AmbientLight(0xffffff, this.isPortrait ? 0.6 : 0.5);
    this.scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xff7700, this.isPortrait ? 1.2 : 1, 100);
    pointLight.position.set(0, 0, 10);
    this.scene.add(pointLight);

    // Start animation loop
    this.animate();

    // Handle window resize and orientation change
    window.addEventListener('resize', () => this.onWindowResize());
    window.addEventListener('orientationchange', () => {
      setTimeout(() => this.onWindowResize(), 100);
    });

    // Add touch event listeners for mobile interaction
    this.container.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: false });
    this.container.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
  }

  updateCameraPosition() {
    this.isPortrait = window.innerHeight > window.innerWidth;
    if (this.isPortrait) {
      this.camera.position.z = 7;
      this.camera.position.y = 1;
    } else {
      this.camera.position.z = 5;
      this.camera.position.y = 0;
    }
    this.camera.lookAt(0, 0, 0);
  }

  createRocket() {
    // Adjust rocket size based on screen size
    const scale = this.isPortrait ? 0.15 : 0.2;
    this.rocketGeometry = new THREE.ConeGeometry(scale, scale * 5, 32);
    this.rocketMaterial = new THREE.MeshPhongMaterial({
      color: 0x4ade80,
      emissive: 0x4ade80,
      emissiveIntensity: 0.5,
      shininess: 100
    });
    this.rocket = new THREE.Mesh(this.rocketGeometry, this.rocketMaterial);
    this.scene.add(this.rocket);

    // Add trail particles
    const particleCount = this.isPortrait ? 30 : 50;
    for (let i = 0; i < particleCount; i++) {
      this.createTrailParticle();
    }
  }

  createTrailParticle() {
    const scale = this.isPortrait ? 0.03 : 0.05;
    const geometry = new THREE.SphereGeometry(scale, 8, 8);
    const material = new THREE.MeshPhongMaterial({
      color: 0xff7700,
      emissive: 0xff4400,
      transparent: true,
      opacity: Math.random()
    });
    const particle = new THREE.Mesh(geometry, material);
    
    // Adjust particle position based on screen orientation
    const offset = this.isPortrait ? 0.3 : 0.5;
    particle.position.set(
      this.rocket.position.x,
      this.rocket.position.y - offset - Math.random(),
      this.rocket.position.z + (Math.random() - 0.5) * 0.2
    );
    
    particle.userData.velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 0.02,
      -Math.random() * (this.isPortrait ? 0.03 : 0.05),
      (Math.random() - 0.5) * 0.02
    );
    
    this.smokeParticles.push(particle);
    this.scene.add(particle);
  }

  createExplosionParticle() {
    const scale = this.isPortrait ? 0.07 : 0.1;
    const geometry = new THREE.SphereGeometry(scale, 8, 8);
    const material = new THREE.MeshPhongMaterial({
      color: Math.random() > 0.5 ? 0xff4400 : 0xff7700,
      emissive: 0xff4400,
      transparent: true,
      opacity: 1
    });
    const particle = new THREE.Mesh(geometry, material);
    particle.position.copy(this.rocket.position);
    
    // Adjust explosion velocity based on screen size
    const velocity = this.isPortrait ? 0.2 : 0.3;
    particle.userData.velocity = new THREE.Vector3(
      (Math.random() - 0.5) * velocity,
      (Math.random() - 0.5) * velocity,
      (Math.random() - 0.5) * velocity
    );
    
    this.explosionParticles.push(particle);
    this.scene.add(particle);
  }

  updateParticles() {
    // Update trail particles
    for (let i = this.smokeParticles.length - 1; i >= 0; i--) {
      const particle = this.smokeParticles[i];
      particle.position.add(particle.userData.velocity);
      particle.material.opacity -= 0.02;

      if (particle.material.opacity <= 0) {
        this.scene.remove(particle);
        this.smokeParticles.splice(i, 1);
        this.createTrailParticle();
      }
    }

    // Update explosion particles
    if (this.isExploding) {
      for (let i = this.explosionParticles.length - 1; i >= 0; i--) {
        const particle = this.explosionParticles[i];
        particle.position.add(particle.userData.velocity);
        particle.material.opacity -= 0.02;

        if (particle.material.opacity <= 0) {
          this.scene.remove(particle);
          this.explosionParticles.splice(i, 1);
        }
      }
    }
  }

  updateRocket() {
    if (!this.isExploding) {
      // Move rocket up based on multiplier with responsive scaling
      const scale = this.isPortrait ? 1.5 : 2;
      const targetY = (this.multiplier - 1) * scale;
      this.rocket.position.y = targetY;

      // Add new trail particles
      if (Math.random() > (this.isPortrait ? 0.7 : 0.5)) {
        this.createTrailParticle();
      }
    }
  }

  explode() {
    if (this.isExploding) return;
    this.isExploding = true;

    // Create explosion particles
    const particleCount = this.isPortrait ? 30 : 50;
    for (let i = 0; i < particleCount; i++) {
      this.createExplosionParticle();
    }

    // Flash effect
    const flash = new THREE.PointLight(0xff7700, this.isPortrait ? 1.5 : 2, 100);
    flash.position.copy(this.rocket.position);
    this.scene.add(flash);

    // Animate flash
    gsap.to(flash, {
      intensity: 0,
      duration: 0.5,
      onComplete: () => this.scene.remove(flash)
    });

    // Hide rocket
    this.rocket.visible = false;

    // Shake camera with responsive intensity
    const intensity = this.isPortrait ? 0.3 : 0.5;
    gsap.to(this.camera.position, {
      x: '+=' + (Math.random() - 0.5) * intensity,
      y: '+=' + (Math.random() - 0.5) * intensity,
      duration: 0.1,
      repeat: 5,
      yoyo: true
    });
  }

  reset() {
    this.isExploding = false;
    this.multiplier = 1.0;
    this.rocket.position.set(0, 0, 0);
    this.rocket.visible = true;

    // Remove all explosion particles
    for (const particle of this.explosionParticles) {
      this.scene.remove(particle);
    }
    this.explosionParticles = [];

    // Reset camera with responsive position
    gsap.to(this.camera.position, {
      x: 0,
      y: this.isPortrait ? 1 : 0,
      z: this.isPortrait ? 7 : 5,
      duration: 0.5
    });
  }

  updateMultiplier(value) {
    this.multiplier = value;
  }

  onWindowResize() {
    const width = this.container.offsetWidth;
    const height = this.container.offsetHeight;
    
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    
    this.updateCameraPosition();
  }

  onTouchStart(e) {
    e.preventDefault();
    // Handle touch interaction if needed
  }

  onTouchMove(e) {
    e.preventDefault();
    // Handle touch movement if needed
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    this.updateRocket();
    this.updateParticles();

    this.renderer.render(this.scene, this.camera);
  }
}

// Export for use in crash.js
export default CrashAnimation; 