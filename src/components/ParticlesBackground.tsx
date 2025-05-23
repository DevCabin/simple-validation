'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Particles, { initParticlesEngine } from '@tsparticles/react';
import type { Container, ISourceOptions } from '@tsparticles/engine';
import { loadSlim } from '@tsparticles/slim';

const ParticlesBackground: React.FC = () => {
  const [init, setInit] = useState(false);

  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine);
    }).then(() => {
      setInit(true);
    });
  }, []);

  const particlesLoaded = async (container?: Container) => {
    // console.log(container);
  };

  // Configuration adapted from user's main site (particles.js)
  const particleOptions: ISourceOptions = useMemo(
    () => ({
      background: {
        color: {
          value: 'transparent', // Page background will show through
        },
      },
      fpsLimit: 60, // Kept from previous, good default
      particles: {
        number: {
          value: 80,
          density: {
            enable: true,
            area: 800, // value_area in particles.js
          },
        },
        color: {
          value: '#14b8a6',
        },
        shape: {
          type: 'circle',
        },
        opacity: {
          value: 0.8,
          random: false, // tsparticles random is an object { enable: boolean, minimumValue: number }
                         // Simple boolean false here should achieve non-random opacity.
        },
        size: {
          value: 3,
          random: true, // tsparticles random is an object { enable: boolean, minimumValue: number }
                        // Simple boolean true should achieve random size (within a default range if not specified)
                        // or we can specify { min: 1, max: 3 } for example if 3 is the max.
                        // For now, let's try with a range for clarity, assuming 3 is the max.
          // random: { enable: true, minimumValue: 1 } // More explicit tsparticles way
        },
        links: { // line_linked in particles.js
          enable: true,
          distance: 150,
          color: '#14b8a6',
          opacity: 0.6,
          width: 1.5,
        },
        move: {
          enable: true,
          speed: 2,
          direction: 'none',
          random: false,
          straight: false,
          outModes: { // out_mode in particles.js
            default: 'out',
          },
          bounce: false, // This is a sub-property of collisions in tsparticles
                        // collisions: { enable: true, mode: 'bounce' } would be the equivalent
                        // For now, if bounce is false, we can omit or ensure collisions are off.
        },
        // Ensure bounce is handled correctly if needed, currently collisions are off by default
        collisions: {
            enable: false, // Corresponds to bounce: false in move
        }
      },
      interactivity: {
        detectsOn: 'canvas', // detect_on in particles.js
        events: {
          onHover: {
            enable: false, // Intentionally keeping this false as per user's last request
                           // Original config had: enable: true, mode: 'grab'
            mode: 'grab',
          },
          onClick: { // Added to disable click interaction explicitly
            enable: false,
            mode: 'push',
          },
          resize: { 
            enable: true,
          },
        },
        modes: {
          grab: {
            distance: 140,
            links: { // line_linked in particles.js grab mode
              opacity: 1,
            },
          },
        },
      },
      detectRetina: true, // retina_detect in particles.js
    }),
    [],
  );

  if (init) {
    return (
      <Particles
        id="tsparticles"
        particlesLoaded={particlesLoaded}
        options={particleOptions}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: -1,
        }}
      />
    );
  }

  return <></>;
};

export default ParticlesBackground; 